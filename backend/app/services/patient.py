from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.patient import Patient
from app.schemas.patient import PatientCreate

class PatientService:
    @staticmethod
    def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
        """ฟังก์ชันลงทะเบียนข้อมูลคนไข้ใหม่"""
        db_patient = Patient(
            patient_id=patient_in.patient_id,
            patient_code=patient_in.patient_code,
            first_name=patient_in.first_name,
            last_name=patient_in.last_name,
            age=patient_in.age,
            sex=patient_in.sex
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def get_patient_by_id(db: Session, patient_id: str) -> Patient | None:
        """ฟังก์ชันดึงข้อมูลคนไข้รายคนด้วย ID"""
        return db.query(Patient).filter(Patient.patient_id == patient_id).first()

    @staticmethod
    def search_patients(db: Session, query: str) -> list[Patient]:
        """ฟังก์ชันค้นหาคนไข้แบบยืดหยุ่นด้วย รหัสประจำตัว (HN), ชื่อ หรือนามสกุล"""
        search_filter = f"%{query}%"
        # สามารถค้นหาได้ครอบคลุมทั้งโค้ดตัวเลข ชื่อ หรือนามสกุล
        return db.query(Patient).filter(
            or_(
                Patient.patient_code == query,
                Patient.first_name.ilike(search_filter),
                Patient.last_name.ilike(search_filter)
            )
        ).order_by(Patient.created_at.desc()).all() # เรียงจากข้อมูลล่าสุด
    
    @staticmethod
    def get_all_patients(db: Session) -> list[Patient]:
        """ฟังก์ชันดึงรายชื่อคนไข้ทั้งหมดในระบบ"""
        return db.query(Patient).order_by(Patient.created_at.desc()).all()