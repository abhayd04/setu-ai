from sqlalchemy import Column, String, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"), nullable=False)
    doc_type = Column(String, nullable=False)   # "identity_proof" | "income_certificate" | ...
    file_url = Column(String, nullable=True)
    extracted_fields = Column(JSON, default=dict)
    validation_status = Column(String, default="pending")  # pending | valid | invalid | missing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
