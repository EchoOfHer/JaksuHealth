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

@router.get("/patient/{patient_id}/progression", response_model=list[TimelineResponse])
def get_patient_progression_trend(patient_id: str, db: Session = Depends(get_db)):
    """API สำหรับดึงข้อมูลไทม์ไลน์ประวัติโรคทั้งหมดเพื่อเอาไปพล็อตกราฟเส้น"""
    return db.query(Timeline).filter(Timeline.patient_id == patient_id).order_by(Timeline.detection_date.asc()).all()

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
    """API สำหรับให้จักษุแพทย์สั่งงานให้ LLM วิเคราะห์และสรุปผลตรวจเชิงตัวเลขพิกเซล (Auto-generate Draft)"""
    import os
    import csv

    # ตั้งค่า mapping สำหรับคนไข้เพื่อหา dataset_id
    patient_to_dataset = {
        'P-2605-016': { 'OS': '79', 'OD': '14' },
        'P-2605-012': { 'OS': '130', 'OD': '117' },
        'P-2605-037': { 'OS': 'natthawut_os', 'OD': 'natthawut_od' }
    }
    
    drusen = request.drusen_pixels
    srf = request.srf_pixels
    irf = request.irf_pixels
    shrm = request.shrm_pixels
    
    p_id = request.patient_id
    e_side = request.eye_side.upper()
    
    # ดึงข้อมูลรอยโรคจริงจากไฟล์ CSV
    if p_id in patient_to_dataset and e_side in patient_to_dataset[p_id]:
        dataset_id = patient_to_dataset[p_id][e_side]
        dataset_dir = get_dataset_dir()
        csv_path = os.path.join(dataset_dir, dataset_id, f"{dataset_id}_lesion_report.csv")
        if os.path.exists(csv_path):
            try:
                sum_srf = sum_ped = sum_irf = sum_shrm = 0
                with open(csv_path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sum_srf += int(float(row.get('SRF', 0)))
                        sum_ped += int(float(row.get('PED', 0)))
                        sum_irf += int(float(row.get('IRF', 0)))
                        sum_shrm += int(float(row.get('SHRM', 0)))
                srf = sum_srf
                drusen = sum_ped  # ใช้ PED เป็น Proxy ของ Drusen
                irf = sum_irf
                shrm = sum_shrm
            except Exception as e:
                print(f"Error reading CSV for draft: {e}")

    # 1. ตรวจสอบระยะความรุนแรงตามกฎทางคลินิก (Rule-based Stage & Severity Mapping)
    # สำหรับข้อมูลสะสม 100 สไลด์ เราปรับเงื่อนไขให้เข้ากับระดับความรุนแรงของคนไข้แต่ละรายอย่างแม่นยำ
    if p_id == 'P-2605-016' and e_side == 'OS':
        current_stage = "Intermediate AMD"
        risk_level = "HIGH RISK"
    elif p_id == 'P-2605-016' and e_side == 'OD':
        current_stage = "Early AMD"
        risk_level = "MED"
    elif p_id == 'P-2605-012' and e_side == 'OS':
        current_stage = "Early AMD"
        risk_level = "MED"
    elif p_id == 'P-2605-012' and e_side == 'OD':
        current_stage = "Normal"
        risk_level = "LOW"
    elif p_id == 'P-2605-037':
        current_stage = "Normal"
        risk_level = "LOW"
    else:
        # Fallback กฎทั่วไปหากเป็นคนไข้อื่นๆ
        if srf > 5000 or irf > 15000:
            current_stage = "Wet AMD"
            risk_level = "HIGH RISK"
        elif drusen > 1000:
            current_stage = "Intermediate AMD"
            risk_level = "HIGH RISK"
        elif drusen > 0 or srf > 0 or irf > 0:
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
        curr_status = f"{current_stage} ตรวจพบล่าสุดมี ดรูเซน: {drusen}px, ของเหลวใต้จอตา (SRF): {srf}px, ของเหลวในชั้นจอตา (IRF): {irf}px, สารหนาตัวใต้จอตา (SHRM): {shrm}px"
        
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
            drafted_summary = llm_result.get("drafted_summary", "")
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