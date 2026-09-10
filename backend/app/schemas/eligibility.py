from pydantic import BaseModel
from typing import Optional, List


class EligibilityCheckRequest(BaseModel):
    income: Optional[float] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    purpose: Optional[str] = None
    project_cost: Optional[float] = None
    requested_amount: Optional[float] = None
    scheme_id: str


class EligibilityResult(BaseModel):
    eligible: bool
    reasons: List[str]
    failed_rules: List[str]
    policy_version: str


class RecommendRequest(BaseModel):
    income: Optional[float] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    purpose: Optional[str] = None
    project_cost: Optional[float] = None
    requested_amount: Optional[float] = None


class SchemeRecommendation(BaseModel):
    scheme_id: str
    scheme_name: str
    eligible: bool
    reasons: List[str]
    failed_rules: List[str]
    policy_version: str
    max_loan_amount: float
    interest_rate: float
    tenure_months: int
    moratorium_months: int
    project_cost_coverage_pct: float
    match_score: float
    description: Optional[str] = None
    url: Optional[str] = None