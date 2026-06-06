from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.visit import VisitCreate, VisitResponse, VisitDetailResponse
from app.models.visit import Visit

router = APIRouter()

@router.post("/", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(visit_in: VisitCreate, db: Session = Depends(get_db)):
    """API สำหรับสร้างคิวการมาตรวจนัดหมายของคนไข้ใหม่"""
    db_visit = Visit(
        patient_id=visit_in.patient_id,
        doctor_id=visit_in.doctor_id,
        visit_date=visit_in.visit_date,
        visit_time=visit_in.visit_time,
        queue_number=visit_in.queue_number,
        status=visit_in.status
    )
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@router.get("/pending", response_model=list[VisitDetailResponse])
def get_pending_worklist(db: Session = Depends(get_db)):
    """API สำหรับดึงคิวตรวจที่รอการวินิจฉัย (Pending Worklist) เรียงตามสถานะเพื่อเตรียมแสดงใน Workspace"""
    return db.query(Visit).filter(Visit.status != "COMPLETE").order_by(Visit.visit_time.asc()).all()

@router.get("/rollback-status")
def rollback_status():
    """API สำหรับตรวจสอบเวลาที่เหลือของการตรวจเช็ค/Rollback ฐานข้อมูล"""
    from app.core.scheduler import get_rollback_status
    return get_rollback_status()