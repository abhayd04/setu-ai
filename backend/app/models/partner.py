from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class Partner(Base):
    __tablename__ = "partners"

    partner_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    partner_type = Column(String, nullable=False)   # "SCA" | "PSB" | "RRB" | "NBFC-MFI"
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    district = Column(String, nullable=True)
    authorized_schemes = Column(JSON, default=list)  # list of scheme_id
    is_operationally_active = Column(Boolean, default=True)
    is_simulated_data = Column(Boolean, default=True)  # per project principle #6


class PartnerOperationalMetrics(Base):
    """
    Operational data including NPA rates, fund utilization, and overdue status
    governing institutional partner eligibility.
    """
    __tablename__ = "partner_operational_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    partner_id = Column(String, ForeignKey("partners.partner_id"), nullable=False)
    capacity_pct = Column(Float, default=50.0)             # 0-100, remaining capacity
    current_workload = Column(Integer, default=0)
    avg_processing_days = Column(Float, default=7.0)
    doc_rejection_rate = Column(Float, default=0.1)         # 0-1
    npa_rate = Column(Float, default=0.05)                 # 0-1, Non-Performing Asset ratio
    fund_utilization_pct = Column(Float, default=65.0)     # 0-100, scheme quota utilization
    has_overdues = Column(Boolean, default=False)          # High overdue lockout flag
    is_simulated_data = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RoutingDecision(Base):
    __tablename__ = "routing_decisions"

    decision_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"), nullable=False)
    partner_id = Column(String, ForeignKey("partners.partner_id"), nullable=False)
    score = Column(Float, nullable=False)
    reasons = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())