import React, { useState, useEffect, useRef } from 'react';
import StatusFilterTab from '../../components/common/StatusFilterTab';
import './Progression.css'; // 🌟 โหลดสไตล์ CSS แยกไฟล์ตรงนี้

// Mock Data เดิมจากระบบ
const INITIAL_PATIENTS = [
  {
    id: "P-2605-016",
    name: "Khanatip Gankingpai",
    lastVisit: "22 May 2026",
    stage: "Intermediate AMD",
    trend: "Worsening",
    trendColor: "#EF4444",
    dotColor: "#EF4444"
  },
  {
    id: "P-2605-012",
    name: "Jirawat Jakthong",
    lastVisit: "18 May 2026",
    stage: "Early AMD",
    trend: "Stable",
    trendColor: "#FE7743",
    dotColor: "#FE7743"
  },
  {
    id: "P-2605-037",
    name: "Natthawut Saengmani",
    lastVisit: "12 May 2026",
    stage: "Normal",
    trend: "Normal",
    trendColor: "#22C55E",
    dotColor: "#22C55E"
  }
];

const ProgressionPage = () => {
  const [patients] = useState(INITIAL_PATIENTS);
  const [filteredPatients, setFilteredPatients] = useState(INITIAL_PATIENTS);
  
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
                  <button className="view-trend-btn">
                    View Trend
                    <span className="arrow">→</span>
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