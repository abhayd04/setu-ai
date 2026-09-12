from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

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
from app.models import Scheme, Document, Application
from app.services.document_service import get_required_documents

class SubmitApplicationRequest(BaseModel):
    partner_id: Optional[str] = None

@router.post("/{application_id}/submit")
def submit_application(application_id: str, payload: Optional[SubmitApplicationRequest] = None, db: Session = Depends(get_db)):
    app_row = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if not app_row.scheme_id:
        raise HTTPException(status_code=400, detail="Cannot submit without a selected scheme.")

    # 1. Fetch scheme requirements and uploaded documents
    scheme = db.query(Scheme).filter(Scheme.scheme_id == app_row.scheme_id).first()
    uploaded_docs = db.query(Document).filter(Document.application_id == application_id).all()

    # 2. Block submission if any uploaded document is invalid
    for doc in uploaded_docs:
        if doc.validation_status == "invalid":
            raise HTTPException(
                status_code=400, 
                detail=f"Document '{doc.doc_type}' is invalid. Please replace it before submitting."
            )

    # 3. Check if all required documents are actually present
    valid_types = [d.doc_type for d in uploaded_docs if d.validation_status in ["valid", "needs_review"]]
    doc_check = get_required_documents(scheme.required_documents or [], valid_types)

    if not doc_check["all_present"]:
        missing = ", ".join(doc_check["missing_documents"])
        raise HTTPException(status_code=400, detail=f"Missing required documents: {missing}")

    # 4. Mutate State and Route to Partner
    if payload and payload.partner_id:
        app_row.partner_id = payload.partner_id

    app_row.status = "SUBMITTED"  # Ensure this matches your Enum definition (e.g., ApplicationStatus.SUBMITTED if using Enums)
    db.commit()

    return {
        "message": "Application submitted successfully",
        "application_id": app_row.application_id,
        "status": app_row.status.value if hasattr(app_row.status, 'value') else app_row.status,
        "partner_id": app_row.partner_id
    }