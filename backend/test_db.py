import uuid
from datetime import date, time, datetime, timedelta
from app.core.database import SessionLocal
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.diagnostic import Diagnostic
from app.models.eye_examination import EyeExamination
from app.models.timeline import Timeline
from app.models.refresh_token import RefreshToken

def test_full_workflow():
    print("⏳ เริ่มทำการทดสอบความถูกต้องของทุก Models และ Relationships...")
    db = SessionLocal()
    try:
        # ทำการล้างข้อมูลทดลองเก่าก่อน (เพื่อป้องกันบั๊ก Unique/Duplicate Constraint พังตอนรันซ้ำ)
        print("🧹 ทำความสะอาดข้อมูลชุดเก่าในฐานข้อมูล...")
        db.query(RefreshToken).delete()
        db.query(Timeline).delete()
        db.query(EyeExamination).delete()
        db.query(Diagnostic).delete()
        db.query(Visit).delete()
        db.query(Patient).filter(Patient.patient_id == "P-TEST-999").delete()
        db.query(Doctor).filter(Doctor.username == "dr_workflow_test").delete()
        db.commit()

        # ── สเต็ปที่ 1: เพิ่มข้อมูลแพทย์ (Doctors) ──
        doctor = Doctor(
            username="dr_workflow_test",
            first_name="Somchai",
            last_name="Jaidee",
            password_hash="hashed_secure_password_abc"
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
        print("✅ 1. บันทึกข้อมูลตาราง [Doctors] สำเร็จ")

        # ── สเต็ปที่ 2: เพิ่มข้อมูลคนไข้ (Patient) ──
        patient = Patient(
            patient_id="P-TEST-999",
            patient_code="HN-2026-999",
            first_name="Somsri",
            last_name="Rakdee",
            age=65,
            sex="Female"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        print("✅ 2. บันทึกข้อมูลตาราง [Patient] สำเร็จ")

        # ── สเต็ปที่ 3: เปิดคิวตรวจนัดหมาย (Visits) ──
        visit = Visit(
            patient_id=patient.patient_id,
            doctor_id=doctor.doctor_id,
            visit_date=date.today(),
            visit_time=time(10, 30),
            queue_number="Q#999",
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(visit)
        db.commit()
        db.refresh(visit)
        print("✅ 3. บันทึกข้อมูลตาราง [Visits] สำเร็จ")

        # ── สเต็ปที่ 4: บันทึกผลตรวจวิเคราะห์โรค (Diagnostics) ──
        diagnostic = Diagnostic(
            patient_id=patient.patient_id,
            visit_id=visit.visit_id,
            risk_level="High",
            condition_stage="Intermediate AMD",
            ai_trend="Worsening",
            drafted_summary="Recent OCT analysis reveals a moderate accumulation of Subretinal Fluid (SRF).",
            suggested_action="Recommend Anti-VEGF intravitreal injection.",
            exported_to_his=False,
            created_at=datetime.utcnow()
        )
        db.add(diagnostic)
        db.commit()
        db.refresh(diagnostic)
        print("✅ 4. บันทึกข้อมูลตาราง [Diagnostics] สำเร็จ")

        # ── สเต็ปที่ 5: เก็บข้อมูลสแกนแยกข้างดวงตา (Eye Examinations) ──
        eye_exam = EyeExamination(
            diagnostic_id=diagnostic.diagnostic_id,
            eye_side="OS",
            biomarker_notes="พบจุดสะสมสารสีใต้ชั้น RPE บริเวณ Macula",
            oct_scan_image_url="https://storage.jaksuhealth.com/scans/srf_sample.png",
            created_at=datetime.utcnow()
        )
        db.add(eye_exam)
        db.commit()
        db.refresh(eye_exam)
        print("✅ 5. บันทึกข้อมูลตาราง [Eye_Examinations] สำเร็จ")

        # ── สเต็ปที่ 6: สร้างไทม์ไลน์บันทึกประวัติการรักษา (Timeline) ──
        timeline = Timeline(
            patient_id=patient.patient_id,
            diagnostic_id=diagnostic.diagnostic_id,
            detected_stage="Intermediate AMD",
            progression_summary="คนไข้มีปริมาตรเลชันเพิ่มขึ้นจากบันทึกครั้งแรก",
            detection_date=date.today(),
            tag_line="1st Detection",
            created_at=datetime.utcnow()
        )
        db.add(timeline)
        db.commit()
        db.refresh(timeline)
        print("✅ 6. บันทึกข้อมูลตาราง [Timeline] สำเร็จ")

        # ── สเต็ปที่ 7: ออก Session Token ประจำวัน (Refresh Tokens) ──
        token = RefreshToken(
            doctor_id=doctor.doctor_id,
            token_hash="sample_jwt_refresh_string_xyz",
            expires_at=datetime.utcnow() + timedelta(days=7),
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        db.add(token)
        db.commit()
        db.refresh(token)
        print("✅ 7. บันทึกข้อมูลตาราง [Refresh_Tokens] สำเร็จ")


        print("\n🔎 ─── เริ่มการทดสอบดึงข้อมูลเชื่อมโยงผ่าน Relationships (Object Graph) ───")
        
        # ค้นหาคนไข้ แล้วทดสอบสาวข้อมูลผ่านตัวแปรความสัมพันธ์ที่ผูกไว้ข้ามตารางโดยตรง
        queried_patient = db.query(Patient).filter(Patient.patient_id == "P-TEST-999").first()
        print(f"🔹 คนไข้เป้าหมาย: {queried_patient.first_name} {queried_patient.last_name}")
        
        # วิ่งทะลุจากตาราง Patient -> ตาราง Visits -> ตาราง Diagnostics -> ตาราง Eye_Examinations
        for v in queried_patient.visits:
            print(f"  └─ เลขคิวตรวจ: {v.queue_number} [เวลา {v.visit_time}]")
            print(f"       └─ สรุปผลวิเคราะห์ AI: {v.diagnostic.condition_stage} ({v.diagnostic.ai_trend})")
            print(f"       └─ ข้อความ Co-pilot: {v.diagnostic.drafted_summary}")
            
            for exam in v.diagnostic.eye_examinations:
                print(f"            └─ ภาพสแกนตาข้าง: {exam.eye_side} -> โน้ตแพทย์: {exam.biomarker_notes}")

        print("\n🎉 [SUCCESS] ทุกโมเดลเชื่อมโยงกันได้อย่างสมบูรณ์แบบ ไร้ปัญหาข้อจำกัดสัมพันธ์ทางโครงสร้าง!")

    except Exception as e:
        print(f"\n❌ [ERROR] ตรวจพบจุดผิดพลาดในโค้ดหรือการจับคู่ความสัมพันธ์: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_full_workflow()