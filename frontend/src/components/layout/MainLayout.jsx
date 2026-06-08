import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function MainLayout() {
  return (
    <div className="main-layout-container">
      
      {/* Navbar จะลอยอยู่ด้านบนสุดเสมอ */}
      <Navbar />

      {/* ส่วนเนื้อหาหลักของแต่ละหน้า */}
      <div className="main-content-wrapper">
        {/* เนื้อหาของหน้า Dashboard / Diagnostic / Progression จะมาเปลี่ยนตรงนี้โดยไม่ชน Navbar */}
        <Outlet /> 
      </div>

    </div>
  );
}

export default MainLayout;