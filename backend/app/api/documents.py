import os
import uuid
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Document, Application, BeneficiaryProfile
from app.services.document_service import run_ocr, extract_fields, validate_document, get_required_documents
from app.schemas.application import DocumentUploadResponse

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    application_id: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    app_row = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    profile_row = db.query(BeneficiaryProfile).filter(BeneficiaryProfile.profile_id == app_row.profile_id).first()
    profile = {"income": profile_row.income} if profile_row else {}

    suffix = os.path.splitext(file.filename or "")[1] or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        raw_text = run_ocr(tmp_path)
        extracted = extract_fields(raw_text)
        validation = validate_document(doc_type, extracted, profile)
    finally:
        os.unlink(tmp_path)

    doc = Document(
        document_id=str(uuid.uuid4()),
        application_id=application_id,
        doc_type=doc_type,
        file_url=None,  # prototype doesn't persist files to blob storage; add S3 in production
        extracted_fields=extracted,
        validation_status=validation["validation_status"],
    )
    db.add(doc)
    db.commit()

    return {
        "document_id": doc.document_id,
        "doc_type": doc_type,
        "extracted_fields": extracted,
        "validation_status": validation["validation_status"],
        "checks": validation["checks"],
    }


@router.get("/checklist/{application_id}")
def checklist(application_id: str, db: Session = Depends(get_db)):
    from app.models import Scheme

    app_row = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app_row.scheme_id:
        raise HTTPException(status_code=400, detail="Application has no scheme assigned yet")

    scheme = db.query(Scheme).filter(Scheme.scheme_id == app_row.scheme_id).first()
    uploaded = db.query(Document).filter(Document.application_id == application_id).all()
    uploaded_types = [d.doc_type for d in uploaded]

    return get_required_documents(scheme.required_documents or [], uploaded_types)
