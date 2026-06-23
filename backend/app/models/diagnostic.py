import uuid
from datetime import datetime
from sqlalchemy import Column, String, TEXT, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Diagnostic(Base):
    __tablename__ = "diagnostics"

    diagnostic_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(String(20), ForeignKey("patient.patient_id", ondelete="CASCADE"), nullable=False)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.visit_id", ondelete="CASCADE"), nullable=False)
    eye_side = Column(String(2), nullable=False) # OS or OD
    risk_level = Column(String(50), nullable=False) # HIGH RISK, MED, LOW
    condition_stage = Column(String(200), nullable=False) # Intermediate AMD, Early AMD, Normal, Other
    ai_trend = Column(String(20), nullable=False) # Worsening, Stable, Normal
    drafted_summary = Column(TEXT, nullable=False)
    suggested_action = Column(TEXT, nullable=False)
    exported_to_his = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    visit = relationship("Visit", back_populates="diagnostics")
    eye_examinations = relationship("EyeExamination", back_populates="diagnostic", cascade="all, delete-orphan")
    timeline = relationship("Timeline", back_populates="diagnostic", uselist=False)