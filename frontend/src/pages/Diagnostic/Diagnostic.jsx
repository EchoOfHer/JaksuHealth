import React, { useState, useRef, useEffect } from 'react';
import './Diagnostic.css';
import API from '../../services/api';

const Diagnostic = ({ onSelectPatient }) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(''); // 🌟 State ค้นหา
  const [sortBy, setSortBy] = useState('queue'); // 🌟 State เรียงลำดับ
  const filterRef = useRef(null);

  // ปิด Dropdown เมื่อคลิกพื้นที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ข้อมูลคนไข้ดึงจากระบบหลังบ้านจริง
  const loadMockPatients = () => {
    return [
      { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444" },
      { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743" },
      { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f" }
    ];
  };

  const [mockPatients, setMockPatients] = useState(loadMockPatients);

  useEffect(() => {
    const fetchPendingPatients = async () => {
      try {
        const response = await API.get('/visits/pending');
        const data = response.data;

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
                    // ตรวจพบว่าสเตตัสใน localStorage ต่างจากค่าเริ่มต้นและยังไม่มีการวินิจฉัยจริงใน DB
                    if (savedList[index].diagnosis !== defaultDiagnosis || savedList[index].isApproved) {
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
        } else {
          setMockPatients(loadMockPatients());
        }
      } catch (err) {
        console.error("Error loading pending diagnostic patients, using mockup fallback:", err);
        setMockPatients(loadMockPatients());
      }
    };

    fetchPendingPatients();
  }, []);


  // ค่าน้ำหนักในการเปรียบเทียบระดับความรุนแรง (สำหรับเรียงลำดับ Severity)
  const severityWeight = {
    'High': 3,
    'Medium': 2,
    'Low': 1
  };

  // ฟังก์ชันแปลงเวลา "10:30AM" เป็นจำนวนนาทีรวม เพื่อการจัดเรียงที่แม่นยำตามจริง
  const parseTimeToMinutes = (timeStr) => {
    const match = timeStr.match(/^(\d+):(\d+)(AM|PM)$/i);
    if (!match) return 0;
    let [_, hours, minutes, ampm] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // 🌟 ขั้นตอนประมวลผลข้อมูลคนไข้จริง (Filter & Sort) 🌟
  const processedPatients = mockPatients
    .filter(patient => {
      // 1. คัดกรองตามสิ่งที่พิมพ์ค้นหา (Search Query)
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        patient.name.toLowerCase().includes(query) || 
        patient.id.toLowerCase().includes(query);

      // 2. คัดกรองตามแท็บความรุนแรง
      const matchesTab = activeTab === 'ALL' || patient.riskLevel === activeTab;

      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      // 3. จัดเรียงข้อมูล (Sort Logic)
      if (sortBy === 'queue') {
        return a.queue.localeCompare(b.queue);
      } else if (sortBy === 'time') {
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      } else if (sortBy === 'severity') {
        return severityWeight[b.riskLevel] - severityWeight[a.riskLevel]; // เรียงความฉุกเฉินสูงสุดก่อน
      }
      return 0;
    });

  // สไตล์สำหรับปุ่มแท็บ
  const getTabStyle = (tabName) => {
    const isActive = activeTab === tabName;
    return {
      width: tabName === 'Medium' ? '137px' : tabName === 'Low' ? '104px' : '85px',
      height: '35px',
      background: isActive ? '#FE7743' : '#FFFFFF',
      color: isActive ? '#FFFFFF' : 'rgba(0,0,0,0.6)',
      borderRadius: '30px',
      fontFamily: "'Inter', sans-serif",
      fontWeight: '600',
      fontSize: '15px',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.25s ease',
      boxShadow: isActive ? '0 6px 16px rgba(254, 119, 67, 0.25)' : '0 4px 12px rgba(0,0,0,0.03)'
    };
  };

  return (
    <div className="diagnostic-container">
      {/* ส่วนหัว */}
      <div className="page-header">
        <h1 style={{ opacity: "80%", fontSize: "30px", margin: 0 }}>Diagnostic Workspace</h1>
        <p style={{ fontSize: "18px", color: "#999", marginTop: "5px", marginBottom: "30px" }}>
          Pending Worklist from HIS
        </p>
      </div>
      
      {/* Searching & Filtering */}
      <div style={{ display: "flex", gap: "15px", width: "100%", maxWidth: "50%", alignItems: "center", position: "relative", zIndex: 100 }}>
        
        {/* ช่อง Search */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "white", borderRadius: "50px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)", padding: "8px 20px", border: "1px solid rgba(0, 0, 0, 0.03)" }}>
          <img src="/SearchIcon.png" alt="search" width="24" height="24" style={{ display: "block", marginRight: "12px", opacity: "50%" }} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // 🌟 ผูกฟังก์ชันค้นหาจริง
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: "500", color: "#1C1C1E" }} 
          />
        </div>

        {/* Filter Dropdown */}
        <div className="filter-dropdown-container" ref={filterRef}>
          <div className={`filter-btn ${filterOpen ? 'active' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
             <img src="/filterIcon.png" alt="filter" width="20" />
          </div>

          <div className={`filter-dropdown-card ${filterOpen ? 'show' : ''}`}>
            <div className="filter-section-title">Sort By</div>
            <label className="filter-option">
              <input 
                type="radio" 
                name="sortBy" 
                value="queue" 
                checked={sortBy === 'queue'} 
                onChange={(e) => setSortBy(e.target.value)} // 🌟 เรียงตามเลขคิว
              />
              <span>Queue Number</span>
            </label>
            <label className="filter-option">
              <input 
                type="radio" 
                name="sortBy" 
                value="time" 
                checked={sortBy === 'time'} 
                onChange={(e) => setSortBy(e.target.value)} // 🌟 เรียงตามเวลานัด
              />
              <span>Appointment Time</span>
            </label>
            <label className="filter-option">
              <input 
                type="radio" 
                name="sortBy" 
                value="severity" 
                checked={sortBy === 'severity'} 
                onChange={(e) => setSortBy(e.target.value)} // 🌟 เรียงตามความรุนแรง
              />
              <span>Severity</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Filter Status Buttons */}
      <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
        {['ALL', 'High', 'Medium', 'Low'].map(tab => (
          <button key={tab} style={getTabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      
      {/* Today's Patient Header */}
      <div style={{ marginTop: "35px", marginBottom: "15px" }}>
        <p style={{ color: "black", opacity: "70%", fontSize: "25px", fontWeight: "bold", margin: 0 }}>
          Today's Patient ({processedPatients.length}) {/* 🌟 อัปเดตตัวเลขตามจริง */}
        </p>
      </div>

      {/* Patient List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", position: "relative" }}>
        {processedPatients.length === 0 ? (
          /* แสดงผลกรณีไม่พบข้อมูลคนไข้ที่ค้นหา */
          <div style={{ padding: "40px", textAlign: "center", backgroundColor: "white", borderRadius: "12px", color: "#999", fontSize: "18px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
            No patients matching the criteria.
          </div>
        ) : (
          processedPatients.map((patient, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "row", backgroundColor: "white", alignItems: "center", borderLeft: `12px solid ${patient.colorCode}`, borderRadius: "12px", padding: "20px 24px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
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
                <div className="review" onClick={() => onSelectPatient(patient)} style={{ cursor: 'pointer' }}>
      <p>Diagnose</p>
      <span className="arrow">➔</span>
    </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Diagnostic;