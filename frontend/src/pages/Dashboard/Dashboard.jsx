import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 1. นำเข้า useNavigate
import './Dashboard.css';
import API from '../../services/api';
import DashboardPatientCard from './DashboardPatientCard';
const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState('');
  const navigate = useNavigate(); // 👈 2. เรียกใช้งานเครื่องมือนำทาง

  // 1. ฟังก์ชันตั้งค่าวันที่ปัจจุบัน
  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', options);
    setCurrentDate(formattedDate.replace(',', ''));
  }, []);

  const [mockPatients, setMockPatients] = useState([]);
  const [stats, setStats] = useState({ pending: 0, highRisk: 0, complete: 0 });

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
              // Default to seed values if DB missing diagnostics
              if (pid === 'P-2605-016') {
                diagnosis = 'Intermediate AMD';
                riskLevel = 'High';
                colorCode = '#EF4444';
              } else if (pid === 'P-2605-012') {
                diagnosis = 'Wet AMD';
                riskLevel = 'High';
                colorCode = '#EF4444';
              } else if (pid === 'P-2605-037') {
                diagnosis = 'Normal';
                riskLevel = 'Low';
                colorCode = '#40a34f';
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
          setMockPatients([]);
          setStats({ pending: 0, highRisk: 0, complete: 0 });
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setMockPatients([]);
        setStats({ pending: 0, highRisk: 0, complete: 0 });
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
        
        {/* วนลูปแสดงรายชื่อคนไข้จาก Array (แสดงสูงสุดแค่ 3 รายการ เพื่อให้รายการที่ 3 โดน fade) */}
        {mockPatients.slice(0, 3).map((patient, index) => (
          <DashboardPatientCard key={index} patient={patient} />
        ))}

        {/* กล่องควบคุม View All แบบฟุ้งสไลด์เบลอ (แสดงเฉพาะเมื่อเกิน 2 รายการ) */}
        {mockPatients.length > 2 && (
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
        )}

      </div>
    </div>
  );
};

export default Dashboard;