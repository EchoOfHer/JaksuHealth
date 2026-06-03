from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patient"

    # ใช้ String(20) ตามที่คุณออกแบบไว้ใน schema.sql
    patient_id = Column(String(20), primary_key=True)
    patient_code = Column(String(20), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)# เพิ่มไว้ในคลาส Patient ล่างสุด
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    