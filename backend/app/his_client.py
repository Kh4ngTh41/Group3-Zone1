import csv
from datetime import date, timedelta
from pathlib import Path
import re
from typing import Dict, List
import unicodedata


CSV_FILE_PATH = Path(__file__).resolve().parents[2] / "Data" / "vinmec_doctors_full.csv"
TIME_WINDOWS = ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30", "18:00"]
MAX_SLOTS_PER_SPECIALTY = 30
MAX_HOMEPAGE_SPECIALTIES = 12
MAX_HOMEPAGE_DOCTORS = 4

SPECIALTY_EMOJI_RULES = [
    ("tim", "❤️"),
    ("thần kinh", "🧠"),
    ("hô hấp", "🫁"),
    ("tiêu hóa", "🫃"),
    ("chấn thương", "🦴"),
    ("cơ xương", "🦴"),
    ("da liễu", "💊"),
    ("tai", "👂"),
    ("mũi", "👂"),
    ("họng", "👂"),
    ("mắt", "👁️"),
    ("nhi", "👶"),
    ("ung bướu", "🎗️"),
    ("tiết niệu", "🫘"),
    ("sản", "🤰"),
]

TITLE_RANK_RULES = [
    ("giáo sư", 5),
    ("phó giáo sư", 4),
    ("tiến sĩ", 3),
    ("bác sĩ chuyên khoa ii", 2),
    ("thạc sĩ", 1),
]


def _clean_specialty(value: str) -> str:
    return (value or "").strip()


def _build_slot_time(index: int, offset_days: int) -> str:
    slot_date = date.today() + timedelta(days=offset_days)
    time_text = TIME_WINDOWS[index % len(TIME_WINDOWS)]
    return f"{slot_date.isoformat()} {time_text}"


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "specialty"


def _pick_specialty_emoji(specialty: str) -> str:
    lowered = (specialty or "").lower()
    for keyword, emoji in SPECIALTY_EMOJI_RULES:
        if keyword in lowered:
            return emoji
    return "🏥"


def _title_rank(title: str) -> int:
    lowered = (title or "").lower()
    for keyword, rank in TITLE_RANK_RULES:
        if keyword in lowered:
            return rank
    return 0


def _load_csv_slots() -> Dict[str, List[dict]]:
    if not CSV_FILE_PATH.exists():
        return {}

    specialty_slots: Dict[str, List[dict]] = {}
    seen_doctors: set[tuple[str, str, str]] = set()

    with CSV_FILE_PATH.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row_index, row in enumerate(reader):
            specialty = _clean_specialty(row.get("Chuyên khoa", ""))
            doctor_name = (row.get("Họ tên") or "").strip()
            profile_link = (row.get("Link Profile") or "").strip()

            if not specialty or specialty.upper() == "N/A" or not doctor_name:
                continue

            unique_key = (specialty, doctor_name, profile_link)
            if unique_key in seen_doctors:
                continue
            seen_doctors.add(unique_key)

            slots = specialty_slots.setdefault(specialty, [])
            if len(slots) >= MAX_SLOTS_PER_SPECIALTY:
                continue

            # Two synthetic slots per doctor to emulate bookable HIS availability.
            slots.append(
                {
                    "specialty": specialty,
                    "doctor_name": doctor_name,
                    "doctor_profile_endpoint": profile_link,
                    "slot_time": _build_slot_time(row_index, (row_index % 5) + 1),
                }
            )
            if len(slots) < MAX_SLOTS_PER_SPECIALTY:
                slots.append(
                    {
                        "specialty": specialty,
                        "doctor_name": doctor_name,
                        "doctor_profile_endpoint": profile_link,
                        "slot_time": _build_slot_time(row_index + 2, (row_index % 7) + 2),
                    }
                )

    return specialty_slots


def _build_home_highlights() -> dict:
    if not CSV_FILE_PATH.exists():
        return {"specialties": [], "featured_doctors": []}

    specialty_counts: Dict[str, set] = {}
    specialty_ids: Dict[str, str] = {}
    doctor_profiles: Dict[str, dict] = {}

    with CSV_FILE_PATH.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row_index, row in enumerate(reader):
            specialty = _clean_specialty(row.get("Chuyên khoa", ""))
            doctor_name = (row.get("Họ tên") or "").strip()
            profile_link = (row.get("Link Profile") or "").strip()
            title = (row.get("Chức vị") or "").strip()

            if not specialty or specialty.upper() == "N/A" or not doctor_name:
                continue

            specialty_ids.setdefault(specialty, _slugify(specialty))
            specialty_counts.setdefault(specialty, set()).add(doctor_name)

            doctor_key = doctor_name.strip().lower()
            profile = doctor_profiles.get(doctor_key)
            rank = _title_rank(title)
            if not profile:
                profile = {
                    "id": f"doc-{row_index + 1}",
                    "name": doctor_name,
                    "title": title,
                    "specialty": specialty,
                    "specialty_id": specialty_ids[specialty],
                    "doctor_profile_endpoint": profile_link,
                    "priority": rank,
                    "specialties": set([specialty]),
                    "specialty_ids": set([specialty_ids[specialty]]),
                }
                doctor_profiles[doctor_key] = profile
            else:
                profile["specialties"].add(specialty)
                profile["specialty_ids"].add(specialty_ids[specialty])
                if rank > profile["priority"]:
                    profile["priority"] = rank
                    profile["title"] = title
                    profile["specialty"] = specialty
                    profile["specialty_id"] = specialty_ids[specialty]
                if not profile["doctor_profile_endpoint"] and profile_link:
                    profile["doctor_profile_endpoint"] = profile_link

    specialties = sorted(
        [
            {
                "id": specialty_ids[name],
                "name": name,
                "emoji": _pick_specialty_emoji(name),
                "doctors": len(doctor_names),
            }
            for name, doctor_names in specialty_counts.items()
        ],
        key=lambda item: (-item["doctors"], item["name"]),
    )[:MAX_HOMEPAGE_SPECIALTIES]

    top_specialty_ids = {item["id"] for item in specialties}
    candidate_doctors = [
        doctor for doctor in doctor_profiles.values()
        if doctor["specialty_ids"].intersection(top_specialty_ids)
    ]
    featured_doctors = sorted(
        candidate_doctors,
        key=lambda item: (-item["priority"], item["name"]),
    )[:MAX_HOMEPAGE_DOCTORS]

    for doctor in featured_doctors:
        doctor["specialties"] = sorted(list(doctor["specialties"]))
        doctor.pop("specialty_ids", None)
        doctor.pop("priority", None)

    return {
        "specialties": specialties,
        "featured_doctors": featured_doctors,
    }


HIS_SLOTS: Dict[str, List[dict]] = _load_csv_slots()
HOMEPAGE_HIGHLIGHTS = _build_home_highlights()


def list_specialties() -> List[str]:
    return sorted(HIS_SLOTS.keys())


def get_slots_by_specialty(specialty: str) -> List[dict]:
    return HIS_SLOTS.get(specialty, [])


def get_homepage_highlights() -> dict:
    return HOMEPAGE_HIGHLIGHTS


def reserve_slot(specialty: str, doctor_name: str, slot_time: str) -> bool:
    slots = HIS_SLOTS.get(specialty, [])
    for i, slot in enumerate(slots):
        if slot["doctor_name"] == doctor_name and slot["slot_time"] == slot_time:
            slots.pop(i)
            return True
    return False
