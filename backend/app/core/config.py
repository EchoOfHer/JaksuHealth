from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # ตัวแปรเหล่านี้จะถูกดึงมาจาก Environment (ที่ตั้งไว้ใน docker-compose.yml)
    DB_HOST: str
    DB_PORT: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # ตัวแปรเสริมสำหรับการเชื่อมต่อ AI Servers (เป็นตัวเลือกเสริม)
    LLM_SERVER_URL: Optional[str] = None
    CV_SERVER_URL: Optional[str] = None

    @property
    def DATABASE_URL(self) -> str:
        # ประกอบร่าง URL สำหรับเชื่อมต่อ PostgreSQL
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"
        extra = "ignore" # ยอมให้มีตัวแปรอื่นใน .env โดยไม่พ่น Error

settings = Settings()