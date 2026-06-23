from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date, time, datetime
from app.schemas.patient import PatientResponse

# โครงสร้างพื้นฐานของประวัติการตรวจคิว (Visits)
class VisitBase(BaseModel):
    patient_id: str
    doctor_id: UUID
    visit_date: date
    visit_time: time
    queue_number: str
    status: str = "PENDING" # PENDING, COMPLETE, HIGH RISK

# ข้อมูลสำหรับบันทึกคิวการเข้าตรวจใหม่
class VisitCreate(VisitBase):
    pass

from app.schemas.patient import PatientResponse
from app.schemas.diagnostic import DiagnosticResponse
from typing import Optional

# ข้อมูลส่งกลับของคิวเข้าตรวจ
class VisitResponse(VisitBase):
    visit_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ข้อมูลส่งกลับแบบละเอียดพร้อมข้อมูลคนไข้ (สำหรับแสดงผลฝั่งคิวงาน Worklist)
class VisitDetailResponse(VisitResponse):
    patient: PatientResponse
    diagnostics: list[DiagnosticResponse] = []

    model_config = ConfigDict(from_attributes=True)
