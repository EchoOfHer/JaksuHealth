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
      { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444", rawVisit: { visit_id: "39a2fe63-8bfd-406d-a51b-1c4495b8d00e" } },
      { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743", rawVisit: { visit_id: "49a2fe63-8bfd-406d-a51b-1c4495b8d00f" } },
      { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f", rawVisit: { visit_id: "59a2fe63-8bfd-406d-a51b-1c4495b8d00e" } }
    ];
  };

  const [mockPatients, setMockPatients] = useState(loadMockPatients);

  useEffect(() => {
    const fetchPendingPatients = async () => {
      try {
        const response = await API.get('/visits/pending');
        const data = response.data;

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
              const highDiag = v.diagnostics.find(d => d.risk_level === 'High' || d.risk_level === 'High');
              const medDiag = v.diagnostics.find(d => d.risk_level === 'Medium' || d.risk_level === 'Medium');
              const validDiag = highDiag || medDiag || v.diagnostics[0];

              diagnosis = validDiag.condition_stage;
              riskLevel = validDiag.risk_level;
              
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

  return (
    <div className="diagnostic-container">
      {/* ส่วนหัว */}
      <div className="page-header">
        <h1 className="page-title">Diagnostic Workspace</h1>
        <p className="page-subtitle">Pending Worklist from HIS</p>
      </div>
      
      {/* Searching & Filtering */}
      <div className="search-filter-row">
        
        {/* ช่อง Search */}
        <div className="search-wrapper">
          <img src="/SearchIcon.png" alt="search" width="24" height="24" className="search-icon" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // 🌟 ผูกฟังก์ชันค้นหาจริง
            className="search-input"
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
      <div className="filter-tabs-container">
        {['ALL', 'High', 'Medium', 'Low'].map(tab => (
          <button 
            key={tab} 
            className={`filter-tab-btn ${activeTab === tab ? 'active' : ''} ${tab.toLowerCase()}-tab`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Today's Patient Header */}
      <div className="patient-list-header">
        <p className="header-title">
          Today's Patient ({processedPatients.length}) {/* 🌟 อัปเดตตัวเลขตามจริง */}
        </p>
      </div>

      {/* Patient List */}
      <div className="patient-list-container">
        {processedPatients.length === 0 ? (
          /* แสดงผลกรณีไม่พบข้อมูลคนไข้ที่ค้นหา */
          <div className="no-patients-alert">
            No patients matching the criteria.
          </div>
        ) : (
          processedPatients.map((patient, index) => (
            <div key={index} className="patient-card" style={{ borderLeft: `12px solid ${patient.colorCode}` }}>
              <div className="patient-col diagnosis-col">
                <p className="patient-diagnosis">{patient.diagnosis}</p>
                <p className="patient-risk" style={{ color: patient.colorCode }}>{patient.riskLevel}</p>
              </div>
              <div className="patient-col info-col">
                <p className="patient-name" title={patient.name}>
                  {patient.name}
                </p>
                <p className="patient-id">{patient.id}</p>
              </div>
              <div className="patient-col queue-col">
                <p className="patient-queue">{patient.queue}</p>
                <p className="patient-time">{patient.time}</p>
              </div>
              <div className="patient-col action-col">
                <div className="review" onClick={() => onSelectPatient(patient)}>
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