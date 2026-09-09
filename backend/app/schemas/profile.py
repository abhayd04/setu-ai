from pydantic import BaseModel
from typing import Optional


class ProfileCreate(BaseModel):
    name: Optional[str] = None
    income: Optional[float] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    purpose: Optional[str] = None            # "business" | "education"
    business_type: Optional[str] = None
    project_cost: Optional[float] = None
    requested_amount: Optional[float] = None
    education_status: Optional[str] = None
    language: str = "hi"
    raw_input_text: Optional[str] = None


class ProfileOut(ProfileCreate):
    profile_id: str

    class Config:
        from_attributes = True
