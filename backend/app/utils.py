import re


PHONE_REGEX = re.compile(r"(\+?\d[\d\-\.\s]{6,}\d)")
EMAIL_REGEX = re.compile(r"([\w\.\-]+@[\w\-]+\.[\w\.-]+)")


def mask_sensitive_text(text: str) -> str:
    text = PHONE_REGEX.sub("[PHONE_MASKED]", text)
    text = EMAIL_REGEX.sub("[EMAIL_MASKED]", text)
    return text
