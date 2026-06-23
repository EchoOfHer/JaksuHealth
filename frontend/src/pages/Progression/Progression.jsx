import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import StatusFilterTab from '../../components/common/StatusFilterTab';
import './Progression.css'; // 🌟 โหลดสไตล์ CSS แยกไฟล์ตรงนี้
import ProgressionSummary from './ProgressionSummary';
import API from '../../services/api';


// Mock Data เดิมจากระบบ
const INITIAL_PATIENTS = [
  {
    id: "P-2605-016",
    name: "Khanatip Gankingpai",
    lastVisit: "22 May 2026",
    stage: "Intermediate AMD",
    trend: "Worsening",
    trendColor: "#EF4444",
    dotColor: "#EF4444",
    age: "65",
    sex: "Male"
  },
  {
    id: "P-2605-012",
    name: "Jirawat Jakthong",
    lastVisit: "18 May 2026",
    stage: "Early AMD",
    trend: "Stable",
    trendColor: "#FE7743",
    dotColor: "#FE7743",
    age: "58",
    sex: "Male"
  },
  {
    id: "P-2605-037",
    name: "Natthawut Saengmani",
    lastVisit: "12 May 2026",
    stage: "Normal",
    trend: "Normal",
    trendColor: "#22C55E",
    dotColor: "#22C55E",
    age: "62",
    sex: "Male"
  }
];

const ProgressionPage = () => {
  const location = useLocation();
  const [selectedPatient, setSelectedPatient] = useState(location.state?.patient || null);
  
  const loadMockProgressionPatients = () => {
    const saved = localStorage.getItem('mockProgressionPatients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('mockProgressionPatients', JSON.stringify(INITIAL_PATIENTS));
    return INITIAL_PATIENTS;
  };

  const [patients, setPatients] = useState(loadMockProgressionPatients);
  const [filteredPatients, setFilteredPatients] = useState(loadMockProgressionPatients);

  useEffect(() => {
    const formatDate = (dateStr) => {
      if (!dateStr) return 'No visit';
      const dateObj = new Date(dateStr);
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return dateObj.toLocaleDateString('en-GB', options).replace(',', '');
    };

    const loadPatients = async () => {
      try {
        const res = await API.get('/patients/');
        const patientList = res.data;
        
        if (Array.isArray(patientList) && patientList.length > 0) {
          const mappedPatients = await Promise.all(patientList.map(async (p) => {
            let lastVisit = "No visit";
            let stage = "Normal";
            let trend = "Normal";
            let trendColor = "#22C55E";
            let dotColor = "#22C55E";
            
            // 1. Load from localStorage mockup first (to sync mockup edits)
            const savedVisits = localStorage.getItem(`mockVisits_${p.patient_id}`);
            if (savedVisits) {
              try {
                const visitsList = JSON.parse(savedVisits);
                if (visitsList && visitsList.length > 0) {
                  const latest = visitsList[0];
                  lastVisit = latest.date;
                  stage = latest.stage;
                  
                  if (stage === "Intermediate AMD" || stage === "Inter. AMD") {
                    trend = "Worsening";
                  } else if (stage === "Early AMD") {
                    trend = "Stable";
                  } else {
                    trend = "Normal";
                  }
                  
                  if (trend.toLowerCase().includes("worsening")) {
                    trendColor = "#EF4444";
                    dotColor = "#EF4444";
                  } else if (trend.toLowerCase().includes("stable")) {
                    trendColor = "#FE7743";
                    dotColor = "#FE7743";
                  } else {
                    trendColor = "#22C55E";
                    dotColor = "#22C55E";
                  }
                }
              } catch (e) {
                console.error("Failed to parse saved mock visits in Progression.jsx:", e);
              }
            }

            try {
              const progRes = await API.get(`/diagnostics/patient/${p.patient_id}/progression`);
              const timeline = progRes.data;
              
              if (Array.isArray(timeline) && timeline.length > 0) {
                // ข้อมูลมาจาก endpoint ล่าสุด (รวม Pending ด้วย) เรียงจากเก่าไปใหม่
                const sortedTimeline = [...timeline].sort((a, b) => new Date(b.detection_date) - new Date(a.detection_date));
                const latest = sortedTimeline[0];
                
                lastVisit = formatDate(latest.detection_date);
                stage = latest.detected_stage;
                
                if (latest.ai_trend) {
                  trend = latest.ai_trend;
                } else if (stage === "Active Wet AMD" || stage === "Late AMD" || stage === "Late AMD (Neovascular/Wet AMD)") {
                  trend = "Worsening";
                } else if (stage === "Intermediate AMD" || stage === "Inter. AMD") {
                  trend = "Worsening";
                } else if (stage === "Early AMD" || stage === "Early/Intermediate AMD") {
                  trend = "Stable";
                } else {
                  trend = "Normal";
                }

                if (trend.toLowerCase().includes("worsening")) {
                  trendColor = "#EF4444";
                  dotColor = "#EF4444";
                } else if (trend.toLowerCase().includes("stable")) {
                  trendColor = "#FE7743";
                  dotColor = "#FE7743";
                } else {
                  trendColor = "#22C55E";
                  dotColor = "#22C55E";
                }
                
                if (latest.is_pending) {
                  // ถ้ามันเป็น Pending timeline สามารถเอามาทำ UI badge เล็กๆ ได้
                }
              }
            } catch (err) {
              console.error("Error fetching progression for patient:", p.patient_id, err);
            }
            
            return {
              id: p.patient_id,
              name: `${p.first_name} ${p.last_name}`,
              lastVisit,
              stage,
              trend,
              trendColor,
              dotColor,
              age: String(p.age || ''),
              sex: p.sex
            };
          }));
          
          setPatients(mappedPatients);
          setFilteredPatients(mappedPatients);
        } else {
          // Fallback to local storage lists if database patients is empty
          setPatients(loadMockProgressionPatients());
          setFilteredPatients(loadMockProgressionPatients());
        }
      } catch (err) {
        console.error("Error loading patients registry, keeping mockup fallback:", err);
        setPatients(loadMockProgressionPatients());
        setFilteredPatients(loadMockProgressionPatients());
      }
    };
    loadPatients();
  }, [selectedPatient]);

  
  // State สำหรับจัดการค้นหาและคัดกรอง
  const [searchQuery, setSearchQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("queue"); // ตัวเลือก: queue, time, severity

  // State สำหรับจัดการ UI Interaction
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ปิดเมนูฟิลเตอร์เมื่อคลิกพื้นที่ด้านนอก (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ระบบประมวลผลค้นหา คัดกรอง และจัดเรียงลำดับข้อมูลผู้ป่วย (Dynamic Engine)
  useEffect(() => {
    let result = [...patients];

    // 1. ค้นหาผ่านชื่อหรือ Patient ID
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
      );
    }

    // 2. คัดกรองด้วยระดับ AI Trend สถานะ
    if (trendFilter !== "ALL") {
      result = result.filter(p => p.trend === trendFilter);
    }

    // 3. จัดเรียงข้อมูล (Sorting)
    result.sort((a, b) => {
      if (sortBy === 'queue') {
        return a.id.localeCompare(b.id);
      } else if (sortBy === 'time') {
        return new Date(b.lastVisit) - new Date(a.lastVisit);
      } else if (sortBy === 'severity') {
        const severityWeight = { 'Worsening': 3, 'Stable': 2, 'Normal': 1 };
        return severityWeight[b.trend] - severityWeight[a.trend];
      }
      return 0;
    });

    setFilteredPatients(result);
  }, [searchQuery, trendFilter, sortBy, patients]);

  // หากมีการเลือกคนไข้ ให้เปลี่ยนไปเรนเดอร์หน้า Progression Summary
  if (selectedPatient) {
    return (
      <ProgressionSummary 
        patient={selectedPatient} 
        onBack={() => setSelectedPatient(null)} 
      />
    );
  }

  return (
    <div className="progression-container">
      
      {/* ส่วนหัวหน้าเว็บ (Page Header) */}
      <div className="page-header">
        <h1 className="page-title">Patient Progression Registry</h1>
        <div className="page-subtitle-container">
          <span className="page-subtitle">Long-term Care Cohort</span>
        </div>
      </div>

      {/* ส่วนค้นหาและเครื่องมือตัวกรอง (Searching & Filtering) */}
      <div className="search-filter-row">
        
        {/* กล่องข้อความค้นหา (Search input container) */}
        <div className="search-container">
          <img src="/SearchIcon.png" alt="search" width="24px" height="24px" className="search-icon" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* ปุ่มและดรอปดาวน์เรียงข้อมูล (Sort Filter Button & Card) */}
        <div className="filter-dropdown-container" ref={dropdownRef}>
          <div 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`filter-btn ${showFilterDropdown ? 'active' : ''}`}
          >
            <img 
              src="/filterIcon.png" 
              alt="filter" 
              width="20" 
              style={{ transform: showFilterDropdown ? 'rotate(90deg)' : 'none' }}
            />
          </div>

          {/* กล่องเมนูตัวเลือกจัดเรียง (Sort Dropdown Card) */}
          <div className={`filter-dropdown-card ${showFilterDropdown ? 'show' : ''}`}>
            <div className="filter-dropdown-title">Sort By</div>

            {/* ตัวเลือก Patient ID */}
            <label className={`filter-option ${sortBy === 'queue' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="sortBy" 
                value="queue" 
                checked={sortBy === 'queue'} 
                onChange={() => setSortBy('queue')}
              />
              <span>Patient ID</span>
            </label>

            {/* ตัวเลือก Last Visit */}
            <label className={`filter-option ${sortBy === 'time' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="sortBy" 
                value="time" 
                checked={sortBy === 'time'} 
                onChange={() => setSortBy('time')}
              />
              <span>Last Visit</span>
            </label>

            {/* ตัวเลือก AI Trend */}
            <label className={`filter-option ${sortBy === 'severity' ? 'selected' : ''}`}>
              <input 
                type="radio" 
                name="sortBy" 
                value="severity" 
                checked={sortBy === 'severity'} 
                onChange={() => setSortBy('severity')}
              />
              <span>AI Trend</span>
            </label>
          </div>
        </div>
      </div>

      {/* เรียกใช้งานปุ่มคัดกรองสถานะ */}
      <StatusFilterTab currentFilter={trendFilter} onFilterChange={setTrendFilter} />

      {/* ส่วนของตารางแสดงผลผู้ป่วย (Patient Table Container) */}
      <div className="table-container">
        
        {/* หัวคอลัมน์ของตาราง */}
        <div className="table-header">
          <div className="table-header-col-left">Patient ID</div>
          <div className="table-header-col-left">Name</div>
          <div className="table-header-col-left">Last Visit</div>
          <div className="table-header-col-left">Current Stage</div>
          <div className="table-header-col-left">AI Trend</div>
          <div className="table-header-col-action">
            <div className="table-header-action-inner">Action</div>
          </div>
        </div>

        {/* ส่วนเนื้อหาของตาราง (Table Body) */}
        <div id="patientTableBody">
          {filteredPatients.length === 0 ? (
            <div className="patient-row" style={{ display: 'block', textAlign: 'center' }}>
              No patients matching the criteria.
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.id} className="patient-row">
                <div className="patient-cell-left">{patient.id}</div>
                <div className="patient-cell-bold">{patient.name}</div>
                <div className="patient-cell-muted">{patient.lastVisit}</div>
                <div className="patient-cell-left">{patient.stage}</div>
                
                {/* สถานะ AI Trend พร้อมจุดสีแจ้งเตือน */}
                <div className="patient-cell-trend" style={{ color: patient.trendColor }}>
                  <div className="status-dot" style={{ backgroundColor: patient.dotColor }}></div>
                  {patient.trend}
                </div>
                
                {/* ปุ่ม View Trend แบบใช้งาน CSS Class แอนิเมชันโดยตรง */}
                <div className="patient-cell-action">
                  <button className="view-trend-btn" onClick={() => setSelectedPatient(patient)}>
                    Trend
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <hr className="table-divider" />
        
        {/* ส่วนสลับหมายเลขหน้า (Pagination Control) */}
        <div className="pagination-container">
          <img src="/downArrow.png" alt="Previous Page" className="page-arrow" style={{ transform: 'rotate(90deg)' }} />
          <span className="active-page">1</span>
          <img src="/downArrow.png" alt="Next Page" className="page-arrow" style={{ transform: 'rotate(-90deg)' }} width={'22px'}/>
        </div>

      </div>
    </div>
  );
};

export default ProgressionPage;