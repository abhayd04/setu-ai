from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.application import ApplicationCreateRequest, ApplicationOut
from app.services.application_service import create_application, get_timeline

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", response_model=ApplicationOut)
def create(payload: ApplicationCreateRequest, db: Session = Depends(get_db)):
    app_row = create_application(db, payload.profile_id, payload.scheme_id)
    return ApplicationOut(
        application_id=app_row.application_id,
        profile_id=app_row.profile_id,
        scheme_id=app_row.scheme_id,
        partner_id=app_row.partner_id,
        status=app_row.status.value,
    )


@router.get("/{application_id}")
def get_application(application_id: str, db: Session = Depends(get_db)):
    from app.models import Application

    app_row = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    timeline = get_timeline(db, application_id)
    return {
        "application_id": app_row.application_id,
        "profile_id": app_row.profile_id,
        "scheme_id": app_row.scheme_id,
        "partner_id": app_row.partner_id,
        "status": app_row.status.value,
        "timeline": timeline,
    }
