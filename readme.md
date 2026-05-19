Folder structure
===========================================
JaksuHealth-Web/
├── backend/                     # ระบบหลังบ้าน FastAPI (บีม + Q)
│   ├── app/
│   │   ├── main.py              # Entry point หลัก และตัวเปิด CORS ให้หน้าบ้านยิงเข้าได้
│   │   ├── api/                 # Endpoints (auth.py, patients.py, predict.py)
│   │   ├── core/                # Config ฐานข้อมูล RDS, ความปลอดภัย JWT
│   │   ├── models/              # ตารางข้อมูลคนไข้และผลสแกน (SQLAlchemy)
│   │   ├── schemas/             # Pydantic ตรวจสอบรูปแบบข้อมูลเข้า-ออก
│   │   └── services/            # ตัวเชื่อมต่อ AWS S3 และโค้ดเรียกใช้ไฟล์โมเดล AI
│   ├── Dockerfile
│   └── requirements.txt         # ลงเฉพาะ Library ที่เว็บต้องใช้ (เช่น fastapi, sqlalchemy, boto3)
│
├── frontend/                    # ระบบหน้าบ้าน React (Q ดูแลหลัก)
│   ├── src/
│   │   ├── components/          # ชิ้นส่วน UI (Sidebar, ImageUploader, SegmentationMap)
│   │   ├── pages/               # หน้าหลัก (Login, Dashboard, PatientList, Analysis)
│   │   ├── config/              # api.js ตั้งค่า URL ยิงหาหลังบ้าน
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml           # 🚀 รันทั้งหน้าบ้านหลังบ้านพร้อมกันบน EC2 ด้วยคำสั่งเดียว
├── .gitignore
└── README.md                    # เอกสารอธิบายการรันระบบเว็บ