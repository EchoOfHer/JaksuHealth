from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.core.database import get_db
from app.schemas.diagnostic import DiagnosticCreate, DiagnosticResponse, AIDraftRequest
from app.schemas.timeline import TimelineResponse, TimelineUpdate
from app.models.diagnostic import Diagnostic
from app.models.timeline import Timeline
from app.models.visit import Visit
from app.services.llm import generate_single_diagnostic, generate_progression_trend
import json
import os

router = APIRouter()

@router.post("/", response_model=DiagnosticResponse)
def create_diagnostic_draft(diagnostic_in: DiagnosticCreate, db: Session = Depends(get_db)):
    """API สำหรับบันทึกผลการวินิจฉัยเริ่มต้น (AI Model Prediction Draft)"""
    # 1. ตรวจสอบว่าคิวตรวจ (Visit) นี้มีอยู่จริงไหม
    visit = db.query(Visit).filter(Visit.visit_id == diagnostic_in.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสคิวนัดหมายนี้")

    # ตรวจสอบว่ามี draft อยู่แล้วหรือยัง
    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == diagnostic_in.visit_id, Diagnostic.eye_side == diagnostic_in.eye_side.upper()).first()
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
            eye_side=diagnostic_in.eye_side.upper(),
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
    if diagnostic_in.risk_level == "High":
        visit.status = "High"
    elif visit.status == "High" and diagnostic_in.risk_level != "High":
        visit.status = "PENDING"
    
    db.commit()
    db.refresh(db_diagnostic)
    return db_diagnostic

@router.get("/visit/{visit_id}/{eye_side}", response_model=DiagnosticResponse)
def get_diagnostic_by_visit(visit_id: UUID, eye_side: str, db: Session = Depends(get_db)):
    """API สำหรับดึงแบบร่างผลวินิจฉัยของคิวนั้น ๆ (สำหรับส่งให้คุณหมอดูในห้องตรวจ)"""
    diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == visit_id, Diagnostic.eye_side == eye_side.upper()).first()
    if not diagnostic:
        raise HTTPException(status_code=404, detail="ไม่พบผลวินิจฉัยของคิวนัดหมายนี้")
    return diagnostic

@router.put("/visit/{visit_id}/{eye_side}/approve", response_model=DiagnosticResponse)
def approve_diagnostic(visit_id: UUID, eye_side: str, diagnostic_in: DiagnosticCreate, db: Session = Depends(get_db)):
    """API สำหรับแพทย์ตรวจทาน แก้ไข และกดอนุมัติผลการวินิจฉัยสุดท้าย (Approve & Save)"""
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสคิวนัดหมายนี้")

    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == visit_id, Diagnostic.eye_side == eye_side.upper()).first()
    now = datetime.utcnow()
    
    if not db_diagnostic:
        # ถ้าไม่มี Draft จาก AI มาก่อน ให้สร้างขึ้นมาใหม่
        db_diagnostic = Diagnostic(
            patient_id=diagnostic_in.patient_id,
            visit_id=visit_id,
            eye_side=eye_side.upper(),
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
            progression_summary=diagnostic_in.drafted_summary,
            detection_date=now.date(),
            tag_line="บันทึกการรักษา",
            created_at=now
        )
        db.add(db_timeline)
    else:
        existing_timeline.detected_stage = diagnostic_in.condition_stage
        existing_timeline.progression_summary = diagnostic_in.drafted_summary

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

@router.get("/patient/{patient_id}/progression")
def get_patient_progression_trend(patient_id: str, eye_side: str = 'os', db: Session = Depends(get_db)):
    """API สำหรับดึงข้อมูลไทม์ไลน์ประวัติโรค รวมถึงข้อมูลปัจจุบันที่ยังรอตรวจ (Pending) โดยแยกตามข้างซ้ายขวา"""
    # Fetch timelines that belong to diagnostics of the specified eye_side
    timelines = db.query(Timeline).join(Diagnostic).filter(
        Timeline.patient_id == patient_id,
        Diagnostic.eye_side == eye_side.upper()
    ).order_by(Timeline.detection_date.asc()).all()
    
    # ดึงผลวินิจฉัยที่ยังไม่ถูกเซฟลง timeline (เช่น อยู่ในสถานะ PENDING)
    timeline_diag_ids = {t.diagnostic_id for t in timelines}
    pending_diagnostics = db.query(Diagnostic).filter(
        Diagnostic.patient_id == patient_id,
        Diagnostic.eye_side == eye_side.upper()
    ).all()
    
    results = [t.__dict__ for t in timelines]
    
    for d in pending_diagnostics:
        if d.diagnostic_id not in timeline_diag_ids:
            # จำลองข้อมูล Timeline จาก Diagnostic
            virtual_timeline = {
                "history_id": d.diagnostic_id, # ใช้ UUID ชั่วคราว
                "patient_id": d.patient_id,
                "diagnostic_id": d.diagnostic_id,
                "detected_stage": d.condition_stage,
                "progression_summary": d.drafted_summary,
                "detection_date": d.created_at.date() if d.created_at else datetime.utcnow().date(),
                "tag_line": f"รอยืนยัน ({d.eye_side})",
                "created_at": d.created_at or datetime.utcnow(),
                "is_pending": True,
                "eye_side": d.eye_side
            }
            results.append(virtual_timeline)
            
    # เรียงลำดับตามวันที่เก่าไปใหม่
    results.sort(key=lambda x: x["detection_date"])
    return results

def get_dataset_dir():
    import os
    # 1. เช็ค relative path สำหรับ local dev (รัน uvicorn ใน backend/)
    local_path = os.path.abspath(os.path.join(os.getcwd(), "../frontend/public/dataset"))
    if os.path.exists(local_path):
        return local_path
        
    # 2. เช็ค path สำหรับ Docker container
    docker_path = "/app/dataset"
    if os.path.exists(docker_path):
        return docker_path
        
    # 3. เช็ค relative path ตรงตัวจาก working directory
    docker_rel_path = os.path.abspath(os.path.join(os.getcwd(), "dataset"))
    if os.path.exists(docker_rel_path):
        return docker_rel_path
        
    # 4. Fallback
    return "D:\\JaksuHealth\\frontend\\public\\dataset"

@router.get("/dataset/{dataset_id}/metadata")
def get_dataset_metadata(dataset_id: str):
    """API สำหรับดึงข้อมูลรอยโรคราย B-scan ไดนามิกจากไฟล์ CSV ใน Dataset"""
    import os
    import csv
    
    dataset_dir = get_dataset_dir()
    csv_path = os.path.join(dataset_dir, dataset_id, f"{dataset_id}_lesion_report.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"ไม่พบไฟล์ข้อมูลรอยโรคสำหรับรหัส {dataset_id}")
        
    try:
        data = []
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append({
                    "Image_Name": row.get("Image_Name", ""),
                    "SRF": int(float(row.get("SRF", 0))),
                    "PED": int(float(row.get("PED", 0))),
                    "IRF": int(float(row.get("IRF", 0))),
                    "SHRM": int(float(row.get("SHRM", 0))),
                    "IS_OS": int(float(row.get("IS/OS", 0))),
                    "Total_Lesion_Pixels": int(float(row.get("Total_Lesion_Pixels", 0)))
                })
        
        # จัดเรียงข้อมูลตามหมายเลขสไลด์จริงจากชื่อไฟล์ (Numerical Sorting) เพื่อให้เลื่อนภาพต่อเนื่อง
        def get_slice_number(item):
            name = item.get("Image_Name", "")
            try:
                parts = name.split("_")
                if len(parts) > 1:
                    num_str = parts[1].split(".")[0]
                else:
                    num_str = parts[0].split(".")[0]
                return int(num_str)
            except Exception:
                return 0
        data.sort(key=get_slice_number)
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: {e}")

@router.post("/generate-draft", response_model=DiagnosticResponse)
async def generate_ai_diagnostic_draft(request: AIDraftRequest, db: Session = Depends(get_db)):
    """API สำหรับดึงผลวินิจฉัยจาก Mock Data แทนการเรียก LLM (เพื่อความเสถียร 100%)"""
    
    p_id = request.patient_id
    e_side = request.eye_side.upper()
    
    # 1. เรียกใช้งาน Gemini API (เปลี่ยนกลับมาใช้ของจริงตามที่คุณณัฐวุฒิแนะนำ)
    ai_result = await generate_single_diagnostic(
        patient_id=p_id,
        age=request.age,
        eye_side=e_side,
        cv_model_result="AI Lesion Segmentation", # Mock or pass from frontend
        drusen=request.drusen_pixels,
        srf=request.srf_pixels,
        irf=request.irf_pixels,
        shrm=request.shrm_pixels,
        is_os=request.is_os_pixels
    )

    if ai_result:
        current_stage = ai_result.get("condition_stage", "Unknown")
        risk_level = ai_result.get("risk_level", "Medium")
        ai_trend = ai_result.get("ai_trend", "Normal")
        drafted_summary = ai_result.get("drafted_summary", "No AI draft available.")
        suggested_action = ai_result.get("suggested_action", "Consult a physician.")
    else:
        # Fallback กรณี API มีปัญหาจริงๆ (ซึ่งรอบนี้น่าจะไม่ติดปัญหา 8000 ค้างแล้ว)
        current_stage = "Unknown"
        risk_level = "Medium"
        ai_trend = "Normal"
        drafted_summary = "AI service unavailable. Please check the network or try again."
        suggested_action = "Consult a physician."

    # 2. บันทึก/อัปเดตลงฐานข้อมูล (Diagnostics Table)
    db_diagnostic = db.query(Diagnostic).filter(Diagnostic.visit_id == request.visit_id, Diagnostic.eye_side == e_side).first()
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
            eye_side=e_side,
            risk_level=risk_level,
            condition_stage=current_stage,
            ai_trend=ai_trend,
            drafted_summary=drafted_summary,
            suggested_action=suggested_action,
            exported_to_his=False,
            created_at=datetime.utcnow()
        )
        db.add(db_diagnostic)
        
    # เราจะไม่อัปเดต visit.status เป็น High เพื่อหลีกเลี่ยง CheckConstraint ของฐานข้อมูล
    # status ของ visit ควรเป็น PENDING หรือ COMPLETE เท่านั้น

    db.commit()
    db.refresh(db_diagnostic)

    return db_diagnostic
@router.post("/bulk-generate-pending")
async def bulk_generate_pending(db: Session = Depends(get_db)):
    """
    Generate diagnostics for all pending visits that do not have diagnostics yet.
    """
    from app.models.visit import Visit
    from app.models.diagnostic import Diagnostic
    from datetime import datetime
    import csv, os
    
    pending_visits = db.query(Visit).filter(Visit.status != "COMPLETE").all()
    count = 0
    logs = []
    
    patient_map = {
        'P-2605-016': {'os': '79', 'od': '14'},
        'P-2605-012': {'os': '130', 'od': '117'},
        'P-2605-037': {'os': 'natthawut_os', 'od': 'natthawut_od'}
    }
    
    for v in pending_visits:
        logs.append(f"Processing visit: {v.visit_id}")
        for eye in ['OS', 'OD']:
            existing = db.query(Diagnostic).filter(Diagnostic.visit_id == v.visit_id, Diagnostic.eye_side == eye).first()
            if not existing:
                logs.append(f"No existing diagnostic for {v.patient_id} {eye}")
                p_id = v.patient_id
                dataset_id = patient_map.get(p_id, {}).get(eye.lower(), '95')
                dataset_dir = get_dataset_dir()
                csv_path = os.path.join(dataset_dir, dataset_id, f"{dataset_id}_lesion_report.csv")
                
                srf = 0; irf = 0; shrm = 0; is_os = 0
                if os.path.exists(csv_path):
                    with open(csv_path, mode='r', encoding='utf-8') as cf:
                        reader = csv.DictReader(cf)
                        for row in reader:
                            srf += int(float(row.get('SRF', 0)))
                            irf += int(float(row.get('IRF', 0)))
                            shrm += int(float(row.get('SHRM', 0)))
                            is_os += int(float(row.get('IS/OS', 0)))
                drusen = 0
                if '016' in p_id: drusen = 1200 if eye == 'OS' else 450
                elif '012' in p_id: drusen = 350 if eye == 'OS' else 0

                ai_result = await generate_single_diagnostic(
                    patient_id=p_id, age=65, eye_side=eye, cv_model_result="AI Lesion Segmentation",
                    drusen=drusen, srf=srf, irf=irf, shrm=shrm, is_os=is_os
                )
                if ai_result:
                    logs.append(f"Success generation for {p_id} {eye}: {ai_result.get('risk_level')}")
                    db_diagnostic = Diagnostic(
                        patient_id=p_id, visit_id=v.visit_id, eye_side=eye,
                        risk_level=ai_result.get("risk_level", "Medium"),
                        condition_stage=ai_result.get("condition_stage", "Unknown"),
                        ai_trend=ai_result.get("ai_trend", "Normal"),
                        drafted_summary=ai_result.get("drafted_summary", ""),
                        suggested_action=ai_result.get("suggested_action", ""),
                        exported_to_his=False, created_at=datetime.utcnow()
                    )
                    db.add(db_diagnostic)
                    count += 1
                else:
                    logs.append(f"Failed to generate for {p_id} {eye}")
    db.commit()
    return {"message": f"Generated {count} new diagnostics.", "logs": logs}

class ProgressionCompareRequest(BaseModel):
    patient_id: str
    eye_side: str
    age: int
    prev_status: str
    curr_status: str

@router.post("/compare-progression")
async def compare_progression(request: ProgressionCompareRequest):
    """API สำหรับให้ Gemini วิเคราะห์เปรียบเทียบรอยโรค 2 ช่วงเวลา (Baseline vs Current)"""
    from app.services.llm import generate_progression_trend
    
    result = await generate_progression_trend(
        patient_id=request.patient_id,
        age=request.age,
        eye_side=request.eye_side.upper(),
        prev_status=request.prev_status,
        curr_status=request.curr_status
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Gemini failed to generate progression comparison")
        
    return result
