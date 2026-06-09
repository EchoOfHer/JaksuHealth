import React, { useState, useEffect } from 'react'; // 🌟 1. เติมนำเข้า useState และ useEffect ตรงนี้
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard'; 
import Diagnostic from './pages/Diagnostic/Diagnostic';
import Login from './pages/Login/Login';

// 🌟 2. Import หน้า Individual (หน้ารายบุคคลจริงที่คุณเพิ่งสร้างเสร็จ)
import Individual from './pages/Diagnostic/IndividualDiagnostic'; // 👈 หรือปรับเปลี่ยนโฟลเดอร์ตามที่คุณบันทึกไฟล์ไว้ เช่น './pages/Individual/IndividualDiagnostic'
import ProgressionPage from './pages/Progression/Progression'; // หน้าวิเคราะห์แนวโน้มเดิม

function AppRoutes() {
  // 🌟 3. สร้างสถานะเพื่อเก็บข้อมูลคนไข้ที่ถูกกด Diagnose
  const [selectedPatient, setSelectedPatient] = useState(null);
  const location = useLocation();

  // 🌟 4. ตรวจจับการเปลี่ยนหน้า: หากย้ายออกจากหน้า /diagnostic ให้ล้างประวัติคนไข้ที่เลือกเพื่อกลับไปหน้าหลัก
  useEffect(() => {
    if (location.pathname !== '/diagnostic') {
      setSelectedPatient(null);
    }
  }, [location.pathname]);

  return (
    <Routes>
      {/* 1. ถ้าพิมพ์แค่ localhost:5173/ ให้เด้งไปหน้า Login ทันที */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 2. เส้นทางสำหรับหน้า Login (Redirect to Dashboard) */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      {/* 3. กลุ่มหน้าในระบบ (ครอบด้วย MainLayout) */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 🌟 5. แก้ Route นี้: หากยังไม่มีการเลือกคนไข้ ให้แสดงหน้า Diagnostic (รายชื่อคนไข้ทั้งหมด)
            แต่ถ้าหากกดปุ่ม Diagnose แล้ว จะเปลี่ยนมาเรนเดอร์หน้า Individual พร้อมส่งข้อมูลคนไข้ไปทันที */}
        <Route 
          path="/diagnostic" 
          element={
            selectedPatient === null ? (
              <Diagnostic onSelectPatient={(patient) => setSelectedPatient(patient)} />
            ) : (
              <Individual 
                patient={selectedPatient} 
                onBack={() => setSelectedPatient(null)} 
              />
            )
          } 
        />
        
        {/* หน้าประเมินการดำเนินโรคของคนไข้ */}
        <Route path="/progression" element={<ProgressionPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;