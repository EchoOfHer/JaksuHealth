from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# 1. สร้าง Engine เชื่อมต่อ (echo=True จะช่วยปริ้นท์ SQL ออกมาใน Console ให้เราตรวจสอบง่ายตอน Dev)
engine = create_engine(settings.DATABASE_URL, echo=True)

# 2. สร้าง Session Factory เพื่อใช้สร้าง Database Session สำหรับแต่ละ Request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. สร้าง Base Class เพื่อให้ Model ของเรานำไปสืบทอด (Inherit)
class Base(DeclarativeBase):
    pass

# 4. Dependency ฟังก์ชันสำหรับดึง Session ไปใช้ใน API Routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()