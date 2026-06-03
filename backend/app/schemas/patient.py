from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

# โครงสร้างพื้นฐานของคนไข้
class PatientBase(BaseModel):
    patient_id: str
    patient_code: str
    first_name: str
    last_name: str
    age: Optional[int] = None
    sex: str # 'Male' หรือ 'Female'

# ข้อมูลที่ต้องส่งมาตอนเพิ่มคนไข้ใหม่
class PatientCreate(PatientBase):
    pass

# ข้อมูลคนไข้ที่จะส่งกลับไปแสดงผลบนหน้าจอ React
class PatientResponse(PatientBase):
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)