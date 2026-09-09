from pydantic import BaseModel
from typing import Optional


class EmiRequest(BaseModel):
    principal: float
    interest_rate: float
    tenure_months: int
    moratorium_months: int = 0


class EmiResponse(BaseModel):
    monthly_emi: float
    total_interest: float
    total_repayment: float
    moratorium_months: int
    repayment_start_month: int
    repayment_months: int
    effective_principal_after_moratorium: float
    assumption_note: Optional[str] = None
