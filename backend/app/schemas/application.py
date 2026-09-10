from pydantic import BaseModel
from typing import Optional, List, Any


class DocumentUploadResponse(BaseModel):
    document_id: str
    doc_type: str
    extracted_fields: dict
    validation_status: str
    checks: List[dict]


class ApplicationCreateRequest(BaseModel):
    profile_id: str
    scheme_id: Optional[str] = None


class ApplicationOut(BaseModel):
    application_id: str
    profile_id: str
    scheme_id: Optional[str]
    partner_id: Optional[str]
    status: str

    class Config:
        from_attributes = True


class PartnerRouteRequest(BaseModel):
    scheme_id: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    application_id: Optional[str] = None  # if provided, routing decision is attached to the application


class PartnerRouteResult(BaseModel):
    partner_id: str
    partner_name: str
    partner_type: str
    score: float
    distance_km: Optional[float]
    lat: float
    lng: float
    reasons: List[str]
    is_simulated_data: bool
    npa_rate: Optional[float] = None
    fund_utilization_pct: Optional[float] = None
    has_overdues: Optional[bool] = False
    is_eligible: Optional[bool] = True
    disqualification_reason: Optional[str] = None


class PartnerRouteResponse(BaseModel):
    recommended_partner: PartnerRouteResult
    closest_partner: Optional[PartnerRouteResult] = None
    alternatives: List[PartnerRouteResult]