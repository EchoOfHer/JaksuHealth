import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* หน้าหลักที่โดนครอบด้วย Navbar */}
        <Route path="/" element={<MainLayout />}>
          {/* เข้าเว็บมาปุ๊บ ให้วิ่งไปหน้า Dashboard อัตโนมัติ */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="diagnostic" element={<div>นี่คือหน้า Diagnostic Workspace</div>} />
        </Route>
        
        {/* หน้า Login เดี่ยวๆ (เดี๋ยวเราค่อยมาทำทีหลัง) */}
        <Route path="/login" element={<div>นี่คือหน้า Login เดี่ยวๆ</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;