import threading
import time
import logging
from datetime import date
from app.core.database import SessionLocal
from app.models.visit import Visit
from seed_db import seed

logger = logging.getLogger("uvicorn.error")

def check_db_changes_and_rollback():
    """
    ตรวจสอบว่าคิวตรวจ (Visits) ของวันนี้มีการเปลี่ยนสถานะจาก PENDING หรือไม่
    (เช่น เปลี่ยนเป็น COMPLETE หรือ HIGH RISK หลังจากการตรวจ/Approve)
    หากพบ ให้ทำการ Rollback ฐานข้อมูลกลับมาด้วย seed()
    """
    db = SessionLocal()
    try:
        today = date.today()
        # ค้นหาว่ามี Visits ของวันนี้ ที่ไม่ใช่ PENDING หรือไม่
        modified_visits = db.query(Visit).filter(
            Visit.visit_date == today,
            Visit.status != "PENDING"
        ).count()

        if modified_visits > 0:
            logger.info("⚠️ [Database Monitor] พบการแก้ไขหรือ Approve คนไข้ในฐานข้อมูล! กำลังดำเนินการ Rollback...")
            seed()
            logger.info("✅ [Database Monitor] ดำเนินการ Rollback และบันทึกข้อมูลตั้งต้น (Seed) เรียบร้อย")
        else:
            logger.info("ℹ [Database Monitor] ไม่พบการเปลี่ยนแปลงข้อมูลคิวตรวจวันนี้ (สถานะยังคงเป็น PENDING)")
    except Exception as e:
        logger.error(f"❌ [Database Monitor] เกิดข้อผิดพลาดขณะตรวจสอบฐานข้อมูล: {e}")
    finally:
        db.close()

def db_monitor_loop():
    """
    ลูปการทำงานใน Background Thread วิ่งตรวจทุก 5 นาที (300 วินาที)
    """
    logger.info("🕒 [Database Monitor] เริ่มต้นการตรวจสอบข้อมูล Database อัตโนมัติทุกๆ 5 นาที")
    while True:
        try:
            # ตรวจสอบทุกๆ 300 วินาที (5 นาที)
            time.sleep(300)
            check_db_changes_and_rollback()
        except Exception as e:
            logger.error(f"❌ [Database Monitor] ข้อผิดพลาดในลูปหลัก: {e}")

def start_db_monitor():
    """
    เริ่มต้น Background Thread สำหรับการตรวจจับ DB
    """
    monitor_thread = threading.Thread(target=db_monitor_loop, daemon=True)
    monitor_thread.start()
