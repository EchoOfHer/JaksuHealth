# JaksuHealth Frontend - Branching & Task Strategy

โปรเจกต์นี้ใช้ระบบ Feature Branching โดยจะแตก Branch ออกจาก `main` (หรือ `develop`) เพื่อพัฒนาทีละส่วน

## 🌿 รายการ Branches และรายละเอียดงาน

### 1. `feature/layout` (โครงสร้างหลักของเว็บ)
- [ ] สร้าง Navbar ด้านบน (พิจารณาเพิ่ม 1 menu ตามความเหมาะสมของการนำทาง)
- [ ] สร้าง Sidebar แถบเมนูด้านซ้ายสำหรับเปลี่ยนหน้า
- [ ] เตรียมวิธีที่หมอจะสามารถเข้าถึงข้อมูลคนไข้แต่ละคนได้ก่อนที่จะเจาะลึกเข้าไปดูหน้า Diagnostic หรือ Progression

### 2. `feature/dashboard` (หน้าภาพรวมรายวัน)
- [ ] ออกแบบและสร้าง Wireframe / Skeleton สำหรับหน้า Dashboard ก่อนลง UI จริง
- [ ] สร้างกล่องสรุปตัวเลข (Pending, High Risk, Complete)
- [ ] สร้างตาราง Worklist แสดงคิวคนไข้
- [ ] ดึงข้อมูลรายการจาก HIS ของโรงพยาบาล (จำลองข้อมูลเป็น Mockup ก่อน โดยจะไม่มีการสร้าง New Diagnosis แบบ Manual ในหน้านี้)

### 3. `feature/diagnostic` (หน้าจอวิเคราะห์ผลสแกน)
- [ ] สร้างหน้า UI สำหรับแสดง OCT Slice View
- [ ] จัดเรียงลำดับข้อมูลการแสดงผลให้สอดคล้องกับสิ่งที่แพทย์จะมองหาเป็นอย่างแรกเวลาตรวจ
- [ ] สร้าง UI ส่วน ✨ AI Clinical Co-pilot (Powered by LLM)
- [ ] ทำช่องแสดง Drafted Summary (เช่น ปริมาตร Drusen) และ Suggested Action
- [ ] สร้างปุ่ม Action: Edit Text, Copy to Hospital HIS, และ Approve & Save

### 4. `feature/progression` (หน้าติดตามอาการต่อเนื่อง)
- [ ] สร้างหน้าดู Progression ของคนไข้เพื่อติดตามผลว่าหลังการรักษาไปแต่ละครั้งเป็นอย่างไร (ใช้หน้านี้เป็นหลักแทนหน้า History ทั่วไป)
- [ ] สร้างกราฟหรือ Timeline เปรียบเทียบผลการตรวจในอดีตกับปัจจุบัน (Worsening / Stable / Normal)
- [ ] สร้างหน้า Comparative View เพื่อเปรียบเทียบภาพสแกนดวงตา (OS / OD)

### 5. `feature/auth` (ระบบเข้าใช้งาน)
- [ ] สร้างหน้า Login UI (Username / Password)
- [ ] เตรียม State หรือ Context สำหรับจัดการ User Session (JWT / Access Token)