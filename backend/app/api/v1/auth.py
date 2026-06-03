from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.doctor import DoctorCreate, DoctorResponse
from app.services.auth import AuthService

router = APIRouter()

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def register(doctor_in: DoctorCreate, db: Session = Depends(get_db)):
    """API สำหรับให้แพทย์สมัครสมาชิกใหม่"""
    return AuthService.register_doctor(db, doctor_in)

@router.post("/login", response_model=DoctorResponse)
def login(username: str, password: str, db: Session = Depends(get_db)):
    """API สำหรับการตรวจสอบการเข้าสู่ระบบของแพทย์"""
    doctor = AuthService.authenticate_doctor(db, username, password)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
        )
    return doctor