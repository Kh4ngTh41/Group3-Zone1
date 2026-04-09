import json

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models


def record_metric(db: Session, metric_name: str, metric_value: float = 1.0, tags: dict | None = None):
    event = models.MetricEvent(
        metric_name=metric_name,
        metric_value=metric_value,
        tags=json.dumps(tags or {}, ensure_ascii=False),
    )
    db.add(event)
    db.commit()


def get_metric_summary(db: Session) -> dict:
    total_conversations = db.query(func.count(models.Conversation.id)).scalar() or 0
    total_bookings = db.query(func.count(models.Booking.id)).scalar() or 0
    escalations = (
        db.query(func.count(models.MetricEvent.id))
        .filter(models.MetricEvent.metric_name == "human_escalation")
        .scalar()
        or 0
    )

    conversion_rate = (total_bookings / total_conversations) if total_conversations else 0.0
    escalation_rate = (escalations / total_conversations) if total_conversations else 0.0

    return {
        "total_conversations": int(total_conversations),
        "total_bookings": int(total_bookings),
        "conversion_rate": round(conversion_rate, 4),
        "escalation_rate": round(escalation_rate, 4),
    }
