from pydantic import BaseModel
from typing import Optional, List


class IntentExtractRequest(BaseModel):
    text: str


class ExtractedProfile(BaseModel):
    purpose: Optional[str] = None
    business_type: Optional[str] = None
    income: Optional[float] = None
    requested_amount: Optional[float] = None
    project_cost: Optional[float] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    education_status: Optional[str] = None
    location: Optional[str] = None
    name: Optional[str] = None
    language: str = "hi"
    raw_input_text: Optional[str] = None


class IntentExtractResponse(BaseModel):
    profile: ExtractedProfile
    missing_fields: List[str]
