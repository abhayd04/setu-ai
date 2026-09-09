"""
Owns the application state machine. Every transition writes an
ApplicationEvent row so the timeline (spec's "application lifecycle") is
reconstructable, and so routing_decisions/analytics can be audited later.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import Application, ApplicationEvent, ApplicationStatus, RoutingDecision


def _log_event(db: Session, application_id: str, event_type: str, payload: dict = None):
    event = ApplicationEvent(
        event_id=str(uuid.uuid4()),
        application_id=application_id,
        event_type=event_type,
        payload=payload or {},
    )
    db.add(event)


def create_application(db: Session, profile_id: str, scheme_id: str = None) -> Application:
    app = Application(
        application_id=str(uuid.uuid4()),
        profile_id=profile_id,
        scheme_id=scheme_id,
        status=ApplicationStatus.PROFILE_CREATED,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    _log_event(db, app.application_id, "PROFILE_CREATED", {"profile_id": profile_id})
    db.commit()
    return app


def advance_status(db: Session, application_id: str, new_status: ApplicationStatus, payload: dict = None) -> Application:
    app = db.query(Application).filter(Application.application_id == application_id).first()
    if not app:
        raise ValueError(f"Unknown application_id: {application_id}")
    old_status = app.status
    app.status = new_status
    db.commit()
    db.refresh(app)
    _log_event(
        db,
        application_id,
        "STATUS_CHANGE",
        {"from": old_status.value if old_status else None, "to": new_status.value, **(payload or {})},
    )
    db.commit()
    return app


def attach_partner_routing(db: Session, application_id: str, partner_id: str, score: float, reasons: list) -> Application:
    app = db.query(Application).filter(Application.application_id == application_id).first()
    if not app:
        raise ValueError(f"Unknown application_id: {application_id}")
    app.partner_id = partner_id
    db.add(
        RoutingDecision(
            decision_id=str(uuid.uuid4()),
            application_id=application_id,
            partner_id=partner_id,
            score=score,
            reasons=reasons,
        )
    )
    db.commit()
    return advance_status(db, application_id, ApplicationStatus.PARTNER_RECOMMENDED, {"partner_id": partner_id, "score": score})


def get_timeline(db: Session, application_id: str) -> list[dict]:
    events = (
        db.query(ApplicationEvent)
        .filter(ApplicationEvent.application_id == application_id)
        .order_by(ApplicationEvent.created_at.asc())
        .all()
    )
    return [
        {"event_type": e.event_type, "payload": e.payload, "created_at": e.created_at.isoformat()}
        for e in events
    ]
