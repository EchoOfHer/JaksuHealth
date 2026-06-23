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

def seed():
    db = SessionLocal()
    try:
        # 1. ทำความสะอาดข้อมูลเก่า (ถ้ามี)
        db.query(RefreshToken).delete()
        db.query(Timeline).delete()
        db.query(EyeExamination).delete()
        db.query(Diagnostic).delete()
        db.query(Visit).delete()
        db.query(Patient).delete()
        db.query(Doctor).delete()
        db.commit()
        print("[OK] Old data cleared successfully")

        # 2. เพิ่มแพทย์ EchoOfHer (รหัสผ่าน 1234 ผ่านการแฮช SHA-256)
        password_hash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
        doc = Doctor(
            doctor_id=uuid.UUID("36197f2b-bd63-408a-b7a0-a7064bded706"),
            username="EchoOfHer",
            first_name="Somchai",
            last_name="Jaidee",
            password_hash=password_hash
        )
        db.add(doc)
        db.commit()
        print("[OK] Doctor seeded (username: 'EchoOfHer' / password: '1234')")

        # 3. บันทึกรายชื่อคนไข้ทั้ง 3 คน
        p1 = Patient(
            patient_id="P-2605-016",
            patient_code="HN-2605-016",
            first_name="Khanatip",
            last_name="Gankingpai",
            age=65,
            sex="Male",
            created_at=datetime.utcnow() - timedelta(days=400)
        )
        p2 = Patient(
            patient_id="P-2605-012",
            patient_code="HN-2605-012",
            first_name="Jirawat",
            last_name="Jakthong",
            age=58,
            sex="Male",
            created_at=datetime.utcnow() - timedelta(days=300)
        )
        p3 = Patient(
            patient_id="P-2605-037",
            patient_code="HN-2605-037",
            first_name="Natthawut",
            last_name="Saengmani",
            age=70,
            sex="Male",
            created_at=datetime.utcnow() - timedelta(days=200)
        )
        db.add_all([p1, p2, p3])
        db.commit()
        print("✅ บันทึกข้อมูลคนไข้ทั้ง 3 รายสำเร็จ")

        # 4. บันทึกข้อมูลคิวตรวจวันนี้ (วันนี้จะแสดงเป็นสถานะ PENDING บนหน้า Dashboard)
        today = date.today()
        v1 = Visit(
            visit_id=uuid.UUID("39a2fe63-8bfd-406d-a51b-1c4495b8d00e"),
            patient_id=p1.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=today,
            visit_time=time(10, 0),
            queue_number="Q#001",
            status="PENDING",
            created_at=datetime.utcnow()
        )
        v2 = Visit(
            visit_id=uuid.UUID("49a2fe63-8bfd-406d-a51b-1c4495b8d00f"),
            patient_id=p2.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=today,
            visit_time=time(10, 15),
            queue_number="Q#002",
            status="PENDING",
            created_at=datetime.utcnow()
        )
        v3 = Visit(
            visit_id=uuid.UUID("59a2fe63-8bfd-406d-a51b-1c4495b8d00e"),
            patient_id=p3.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=today,
            visit_time=time(10, 30),
            queue_number="Q#003",
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add_all([v1, v2, v3])
        db.commit()
        
        # Pre-calculate Tier 1 CV rules for Dashboard
        # P-2605-016
        d1_os = Diagnostic(patient_id=p1.patient_id, visit_id=v1.visit_id, eye_side="OS", risk_level="High", condition_stage="Intermediate AMD", ai_trend="", drafted_summary="", suggested_action="")
        d1_od = Diagnostic(patient_id=p1.patient_id, visit_id=v1.visit_id, eye_side="OD", risk_level="Medium", condition_stage="Early AMD", ai_trend="", drafted_summary="", suggested_action="")
        # P-2605-012
        d2_os = Diagnostic(patient_id=p2.patient_id, visit_id=v2.visit_id, eye_side="OS", risk_level="Medium", condition_stage="Early AMD", ai_trend="", drafted_summary="", suggested_action="")
        d2_od = Diagnostic(patient_id=p2.patient_id, visit_id=v2.visit_id, eye_side="OD", risk_level="Low", condition_stage="Normal", ai_trend="", drafted_summary="", suggested_action="")
        # P-2605-037
        d3_os = Diagnostic(patient_id=p3.patient_id, visit_id=v3.visit_id, eye_side="OS", risk_level="Low", condition_stage="Normal", ai_trend="", drafted_summary="", suggested_action="")
        d3_od = Diagnostic(patient_id=p3.patient_id, visit_id=v3.visit_id, eye_side="OD", risk_level="Low", condition_stage="Normal", ai_trend="", drafted_summary="", suggested_action="")
        
        db.add_all([d1_os, d1_od, d2_os, d2_od, d3_os, d3_od])
        db.commit()
        
        print("✅ เปิดคิวตรวจนัดหมาย (Visits) และคำนวณ CV Risk ล่วงหน้าสำหรับ Dashboard เรียบร้อย")

        # 5. เพิ่มข้อมูลประวัติย้อนหลัง (เพื่อเอาไปทำกราฟแนวโน้ม Progression)
        # -- ประวัติคนไข้ Khanatip Gankingpai --
        # ตรวจครั้งที่ 1 (Jul 22, 2023) - ผลปกติ
        v_h1 = Visit(
            visit_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=date(2023, 7, 22),
            visit_time=time(9, 30),
            queue_number="Q#777",
            status="COMPLETE",
            created_at=datetime(2023, 7, 22, 9, 30)
        )
        db.add(v_h1)
        db.flush()
        d_h1 = Diagnostic(
            diagnostic_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            visit_id=v_h1.visit_id,
            eye_side="OS",
            risk_level="Low",
            condition_stage="Normal",
            ai_trend="Normal",
            drafted_summary="The retina appears completely normal with no signs of drusen or fluid accumulation. Comparative review against previous baseline scan confirms no progression.",
            suggested_action="Routine follow-up in 12 months.",
            exported_to_his=True,
            created_at=datetime(2023, 7, 22, 10, 0)
        )
        db.add(d_h1)
        db.flush()
        t_h1 = Timeline(
            history_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            diagnostic_id=d_h1.diagnostic_id,
            detected_stage="Normal",
            progression_summary=d_h1.drafted_summary,
            detection_date=date(2023, 7, 22),
            tag_line="Baseline",
            created_at=datetime(2023, 7, 22, 10, 0)
        )
        db.add(t_h1)

        # ตรวจครั้งที่ 2 (Jan 15, 2024) - พบตาทรุดตัวระยะแรก
        v_h2 = Visit(
            visit_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=date(2024, 1, 15),
            visit_time=time(14, 15),
            queue_number="Q#888",
            status="COMPLETE",
            created_at=datetime(2024, 1, 15, 14, 15)
        )
        db.add(v_h2)
        db.flush()
        d_h2 = Diagnostic(
            diagnostic_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            visit_id=v_h2.visit_id,
            eye_side="OS",
            risk_level="Medium",
            condition_stage="Early AMD",
            ai_trend="Stable",
            drafted_summary="Early signs of AMD detected with drusen accumulation. IS/OS junction remains intact.",
            suggested_action="Monitor changes in vision, check grids, follow-up in 6 months.",
            exported_to_his=True,
            created_at=datetime(2024, 1, 15, 15, 0)
        )
        db.add(d_h2)
        db.flush()
        t_h2 = Timeline(
            history_id=uuid.uuid4(),
            patient_id=p1.patient_id,
            diagnostic_id=d_h2.diagnostic_id,
            detected_stage="Early AMD",
            progression_summary=d_h2.drafted_summary,
            detection_date=date(2024, 1, 15),
            tag_line="1st Detection",
            created_at=datetime(2024, 1, 15, 15, 0)
        )
        db.add(t_h2)

        # -- ประวัติคนไข้ Jirawat Jakthong --
        # ตรวจครั้งที่ 1 (Oct 05, 2023) - ปกติ
        v_j1 = Visit(
            visit_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=date(2023, 10, 5),
            visit_time=time(11, 0),
            queue_number="Q#101",
            status="COMPLETE",
            created_at=datetime(2023, 10, 5, 11, 0)
        )
        db.add(v_j1)
        db.flush()
        d_j1 = Diagnostic(
            diagnostic_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            visit_id=v_j1.visit_id,
            eye_side="OS",
            risk_level="Low",
            condition_stage="Normal",
            ai_trend="Normal",
            drafted_summary="The retina appears completely normal with no signs of drusen or fluid accumulation.",
            suggested_action="Routine follow-up in 12 months.",
            exported_to_his=True,
            created_at=datetime(2023, 10, 5, 11, 30)
        )
        db.add(d_j1)
        db.flush()
        t_j1 = Timeline(
            history_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            diagnostic_id=d_j1.diagnostic_id,
            detected_stage="Normal",
            progression_summary=d_j1.drafted_summary,
            detection_date=date(2023, 10, 5),
            tag_line="Baseline",
            created_at=datetime(2023, 10, 5, 11, 30)
        )
        db.add(t_j1)

        # ตรวจครั้งที่ 2 (Dec 10, 2023) - พบระยะเริ่มต้นทรงตัว
        v_j2 = Visit(
            visit_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=date(2023, 12, 10),
            visit_time=time(13, 0),
            queue_number="Q#102",
            status="COMPLETE",
            created_at=datetime(2023, 12, 10, 13, 0)
        )
        db.add(v_j2)
        db.flush()
        d_j2 = Diagnostic(
            diagnostic_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            visit_id=v_j2.visit_id,
            eye_side="OS",
            risk_level="Medium",
            condition_stage="Early AMD",
            ai_trend="Stable",
            drafted_summary="Early AMD findings are well-maintained with recommendation of routine follow-up.",
            suggested_action="Recommend routine follow-up.",
            exported_to_his=True,
            created_at=datetime(2023, 12, 10, 13, 30)
        )
        db.add(d_j2)
        db.flush()
        t_j2 = Timeline(
            history_id=uuid.uuid4(),
            patient_id=p2.patient_id,
            diagnostic_id=d_j2.diagnostic_id,
            detected_stage="Early AMD",
            progression_summary=d_j2.drafted_summary,
            detection_date=date(2023, 12, 10),
            tag_line="1st Detection",
            created_at=datetime(2023, 12, 10, 13, 30)
        )
        db.add(t_j2)

        # -- ประวัติคนไข้ Natthawut Saengmani --
        # ตรวจครั้งที่ 1 (Jul 22, 2023) - ปกติ
        v_n1 = Visit(
            visit_id=uuid.uuid4(),
            patient_id=p3.patient_id,
            doctor_id=doc.doctor_id,
            visit_date=date(2023, 7, 22),
            visit_time=time(15, 0),
            queue_number="Q#301",
            status="COMPLETE",
            created_at=datetime(2023, 7, 22, 15, 0)
        )
        db.add(v_n1)
        db.flush()
        d_n1 = Diagnostic(
            diagnostic_id=uuid.uuid4(),
            patient_id=p3.patient_id,
            visit_id=v_n1.visit_id,
            eye_side="OS",
            risk_level="Low",
            condition_stage="Normal",
            ai_trend="Normal",
            drafted_summary="The retina appears completely normal with no signs of drusen or fluid accumulation.",
            suggested_action="Routine follow-up in 12 months.",
            exported_to_his=True,
            created_at=datetime(2023, 7, 22, 15, 30)
        )
        db.add(d_n1)
        db.flush()
        t_n1 = Timeline(
            history_id=uuid.uuid4(),
            patient_id=p3.patient_id,
            diagnostic_id=d_n1.diagnostic_id,
            detected_stage="Normal",
            progression_summary=d_n1.drafted_summary,
            detection_date=date(2023, 7, 22),
            tag_line="Baseline",
            created_at=datetime(2023, 7, 22, 15, 30)
        )
        db.add(t_n1)

        db.commit()
        print("🎉 สำเร็จ! ข้อมูล Seed ถูกบรรจุลงฐานข้อมูลเรียบร้อย")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดตอนใส่ข้อมูล: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()