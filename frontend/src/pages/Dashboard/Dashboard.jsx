import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 1. นำเข้า useNavigate
import './Dashboard.css';
import API from '../../services/api';
const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState('');
  const navigate = useNavigate(); // 👈 2. เรียกใช้งานเครื่องมือนำทาง

  // 1. ฟังก์ชันตั้งค่าวันที่ปัจจุบัน
  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', options);
    setCurrentDate(formattedDate.replace(',', ''));
  }, []);

  // 2. ข้อมูลจำลอง (Mock Data) 
  const loadMockDashboard = () => {
    const saved = localStorage.getItem('mockPatients');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        return list.filter(p => !p.isApproved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444" },
      { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743" },
      { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f" }
    ];
  };

  const loadMockStats = () => {
    const saved = localStorage.getItem('mockPatients');
    let pending = 3;
    let highRisk = 1;
    let complete = 3;

    if (saved) {
      try {
        const list = JSON.parse(saved);
        const approvedCount = list.filter(p => p.isApproved).length;
        pending = list.length - approvedCount;
        highRisk = list.filter(p => p.riskLevel === 'High' && !p.isApproved).length;
        complete = 3 + approvedCount;
      } catch (e) {
        console.error(e);
      }
    }
    return { pending, highRisk, complete };
  };

  const [mockPatients, setMockPatients] = useState(loadMockDashboard);
  const [stats, setStats] = useState(loadMockStats);

  // โหลดรายการและคำนวณสถิติจากหลังบ้านจริง
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await API.get('/visits/pending');
        const data = response.data; // รายการคิวจาก SQL

        if (data && data.length > 0) {
          const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const parts = timeStr.split(':');
            if (parts.length < 2) return timeStr;
            let hours = parseInt(parts[0], 10);
            const minutes = parts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${minutes}${ampm}`;
          };

          const mapped = data.map(v => {
            const pid = v.patient_id;
            const name = `${v.patient.first_name} ${v.patient.last_name}`;
            const time = formatTime(v.visit_time);
            const queue = v.queue_number;

            let diagnosis = 'Pending';
            let riskLevel = 'Medium';
            let colorCode = '#FE7743';

            if (v.diagnostic) {
              diagnosis = v.diagnostic.condition_stage;
              riskLevel = v.diagnostic.risk_level === 'HIGH RISK' ? 'High' : v.diagnostic.risk_level === 'MED' ? 'Medium' : 'Low';
              colorCode = riskLevel === 'High' ? '#EF4444' : riskLevel === 'Medium' ? '#FE7743' : '#40a34f';
            } else {
              // ฐานข้อมูลจริงไม่มี diagnostic (เช่น หลังรัน rollback DB)
              // ล้างสเตตัส mismatch ใน localStorage เพื่อซิงค์กับ DB
              const savedMock = localStorage.getItem('mockPatients');
              if (savedMock) {
                try {
                  const savedList = JSON.parse(savedMock);
                  const index = savedList.findIndex(p => p.id === pid);
                  if (index !== -1) {
                    const defaultDiagnosis = pid === 'P-2605-016' ? 'Intermediate AMD' : pid === 'P-2605-012' ? 'Early AMD' : 'Normal';
                    // ตรวจพบว่าสเตตัสใน localStorage ถูกอนุมัติ (Approved) แล้ว แต่ยังไม่มีการวินิจฉัยใน DB (เกิดจากการ Rollback)
                    if (savedList[index].isApproved) {
                      savedList[index].diagnosis = defaultDiagnosis;
                      savedList[index].riskLevel = pid === 'P-2605-016' ? 'High' : pid === 'P-2605-012' ? 'Medium' : 'Low';
                      savedList[index].colorCode = pid === 'P-2605-016' ? '#EF4444' : pid === 'P-2605-012' ? '#FE7743' : '#40a34f';
                      savedList[index].isApproved = false;
                      localStorage.setItem('mockPatients', JSON.stringify(savedList));

                      localStorage.removeItem(`mockDraft_${pid}_os`);
                      localStorage.removeItem(`mockDraft_${pid}_od`);
                      localStorage.removeItem(`mockVisits_${pid}_os`);
                      localStorage.removeItem(`mockVisits_${pid}_od`);
                    }
                  }
                } catch (e) {
                  console.error(e);
                }
              }

              const savedMockUpdated = localStorage.getItem('mockPatients');
              let foundSaved = false;
              if (savedMockUpdated) {
                try {
                  const savedList = JSON.parse(savedMockUpdated);
                  const matched = savedList.find(p => p.id === pid);
                  if (matched) {
                    diagnosis = matched.diagnosis;
                    riskLevel = matched.riskLevel;
                    colorCode = matched.colorCode;
                    foundSaved = true;
                  }
                } catch (e) {
                  console.error(e);
                }
              }
              if (!foundSaved) {
                if (pid === 'P-2605-016') {
                  diagnosis = 'Intermediate AMD';
                  riskLevel = 'High';
                  colorCode = '#EF4444';
                } else if (pid === 'P-2605-012') {
                  diagnosis = 'Early AMD';
                  riskLevel = 'Medium';
                  colorCode = '#FE7743';
                } else if (pid === 'P-2605-037') {
                  diagnosis = 'Normal';
                  riskLevel = 'Low';
                  colorCode = '#40a34f';
                }
              }
            }

            return { id: pid, name, queue, time, diagnosis, riskLevel, colorCode, rawVisit: v };
          });

          setMockPatients(mapped);

          // นับยอดเพื่อพล็อตลง Widget สถิติกล่องด้านบนตามฐานข้อมูลจริง
          const highRiskCount = data.filter(v => v.status === 'HIGH RISK').length;
          setStats({
            pending: data.length,
            highRisk: highRiskCount,
            complete: 3 // baseline สะสมเดิม
          });
        }
      } catch (err) {
        console.error("Error loading dashboard data, using mockup fallback:", err);
        setMockPatients(loadMockDashboard());
        setStats(loadMockStats());
      }
    };
    
    fetchDashboardData();
  }, []);

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
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>{stats.pending}</h1>
          <p style={{ backgroundColor: "#FFDDBF", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#FE7743", borderRadius: "10px" }}>PENDING</p>
        </div>

        {/* กล่อง High Risk */}
        <div style={{ backgroundColor: "white", width: "300px", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>{stats.highRisk}</h1>
          <p style={{ backgroundColor: "#FF8383", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#B20101", borderRadius: "10px" }}>HIGH RISK</p>
        </div>

        {/* กล่อง Complete */}
        <div style={{ backgroundColor: "white", width: "300px", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "100px", margin: "0", lineHeight: "1", textAlign: "center" }}>{stats.complete}</h1>
          <p style={{ backgroundColor: "#86D392", margin: "24px -5px -5px -5px", padding: "15px 12px", textAlign: "center", fontWeight: "700", fontSize: "25px", color: "#36543A", borderRadius: "10px" }}>COMPLETE</p>
        </div>
      </div>

      <hr style={{ border: "none", height: "2px", backgroundColor: "#000", opacity: "30%", margin: "40px 0 30px 0" }} />
      
      <div style={{ marginBottom: "15px" }}>
        <h1 style={{ fontSize: "30px", color: "#1C1C1E", opacity: "80%" }}>Today's Patient ({mockPatients.length})</h1>
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
              {/* ทำปุ่ม Diagnose ให้สลับไปหน้า Diagnostic ได้เหมือนกัน */}
              <div className="review" onClick={() => navigate('/diagnostic')}>
                <p>Diagnose</p>
                <img className="arrow" src="/orangeArrow.png" alt="menu" />
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
          
          {/* 👈 3. ใส่เหตุการณ์ onClick พร้อมเรียกฟังก์ชัน navigate ชี้ไปที่ /diagnostic */}
          <button 
            className="view-all-btn" 
            onClick={() => navigate('/diagnostic')} 
            style={{ position: "relative", zIndex: "101", marginBottom: "-20px" }}
          >
            View All Patients
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;