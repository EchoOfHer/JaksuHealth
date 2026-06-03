import uuid
from datetime import datetime
from sqlalchemy import Column, String, TEXT, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Timeline(Base):
    __tablename__ = "timeline"

    history_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(String(20), ForeignKey("patient.patient_id", ondelete="CASCADE"), nullable=False)
    diagnostic_id = Column(UUID(as_uuid=True), ForeignKey("diagnostics.diagnostic_id", ondelete="CASCADE"), unique=True, nullable=False)
    detected_stage = Column(String(50), nullable=False)
    progression_summary = Column(TEXT, nullable=False)
    detection_date = Column(Date, nullable=False)
    tag_line = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    diagnostic = relationship("Diagnostic", back_populates="timeline")