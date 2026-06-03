import uuid
from datetime import datetime
from sqlalchemy import Column, String, TEXT, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class EyeExamination(Base):
    __tablename__ = "eye_examinations"

    exam_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    diagnostic_id = Column(UUID(as_uuid=True), ForeignKey("diagnostics.diagnostic_id", ondelete="CASCADE"), nullable=False)
    eye_side = Column(String(2), nullable=False) # OS, OD
    biomarker_notes = Column(TEXT, nullable=False)
    oct_scan_image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    diagnostic = relationship("Diagnostic", back_populates="eye_examinations")