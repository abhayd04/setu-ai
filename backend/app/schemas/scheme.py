from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class SchemeOut(BaseModel):
    scheme_id: str
    scheme_name: str
    purpose: str
    min_project_cost: float
    max_project_cost: Optional[float]
    max_loan_amount: float
    income_limit: float
    interest_rate: float
    tenure_months: int
    moratorium_months: int
    project_cost_coverage_pct: float
    eligible_categories: List[str]
    eligible_purposes: List[str]
    eligible_gender: str
    required_documents: List[str]
    policy_version: str
    active: bool
    description: Optional[str] = None
    url: Optional[str] = None

    class Config:
        from_attributes = True