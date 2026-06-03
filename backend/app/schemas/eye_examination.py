from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

# โครงสร้างข้อมูลสแกนตาและ Biomarker รายข้าง (EyeExaminations)
class EyeExaminationBase(BaseModel):
    diagnostic_id: UUID
    eye_side: str # OS (Left), OD (Right)
    biomarker_notes: str
    oct_scan_image_url: str

# ข้อมูลส่งเข้าเมื่อทำการบันทึกข้อมูล B-Scan และจุดมาร์กเลชัน
class EyeExaminationCreate(EyeExaminationBase):
    pass

# ข้อมูลที่ส่งกลับเมื่อค้นหาผลการตรวจตาแยกตามข้าง
class EyeExaminationResponse(EyeExaminationBase):
    exam_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
