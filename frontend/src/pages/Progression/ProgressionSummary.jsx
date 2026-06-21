import React, { useState, useEffect, useRef } from 'react';
import './ProgressionSummary.css';
import API from '../../services/api';


// ฟังก์ชันดึงรายการสแกนจำลองตามคนไข้แต่ละรายเพื่อให้แสดงผลเสมือนจริง แยกข้างตาซ้าย/ขวา
const getVisitsForPatient = (patient, eyeSide = 'os') => {
  const name = patient?.name || "Khanatip Gankingpai";
  if (name.includes("Khanatip")) {
    if (eyeSide === 'os') {
      return [
        {
          date: "May 22, 2026",
          stage: "Intermediate AMD",
          detection: "Worsening Trend",
          isLatest: true,
          lesionPath: "M 210,130 Q 230,110 250,130 Z",
          strokePath: "M 10,105 L 180,123 Q 230,132 280,127 L 450,127"
        },
        {
          date: "Jan 15, 2024",
          stage: "Early AMD",
          detection: "1st Detection",
          isLatest: false,
          lesionPath: "M 190,132 Q 215,115 240,132 Z",
          strokePath: "M 10,105 L 180,123 Q 230,130 280,127 L 450,127"
        },
        {
          date: "Jul 22, 2023",
          stage: "Normal",
          detection: "Baseline",
          isLatest: false,
          lesionPath: "",
          strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
        }
      ];
    } else {
      return [
        {
          date: "May 22, 2026",
          stage: "Early AMD",
          detection: "Stable",
          isLatest: true,
          lesionPath: "M 190,132 Q 215,115 240,132 Z",
          strokePath: "M 10,105 L 180,123 Q 230,130 280,127 L 450,127"
        },
        {
          date: "Jan 15, 2024",
          stage: "Normal",
          detection: "Baseline",
          isLatest: false,
          lesionPath: "",
          strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
        }
      ];
    }
  } else if (name.includes("Jirawat")) {
    if (eyeSide === 'os') {
      return [
        {
          date: "May 18, 2026",
          stage: "Early AMD",
          detection: "Stable",
          isLatest: true,
          lesionPath: "M 190,132 Q 215,115 240,132 Z",
          strokePath: "M 10,105 L 180,123 Q 230,130 280,127 L 450,127"
        },
        {
          date: "Dec 10, 2023",
          stage: "Early AMD",
          detection: "1st Detection",
          isLatest: false,
          lesionPath: "M 180,135 Q 200,120 220,135 Z",
          strokePath: "M 10,105 L 180,122 Q 230,129 280,127 L 450,127"
        },
        {
          date: "Oct 05, 2023",
          stage: "Normal",
          detection: "Baseline",
          isLatest: false,
          lesionPath: "",
          strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
        }
      ];
    } else {
      return [
        {
          date: "May 18, 2026",
          stage: "Normal",
          detection: "Normal",
          isLatest: true,
          lesionPath: "",
          strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
        },
        {
          date: "Oct 05, 2023",
          stage: "Normal",
          detection: "Baseline",
          isLatest: false,
          lesionPath: "",
          strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
        }
      ];
    }
  } else {
    // สำหรับ Natthawut หรือทั่วไป
    return [
      {
        date: "May 12, 2026",
        stage: "Normal",
        detection: "Normal",
        isLatest: true,
        lesionPath: "",
        strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
      },
      {
        date: "Jul 22, 2023",
        stage: "Normal",
        detection: "Baseline",
        isLatest: false,
        lesionPath: "",
        strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
      }
    ];
  }
};

const getSummaryForPatient = (patient, eyeSide = 'os') => {
  const name = patient?.name || "Khanatip Gankingpai";
  if (name.includes("Khanatip")) {
    if (eyeSide === 'os') {
      return "Compared to the previous scan on Jan 15, 2024, the disease progression shows a significant worsening trend. While the previous scan indicated only Subretinal Hyperreflective Material (SHRM), the current scan reveals new fluid accumulation, including both SRF and IRF. This suggests a potential transition from Intermediate AMD to active Neovascular (Wet) AMD.";
    } else {
      return "Compared to the previous scan on Jan 15, 2024, the dry AMD findings in the right eye are stable. Mild drusen accumulation remains unchanged with no sign of geographic atrophy or active neovascularization.";
    }
  } else if (name.includes("Jirawat")) {
    if (eyeSide === 'os') {
      return "Compared to the previous scan on Dec 10, 2023, the disease progression shows a stable trend. No new lesion or fluid accumulation is observed. The early AMD findings are well-maintained with recommendation of routine follow-up.";
    } else {
      return "The right retina appears completely normal. Retinal layer structural integrity is well-preserved with no signs of drusen or subretinal/intraretinal fluid accumulation.";
    }
  } else {
    return "The retina appears completely normal with no signs of drusen or fluid accumulation. Comparative review against previous baseline scan confirms no progression.";
  }
};

export default function ProgressionSummary({ patient, onBack }) {
  const [activeEye, setActiveEye] = useState('os');
  const [visits, setVisits] = useState(() => getVisitsForPatient(patient, 'os'));
  const [activeIndex, setActiveIndex] = useState(() => {
    const initialVisits = getVisitsForPatient(patient, 'os');
    return initialVisits.length > 1 ? 1 : 0;
  });
  
  // Progression Summary Text
  const [summaryText, setSummaryText] = useState(() => getSummaryForPatient(patient, 'os'));

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFullViewModalOpen, setIsFullViewModalOpen] = useState(false);

  // Edit Modal input states
  const [modalRisk, setModalRisk] = useState('');
  const [modalRiskOther, setModalRiskOther] = useState('');
  const [modalTagLine, setModalTagLine] = useState('');
  const [modalSummary, setModalSummary] = useState('');

  // Button interaction states
  const [exportSuccess, setExportSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fundus scanner line dragging
  const [dragTopPercent, setDragTopPercent] = useState(92);
  const [scaleValue, setScaleValue] = useState(1);
  const isDraggingRef = useRef(false);
  const fundusContainerRef = useRef(null);
  const dragLineRef = useRef(null);

  const [csvMetadata, setCsvMetadata] = useState([]);
  const [prevCsvMetadata, setPrevCsvMetadata] = useState([]);

  const patientToDatasetMap = {
    'P-2605-016': { 
      os: { current: '79', baseline: '18' }, 
      od: { current: '14', baseline: '151' } 
    },
    'P-2605-012': { 
      os: { current: '130', baseline: '6' }, 
      od: { current: '117', baseline: '95' } 
    },
    'P-2605-037': { 
      os: { current: 'natthawut_os', baseline: 'natthawut_os' }, 
      od: { current: 'natthawut_od', baseline: 'natthawut_od' } 
    }
  };

  const pId = patient?.id || patient?.patient_id || 'P-2605-016';
  const eyeSide = activeEye.toLowerCase();
  
  const currentDatasetId = patientToDatasetMap[pId]?.[eyeSide]?.current || '79';
  const selectedVisit = visits[activeIndex] || {};
  const isSelectedVisitNormal = selectedVisit.stage === 'Normal' || selectedVisit.stage === 'normal';

  const prevDatasetId = activeIndex === 0
    ? currentDatasetId
    : (isSelectedVisitNormal 
        ? `natthawut_${eyeSide}` 
        : (patientToDatasetMap[pId]?.[eyeSide]?.baseline || '18'));

  // โหลดข้อมูล CSV Metadata ของทั้ง Current และ Previous
  useEffect(() => {
    const fetchCurrentMetadata = async () => {
      try {
        const response = await API.get(`/diagnostics/dataset/${currentDatasetId}/metadata`);
        if (response.data) {
          setCsvMetadata(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch current dataset CSV metadata:", err);
      }
    };
    
    setScaleValue(1);
    setDragTopPercent(92);
    fetchCurrentMetadata();
  }, [currentDatasetId]);

  useEffect(() => {
    const fetchPrevMetadata = async () => {
      try {
        const response = await API.get(`/diagnostics/dataset/${prevDatasetId}/metadata`);
        if (response.data) {
          setPrevCsvMetadata(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch previous dataset CSV metadata:", err);
      }
    };
    fetchPrevMetadata();
  }, [prevDatasetId]);

  // จำกัดขอบเขตของ scaleValue และซิงก์ตำแหน่งขีดตาม B-scan ปัจจุบัน
  useEffect(() => {
    if (!isDraggingRef.current && csvMetadata.length > 0) {
      const N = csvMetadata.length;
      let constrained = scaleValue;
      if (scaleValue > N) {
        constrained = N;
        setScaleValue(N);
      } else if (scaleValue < 1) {
        constrained = 1;
        setScaleValue(1);
      }
      const ratio = N > 1 ? (constrained - 1) / (N - 1) : 0;
      const percentY = 92 - ratio * (92 - 8);
      setDragTopPercent(percentY);
    }
  }, [scaleValue, csvMetadata]);

  const activeVisit = visits[activeIndex] || {};

  // ล้างการเลื่อนเมื่อปิด modal
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString('en-GB', options).replace(',', '');
  };

  useEffect(() => {
    const loadProgression = async () => {
      const pId = patient?.id || patient?.patient_id;
      if (!pId) return;

      const loadMockupData = (pid) => {
        const savedMock = localStorage.getItem(`mockVisits_${pid}_${activeEye}`);
        if (savedMock) {
          try {
            const parsed = JSON.parse(savedMock);
            if (parsed && parsed.length > 0) {
              setVisits(parsed);
              setActiveIndex(parsed.length > 1 ? 1 : 0);
              const firstVisit = parsed[0];
              setSummaryText(firstVisit.summary || getSummaryForPatient(patient, activeEye));
              return;
            }
          } catch (e) {
            console.error("Failed to parse mock visits from localStorage", e);
          }
        }
        const fallbackVisits = getVisitsForPatient(patient, activeEye);
        setVisits(fallbackVisits);
        setActiveIndex(fallbackVisits.length > 1 ? 1 : 0);
        setSummaryText(getSummaryForPatient(patient, activeEye));
      };

      try {
        const res = await API.get(`/diagnostics/patient/${pId}/progression`);
        const timeline = res.data;
        if (Array.isArray(timeline) && timeline.length > 0) {
          const sortedTimeline = [...timeline].sort((a, b) => new Date(b.detection_date) - new Date(a.detection_date));

          const mappedVisits = sortedTimeline.map((item, idx) => {
            const stage = item.detected_stage;
            let lesionPath = "";
            let strokePath = "M 10,105 L 180,120 Q 230,126 280,127 L 450,127";

            if (stage === "Intermediate AMD" || stage === "Inter. AMD") {
              lesionPath = "M 210,130 Q 230,110 250,130 Z";
              strokePath = "M 10,105 L 180,123 Q 230,132 280,127 L 450,127";
            } else if (stage === "Early AMD") {
              lesionPath = "M 190,132 Q 215,115 240,132 Z";
              strokePath = "M 10,105 L 180,123 Q 230,130 280,127 L 450,127";
            }

            return {
              date: formatDate(item.detection_date),
              stage: stage,
              detection: item.tag_line,
              isLatest: idx === 0,
              lesionPath,
              strokePath,
              rawTimeline: item
            };
          });

          setVisits(mappedVisits);
          setActiveIndex(mappedVisits.length > 1 ? 1 : 0);
          setSummaryText(mappedVisits[0]?.rawTimeline?.progression_summary || "");
        } else {
          // Fallback to mockup data if timeline is empty
          loadMockupData(pId);
        }
      } catch (err) {
        console.error("Error loading progression timeline, using mockup fallback:", err);
        loadMockupData(pId);
      }
    };
    loadProgression();
  }, [patient, activeEye]);

  useEffect(() => {
    if (visits[activeIndex]) {
      if (visits[activeIndex].rawTimeline) {
        setSummaryText(visits[activeIndex].rawTimeline.progression_summary);
      } else {
        // Fallback for mockup visits
        setSummaryText(visits[activeIndex].summary || getSummaryForPatient(patient, activeEye));
      }
    }
  }, [activeIndex, visits, patient, activeEye]);


  // Sync ข้อมูลของ visit ปัจจุบันขึ้นฟอร์มแก้ไข
  const openEditModal = () => {
    const activeVisit = visits[activeIndex];
    if (!activeVisit) return;

    document.body.style.overflow = 'hidden';
    setModalSummary(summaryText);
    setModalTagLine(activeVisit.detection || '');

    if (['Intermediate AMD', 'Early AMD', 'Normal'].includes(activeVisit.stage)) {
      setModalRisk(activeVisit.stage);
      setModalRiskOther('');
    } else {
      setModalRisk('Other');
      setModalRiskOther(activeVisit.stage || '');
    }
    
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    document.body.style.overflow = '';
    setIsEditModalOpen(false);
    setSaveSuccess(false);
  };

  const saveModalChanges = async () => {
    const activeVisit = visits[activeIndex];
    if (!activeVisit) {
      console.warn("No active visit found during save changes");
      return;
    }

    try {
      let finalRisk = modalRisk;
      if (modalRisk === 'Other') {
        finalRisk = modalRiskOther.trim() !== '' ? modalRiskOther.trim() : 'Custom AMD';
      }

      // 1. Save to DB if there is a rawTimeline (wrapped in its own try-catch block)
      if (activeVisit.rawTimeline) {
        try {
          const history_id = activeVisit.rawTimeline.history_id;
          await API.put(`/diagnostics/timeline/${history_id}`, {
            detected_stage: finalRisk,
            tag_line: modalTagLine,
            progression_summary: modalSummary
          });
        } catch (apiErr) {
          console.error("Failed to save timeline to database, continuing with local updates:", apiErr);
        }
      }

      setSaveSuccess(true);

      // Define paths to redraw the SVG overlays based on the edited stage
      let lesionPath = "";
      let strokePath = "M 10,105 L 180,120 Q 230,126 280,127 L 450,127";

      if (finalRisk === "Intermediate AMD" || finalRisk === "Inter. AMD") {
        lesionPath = "M 210,130 Q 230,110 250,130 Z";
        strokePath = "M 10,105 L 180,123 Q 230,132 280,127 L 450,127";
      } else if (finalRisk === "Early AMD") {
        lesionPath = "M 190,132 Q 215,115 240,132 Z";
        strokePath = "M 10,105 L 180,123 Q 230,130 280,127 L 450,127";
      }

      const updatedVisits = [...visits];
      updatedVisits[activeIndex] = {
        ...updatedVisits[activeIndex],
        stage: finalRisk,
        detection: modalTagLine,
        summary: modalSummary,
        lesionPath,
        strokePath
      };

      if (updatedVisits[activeIndex].rawTimeline) {
        updatedVisits[activeIndex].rawTimeline = {
          ...updatedVisits[activeIndex].rawTimeline,
          detected_stage: finalRisk,
          tag_line: modalTagLine,
          progression_summary: modalSummary
        };
      }

      setVisits(updatedVisits);
      setSummaryText(modalSummary);

      // 2. Persist mockup changes in localStorage
      const pId = patient?.id || patient?.patient_id;
      if (pId) {
        localStorage.setItem(`mockVisits_${pId}_${activeEye}`, JSON.stringify(updatedVisits));

        // Sync with mockPatients (for Dashboard & Diagnostic workspace)
        let mockPatientsList = [];
        const savedMockPatients = localStorage.getItem('mockPatients');
        if (savedMockPatients) {
          try {
            mockPatientsList = JSON.parse(savedMockPatients);
          } catch (e) {
            console.error("Failed to parse mockPatients from localStorage:", e);
          }
        }
        
        // Ensure mockPatientsList is an array
        if (!Array.isArray(mockPatientsList)) {
          mockPatientsList = [];
        }

        if (mockPatientsList.length === 0) {
          mockPatientsList = [
            { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444" },
            { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743" },
            { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f" }
          ];
        }

        // Sync if the edited visit is the latest one (index 0)
        if (activeIndex === 0) {
          const patientIndex = mockPatientsList.findIndex(p => p && p.id === pId);
          if (patientIndex !== -1) {
            mockPatientsList[patientIndex].diagnosis = finalRisk;
            mockPatientsList[patientIndex].riskLevel = finalRisk === 'Intermediate AMD' ? 'High' : finalRisk === 'Early AMD' ? 'Medium' : 'Low';
            mockPatientsList[patientIndex].colorCode = mockPatientsList[patientIndex].riskLevel === 'High' ? '#EF4444' : mockPatientsList[patientIndex].riskLevel === 'Medium' ? '#FE7743' : '#40a34f';
            localStorage.setItem('mockPatients', JSON.stringify(mockPatientsList));
          }

          // Sync with mockProgressionPatients (for Patient Progression Registry)
          let mockProgList = [];
          const savedMockProg = localStorage.getItem('mockProgressionPatients');
          if (savedMockProg) {
            try {
              mockProgList = JSON.parse(savedMockProg);
            } catch (e) {
              console.error("Failed to parse mockProgressionPatients from localStorage:", e);
            }
          }

          // Ensure mockProgList is an array
          if (!Array.isArray(mockProgList)) {
            mockProgList = [];
          }

          if (mockProgList.length === 0) {
            mockProgList = [
              { id: "P-2605-016", name: "Khanatip Gankingpai", lastVisit: "22 May 2026", stage: "Intermediate AMD", trend: "Worsening", trendColor: "#EF4444", dotColor: "#EF4444", age: "65", sex: "Male" },
              { id: "P-2605-012", name: "Jirawat Jakthong", lastVisit: "18 May 2026", stage: "Early AMD", trend: "Stable", trendColor: "#FE7743", dotColor: "#FE7743", age: "58", sex: "Male" },
              { id: "P-2605-037", name: "Natthawut Saengmani", lastVisit: "12 May 2026", stage: "Normal", trend: "Normal", trendColor: "#22C55E", dotColor: "#22C55E", age: "62", sex: "Male" }
            ];
          }
          const progIdx = mockProgList.findIndex(p => p && p.id === pId);
          if (progIdx !== -1) {
            mockProgList[progIdx].stage = finalRisk;
            mockProgList[progIdx].trend = finalRisk === "Intermediate AMD" ? "Worsening" : finalRisk === "Early AMD" ? "Stable" : "Normal";
            mockProgList[progIdx].trendColor = finalRisk === "Intermediate AMD" ? "#EF4444" : finalRisk === "Early AMD" ? "#FE7743" : "#22C55E";
            mockProgList[progIdx].dotColor = mockProgList[progIdx].trendColor;
            localStorage.setItem('mockProgressionPatients', JSON.stringify(mockProgList));
          }
        }
      }

      setTimeout(() => {
        closeEditModal();
      }, 600);
    } catch (err) {
      console.error("Critical error in saveModalChanges:", err);
    }
  };


  const triggerExportSuccess = () => {
    if (exportSuccess) return;
    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
    }, 1500);
  };

  // ── MOUSE/TOUCH DRAG HANDLERS (FUNDUS DRAG LINE) ──
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    if (dragLineRef.current) {
      dragLineRef.current.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !fundusContainerRef.current) return;

    const rect = fundusContainerRef.current.getBoundingClientRect();
    let relativeY = e.clientY - rect.top;

    // จำกัดตำแหน่ง y ให้อยู่ระหว่าง 8% ถึง 92% ของความสูง Container
    const minY = rect.height * 0.08;
    const maxY = rect.height * 0.92;

    if (relativeY < minY) relativeY = minY;
    if (relativeY > maxY) relativeY = maxY;

    const percentY = (relativeY / rect.height) * 100;
    setDragTopPercent(percentY);

    const totalSlices = csvMetadata.length > 0 ? csvMetadata.length : 100;
    const calculatedScale = totalSlices > 1
      ? Math.round(((maxY - relativeY) / (maxY - minY)) * (totalSlices - 1)) + 1
      : 1;
    setScaleValue(calculatedScale);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const apiHost = API.defaults.baseURL ? API.defaults.baseURL.replace('/api/v1', '') : '';

  const currentSlices = csvMetadata.length;
  const prevSlices = prevCsvMetadata.length;
  const prevScaleValue = (prevSlices > 1 && currentSlices > 1)
    ? Math.round(((scaleValue - 1) / (currentSlices - 1)) * (prevSlices - 1)) + 1
    : scaleValue;

  const currentImageName = csvMetadata[scaleValue - 1]?.Image_Name || `${currentDatasetId}_${scaleValue}.png`;
  const prevImageName = prevCsvMetadata[prevScaleValue - 1]?.Image_Name || `${prevDatasetId}_${prevScaleValue}.png`;

  const octImgUrl = `${apiHost}/api/v1/dataset/${currentDatasetId}/cropped_overlays/${currentImageName}`;
  const prevOctImgUrl = `${apiHost}/api/v1/dataset/${prevDatasetId}/cropped_overlays/${prevImageName}`;

  return (
    <div className="progression-summary-container progression-summary-page">
      {/* 2.1 pageHeader: ปุ่มย้อนกลับ และ การเลือก OS/OD */}
      <div className="page-header">
        {/* ซ้าย: ปุ่มย้อนกลับ */}
        <div className="header-left">
          <span className="back-btn" onClick={onBack}>
            <span className="arrow-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </span>
            Progression Summary
          </span>
        </div>

        {/* กลาง: ตัวสลับ OS / OD Selection */}
        <div className="header-center">
          <div className="eye-selector-wrapper">
            <div 
              className={`eye-tab ${activeEye === 'os' ? 'active' : ''}`} 
              onClick={() => setActiveEye('os')}
            >
              OS
            </div>
            <div 
              className={`eye-tab ${activeEye === 'od' ? 'active' : ''}`} 
              onClick={() => setActiveEye('od')}
            >
              OD
            </div>
          </div>
        </div>

        {/* ขวา: บาลานเซอร์ */}
        <div className="header-right"></div>
      </div>

      {/* 2.2 โครงสร้างแบบ 3 คอลัมน์ */}
      <div className="workspace-grid">
        
        {/* ==================== คอลัมน์ซ้าย (LEFT COLUMN) ==================== */}
        <div className="col-left">
          {/* บล็อก 1: Patient Info */}
          <div className="premium-card">
            <p className="pill-label">Patient Info.</p>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '20px', textAlign: 'left' }}>
              <div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 5, marginRight: '6px' }}>Name</span> 
                <span style={{ fontWeight: 7, color: 'var(--text-dark)' }}>{patient?.name || 'Khanatip Gankingpai'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 5, marginRight: '6px' }}>Age</span> 
                <span style={{ fontWeight: 7, color: 'var(--text-dark)' }}>{patient?.age || '65'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 5, marginRight: '6px' }}>Sex</span> 
                <span style={{ fontWeight: 7, color: 'var(--text-dark)' }}>{patient?.sex || 'Male'}</span>
              </div>
              <div style={{ marginTop: '6px' }}>
                <div style={{ color: 'var(--text-soft)', fontWeight: 5, marginBottom: '2px' }}>Risk Status</div>
                <div style={{ fontWeight: 7, color: 'var(--text-dark)' }}>{visits[0]?.stage || 'Intermediate AMD'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-soft)', fontWeight: 5, marginBottom: '2px' }}>Jaksu Trend</div>
                <div style={{ 
                  fontWeight: 7, 
                  color: (visits[0]?.stage === 'Normal') ? 'var(--green)' : (visits[0]?.stage === 'Early AMD') ? 'var(--orange)' : 'var(--red)' 
                }}>
                  {visits[0]?.stage === 'Normal' ? 'Normal' : visits[0]?.stage === 'Early AMD' ? 'Stable' : 'Worsening'}
                </div>
              </div>
            </div>
          </div>

          {/* บล็อก 2: Timeline */}
          <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p className="pill-label">Timeline</p>
            <div className="timeline-container">
              {visits.map((visit, index) => (
                <div key={index} className="timeline-item" onClick={() => setActiveIndex(index)} style={{ cursor: 'pointer' }}>
                  <div className="timeline-left">
                    <div className={`timeline-dot ${index === activeIndex ? 'active' : ''}`}></div>
                    {index < visits.length - 1 && <div className="timeline-line"></div>}
                  </div>
                  <div className="timeline-content">
                    <div className={`timeline-box ${index === activeIndex ? 'active' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 7, color: 'var(--text-dark)', fontSize: '14px' }}>{visit.stage}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-soft)', fontWeight: 5 }}>
                          {visit.isLatest && <span style={{ color: 'var(--orange)', fontWeight: 7 }}>Latest</span>}
                          <span>{visit.date}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span className="timeline-detection" style={{ fontSize: '11px' }}>{visit.detection}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== คอลัมน์กลาง (CENTER COLUMN) ==================== */}
        <div className="col-center">
          {/* บล็อก 1: Fundus Draggable Scanner */}
          <div className="premium-card fundus-viewer-card">
            <div 
              id="fundusContainer" 
              ref={fundusContainerRef}
              onPointerMove={handlePointerMove}
              style={{ touchAction: 'none' }}
            >
              <img src={activeEye === 'os' ? '/OS.png' : '/OD.png'} alt="Fundus Image" className="fundus-img" />
              <div 
                id="dragLineContainer" 
                ref={dragLineRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ 
                  top: `${dragTopPercent}%`, 
                  transition: isDraggingRef.current ? 'none' : 'top 0.1s ease',
                  touchAction: 'none'
                }}
              >
                <div className="drag-white-line"></div>
                <div id="dragBadge">{scaleValue}</div>
              </div>
            </div>
          </div>

          {/* บล็อก 2: Progression Summary */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <p className="pill-label">Progression Summary</p>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="var(--orange)" strokeWidth="2.5"/>
                <circle cx="12" cy="12" r="6" fill="#000"/>
                <circle cx="15" cy="12" r="2" fill="var(--orange)"/>
              </svg>
            </div>
            <p style={{ margin: '20px 0 0 0', fontSize: '16px', lineHeight: 1.6, color: '#2C2C2E', fontWeight: 500, textAlign: 'justify', textIndent: '2.5em', marginTop: '20px' }}>
              {summaryText}
            </p>
          </div>

          {/* ปุ่ม EDIT */}
          <button 
            onClick={openEditModal} 
            style={{ width: '100%', backgroundColor: 'var(--orange)', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '17px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginTop: '10px' }}
          >
            EDIT
          </button>
        </div>

        {/* ==================== คอลัมน์ขวา (RIGHT COLUMN) ==================== */}
        <div className="col-right">
          {/* บล็อก 1: Comparative View */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <p className="pill-label" style={{ margin: 0 }}>Comparative View</p>
              <button 
                onClick={() => { document.body.style.overflow = 'hidden'; setIsFullViewModalOpen(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-soft)', fontWeight: 700, fontSize: '14px', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }} 
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                Full View
              </button>
            </div>

            <div className="oct-comparison-wrapper">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* สแกนภาพย้อนหลัง (Previous) พร้อม SVG Lesion Dynamic Overlay */}
                <div className="oct-card-view">
                  <img src={prevOctImgUrl} alt="Previous OCT" />
                </div>
                <div className="scan-selector-row">
                  <span className="scan-label">Previous</span>
                  <div className="custom-select-wrapper">
                    <select 
                      className="custom-select" 
                      value={activeIndex} 
                      onChange={(e) => setActiveIndex(parseInt(e.target.value))}
                    >
                      {visits.map((visit, index) => (
                        <option key={index} value={index}>
                          {visit.date} {visit.isLatest ? '( Latest )' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="select-arrow">▼</span>
                  </div>
                </div>
              </div>

              <hr style={{ width: '100%', border: 0, borderTop: '1px dashed #E5E7EB', margin: '5px 0' }} />

              {/* สแกนภาพปัจจุบัน (Current) พร้อม SVG static overlay */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="oct-card-view">
                  <img src={octImgUrl} alt="Current OCT" />
                </div>
                <div className="scan-selector-row">
                  <span className="scan-label">Current</span>
                  <div className="custom-select-wrapper">
                    <select className="custom-select" disabled>
                      <option>{visits[0]?.date || 'May 22, 2026'} ( Latest )</option>
                    </select>
                    <span className="select-arrow">▼</span>
                  </div>
                </div>
              </div>
            </div>

            {/* แถบระบุสี Legend */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', fontWeight: 700, justifyContent: 'flex-start', borderBottom: '1.5px solid #F3F3F3', paddingBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--blue)' }}></span>
                <span style={{ color: 'var(--text-dark)', opacity: 0.85 }}>SRF</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--green)' }}></span>
                <span style={{ color: 'var(--text-dark)', opacity: 0.85 }}>PED</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--red)' }}></span>
                <span style={{ color: 'var(--text-dark)', opacity: 0.85 }}>IRF</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--yellow)' }}></span>
                <span style={{ color: 'var(--text-dark)', opacity: 0.85 }}>SHRM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--purple)' }}></span>
                <span style={{ color: 'var(--text-dark)', opacity: 0.85 }}>IS/OS</span>
              </div>
            </div>

            {/* ปุ่ม EXPORT */}
            <button 
              id="exportBtn" 
              className={exportSuccess ? 'success' : ''}
              onClick={triggerExportSuccess} 
              style={{ width: '100%', borderRadius: '100px', padding: '14px 0', fontSize: '17px', fontWeight: 700, cursor: 'pointer' }}
            >
              {exportSuccess ? 'EXPORTED!' : 'EXPORT'}
            </button>
          </div>
        </div>

      </div>

      {/* 3. บล็อก POPUP MODAL (EDIT TEXT OVERLAY - 2 Columns Layout) */}
      {isEditModalOpen && (
        <div id="modalBackdrop" className="modal-overlay" onClick={closeEditModal}>
          <div id="modalContainer" onClick={(e) => e.stopPropagation()}>
            
            {/* ปุ่ม X ปิดสีแดงเด่นด้านมุมบนขวา */}
            <button 
              onClick={closeEditModal} 
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', backgroundColor: '#FF3B30', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)', transition: 'transform 0.2s' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* 🌟 คอลัมน์ซ้ายของโมดอล: แสดง Timeline การรักษาเพื่อเป็น Reference */}
            <div className="modal-timeline-col">
              <p className="pill-label" style={{ fontSize: '12px', padding: '4px 12px' }}>Timeline</p>
              
              <div className="timeline-container" style={{ marginTop: '15px', flex: 1 }}>
                {visits.map((visit, index) => (
                  <div key={index} className="timeline-item" onClick={() => { setActiveIndex(index); syncModalFieldsForIndex(index); }} style={{ cursor: 'pointer' }}>
                    <div className="timeline-left">
                      <div className={`timeline-dot ${index === activeIndex ? 'active' : ''}`}></div>
                      {index < visits.length - 1 && <div className="timeline-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className={`timeline-box ${index === activeIndex ? 'active' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 7, color: 'var(--text-dark)', fontSize: '13px' }}>{visit.stage}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-soft)', fontWeight: 5 }}>
                            {visit.isLatest && <span style={{ color: 'var(--orange)', fontWeight: 7 }}>Latest</span>}
                            <span>{visit.date}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span className="timeline-detection" style={{ fontSize: '11px' }}>{visit.detection}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 🌟 คอลัมน์ขวาของโมดอล: ฟอร์มการแก้ไขข้อมูล (Risk Status, Tag line, Summary) */}
            <div className="modal-form-col">
              
              {/* หมวด 1: Risk Status */}
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.2px' }}>Risk Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="radio" 
                      name="modalRisk" 
                      value="Intermediate AMD" 
                      className="modal-radio-input"
                      checked={modalRisk === 'Intermediate AMD'}
                      onChange={(e) => setModalRisk(e.target.value)}
                    />
                    Intermediate AMD
                  </label>
                  
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="radio" 
                      name="modalRisk" 
                      value="Early AMD" 
                      className="modal-radio-input"
                      checked={modalRisk === 'Early AMD'}
                      onChange={(e) => setModalRisk(e.target.value)}
                    />
                    Early AMD
                  </label>
                  
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="radio" 
                      name="modalRisk" 
                      value="Normal" 
                      className="modal-radio-input"
                      checked={modalRisk === 'Normal'}
                      onChange={(e) => setModalRisk(e.target.value)}
                    />
                    Normal
                  </label>
                  
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="radio" 
                      name="modalRisk" 
                      value="Other" 
                      className="modal-radio-input"
                      checked={modalRisk === 'Other'}
                      onChange={(e) => setModalRisk(e.target.value)}
                    />
                    Other...
                    <input 
                      type="text" 
                      placeholder="Type status..." 
                      className="modal-text-input" 
                      style={{ width: '100px', fontSize: '13px', fontWeight: 600, padding: '6px 10px', marginLeft: '4px' }}
                      value={modalRiskOther}
                      onChange={(e) => {
                        setModalRisk('Other');
                        setModalRiskOther(e.target.value);
                      }}
                      onFocus={() => setModalRisk('Other')}
                    />
                  </label>
                </div>
              </div>

              <hr style={{ width: '100%', border: 0, borderTop: '1.5px solid #ECECEC', margin: 0 }} />

              {/* หมวด 2: Tag line */}
              <div>
                <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.2px' }}>Tag line</p>
                <input 
                  type="text" 
                  className="modal-text-input" 
                  style={{ width: '100%', padding: '10px 14px', fontSize: '15px' }} 
                  placeholder="เช่น 1st Detection"
                  value={modalTagLine}
                  onChange={(e) => setModalTagLine(e.target.value)}
                />
              </div>

              <hr style={{ width: '100%', border: 0, borderTop: '1.5px solid #ECECEC', margin: 0 }} />

              {/* หมวด 3: Progression Summary */}
              <div>
                <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.2px' }}>Progression Summary</p>
                <textarea 
                  className="modal-textarea" 
                  style={{ width: '100%', height: '120px' }}
                  value={modalSummary}
                  onChange={(e) => setModalSummary(e.target.value)}
                ></textarea>
              </div>

              {/* ปุ่ม Save Changes ด้านล่างขวา */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                <button 
                  onClick={saveModalChanges} 
                  style={{ 
                    backgroundColor: saveSuccess ? 'var(--green)' : 'var(--orange)', 
                    color: '#FFFFFF', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '14px 54px', 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    boxShadow: saveSuccess ? '0 6px 16px rgba(16, 185, 129, 0.25)' : '0 6px 16px rgba(254, 119, 67, 0.25)', 
                    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)' 
                  }}
                >
                  {saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. บล็อก POPUP MODAL (FULL VIEW OCT IMAGES) */}
      {isFullViewModalOpen && (
        <div id="fullViewModal" className="modal-overlay" onClick={() => { document.body.style.overflow = ''; setIsFullViewModalOpen(false); }}>
          <div id="fullViewContainer" onClick={(e) => e.stopPropagation()}>
            
            {/* ปุ่ม Back ด้านซ้ายบน */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <span 
                onClick={() => { document.body.style.overflow = ''; setIsFullViewModalOpen(false); }} 
                style={{ fontSize: '16px', color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, opacity: 0.85, transition: 'opacity 0.2s' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back
              </span>
            </div>

            {/* ส่วนที่ 1: Previous OCT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div className="oct-card-view" style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <img src={prevOctImgUrl} alt="Previous OCT Full" style={{ width: '100%', height: '118%', objectFit: 'fill', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', textAlign: 'left' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-soft)', minWidth: '80px' }}>Previous</span>
                <div className="custom-select-wrapper" style={{ width: '260px' }}>
                  <select 
                    className="custom-select" 
                    value={activeIndex} 
                    onChange={(e) => setActiveIndex(parseInt(e.target.value))}
                  >
                    {visits.map((visit, index) => (
                      <option key={index} value={index}>
                        {visit.date} {visit.isLatest ? '( Latest )' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="select-arrow">▼</span>
                </div>
              </div>
            </div>

            <hr style={{ width: '100%', border: 0, borderTop: '1.5px solid #F3F3F3', margin: '5px 0' }} />

            {/* ส่วนที่ 2: Current OCT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div className="oct-card-view" style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <img src={octImgUrl} alt="Current OCT Full" style={{ width: '100%', height: '118%', objectFit: 'fill', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', textAlign: 'left' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-soft)', minWidth: '80px' }}>Current</span>
                <div className="custom-select-wrapper" style={{ width: '260px' }}>
                  <select className="custom-select" disabled>
                    <option>{visits[0]?.date || 'May 22, 2026'} ( Latest )</option>
                  </select>
                  <span className="select-arrow">▼</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );

  // ฟังก์ชันช่วยเหลือสำหรับ sync ข้อมูลฟอร์มในโมดอลเมื่อกดเลือกใน Timeline ของโมดอล
  function syncModalFieldsForIndex(idx) {
    const targetVisit = visits[idx];
    if (!targetVisit) return;
    setModalTagLine(targetVisit.detection || '');
    if (['Intermediate AMD', 'Early AMD', 'Normal'].includes(targetVisit.stage)) {
      setModalRisk(targetVisit.stage);
      setModalRiskOther('');
    } else {
      setModalRisk('Other');
      setModalRiskOther(targetVisit.stage || '');
    }
    if (targetVisit.rawTimeline) {
      setModalSummary(targetVisit.rawTimeline.progression_summary || '');
    } else {
      setModalSummary(targetVisit.summary || getSummaryForPatient(patient));
    }
  }
}
