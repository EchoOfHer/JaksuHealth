import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState('');

  // 1. ฟังก์ชันตั้งค่าวันที่ปัจจุบัน
  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', options);
    setCurrentDate(formattedDate.replace(',', ''));
  }, []);

  // 2. ข้อมูลจำลอง (Mock Data) ดึงจากที่นายเขียนไว้
  const mockPatients = [
    {
      id: "P-2605-016",
      name: "Khanatip Gankingpai",
      queue: "Q#001",
      time: "10:00AM",
      diagnosis: "Inter. AMD",
      riskLevel: "High",
      colorCode: "#EF4444" // แดง
    },
    {
      id: "P-2605-012",
      name: "Jirawat Jakthong",
      queue: "Q#002",
      time: "10:15AM",
      diagnosis: "Early AMD",
      riskLevel: "Medium",
      colorCode: "#FE7743" // ส้ม
    },
    {
      id: "P-2605-037",
      name: "Natthawut Saengmani",
      queue: "Q#003",
      time: "10:30AM",
      diagnosis: "Normal",
      riskLevel: "Low",
      colorCode: "#40a34f" // เขียว
    }
  ];

  return (
    <div className="dashboard-container">
      {/* ส่วนหัวหน้าจอ */}
      <div className="page-header">
        <h1>Today's Overview</h1>
        <p className="date">{currentDate}</p>
      </div>

      {/* กล่องสรุปสถิติ */}
      <div style={{ display: "flex", flexDirection: "row", gap: "40px" }}>
        {/* กล่อง Pending */}
        <div style={{ backgroundColor: "white", width: "300px", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>13</h1>
          <p style={{ backgroundColor: "#FFDDBF", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#FE7743", borderRadius: "10px" }}>PENDING</p>
        </div>

        {/* กล่อง High Risk */}
        <div style={{ backgroundColor: "white", width: "300px", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>2</h1>
          <p style={{ backgroundColor: "#FF8383", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#B20101", borderRadius: "10px" }}>HIGH RISK</p>
        </div>

        {/* กล่อง Complete */}
        <div style={{ backgroundColor: "white", width: "300px", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>3</h1>
          <p style={{ backgroundColor: "#86D392", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#36543A", borderRadius: "10px" }}>COMPLETE</p>
        </div>
      </div>

      <hr style={{ border: "none", height: "2px", backgroundColor: "#000", opacity: "30%", margin: "40px 0 30px 0" }} />
      
      <div style={{ marginBottom: "15px" }}>
        <h1 style={{ fontSize: "30px", color: "#1C1C1E", opacity: "80%" }}>Today's Patient (3)</h1>
      </div>

      {/* Patient List */}
      <div style={{ display: "flex", flexDirection: "column", textAlign: "start", gap: "15px", position: "relative" }}>
        
        {/* วนลูปแสดงรายชื่อคนไข้จาก Array */}
        {mockPatients.map((patient, index) => (
          <div key={index} style={{
            display: "flex", flexDirection: "row", backgroundColor: "white", alignItems: "center", 
            borderLeft: `12px solid ${patient.colorCode}`, borderRadius: "12px", padding: "20px 24px", 
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
          }}>
            <div style={{ width: "25%", marginLeft: "10px" }}>
              <p style={{ fontSize: "25px", fontWeight: "700", color: "#1C1C1E", margin: "0", opacity: "85%" }}>{patient.diagnosis}</p>
              <p style={{ color: patient.colorCode, fontSize: "18px", fontWeight: "600", margin: "10px 0 0 0" }}>{patient.riskLevel}</p>
            </div>
            <div style={{ width: "35%" }}>
              <p style={{ fontSize: "25px", fontWeight: "700", color: "#1C1C1E", margin: "0", opacity: "85%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={patient.name}>
                {patient.name}
              </p>
              <p style={{ color: "#555", fontSize: "18px", fontWeight: "600", margin: "10px 0 0 0", opacity: "75%" }}>{patient.id}</p>
            </div>
            <div style={{ width: "20%" }}>
              <p style={{ fontSize: "25px", fontWeight: "700", color: "#1C1C1E", margin: "0", opacity: "85%" }}>{patient.queue}</p>
              <p style={{ color: "#555", fontSize: "18px", fontWeight: "600", margin: "10px 0 0 0", opacity: "75%" }}>{patient.time}</p>
            </div>
            <div style={{ width: "20%", display: "flex", justifyContent: "flex-end" }}>
              <div className="review">
                <p>Diagnose</p>
                {/* ถ้าเอาไอคอนมาใส่ อย่าลืมแก้ Path รูปภาพตรงนี้นะครับ */}
                <span style={{ marginLeft: "8px", color: "#FE7743" }}>➔</span> 
              </div>
            </div>
          </div>
        ))}

        {/* กล่องควบคุม View All แบบฟุ้งสไลด์เบลอ */}
        <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", height: "150px", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: "100" }}>
          <div style={{
            position: "absolute", top: "0", left: "-12px", right: "-12px", bottom: "0",
            background: "linear-gradient(to bottom, rgba(236, 236, 236, 0) 0%, rgba(236, 236, 236, 0.96) 65%, rgba(236, 236, 236, 1) 100%)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 85%)",
            pointerEvents: "none", borderRadius: "0 0 12px 12px"
          }}></div>
          <button className="view-all-btn" style={{ position: "relative", zIndex: "101", marginBottom: "-20px" }}>
            View All Patients
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;