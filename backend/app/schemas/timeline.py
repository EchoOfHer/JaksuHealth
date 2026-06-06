from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date, datetime

# โครงสร้างพื้นฐานของประวัติไทม์ไลน์การเปลี่ยนแปลงอาการ (Timeline)
class TimelineBase(BaseModel):
    patient_id: str
    diagnostic_id: UUID
    detected_stage: str
    progression_summary: str
    detection_date: date
    tag_line: str

# ข้อมูลส่งเข้าเมื่อเพิ่มเรคคอร์ดไทม์ไลน์ประวัติคนไข้ใหม่
class TimelineCreate(TimelineBase):
    pass

# ข้อมูลประวัติการดำเนินโรคที่จะส่งกลับไปเรนเดอร์ในเส้น Timeline หน้ารายบุคคล
class TimelineResponse(TimelineBase):
    history_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
class TimelineUpdate(BaseModel):
    detected_stage: str
    tag_line: str
    progression_summary: str