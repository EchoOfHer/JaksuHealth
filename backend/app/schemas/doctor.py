from pydantic import BaseModel, ConfigDict
from uuid import UUID

# โครงสร้างพื้นฐานของข้อมูลหมอ
class DoctorBase(BaseModel):
    username: str
    first_name: str
    last_name: str

# ข้อมูลที่ต้องส่งมาตอนสมัครสมาชิก (Sign-up) -> มีรหัสผ่านพ่วงมาด้วย
class DoctorCreate(DoctorBase):
    password: str

# โครงสร้างข้อมูลที่จะส่งกลับไปให้หน้าบ้าน (Response) -> ปลอดภัยเพราะไม่มี Password
class DoctorResponse(DoctorBase):
    doctor_id: UUID
    
    # บอกให้ Pydantic รู้ว่าสามารถอ่านข้อมูลจากวัตถุ SQLAlchemy (ORM) ได้โดยตรง
    model_config = ConfigDict(from_attributes=True)