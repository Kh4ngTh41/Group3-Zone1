from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models
from .ai_service import ai_service
from .config import settings
from .db import Base, engine, get_db
from .guardrails import detect_emergency, safe_bot_message
from .his_client import get_homepage_highlights, get_slots_by_specialty, list_specialties, reserve_slot
from .metrics import get_metric_summary, record_metric
from .schemas import (
    BookingRequest,
    BookingResponse,
    CorrectionRequest,
    MetricSummaryResponse,
    HomepageHighlightsResponse,
    SpecialtyListResponse,
    TriageRequest,
    TriageResponse,
)
from .utils import mask_sensitive_text


app = FastAPI(title="Vinmec AI Concierge API", version="0.1.0")

EMERGENCY_SPECIALTY_KEYWORDS = (
    "hồi sức",
    "cấp cứu",
    "emergency",
)

allowed_origins = [x.strip() for x in settings.allow_origins.split(",") if x.strip()]
has_wildcard_origin = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=not has_wildcard_origin,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/meta/specialties", response_model=SpecialtyListResponse)
def get_specialties():
    return SpecialtyListResponse(specialties=list_specialties())


@app.get("/api/home/highlights", response_model=HomepageHighlightsResponse)
def get_home_highlights():
    highlights = get_homepage_highlights()
    return HomepageHighlightsResponse(**highlights)


@app.get("/api/slots")
def get_slots(specialty: str):
    return {"specialty": specialty, "slots": get_slots_by_specialty(specialty)}


@app.post("/api/chat/triage", response_model=TriageResponse)
def triage(payload: TriageRequest, db: Session = Depends(get_db)):
    sanitized = mask_sensitive_text(payload.symptom_text)
    keyword_emergency = detect_emergency(payload.symptom_text)

    conversation = models.Conversation(
        patient_name=payload.patient_name,
        patient_phone=payload.patient_phone,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    db.add(models.Message(conversation_id=conversation.id, role="user", content=sanitized))
    db.commit()

    triage_result = ai_service.triage(payload.symptom_text)
    suggested = payload.force_specialty or triage_result.suggested_specialty
    suggested_lower = (suggested or "").lower()
    confidence_emergency = (
        triage_result.confidence >= settings.emergency_confidence_threshold
        and any(keyword in suggested_lower for keyword in EMERGENCY_SPECIALTY_KEYWORDS)
    )
    is_emergency = keyword_emergency.is_emergency or confidence_emergency

    if is_emergency:
        emergency_reason = keyword_emergency.reason if keyword_emergency.is_emergency else "high_confidence_emergency_specialty"
        record_metric(db, "emergency_redirect", 1.0, {"reason": emergency_reason})
        bot_message = (
            f"Phát hiện dấu hiệu khẩn cấp. Vui lòng gọi ngay {settings.emergency_hotline} "
            f"hoặc {settings.vinmec_hotline} "
            "hoặc đến cơ sở y tế gần nhất."
        )
        db.add(models.Message(conversation_id=conversation.id, role="assistant", content=bot_message))
        db.commit()
        return TriageResponse(
            conversation_id=conversation.id,
            status="emergency",
            message=bot_message,
            confidence=1.0 if keyword_emergency.is_emergency else triage_result.confidence,
            fallback_used=False,
        )

    # For normal triage flow, require confidence to pass threshold before selecting
    # specialty and suggesting doctors/slots to the user.
    low_confidence = triage_result.confidence < settings.low_confidence_threshold
    if low_confidence and not payload.force_specialty:
        clarify_message = safe_bot_message(
            "Mình cần thêm thông tin để chọn đúng chuyên khoa. Bạn vui lòng cho biết: "
            "1) Triệu chứng chính, 2) Vị trí triệu chứng, 3) Triệu chứng bắt đầu từ khi nào, "
            "4) Mức độ nặng nhẹ (1-10), 5) Dấu hiệu kèm theo như sốt/khó thở/nôn/chảy máu."
        )
        db.add(models.Message(conversation_id=conversation.id, role="assistant", content=clarify_message))
        db.commit()

        record_metric(
            db,
            "triage_request",
            1.0,
            {
                "status": "clarify",
                "specialty": None,
                "fallback": triage_result.fallback_used,
            },
        )

        return TriageResponse(
            conversation_id=conversation.id,
            status="clarify",
            message=clarify_message,
            confidence=triage_result.confidence,
            suggested_specialty=None,
            candidates=[],
            slots=[],
            fallback_used=triage_result.fallback_used,
        )

    slots = get_slots_by_specialty(suggested)

    if not slots:
        record_metric(db, "human_escalation", 1.0, {"reason": "no_slots", "specialty": suggested})
        msg = safe_bot_message(
            "Hiện chưa có lịch trống phù hợp. Mình sẽ chuyển bạn đến tổng đài viên để hỗ trợ ngay."
        )
        db.add(models.Message(conversation_id=conversation.id, role="assistant", content=msg))
        db.commit()
        return TriageResponse(
            conversation_id=conversation.id,
            status="escalated",
            message=msg,
            confidence=triage_result.confidence,
            suggested_specialty=suggested,
            candidates=triage_result.candidates,
            slots=[],
            fallback_used=triage_result.fallback_used,
        )

    msg = safe_bot_message(
        f"Mình đã chọn chuyên khoa phù hợp: {suggested} (độ tin cậy {triage_result.confidence:.0%}). "
        "Bạn chọn bác sĩ và khung giờ để xác nhận đặt lịch nhé."
    )
    db.add(models.Message(conversation_id=conversation.id, role="assistant", content=msg))
    db.commit()

    record_metric(
        db,
        "triage_request",
        1.0,
        {
            "status": "success",
            "specialty": suggested,
            "fallback": triage_result.fallback_used,
        },
    )

    return TriageResponse(
        conversation_id=conversation.id,
        status="success",
        message=msg,
        confidence=triage_result.confidence,
        suggested_specialty=suggested,
        candidates=[],
        slots=slots,
        fallback_used=triage_result.fallback_used,
    )


@app.post("/api/bookings/confirm", response_model=BookingResponse)
def confirm_booking(payload: BookingRequest, db: Session = Depends(get_db)):
    if not reserve_slot(payload.specialty, payload.doctor_name, payload.slot_time):
        raise HTTPException(status_code=409, detail="Slot đã được đặt bởi người khác. Vui lòng chọn slot khác.")

    booking = models.Booking(
        conversation_id=payload.conversation_id,
        patient_name=payload.patient_name,
        patient_phone=payload.patient_phone,
        specialty=payload.specialty,
        doctor_name=payload.doctor_name,
        slot_time=payload.slot_time,
        ai_suggested=payload.ai_suggested,
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    db.add(
        models.Message(
            conversation_id=payload.conversation_id,
            role="assistant",
            content="Đặt lịch thành công. Cảm ơn bạn đã sử dụng Vinmec AI Concierge.",
        )
    )
    db.commit()

    record_metric(db, "booking_confirmed", 1.0, {"specialty": payload.specialty})
    booking_code = f"VM{booking.id:06d}"
    return BookingResponse(booking_id=booking.id, booking_code=booking_code, status="confirmed")


@app.post("/api/feedback/correction")
def feedback_correction(payload: CorrectionRequest, db: Session = Depends(get_db)):
    event = models.CorrectionEvent(
        conversation_id=payload.conversation_id,
        predicted_specialty=payload.predicted_specialty,
        corrected_specialty=payload.corrected_specialty,
        reason=payload.reason,
    )
    db.add(event)
    db.commit()

    record_metric(
        db,
        "specialty_corrected",
        1.0,
        {"from": payload.predicted_specialty, "to": payload.corrected_specialty},
    )
    return {"status": "ok"}


@app.get("/api/metrics/summary", response_model=MetricSummaryResponse)
def metrics_summary(db: Session = Depends(get_db)):
    return MetricSummaryResponse(**get_metric_summary(db))
