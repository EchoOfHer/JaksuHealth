import hashlib
from sqlalchemy.orm import Session
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """ฟังก์ชันเข้ารหัสผ่านเพื่อความปลอดภัยก่อนบันทึกลงฐานข้อมูล"""
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """ฟังก์ชันตรวจสอบว่ารหัสผ่านที่หมอพิมพ์มา ตรงกับในฐานข้อมูลหรือไม่"""
        return AuthService.hash_password(plain_password) == hashed_password

    @staticmethod
    def register_doctor(db: Session, doctor_in: DoctorCreate) -> Doctor:
        """ฟังก์ชันลงทะเบียนแพทย์คนใหม่"""
        # เข้ารหัสผ่านก่อนบันทึกเสมอ เพื่อความปลอดภัย
        hashed_pwd = AuthService.hash_password(doctor_in.password)
        
        db_doctor = Doctor(
            username=doctor_in.username,
            first_name=doctor_in.first_name,
            last_name=doctor_in.last_name,
            password_hash=hashed_pwd
        )
        db.add(db_doctor)
        db.commit()
        db.refresh(db_doctor)
        return db_doctor

    @staticmethod
    def authenticate_doctor(db: Session, username: str, password: str) -> Doctor | None:
        """ฟังก์ชันตรวจสอบการล็อกอินของแพทย์"""
        # ดึงข้อมูลแพทย์จากฐานข้อมูลด้วย username
        doctor = db.query(Doctor).filter(Doctor.username == username).first()
        if not doctor:
            return None
        
        # ตรวจสอบรหัสผ่าน
        if not AuthService.verify_password(password, doctor.password_hash):
            return None
            
        return doctor