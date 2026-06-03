from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.schemas.diagnostic import DiagnosticCreate, DiagnosticResponse
from app.schemas.timeline import TimelineResponse
from app.models.diagnostic import Diagnostic
from app.models.timeline import Timeline
from app.models.visit import Visit

router = APIRouter()

@router.post("/", response_model=DiagnosticResponse, status_code=status.HTTP_201_CREATED)
def submit_diagnosis(diagnostic_in: DiagnosticCreate, db: Session = Depends(get_db)):
    """API สำหรับแพทย์กดส่งผลการวินิจฉัย (Approve & Save) บันทึกผล AI สรุปบทวิเคราะห์ และอัปเดตสถานะคิว"""
    # 1. ตรวจสอบก่อนว่าคิวตรวจ (Visit) นี้มีอยู่จริงไหม
    visit = db.query(Visit).filter(Visit.visit_id == diagnostic_in.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสคิวนัดหมายนี้")

    # 2. บันทึกผลการวินิจฉัยลงตาราง Diagnostics
    now = datetime.utcnow()
    db_diagnostic = Diagnostic(
        patient_id=diagnostic_in.patient_id,
        visit_id=diagnostic_in.visit_id,
        risk_level=diagnostic_in.risk_level,
        condition_stage=diagnostic_in.condition_stage,
        ai_trend=diagnostic_in.ai_trend,
        drafted_summary=diagnostic_in.drafted_summary,
        suggested_action=diagnostic_in.suggested_action,
        exported_to_his=diagnostic_in.exported_to_his,
        created_at=now
    )
    db.add(db_diagnostic)
    db.flush() # เรียกเพื่อให้ได้ diagnostic_id มาใช้งานต่อในขั้นตอนสร้าง Timeline

    # 3. สร้างข้อมูลบันทึกประวัติ Timeline อัตโนมัติ เพื่อใช้ในหน้าดู Progression
    db_timeline = Timeline(
        patient_id=diagnostic_in.patient_id,
        diagnostic_id=db_diagnostic.diagnostic_id,
        detected_stage=diagnostic_in.condition_stage,
        progression_summary=f"วิเคราะห์พบในระดับ {diagnostic_in.condition_stage} แนวโน้ม {diagnostic_in.ai_trend}",
        detection_date=now.date(),
        tag_line="บันทึกผลการรักษา",
        created_at=now
    )
    db.add(db_timeline)

    # 4. อัปเดตสถานะคิวตรวจนัดหมายนั้นให้เป็นเสร็จสิ้น (COMPLETE)
    visit.status = "COMPLETE"
    
    db.commit()
    db.refresh(db_diagnostic)
    return db_diagnostic

@router.get("/patient/{patient_id}/progression", response_model=list[TimelineResponse])
def get_patient_progression_trend(patient_id: str, db: Session = Depends(get_db)):
    """API สำหรับดึงข้อมูลไทม์ไลน์ประวัติโรคทั้งหมดของคนไข้คนนั้น เพื่อเอาไปพล็อตกราฟเส้นในหน้า Progression"""
    return db.query(Timeline).filter(Timeline.patient_id == patient_id).order_by(Timeline.detection_date.asc()).all()