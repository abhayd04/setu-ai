from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.models import Partner, Application
from app.schemas.application import PartnerRouteRequest, PartnerRouteResponse
from app.services.routing_engine import route_partners
from app.services.application_service import attach_partner_routing

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
    from app.models import Application, BeneficiaryProfile, Scheme

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