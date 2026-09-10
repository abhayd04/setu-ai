"""
Scheme registry — this is the deterministic policy-as-code table.
The recommendation/eligibility engine reads from here; it never
hardcodes scheme numbers in application logic (per project principle #4/#7).
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, Date, JSON
from app.db.session import Base


class Scheme(Base):
    __tablename__ = "schemes"

    scheme_id = Column(String, primary_key=True)          # e.g. "micro_finance_general"
    scheme_name = Column(String, nullable=False)
    purpose = Column(String, nullable=False)               # "business" | "education"
    min_project_cost = Column(Float, default=0)
    max_project_cost = Column(Float, nullable=True)
    max_loan_amount = Column(Float, nullable=False)
    income_limit = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)           # % p.a.
    tenure_months = Column(Integer, nullable=False)
    moratorium_months = Column(Integer, default=0)
    project_cost_coverage_pct = Column(Float, default=90)   # NBCFDC funds this % of project cost
    eligible_categories = Column(JSON, default=list)        # e.g. ["SC"]
    eligible_purposes = Column(JSON, default=list)          # e.g. ["business"]
    eligible_gender = Column(String, default="any")         # "any" | "female"
    required_documents = Column(JSON, default=list)
    policy_version = Column(String, default="v1")
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    active = Column(Boolean, default=True)
    source_note = Column(String, nullable=True)              # citation / where the figures came from
    description = Column(String, nullable=True)              # Detailed scheme overview for users
    url = Column(String, nullable=True)                      # Direct external link to official scheme details/portal