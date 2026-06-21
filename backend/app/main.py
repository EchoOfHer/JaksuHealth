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

def get_dataset_dir():
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

dataset_dir = get_dataset_dir()
if os.path.exists(dataset_dir):
    app.mount("/api/v1/dataset", StaticFiles(directory=dataset_dir), name="dataset")

@app.get("/")
def root():
    return {"message": "ยินดีต้อนรับสู่ระบบบริการข้อมูลหลังบ้าน JaksuHealth API"}

@app.on_event("startup")
def startup_event():
    start_db_monitor()