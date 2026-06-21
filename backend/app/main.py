from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.patient import router as patient_router
from app.api.v1.visit import router as visit_router
from app.api.v1.diagnostic import router as diagnostic_router
from app.core.scheduler import start_db_monitor

app = FastAPI(
    title="JaksuHealth API",
    description="ระบบหลังบ้านสำหรับแพลตฟอร์มวิเคราะห์และวินิจฉัยโรคจอประสาทตา",
    version="1.0.0"
)

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ผูกขาดเส้นทางเดินข้อมูล API ทั้งหมดเข้าจุดศูนย์กลาง
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(patient_router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(visit_router, prefix="/api/v1/visits", tags=["Visits (Queues)"])
app.include_router(diagnostic_router, prefix="/api/v1/diagnostics", tags=["Diagnostics & Progression"])

# Mount static folder for dataset scans
from fastapi.staticfiles import StaticFiles
import os
dataset_dir = "D:\\JaksuHealth\\frontend\\public\\dataset"
if os.path.exists(dataset_dir):
    app.mount("/api/v1/dataset", StaticFiles(directory=dataset_dir), name="dataset")

@app.get("/")
def root():
    return {"message": "ยินดีต้อนรับสู่ระบบบริการข้อมูลหลังบ้าน JaksuHealth API"}

@app.on_event("startup")
def startup_event():
    start_db_monitor()