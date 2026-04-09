from typing import List, Optional

from pydantic import BaseModel, Field


class TriageRequest(BaseModel):
    symptom_text: str = Field(min_length=3)
    patient_name: str = ""
    patient_phone: str = ""
    force_specialty: Optional[str] = None


class SlotItem(BaseModel):
    specialty: str
    doctor_name: str
    doctor_profile_endpoint: str = ""
    slot_time: str


class TriageResponse(BaseModel):
    conversation_id: int
    status: str
    message: str
    confidence: float = 0.0
    suggested_specialty: Optional[str] = None
    candidates: List[str] = Field(default_factory=list)
    slots: List[SlotItem] = Field(default_factory=list)
    fallback_used: bool = False


class BookingRequest(BaseModel):
    conversation_id: int
    patient_name: str
    patient_phone: str
    specialty: str
    doctor_name: str
    slot_time: str
    ai_suggested: bool = True


class BookingResponse(BaseModel):
    booking_id: int
    booking_code: str
    status: str


class CorrectionRequest(BaseModel):
    conversation_id: int
    predicted_specialty: str
    corrected_specialty: str
    reason: str = ""


class MetricSummaryResponse(BaseModel):
    total_conversations: int
    total_bookings: int
    conversion_rate: float
    escalation_rate: float


class SpecialtyListResponse(BaseModel):
    specialties: List[str]


class HomepageSpecialtyItem(BaseModel):
    id: str
    name: str
    emoji: str
    doctors: int


class HomepageDoctorItem(BaseModel):
    id: str
    name: str
    title: str
    specialty: str
    specialty_id: str
    specialties: List[str] = Field(default_factory=list)
    doctor_profile_endpoint: str = ""


class HomepageHighlightsResponse(BaseModel):
    specialties: List[HomepageSpecialtyItem] = Field(default_factory=list)
    featured_doctors: List[HomepageDoctorItem] = Field(default_factory=list)
