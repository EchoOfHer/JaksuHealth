import threading
import time
import logging
import json
import os
from datetime import date, datetime
from app.core.database import SessionLocal
from app.models.visit import Visit
from seed_db import seed

logger = logging.getLogger("uvicorn.error")

HISTORY_FILE = "rollback_history.json"

def log_rollback_event(status, issue="None"):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            pass
            
    record = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": status,
        "issue": issue
    }
    history.append(record)
    
    if len(history) > 200:
        history = history[-200:]
        
    for idx, item in enumerate(history):
        item["id"] = idx + 1
        
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to write history: {e}")

# Global variables for monitoring
last_check_time = time.time()
last_rollback_time = None

def get_rollback_status():
    global last_check_time, last_rollback_time
    elapsed = time.time() - last_check_time
    remaining = max(0.0, 300.0 - elapsed)
    return {
        "seconds_remaining": int(remaining),
        "minutes_remaining": round(remaining / 60.0, 1),
        "last_rollback": last_rollback_time
    }

def check_db_changes_and_rollback():
    """
    ตรวจสอบว่าคิวตรวจ (Visits) ของวันนี้มีการเปลี่ยนสถานะจาก PENDING หรือไม่
    (เช่น เปลี่ยนเป็น COMPLETE หรือ HIGH RISK หลังจากการตรวจ/Approve)
    หากพบ ให้ทำการ Rollback ฐานข้อมูลกลับมาด้วย seed()
    """
    global last_rollback_time
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
            try:
                seed()
                from datetime import datetime as dt
                last_rollback_time = dt.utcnow().isoformat() + "Z"
                logger.info("✅ [Database Monitor] ดำเนินการ Rollback และบันทึกข้อมูลตั้งต้น (Seed) เรียบร้อย")
                log_rollback_event("Success", "None")
            except Exception as e:
                logger.error(f"❌ [Database Monitor] ดำเนินการ Rollback ล้มเหลว: {e}")
                log_rollback_event("Failed", str(e))
                raise e
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
    global last_check_time
    while True:
        try:
            last_check_time = time.time()
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
