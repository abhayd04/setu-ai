from fastapi import APIRouter
from app.services.calculator import calculate_emi
from app.schemas.calculator import EmiRequest, EmiResponse

router = APIRouter(prefix="/api/calculator", tags=["calculator"])


@router.post("/emi", response_model=EmiResponse)
def emi(payload: EmiRequest):
    return calculate_emi(
        principal=payload.principal,
        annual_interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        moratorium_months=payload.moratorium_months,
    )
