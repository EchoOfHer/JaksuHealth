from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

# โครงสร้างพื้นฐานของผลวินิจฉัยโรคตา (Diagnostics)
class DiagnosticBase(BaseModel):
    patient_id: str
    visit_id: UUID
    risk_level: str # HIGH RISK, MED, LOW
    condition_stage: str # Intermediate AMD, Early AMD, Normal, Other
    ai_trend: str # Worsening, Stable, Normal
    drafted_summary: str
    suggested_action: str
    exported_to_his: bool = False

# ข้อมูลที่ส่งมาตอนบันทึกผลวินิจฉัยเสร็จสิ้น
class DiagnosticCreate(DiagnosticBase):
    pass

# ข้อมูลการวินิจฉัยที่ส่งกลับสำหรับหน้าวิเคราะห์ของแพทย์
class DiagnosticResponse(DiagnosticBase):
    diagnostic_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
