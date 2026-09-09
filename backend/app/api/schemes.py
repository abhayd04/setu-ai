from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models import Scheme
from app.schemas.scheme import SchemeOut
from app.schemas.eligibility import RecommendRequest, SchemeRecommendation
from app.services.recommendation_engine import recommend_schemes

router = APIRouter(prefix="/api/schemes", tags=["schemes"])


@router.get("", response_model=List[SchemeOut])
def list_schemes(db: Session = Depends(get_db)):
    """Returns all active schemes."""
    return db.query(Scheme).filter(Scheme.active == True).all()  # noqa: E712


@router.post("/recommend", response_model=List[SchemeRecommendation])
def recommend(payload: RecommendRequest, db: Session = Depends(get_db)):
    """
    Runs the deterministic policy engine against every active scheme and
    returns a ranked list (eligible schemes first, by match_score).
    Ineligible schemes are still returned with failed_rules so the UI can
    explain "why not this one" — per project principle #5 (explainability).
    """
    profile = payload.model_dump()
    return recommend_schemes(profile, db)
