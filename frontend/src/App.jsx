import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard'; 
import Diagnostic from './pages/Diagnostic/Diagnostic';
import Login from './pages/Login/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. ถ้าพิมพ์แค่ localhost:5173/ (หน้าแรกสุด) ให้เด้งไปหน้า Login ทันที */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 2. เส้นทางสำหรับหน้า Login (เป็นหน้าเดี่ยวๆ ไม่มี Navbar มารบกวน) */}
        <Route path="/login" element={<Login />} />

        {/* 3. กลุ่มหน้าในระบบ (ถูกครอบด้วย MainLayout เพื่อให้มี Navbar เสมอ) */}
        {/* สังเกตว่าเราเอา path="/" ออกจากตรงนี้แล้วเปลี่ยนมาใช้แค่ element */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;