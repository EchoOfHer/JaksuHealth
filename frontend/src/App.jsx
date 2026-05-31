import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard'; 
import Diagnostic from './pages/Diagnostic/Diagnostic';
import Login from './pages/Login/Login';

// 1. Import หน้า Progression ที่เราเพิ่งแปลงเสร็จเข้ามา
import ProgressionPage from './pages/Progression/Progression'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. ถ้าพิมพ์แค่ localhost:5173/ (หน้าแรกสุด) ให้เด้งไปหน้า Login ทันที */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 2. เส้นทางสำหรับหน้า Login (เป็นหน้าเดี่ยวๆ ไม่มี Navbar มารบกวน) */}
        <Route path="/login" element={<Login />} />

        {/* 3. กลุ่มหน้าในระบบ (ถูกครอบด้วย MainLayout เพื่อให้มี Navbar เสมอ) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
          
          {/* 🌟 2. เพิ่ม Route สำหรับหน้า Progression ไว้ตรงนี้ 🌟 */}
          <Route path="/progression" element={<ProgressionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;