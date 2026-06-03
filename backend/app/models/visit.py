import uuid
from datetime import datetime
from sqlalchemy import Column, String, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Visit(Base):
    __tablename__ = "visits"

    visit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(String(20), ForeignKey("patient.patient_id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.doctor_id", ondelete="CASCADE"), nullable=False)
    visit_date = Column(Date, nullable=False)
    visit_time = Column(Time, nullable=False)
    queue_number = Column(String(20), nullable=False)
    status = Column(String, default="PENDING", nullable=False) # PENDING, COMPLETE, HIGH RISK
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship เชื่อมโยงกลับไปหา Patient และ Doctor เพื่อให้ดึงข้อมูลข้ามตารางได้ง่าย
    patient = relationship("Patient", back_populates="visits")
    diagnostic = relationship("Diagnostic", back_populates="visit", uselist=False)