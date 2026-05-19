# 1. ใช้ร่างจำลอง Python ขนาดกำลังดีและเสถียร
FROM python:3.11-slim

# 2. ตั้งค่าโฟลเดอร์ทำงานหลักใน Container
WORKDIR /app

# 3. ติดตั้งเครื่องมือของระบบ Linux ที่จำเป็น (เช่น ตัวดึงข้อมูลทางการแพทย์หรือจัดการภาพพื้นฐาน)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. ก๊อปปี้ไฟล์รายการ Library เข้าไปติดตั้งก่อนเพื่อใช้ประโยชน์จาก Docker Cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 5. ก๊อปปี้โค้ด FastAPI ทั้งหมดในโฟลเดอร์เข้าไปในเครื่องจำลอง
COPY . .

# 6. สั่งเปิดพอร์ต 8000 พอร์ตมาตรฐานของ FastAPI
EXPOSE 8000

# 7. คำสั่งสั่งรันระบบเมื่อ Container สตาร์ทตัว
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]