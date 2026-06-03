from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

# รูปแบบผลลัพธ์เมื่อเข้าสู่ระบบสำเร็จ (Access Token Response)
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ข้อมูลภายใน Token Payload
class TokenData(BaseModel):
    doctor_id: Optional[UUID] = None

# โครงสร้างพื้นฐานของ Refresh Token
class RefreshTokenBase(BaseModel):
    doctor_id: UUID
    token_hash: str
    expires_at: datetime

# โครงสร้างสำหรับบันทึกโทเค็นเข้าสู่ระบบใหม่ลงตารางฐานข้อมูล
class RefreshTokenCreate(RefreshTokenBase):
    pass

# ข้อมูลรายละเอียดของ Refresh Token ส่งออก
class RefreshTokenResponse(RefreshTokenBase):
    token_id: UUID
    is_revoked: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
