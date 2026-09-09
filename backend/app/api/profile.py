import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import BeneficiaryProfile
from app.schemas.profile import ProfileCreate, ProfileOut

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("", response_model=ProfileOut)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    """
    Stores a beneficiary profile as-is (already-structured JSON).
    Milestone 2 will add POST /api/intent/extract, which takes raw
    voice/text input and calls the LLM to produce this same structure
    before it ever reaches this endpoint.
    """
    profile = BeneficiaryProfile(profile_id=str(uuid.uuid4()), **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
