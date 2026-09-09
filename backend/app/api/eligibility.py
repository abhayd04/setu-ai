from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Scheme
from app.services.policy_engine import check_eligibility
from app.schemas.eligibility import EligibilityCheckRequest, EligibilityResult

router = APIRouter(prefix="/api/eligibility", tags=["eligibility"])


@router.post("/check", response_model=EligibilityResult)
def check(payload: EligibilityCheckRequest, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.scheme_id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Unknown scheme_id: {payload.scheme_id}")
    profile = payload.model_dump(exclude={"scheme_id"})
    return check_eligibility(profile, scheme)
