import json
import os
import unicodedata
from dataclasses import dataclass

from openai import OpenAI

from .config import settings
from .his_client import list_specialties


KEYWORD_MAP = {
    "đau ngực": "Tim mạch",
    "tim đập": "Tim mạch",
    "hồi hộp": "Tim mạch",
    "đau bụng": "Tiêu hóa",
    "tiêu chảy": "Tiêu hóa",
    "ợ chua": "Tiêu hóa",
    "đường huyết": "Nội tiết",
    "tiểu đường": "Nội tiết",
    "mụn": "Da liễu",
    "dị ứng da": "Da liễu",
    "đau đầu": "Thần kinh",
    "chóng mặt": "Thần kinh",
}


MEDICAL_INTENT_KEYWORDS = (
    "trieu chung",
    "dau",
    "sot",
    "ho",
    "kho tho",
    "buon non",
    "non",
    "tieu chay",
    "tao bon",
    "chay mau",
    "met moi",
    "chong mat",
    "dau dau",
    "ngua",
    "phat ban",
    "dau bung",
    "tim dap",
    "huyet ap",
    "duong huyet",
    "viem",
    "kham",
    "bac si",
    "benh",
)


def _normalize_text(value: str) -> str:
    text = (value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text


def _build_candidates(all_specialties: list[str], suggested: str, limit: int = 10) -> list[str]:
    if not all_specialties:
        return [suggested] if suggested else []

    rest = [s for s in all_specialties if s != suggested]
    return [suggested] + rest[: max(0, limit - 1)]


def _has_medical_intent(symptom_text: str, specialties: list[str]) -> bool:
    text = _normalize_text(symptom_text)
    if not text:
        return False

    if any(_normalize_text(specialty) in text for specialty in specialties):
        return True

    if any(keyword in text for keyword in MEDICAL_INTENT_KEYWORDS):
        return True

    return any(_normalize_text(keyword) in text for keyword in KEYWORD_MAP)


@dataclass
class TriageResult:
    suggested_specialty: str
    candidates: list[str]
    confidence: float
    source: str
    fallback_used: bool


class AIService:
    def __init__(self):
        self.client = None
        self._current_key = ""

    def _resolve_api_key(self) -> str:
        return (settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")).strip()

    def _get_client(self):
        api_key = self._resolve_api_key()
        if not api_key:
            self.client = None
            self._current_key = ""
            return None

        if self.client is None or api_key != self._current_key:
            self.client = OpenAI(api_key=api_key)
            self._current_key = api_key
        return self.client

    def _extract_json_payload(self, content: str) -> dict:
        text = (content or "").strip()
        if not text:
            return {}

        # Handle occasional markdown-wrapped JSON responses.
        if text.startswith("```"):
            lines = text.splitlines()
            if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
                text = "\n".join(lines[1:-1]).strip()
                if text.lower().startswith("json"):
                    text = text[4:].strip()

        return json.loads(text)

    def triage(self, symptom_text: str) -> TriageResult:
        client = self._get_client()
        if not client:
            return self._rule_based(symptom_text, fallback_used=True)
        specialties = list_specialties()
        prompt = f"""
            <system_prompt>
                <identity>
                    <role>Trợ lý ảo phân luồng y tế cao cấp - Bệnh viện Vinmec</role>
                    <goal>Dựa trên triệu chứng để gợi ý Chuyên khoa và Bác sĩ phù hợp nhất.</goal>
                </identity>

                <rules>
                    <triage_logic>
                        - Nếu người dùng cung cấp từ 2 triệu chứng cụ thể trở lên (ví dụ: đau bụng + xuất huyết) HOẶC 1 triệu chứng kèm vị trí rõ ràng: BẮT BUỘC phải đưa ra gợi ý chuyên khoa ngay lập tức.
                        - KHÔNG ĐƯỢC hỏi lại nếu thông tin đã đủ để khoanh vùng 1-2 chuyên khoa tiềm năng.
                        - Chỉ được đặt câu hỏi làm rõ (clarifying_question) khi thông tin hoàn toàn mơ hồ (ví dụ: "tôi thấy mệt", "tôi khó chịu").
                    </triage_logic>

                    <safety_guardrails>
                        - Tuyệt đối không chẩn đoán tên bệnh (ví dụ: không nói "bạn bị sốt xuất huyết").
                        - Tuyệt đối không kê đơn thuốc.
                        - Nếu có dấu hiệu cấp cứu (xuất huyết nặng, khó thở, đau ngực dữ dội), phải gợi ý chuyên khoa "Cấp cứu" với confidence cao.
                    </safety_guardrails>
                </rules>

                <data_context>
                    <valid_specialties>
                        {specialties}
                    </valid_specialties>
                    <doctors_list>
                        </doctors_list>
                </data_context>

                <output_format>
                    <instruction>Chỉ trả JSON. Không giải thích thừa.</instruction>
                    <schema>
                        {{
                            "suggested_specialty": "Tên chuyên khoa chính",
                            "candidates": ["Các chuyên khoa liên quan khác"],
                            "suggested_doctors": ["Tên 1-2 bác sĩ tiêu biểu của chuyên khoa đó"],
                            "confidence": 0.0,
                            "clarifying_question": null,
                            "reasoning_short": "Lý do ngắn gọn gợi ý chuyên khoa này (ví dụ: Triệu chứng đau bụng kèm xuất huyết cần kiểm tra Nội tổng quát hoặc Huyết học)"
                        }}
                    </schema>
                </output_format>
            </system_prompt>
            """

        try:
            response = client.chat.completions.create(
                model=settings.openai_model,
                temperature=0,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": symptom_text},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            payload = self._extract_json_payload(content)
            return self._normalize(payload)
        except Exception:
            return self._rule_based(symptom_text, fallback_used=True)

    def is_medical_triage_query(self, symptom_text: str) -> bool:
        return _has_medical_intent(symptom_text, list_specialties())

    def _normalize(self, payload: dict) -> TriageResult:
        specialties = set(list_specialties())
        suggested = payload.get("suggested_specialty", "")
        candidates = payload.get("candidates", []) or []
        confidence = float(payload.get("confidence", 0.5))

        valid_candidates = [c for c in candidates if c in specialties]
        if suggested not in specialties:
            if valid_candidates:
                suggested = valid_candidates[0]
            else:
                return self._rule_based("", fallback_used=True)

        if suggested not in valid_candidates:
            valid_candidates = [suggested] + valid_candidates

        return TriageResult(
            suggested_specialty=suggested,
            candidates=valid_candidates[:3],
            confidence=max(0.0, min(1.0, confidence)),
            source="llm",
            fallback_used=False,
        )

    def _rule_based(self, symptom_text: str, fallback_used: bool) -> TriageResult:
        all_specialties = list_specialties()
        if not all_specialties:
            return TriageResult(
                suggested_specialty="Tim mạch",
                candidates=["Tim mạch"],
                confidence=0.4,
                source="rule_based",
                fallback_used=True,
            )

        text = _normalize_text(symptom_text)

        # If user text directly mentions a specialty name, prioritize that specialty.
        for specialty in all_specialties:
            if _normalize_text(specialty) in text:
                return TriageResult(
                    suggested_specialty=specialty,
                    candidates=_build_candidates(all_specialties, specialty),
                    confidence=0.78,
                    source="rule_based",
                    fallback_used=fallback_used,
                )

        for keyword, specialty in KEYWORD_MAP.items():
            if _normalize_text(keyword) in text and specialty in all_specialties:
                return TriageResult(
                    suggested_specialty=specialty,
                    candidates=_build_candidates(all_specialties, specialty),
                    confidence=0.72,
                    source="rule_based",
                    fallback_used=fallback_used,
                )

        preferred_defaults = [
            "Khám sức khỏe tổng quát",
            "Nội tổng quát",
            "Nội tiết",
            "Tim mạch",
            "Tiêu hóa",
        ]
        defaults = [s for s in preferred_defaults if s in all_specialties]
        suggested = defaults[0] if defaults else all_specialties[0]
        return TriageResult(
            suggested_specialty=suggested,
            candidates=_build_candidates(all_specialties, suggested),
            confidence=0.45,
            source="rule_based",
            fallback_used=True,
        )


ai_service = AIService()
