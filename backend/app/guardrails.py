from dataclasses import dataclass


EMERGENCY_KEYWORDS = [
    "đau ngực",
    "khó thở",
    "đột quỵ",
    "bất tỉnh",
    "co giật",
    "chảy máu nhiều",
]


@dataclass
class GuardrailResult:
    is_emergency: bool
    reason: str = ""


def detect_emergency(text: str) -> GuardrailResult:
    lowered = text.lower()
    for keyword in EMERGENCY_KEYWORDS:
        if keyword in lowered:
            return GuardrailResult(is_emergency=True, reason=f"matched:{keyword}")
    return GuardrailResult(is_emergency=False)


def safe_bot_message(message: str) -> str:
    blocked_words = ["chẩn đoán", "toa thuốc", "liều dùng"]
    lowered = message.lower()
    if any(word in lowered for word in blocked_words):
        return "Mình chỉ hỗ trợ gợi ý chuyên khoa và đặt lịch khám, không thay thế chẩn đoán y khoa."
    return message
