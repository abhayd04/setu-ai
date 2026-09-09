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


class PartnerRouteResponse(BaseModel):
    recommended_partner: PartnerRouteResult
    alternatives: List[PartnerRouteResult]
