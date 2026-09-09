from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class BeneficiaryProfile(Base):
    __tablename__ = "beneficiary_profiles"

    profile_id = Column(String, primary_key=True)  # uuid, generated in service layer
    name = Column(String, nullable=True)
    income = Column(Float, nullable=True)
    category = Column(String, nullable=True)          # "SC" etc.
    gender = Column(String, nullable=True)             # "male" | "female" | "other"
    location = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    purpose = Column(String, nullable=True)            # "business" | "education"
    business_type = Column(String, nullable=True)
    project_cost = Column(Float, nullable=True)
    requested_amount = Column(Float, nullable=True)
    education_status = Column(String, nullable=True)
    language = Column(String, default="hi")
    raw_input_text = Column(String, nullable=True)      # original user utterance, for traceability
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ApplicationStatus(str, enum.Enum):
    PROFILE_CREATED = "PROFILE_CREATED"
    ELIGIBILITY_CHECKED = "ELIGIBILITY_CHECKED"
    SCHEME_RECOMMENDED = "SCHEME_RECOMMENDED"
    PARTNER_RECOMMENDED = "PARTNER_RECOMMENDED"
    DOCUMENTS_PENDING = "DOCUMENTS_PENDING"
    READY_FOR_SUBMISSION = "READY_FOR_SUBMISSION"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISBURSED = "DISBURSED"


class Application(Base):
    __tablename__ = "applications"

    application_id = Column(String, primary_key=True)
    profile_id = Column(String, ForeignKey("beneficiary_profiles.profile_id"), nullable=False)
    scheme_id = Column(String, ForeignKey("schemes.scheme_id"), nullable=True)
    partner_id = Column(String, ForeignKey("partners.partner_id"), nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PROFILE_CREATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    event_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"), nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
