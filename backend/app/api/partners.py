import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.models import Partner, Application, BeneficiaryProfile, Scheme, Document
from app.schemas.application import PartnerRouteRequest, PartnerRouteResponse
from app.services.routing_engine import route_partners
from app.services.application_service import attach_partner_routing
from app.core.config import settings

router = APIRouter(prefix="/api/partners", tags=["partners"])


class PartnerActionRequest(BaseModel):
    application_id: str
    partner_id: str
    rejection_reason: Optional[str] = None


@router.get("")
def list_partners(db: Session = Depends(get_db)):
    partners = db.query(Partner).all()
    return [
        {
            "partner_id": p.partner_id,
            "name": p.name,
            "partner_type": p.partner_type,
            "lat": p.lat,
            "lng": p.lng,
            "district": p.district,
            "is_simulated_data": p.is_simulated_data,
        }
        for p in partners
    ]


@router.get("/{partner_id}/applications")
def partner_applications(partner_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(Application, BeneficiaryProfile, Scheme)
        .join(BeneficiaryProfile, Application.profile_id == BeneficiaryProfile.profile_id)
        .outerjoin(Scheme, Application.scheme_id == Scheme.scheme_id)
        .filter(Application.partner_id == partner_id)
        .all()
    )
    return [
        {
            "application_id": app.application_id,
            "status": app.status.value,
            "applicant_name": profile.name,
            "requested_amount": profile.requested_amount,
            "scheme_name": scheme.scheme_name if scheme else None,
            "required_documents": scheme.required_documents if scheme else [],
        }
        for app, profile, scheme in rows
    ]


@router.post("/route", response_model=PartnerRouteResponse)
def route(payload: PartnerRouteRequest, db: Session = Depends(get_db)):
    try:
        result = route_partners(payload.scheme_id, db, payload.user_lat, payload.user_lng)
    except ValueError as e:
        # No eligible partner = a real "credit access gap" state, not a 500 error
        raise HTTPException(status_code=404, detail=str(e))

    if payload.application_id:
        attach_partner_routing(
            db,
            payload.application_id,
            result["recommended_partner"]["partner_id"],
            result["recommended_partner"]["score"],
            result["recommended_partner"]["reasons"],
        )

    return result


@router.post("/approve")
def approve_application(payload: PartnerActionRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.application_id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.status = "APPROVED"
    db.commit()
    return {"status": "APPROVED", "message": "Application approved successfully."}


@router.post("/reject")
def reject_application(payload: PartnerActionRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.application_id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.status = "REJECTED"
    db.commit()
    return {"status": "REJECTED", "reason": payload.rejection_reason}


@router.post("/disburse")
def disburse_loan(payload: PartnerActionRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.application_id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.status = "DISBURSED"
    db.commit()
    return {"status": "DISBURSED", "message": "Funds disbursed successfully."}


@router.post("/draft-email")
def draft_partner_outreach(payload: PartnerActionRequest, db: Session = Depends(get_db)):
    """
    Generates a professional outreach email to a partner branch using Gemini.
    Aggregates the user's profile, scheme requirements, and uploaded documents 
    to draft a highly contextual funding proposal.
    """
    # 1. Fetch Application, Profile, Scheme, and Partner
    app = db.query(Application).filter(Application.application_id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    partner = db.query(Partner).filter(Partner.partner_id == payload.partner_id).first()
    profile = db.query(BeneficiaryProfile).filter(BeneficiaryProfile.profile_id == app.profile_id).first()
    scheme = db.query(Scheme).filter(Scheme.scheme_id == app.scheme_id).first()
    
    if not all([partner, profile, scheme]):
        raise HTTPException(status_code=404, detail="Missing linked application records")

    # 2. Fetch all valid uploaded documents for attachment referencing
    valid_docs = db.query(Document).filter(
        Document.application_id == payload.application_id,
        Document.validation_status.in_(["valid", "needs_review"])
    ).all()
    attached_doc_list = [d.doc_type.replace('_', ' ').title() for d in valid_docs]
    doc_string = ", ".join(attached_doc_list) if attached_doc_list else "None uploaded yet"

    # 3. Securely Prompt Gemini
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-3.6-flash")
    
    prompt = f"""
    Write a formal, concise partner outreach email from an applicant seeking scheme assistance. 
    The email is addressed to {partner.name} (Partner Type: {partner.partner_type}).
    
    Applicant Details:
    - Name: {profile.name or "Citizen"}
    - Applying for Scheme: {scheme.scheme_name}
    - Requested Amount: ₹{profile.requested_amount:,.0f}
    - Purpose: {profile.purpose}
    - Attached Verified Documents: {doc_string}
    
    Instructions:
    - Keep it professional, respectful, and punchy.
    - Highlight that all required compliance documents have been verified via the SETU-AI portal.
    - Request a review meeting or the next steps for disbursement/approval.
    - Do not hallucinate URLs; rely strictly on the provided data.
    """
    
    try:
        response = model.generate_content(prompt)
        email_body = response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate email content: {str(e)}")

    # Partner email fallback since it's not strictly mapped in the DB yet
    partner_email = partner.email or "contact@partnerbranch.in"

    return {
        "status": "success",
        "partner_name": partner.name,
        "partner_email": partner_email,
        "subject": f"Application for {scheme.scheme_name} - {profile.name or 'Applicant'}",
        "body": email_body,
        "attached_documents": attached_doc_list
    }