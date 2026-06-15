from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.schemas.diagnostic import DiagnosticCreate, DiagnosticResponse, AIDraftRequest
from app.schemas.timeline import TimelineResponse, TimelineUpdate
from app.models.diagnostic import Diagnostic
from app.models.timeline import Timeline
from app.models.visit import Visit
from app.services.llm import generate_single_diagnostic, generate_progression_trend


router = APIRouter()

@router.post("/", response_model=DiagnosticResponse)
def create_diagnostic_draft(diagnostic_in: DiagnosticCreate, db: Session = Depends(get_db)):
    """API สำหรับบันทึกผลการวินิจฉัยเริ่มต้น (AI Model Prediction Draft)"""
    # 1. ตรวจสอบว่าคิวตรวจ (Visit) นี้มีอยู่จริงไหม
    visit = db.query(Visit).filter(Visit.visit_id == diagnostic_in.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสคิวนัดหมายนี้")

    # ตรวจสอบว่ามี draft อยู่แล้วหรือยัง
    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == diagnostic_in.visit_id).first()
    if db_diagnostic:
        # อัปเดตข้อมูลที่มีอยู่แล้ว
        db_diagnostic.risk_level = diagnostic_in.risk_level
        db_diagnostic.condition_stage = diagnostic_in.condition_stage
        db_diagnostic.ai_trend = diagnostic_in.ai_trend
        db_diagnostic.drafted_summary = diagnostic_in.drafted_summary
        db_diagnostic.suggested_action = diagnostic_in.suggested_action
        db_diagnostic.exported_to_his = diagnostic_in.exported_to_his
    else:
        # สร้างใหม่
        db_diagnostic = Diagnostic(
            patient_id=diagnostic_in.patient_id,
            visit_id=diagnostic_in.visit_id,
            risk_level=diagnostic_in.risk_level,
            condition_stage=diagnostic_in.condition_stage,
            ai_trend=diagnostic_in.ai_trend,
            drafted_summary=diagnostic_in.drafted_summary,
            suggested_action=diagnostic_in.suggested_action,
            exported_to_his=diagnostic_in.exported_to_his,
            created_at=datetime.utcnow()
        )
        db.add(db_diagnostic)
    
    # อัปเดตสถานะคิวตรวจเป็น HIGH RISK หรืออื่น ๆ ตามที่แพทย์ประเมิน (แต่ยังไม่ COMPLETE)
    if diagnostic_in.risk_level == "HIGH RISK":
        visit.status = "HIGH RISK"
    elif visit.status == "HIGH RISK" and diagnostic_in.risk_level != "HIGH RISK":
        visit.status = "PENDING"
    
    db.commit()
    db.refresh(db_diagnostic)
    return db_diagnostic

@router.get("/visit/{visit_id}", response_model=DiagnosticResponse)
def get_diagnostic_by_visit(visit_id: UUID, db: Session = Depends(get_db)):
    """API สำหรับดึงแบบร่างผลวินิจฉัยของคิวนั้น ๆ (สำหรับส่งให้คุณหมอดูในห้องตรวจ)"""
    diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == visit_id).first()
    if not diagnostic:
        raise HTTPException(status_code=404, detail="ไม่พบผลวินิจฉัยของคิวนัดหมายนี้")
    return diagnostic

@router.put("/visit/{visit_id}/approve", response_model=DiagnosticResponse)
def approve_diagnostic(visit_id: UUID, diagnostic_in: DiagnosticCreate, db: Session = Depends(get_db)):
    """API สำหรับแพทย์ตรวจทาน แก้ไข และกดอนุมัติผลการวินิจฉัยสุดท้าย (Approve & Save)"""
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสคิวนัดหมายนี้")

    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == visit_id).first()
    now = datetime.utcnow()
    
    if not db_diagnostic:
        # ถ้าไม่มี Draft จาก AI มาก่อน ให้สร้างขึ้นมาใหม่
        db_diagnostic = Diagnostic(
            patient_id=diagnostic_in.patient_id,
            visit_id=visit_id,
            risk_level=diagnostic_in.risk_level,
            condition_stage=diagnostic_in.condition_stage,
            ai_trend=diagnostic_in.ai_trend,
            drafted_summary=diagnostic_in.drafted_summary,
            suggested_action=diagnostic_in.suggested_action,
            exported_to_his=diagnostic_in.exported_to_his,
            created_at=now
        )
        db.add(db_diagnostic)
        db.flush()
    else:
        # ถ้ามี Draft อยู่แล้ว ให้อัปเดตฟิลด์ด้วยข้อมูลตรวจทานของแพทย์
        db_diagnostic.risk_level = diagnostic_in.risk_level
        db_diagnostic.condition_stage = diagnostic_in.condition_stage
        db_diagnostic.ai_trend = diagnostic_in.ai_trend
        db_diagnostic.drafted_summary = diagnostic_in.drafted_summary
        db_diagnostic.suggested_action = diagnostic_in.suggested_action
        db_diagnostic.exported_to_his = diagnostic_in.exported_to_his

    # อัปเดตสถานะคิวเป็นเสร็จสิ้น (COMPLETE)
    visit.status = "COMPLETE"

    # สร้างหรืออัปเดต Timeline
    existing_timeline = db.query(Timeline).filter(Timeline.diagnostic_id == db_diagnostic.diagnostic_id).first()
    if not existing_timeline:
        db_timeline = Timeline(
            patient_id=diagnostic_in.patient_id,
            diagnostic_id=db_diagnostic.diagnostic_id,
            detected_stage=diagnostic_in.condition_stage,
            progression_summary=f"วิเคราะห์พบในระดับ {diagnostic_in.condition_stage} แนวโน้ม {diagnostic_in.ai_trend}",
            detection_date=now.date(),
            tag_line="บันทึกการรักษา",
            created_at=now
        )
        db.add(db_timeline)
    else:
        existing_timeline.detected_stage = diagnostic_in.condition_stage
        existing_timeline.progression_summary = f"วิเคราะห์พบในระดับ {diagnostic_in.condition_stage} แนวโน้ม {diagnostic_in.ai_trend}"

    db.commit()
    db.refresh(db_diagnostic)
    return db_diagnostic

@router.put("/timeline/{history_id}", response_model=TimelineResponse)
def update_timeline_entry(history_id: UUID, timeline_update: TimelineUpdate, db: Session = Depends(get_db)):
    """API สำหรับแก้ไขข้อมูลไทม์ไลน์ประวัติคนไข้ย้อนหลังจากหน้าจอ Progression"""
    db_timeline = db.query(Timeline).filter(Timeline.history_id == history_id).first()
    if not db_timeline:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลไทม์ไลน์ประวัตินี้")

    db_timeline.detected_stage = timeline_update.detected_stage
    db_timeline.tag_line = timeline_update.tag_line
    db_timeline.progression_summary = timeline_update.progression_summary
    
    db.commit()
    db.refresh(db_timeline)
    return db_timeline

@router.get("/patient/{patient_id}/progression", response_model=list[TimelineResponse])
def get_patient_progression_trend(patient_id: str, db: Session = Depends(get_db)):
    """API สำหรับดึงข้อมูลไทม์ไลน์ประวัติโรคทั้งหมดเพื่อเอาไปพล็อตกราฟเส้น"""
    return db.query(Timeline).filter(Timeline.patient_id == patient_id).order_by(Timeline.detection_date.asc()).all()

@router.post("/generate-draft", response_model=DiagnosticResponse)
async def generate_ai_diagnostic_draft(request: AIDraftRequest, db: Session = Depends(get_db)):
    """API สำหรับให้จักษุแพทย์สั่งงานให้ LLM วิเคราะห์และสรุปผลตรวจเชิงตัวเลขพิกเซล (Auto-generate Draft)"""
    # 1. ตรวจสอบระยะความรุนแรงตามกฎทางคลินิก (Rule-based Stage & Severity Mapping)
    if request.srf_pixels > 0 or request.irf_pixels > 0:
        current_stage = "Wet AMD"
        risk_level = "HIGH RISK"
    elif request.drusen_pixels > 500:
        current_stage = "Intermediate AMD"
        risk_level = "HIGH RISK"
    elif request.drusen_pixels > 0:
        current_stage = "Early AMD"
        risk_level = "MED"
    else:
        current_stage = "Normal"
        risk_level = "LOW"

    # 2. ค้นหาประวัติการตรวจในอดีต (Longitudinal Timeline History) เพื่อประเมินแนวโน้ม
    prev_timeline = db.query(Timeline).filter(Timeline.patient_id == request.patient_id).order_by(Timeline.detection_date.desc()).first()

    if prev_timeline:
        # --- เคสที่มีประวัติเก่า: รัน Task 2: Progression Trend Analysis ---
        prev_status = f"{prev_timeline.detected_stage} (พบจุดเหลืองสะสมและพยาธิสภาพในวันที่ตรวจ)"
        curr_status = f"{current_stage} ตรวจพบล่าสุดมี ดรูเซน: {request.drusen_pixels}px, ของเหลวใต้จอตา (SRF): {request.srf_pixels}px, ของเหลวในชั้นจอตา (IRF): {request.irf_pixels}px, สารหนาตัวใต้จอตา (SHRM): {request.shrm_pixels}px"
        
        llm_result = await generate_progression_trend(
            patient_id=request.patient_id,
            age=request.age,
            eye_side=request.eye_side,
            prev_status=prev_status,
            curr_status=curr_status
        )
        
        if llm_result:
            ai_trend = llm_result.get("progression_trend", "Stable")
            drafted_summary = llm_result.get("progression_summary", "")
            suggested_action = llm_result.get("suggested_action", "")
            # อัพเดตระยะตามการประเมินล่าสุดของ LLM
            current_stage = llm_result.get("condition_stage", current_stage)
            risk_level = llm_result.get("risk_level", risk_level)
        else:
            ai_trend = "Stable"
            drafted_summary = "เกิดข้อผิดพลาดในการดึงความเห็นแพทย์จากโมเดล AI"
            suggested_action = "กรุณาแก้ไขด้วยตนเอง"
    else:
        # --- เคสตรวจครั้งแรก: รัน Task 1: Single Diagnostic Analysis ---
        llm_result = await generate_single_diagnostic(
            patient_id=request.patient_id,
            age=request.age,
            eye_side=request.eye_side,
            cv_model_result=current_stage
        )
        
        ai_trend = "Normal" # ตรวจครั้งแรกแนวโน้มเป็นค่าเริ่มต้น
        if llm_result:
            drafted_summary = llm_result.get("clinical_summary", "")
            suggested_action = llm_result.get("suggested_action", "")
            current_stage = llm_result.get("condition_stage", current_stage)
            risk_level = llm_result.get("risk_level", risk_level)
        else:
            drafted_summary = "เกิดข้อผิดพลาดในการดึงความเห็นแพทย์จากโมเดล AI"
            suggested_action = "กรุณาแก้ไขด้วยตนเอง"

    # 3. บันทึก/อัปเดตลงฐานข้อมูล (Diagnostics Table)
    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == request.visit_id).first()
    if db_diagnostic:
        db_diagnostic.risk_level = risk_level
        db_diagnostic.condition_stage = current_stage
        db_diagnostic.ai_trend = ai_trend
        db_diagnostic.drafted_summary = drafted_summary
        db_diagnostic.suggested_action = suggested_action
    else:
        db_diagnostic = Diagnostic(
            patient_id=request.patient_id,
            visit_id=request.visit_id,
            risk_level=risk_level,
            condition_stage=current_stage,
            ai_trend=ai_trend,
            drafted_summary=drafted_summary,
            suggested_action=suggested_action,
            exported_to_his=False,
            created_at=datetime.utcnow()
        )
        db.add(db_diagnostic)

    # อัปเดตสถานะคิวนัดหมายตามประเมินเบื้องต้น
    visit = db.query(Visit).filter(Visit.visit_id == request.visit_id).first()
    if visit:
        if risk_level == "HIGH RISK":
            visit.status = "HIGH RISK"
        elif visit.status == "HIGH RISK" and risk_level != "HIGH RISK":
            visit.status = "PENDING"

    db.commit()
    db.refresh(db_diagnostic)
    return db_diagnostic