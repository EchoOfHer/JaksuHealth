import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function MainLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ECECEC' }}>
      
      {/* Navbar จะลอยอยู่ด้านบนสุดเสมอ */}
      <Navbar />

      {/* ส่วนเนื้อหาหลักของแต่ละหน้า */}
      <div style={{ 
        flex: 1, 
        padding: '40px', 
        paddingTop: '110px', // ดันพื้นที่ด้านบนลงมา (ชดเชยความสูง Navbar 70px + ช่องไฟด้านบน 20px + ระยะห่าง)
        overflowY: 'auto' 
      }}>
        {/* เนื้อหาของหน้า Dashboard / Diagnostic / Progression จะมาเปลี่ยนตรงนี้โดยไม่ชน Navbar */}
        <Outlet /> 
      </div>

    </div>
  );
}

export default MainLayout;