from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.analytics_service import get_overview, get_partner_workload

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    return get_overview(db)


@router.get("/partners")
def partners_workload(db: Session = Depends(get_db)):
    return get_partner_workload(db)
