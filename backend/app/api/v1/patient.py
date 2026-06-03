from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.patient import PatientCreate, PatientResponse
from app.services.patient import PatientService

router = APIRouter()

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(patient_in: PatientCreate, db: Session = Depends(get_db)):
    """API สำหรับลงทะเบียนคนไข้ใหม่เข้าสู่ระบบ"""
    existing_patient = PatientService.get_patient_by_id(db, patient_in.patient_id)
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รหัสคนไข้ (Patient ID) นี้มีอยู่ในระบบแล้ว"
        )
    return PatientService.create_patient(db, patient_in)

@router.get("/search", response_model=list[PatientResponse])
def search_patients(q: str = Query(..., description="ค้นหาจาก HN, ชื่อ หรือนามสกุล"), db: Session = Depends(get_db)):
    """API สำหรับค้นหาคนไข้แบบ Dynamic Search"""
    return PatientService.search_patients(db, q)

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """API สำหรับดึงข้อมูลส่วนตัวของคนไข้รายบุคคล"""
    patient = PatientService.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบข้อมูลคนไข้รายนี้"
        )
    return patient