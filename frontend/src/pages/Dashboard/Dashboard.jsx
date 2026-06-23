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
        // ดึงข้อมูลที่อัปเดตแล้วมาแสดงผล
        const response = await API.get('/visits/pending');
        const data = response.data; // รายการคิวจาก SQL

        if (Array.isArray(data) && data.length > 0) {
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

            if (v.diagnostics && v.diagnostics.length > 0) {
              // Try to find high risk first, then medium
              const highDiag = v.diagnostics.find(d => d.risk_level === 'High' || d.risk_level === 'High');
              const medDiag = v.diagnostics.find(d => d.risk_level === 'Medium' || d.risk_level === 'Medium');
              const validDiag = highDiag || medDiag || v.diagnostics[0];

              riskLevel = validDiag.risk_level;
              diagnosis = validDiag.condition_stage;

              if (riskLevel === 'High' || riskLevel === 'High') {
                colorCode = '#EF4444';
              } else if (riskLevel === 'Medium' || riskLevel === 'Medium') {
                colorCode = '#FE7743';
              } else {
                colorCode = '#40a34f';
              }
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
          const highRiskCount = mapped.filter(p => p.riskLevel === 'High').length;
          
          // ดึงค่า Completed Count จาก Backend จริง
          const completedResponse = await API.get('/visits/completed-count');
          const completedCountFromDB = completedResponse.data;

          setStats({
            pending: mapped.length,
            highRisk: highRiskCount,
            complete: completedCountFromDB
          });
        } else {
          setMockPatients(loadMockDashboard());
          setStats(loadMockStats());
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
      <div className="stats-container">
        {/* กล่อง Pending */}
        <div className="stat-card pending-card">
          <h1 className="stat-number">{stats.pending}</h1>
          <p className="stat-label pending-label">PENDING</p>
        </div>

        {/* กล่อง High Risk */}
        <div className="stat-card high-risk-card">
          <h1 className="stat-number">{stats.highRisk}</h1>
          <p className="stat-label high-risk-label">HIGH RISK</p>
        </div>

        {/* กล่อง Complete */}
        <div className="stat-card complete-card">
          <h1 className="stat-number">{stats.complete}</h1>
          <p className="stat-label complete-label">COMPLETE</p>
        </div>
      </div>

      <hr className="dashboard-divider" />
      
      <div className="patient-list-header">
        <h1>Today's Patient ({mockPatients.length})</h1>
      </div>

      {/* Patient List */}
      <div className="patient-list-container">
        
        {/* วนลูปแสดงรายชื่อคนไข้จาก Array */}
        {mockPatients.map((patient, index) => (
          <div key={index} className="patient-card" style={{ borderLeft: `12px solid ${patient.colorCode}` }}>
            <div className="patient-col diagnosis-col">
              <p className="patient-diagnosis">{patient.diagnosis}</p>
              <p className="patient-risk" style={{ color: patient.colorCode }}>{patient.riskLevel}</p>
            </div>
            <div className="patient-col info-col">
              <p className="patient-name" title={patient.name}>{patient.name}</p>
              <p className="patient-id">{patient.id}</p>
            </div>
            <div className="patient-col queue-col">
              <p className="patient-queue">{patient.queue}</p>
              <p className="patient-time">{patient.time}</p>
            </div>
          </div>
        ))}

        {/* กล่องควบคุม View All แบบฟุ้งสไลด์เบลอ */}
        <div className="view-all-container">
          <div className="blur-overlay"></div>
          
          {/* 👈 3. ใส่เหตุการณ์ onClick พร้อมเรียกฟังก์ชัน navigate ชี้ไปที่ /diagnostic */}
          <button 
            className="view-all-btn" 
            onClick={() => navigate('/diagnostic')} 
          >
            View All
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;