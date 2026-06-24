import React, { useState, useRef, useEffect, useCallback } from 'react';
import './IndividualDiagnostic.css';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';


export default function IndividualDiagnostic({ patient, onBack }) {
  // ── STATE MANAGEMENT ──
  const location = useLocation();
  const navigate = useNavigate();
  const passedPatient = location.state?.patient;
  
  const [activeEye, setActiveEye] = useState('os'); // 'os' หรือ 'od'
  const [showMask, setShowMask] = useState(true);
  const [csvMetadata, setCsvMetadata] = useState([]);
  
  // ระบบลากขีดแนวแกนสแกนพิกัดบน Fundus (Draggable Scale 1-100)
  const [dragTopPercent, setDragTopPercent] = useState(92);
  const [scaleValue, setScaleValue] = useState(1);
  const isDraggingRef = useRef(false);
  const fundusContainerRef = useRef(null);
  const dragLineRef = useRef(null);
  
  const [riskStatus, setRiskStatus] = useState(patient?.diagnosis || passedPatient?.diagnosis || '');
  const [summaryText, setSummaryText] = useState('');
  const [actionText, setActionText] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false); // แสดง loading ขณะรอ Gemini
  const isGeneratingRef = useRef(false); // ป้องกัน Gemini ถูกยิงซ้ำพร้อมกัน
  const abortControllerRef = useRef(null); // ยกเลิก request เก่าเมื่อ switch ตา

  useEffect(() => {
    // ยกเลิก request เก่าถ้ามีการ switch ตาก่อนที่จะโหลดเสร็จ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // ล้างข้อมูลเก่าทันทีเมื่อเปลี่ยนตา เพื่อไม่ให้แสดงผลข้างเดิมค้างอยู่
    setSummaryText('');
    setActionText('');
    setRiskStatus('');
    setIsDraftLoading(true);

    const fetchDraft = async () => {
      let vId = patient?.rawVisit?.visit_id || passedPatient?.rawVisit?.visit_id;
      const pId = patient?.id || passedPatient?.id || 'P-2605-016';

      // Fallback to seed visit_ids if visit_id is missing to enable LLM generation in mockup mode
      if (!vId) {
        if (pId === 'P-2605-016') {
          vId = '39a2fe63-8bfd-406d-a51b-1c4495b8d00e';
        } else if (pId === 'P-2605-012') {
          vId = '49a2fe63-8bfd-406d-a51b-1c4495b8d00f';
        } else if (pId === 'P-2605-037') {
          vId = '59a2fe63-8bfd-406d-a51b-1c4495b8d00e';
        }
      }

      // 1. We removed localStorage check to ALWAYS fetch from backend database

      // Initialize different default mock data based on eyeSide (OS vs OD)
      if (vId) {
        try {
          const response = await API.get(`/diagnostics/visit/${vId}/${activeEye.toUpperCase()}`);
          if (controller.signal.aborted) return; // ถ้า switch ตาไปแล้ว ยกเลิกทันที
          const data = response.data;
          if (data && data.drafted_summary && data.drafted_summary.trim().length > 30) {
            // มีผลวินิจฉัยจริงจาก Gemini อยู่ใน DB แล้ว — แสดงทันที ไม่ยิง Gemini ซ้ำ
            setRiskStatus(data.condition_stage || '');
            setSummaryText(data.drafted_summary || '');
            setActionText(data.suggested_action || '');
            setIsDraftLoading(false);
            return;
          } else {
            // drafted_summary ว่างเปล่า (ข้อมูล seed เริ่มต้น) → ต้องขอ Gemini
            if (!isGeneratingRef.current) {
              isGeneratingRef.current = true;
              throw new Error("Draft empty");
            } else {
              // มีคำขอ Gemini อยู่แล้ว ไม่ต้องยิงซ้ำ
              setIsDraftLoading(false);
              return;
            }
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          if ((err.response && err.response.status === 404) || err.message === "Draft empty") {
            console.log("No existing draft found (or empty) in database, generating new AI draft via LLM.");
            try {
              const pName = patient?.name || passedPatient?.name || "Khanatip Gankingpai";
              
              // 1. ดึงข้อมูล CSV แบบ Real-time เพื่อเอาค่าพิกเซลจริงส่งให้ LLM
              const patientMap = {
                'P-2605-016': { os: '79', od: '14' },
                'P-2605-012': { os: '130', od: '117' },
                'P-2605-037': { os: 'natthawut_os', od: 'natthawut_od' }
              };
              const datasetId = patientMap[pId]?.[activeEye.toLowerCase()] || '95';
              let metaData = [];
              try {
                const metaRes = await API.get(`/diagnostics/dataset/${datasetId}/metadata`);
                metaData = metaRes.data || [];
              } catch (e) {
                console.error("Failed to fetch metadata for draft:", e);
              }

              // 2. คำนวณผลรวมพิกเซลจากทุก B-Scan
              let srf = 0, irf = 0, shrm = 0, is_os = 0;
              metaData.forEach(row => {
                srf += row.SRF || 0;
                irf += row.IRF || 0;
                shrm += row.SHRM || 0;
                is_os += row.IS_OS || 0;
              });

              // 3. Drusen ไม่มีใน CSV จึงจำลองตามเคส (เหมือนเดิม)
              let drusen = 0;
              if (pName.includes("Khanatip")) {
                drusen = activeEye === 'os' ? 1200 : 450;
              } else if (pName.includes("Jirawat")) {
                drusen = activeEye === 'os' ? 350 : 0;
              }

              const draftResponse = await API.post('/diagnostics/generate-draft', {
                patient_id: pId,
                visit_id: vId,
                age: parseInt(patient?.age || passedPatient?.age || "65"),
                eye_side: activeEye.toUpperCase(),
                drusen_pixels: drusen,
                srf_pixels: srf,
                irf_pixels: irf,
                shrm_pixels: shrm,
                is_os_pixels: is_os
              });

              if (controller.signal.aborted) return;
              const draftData = draftResponse.data;
              if (draftData) {
                setRiskStatus(draftData.condition_stage || '');
                setSummaryText(draftData.drafted_summary || '');
                setActionText(draftData.suggested_action || '');
              }
            } catch (draftErr) {
              if (controller.signal.aborted) return;
              console.error("Failed to generate AI draft:", draftErr);
              setSummaryText("Connection issue with LLM. Please try again later.");
              setActionText("Unable to analyze data due to server connection error.");
            } finally {
              isGeneratingRef.current = false;
            }
          } else {
            console.error("Error fetching diagnostic draft:", err);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsDraftLoading(false);
          }
        }
      }
    };

    fetchDraft();

    // Cleanup: ยกเลิก request เมื่อ component unmount หรือ activeEye เปลี่ยน
    return () => {
      controller.abort();
      isGeneratingRef.current = false;
    };
  }, [patient, passedPatient, activeEye]);

  // ตั้งค่า mapping สำหรับคนไข้เพื่อหา dataset_id ของภาพและข้อมูลจริง
  const patientToDatasetMap = {
    'P-2605-016': { os: '79', od: '14' }, // Khanatip (Intermediate/Early)
    'P-2605-012': { os: '130', od: '117' },   // Jirawat (Early/Wet)
    'P-2605-037': { os: 'natthawut_os', od: 'natthawut_od' }  // Natthawut (Normal/Normal)
  };
  const pId = patient?.id || passedPatient?.id || 'P-2605-016';
  const eyeSide = activeEye.toLowerCase();
  const datasetId = patientToDatasetMap[pId]?.[eyeSide] || '95';

  // โหลดข้อมูลพิกเซลรอยโรคแบบไดนามิกจากหลังบ้าน
  useEffect(() => {
    const fetchCsvMetadata = async () => {
      try {
        const response = await API.get(`/diagnostics/dataset/${datasetId}/metadata`);
        if (response.data) {
          setCsvMetadata(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch dataset CSV metadata:", err);
      }
    };
    
    // รีเซ็ตค่าสเกลและตำแหน่งขีดสีขาวกลับไปค่าเริ่มต้นก่อน
    setScaleValue(1);
    setDragTopPercent(92);
    fetchCsvMetadata();
  }, [datasetId]);

  // จำกัดขอบเขตของ scaleValue และซิงก์ตำแหน่งขีดตาม B-scan ปัจจุบัน
  useEffect(() => {
    if (!isDraggingRef.current && csvMetadata.length > 0) {
      const N = csvMetadata.length;
      
      // จำกัดค่า scaleValue ให้อยู่ในช่วง 1 ถึง N
      let constrained = scaleValue;
      if (scaleValue > N) {
        constrained = N;
        setScaleValue(N);
      } else if (scaleValue < 1) {
        constrained = 1;
        setScaleValue(1);
      }
      
      // คำนวณเปอร์เซ็นต์ส่วนสูงจากสูตร y = maxY - ratio * (maxY - minY)
      // โดยขอบเขตอยู่ระหว่าง 8% (บนสุด) ถึง 92% (ล่างสุด)
      const ratio = N > 1 ? (constrained - 1) / (N - 1) : 0;
      const percentY = 92 - ratio * (92 - 8);
      setDragTopPercent(percentY);
    }
  }, [scaleValue, csvMetadata]);


  // สถานะเปิด-ปิด Modal ต่างๆ
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOctModalOpen, setIsOctModalOpen] = useState(false);

  // ค่าฟิลด์ฟอร์มชั่วคราวใน Edit Modal
  const [modalRisk, setModalRisk] = useState('');
  const [modalRiskOther, setModalRiskOther] = useState('');
  const [modalSummary, setModalSummary] = useState('');
  const [modalAction, setModalAction] = useState('');

  // สถานะความสำเร็จของปุ่ม Action ข้างล่าง
  const [isCopied, setIsCopied] = useState(false);
  const [isSavedBtnState, setIsSavedBtnState] = useState(false); // ควบคุมสถานะปุ่มใน Modal
  const [isApproved, setIsApproved] = useState(false); // ปุ่ม Approve ใหญ่

  // (Declarations moved to the top of the component to prevent ReferenceError)

  // ── FUNCTIONS ──
  // ฟังก์ชันคัดลอกข้อความสรุป (Copy to Hospital HIS)
  const handleCopyToHIS = () => {
    const fullTextToCopy = `[Drafted Summary]\n${summaryText}\n\n[Suggested Action]\n${actionText}`;
    navigator.clipboard.writeText(fullTextToCopy)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  // จัดการเปิดฟอร์มแก้ไขและดึงค่าเดิมขึ้นมา Setup
  const openEditModal = () => {
    document.body.style.overflow = 'hidden';
    setModalSummary(summaryText);
    setModalAction(actionText);

    if (['Intermediate AMD', 'Early AMD', 'Normal'].includes(riskStatus)) {
      setModalRisk(riskStatus);
      setModalRiskOther('');
    } else {
      setModalRisk('Other');
      setModalRiskOther(riskStatus);
    }
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    document.body.style.overflow = '';
    setIsEditModalOpen(false);
    setIsSavedBtnState(false);
  };

  // จัดการบันทึกฟอร์มแก้ไขลงหน้าจอหลักแบบเรียลไทม์
  const handleSaveModalChanges = async () => {
    setIsSavedBtnState(true);
    
    let finalRisk = modalRisk;
    if (modalRisk === 'Other') {
      finalRisk = modalRiskOther.trim() !== '' ? modalRiskOther.trim() : 'Custom AMD';
    }

    const pId = patient?.id || passedPatient?.id || 'P-2605-016';
    const vId = patient?.rawVisit?.visit_id || passedPatient?.rawVisit?.visit_id;

    // 1. Update React state immediately (without saving to localStorage)
    setRiskStatus(finalRisk);
    setSummaryText(modalSummary);
    setActionText(modalAction);

    // Sync mockup state in localStorage when saving modal changes
    let list = [];
    const savedMockPatients = localStorage.getItem('mockPatients');
    if (savedMockPatients) {
      try {
        list = JSON.parse(savedMockPatients);
      } catch (e) {
        console.error(e);
      }
    }
    if (list.length === 0) {
      list = [
        { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444" },
        { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743" },
        { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f" }
      ];
    }
    const index = list.findIndex(p => p.id === pId);
    if (index !== -1) {
      list[index].diagnosis = finalRisk;
      list[index].riskLevel = finalRisk === 'Intermediate AMD' ? 'High' : finalRisk === 'Early AMD' ? 'Medium' : 'Low';
      list[index].colorCode = list[index].riskLevel === 'High' ? '#EF4444' : list[index].riskLevel === 'Medium' ? '#FE7743' : '#40a34f';
      localStorage.setItem('mockPatients', JSON.stringify(list));
    }


    // Save draft to PostgreSQL if vId exists
    if (vId) {
      try {
        let riskLevel = 'Low';
        let aiTrend = 'Normal';
        if (finalRisk === 'Intermediate AMD') {
          riskLevel = 'High';
          aiTrend = 'Worsening';
        } else if (finalRisk === 'Early AMD') {
          riskLevel = 'Medium';
          aiTrend = 'Stable';
        } else if (finalRisk === 'Normal') {
          riskLevel = 'Low';
          aiTrend = 'Normal';
        } else {
          riskLevel = 'High';
          aiTrend = 'Stable';
        }

        await API.post('/diagnostics/', {
          patient_id: pId,
          visit_id: vId,
          eye_side: activeEye.toUpperCase(),
          risk_level: riskLevel,
          condition_stage: finalRisk,
          ai_trend: aiTrend,
          drafted_summary: modalSummary,
          suggested_action: modalAction,
          exported_to_his: false
        });
      } catch (err) {
        console.error("Error saving diagnostic draft to API:", err);
      }
    }

    setRiskStatus(finalRisk);
    setSummaryText(modalSummary);
    setActionText(modalAction);

    setTimeout(() => {
      closeEditModal();
    }, 800);
  };

  // ฟังก์ชัน Approve & Save บล็อกล่างสุด
  const handleTriggerApprove = async () => {
    const vId = patient?.rawVisit?.visit_id || passedPatient?.rawVisit?.visit_id;
    const pId = patient?.id || passedPatient?.id || 'P-2605-016';

    // Map risk status to severity risk level as expected by DB schema
    let riskLevel = 'Low';
    let aiTrend = 'Normal';
    if (riskStatus === 'Intermediate AMD') {
      riskLevel = 'High';
      aiTrend = 'Worsening';
    } else if (riskStatus === 'Early AMD') {
      riskLevel = 'Medium';
      aiTrend = 'Stable';
    } else if (riskStatus === 'Normal') {
      riskLevel = 'Low';
      aiTrend = 'Normal';
    } else {
      riskLevel = 'High';
      aiTrend = 'Stable';
    }

    if (vId) {
      try {
        await API.put(`/diagnostics/visit/${vId}/${activeEye.toUpperCase()}/approve`, {
          patient_id: pId,
          visit_id: vId,
          eye_side: activeEye.toUpperCase(),
          risk_level: riskLevel,
          condition_stage: riskStatus,
          ai_trend: aiTrend,
          drafted_summary: summaryText,
          suggested_action: actionText,
          exported_to_his: true
        });
      } catch (err) {
        console.error("Error approving and saving diagnostic, fallback to mockup mode:", err);
      }
    } else {
      console.warn("No visit ID found for this patient queue, running in mockup mode");
    }

    // Save approved mockup state in localStorage for specific eye side
    const localKey = `mockDraft_${pId}_${activeEye}`;
    localStorage.setItem(localKey, JSON.stringify({
      riskStatus,
      summaryText,
      actionText,
      isApproved: true
    }));

    // Sync mockup state in localStorage
    let list2 = [];
    const savedMockPatients2 = localStorage.getItem('mockPatients');
    if (savedMockPatients2) {
      try {
        list2 = JSON.parse(savedMockPatients2);
      } catch (e) {
        console.error(e);
      }
    }
    if (list2.length === 0) {
      list2 = [
        { id: "P-2605-016", name: "Khanatip Gankingpai", queue: "Q#001", time: "10:00AM", diagnosis: "Intermediate AMD", riskLevel: "High", colorCode: "#EF4444" },
        { id: "P-2605-012", name: "Jirawat Jakthong", queue: "Q#002", time: "10:15AM", diagnosis: "Early AMD", riskLevel: "Medium", colorCode: "#FE7743" },
        { id: "P-2605-037", name: "Natthawut Saengmani", queue: "Q#003", time: "10:30AM", diagnosis: "Normal", riskLevel: "Low", colorCode: "#40a34f" }
      ];
    }
    const index2 = list2.findIndex(p => p.id === pId);
    if (index2 !== -1) {
      list2[index2].diagnosis = riskStatus;
      list2[index2].riskLevel = riskStatus === 'Intermediate AMD' ? 'High' : riskStatus === 'Early AMD' ? 'Medium' : 'Low';
      list2[index2].colorCode = list2[index2].riskLevel === 'High' ? '#EF4444' : list2[index2].riskLevel === 'Medium' ? '#FE7743' : '#40a34f';
      list2[index2].isApproved = true;
      localStorage.setItem('mockPatients', JSON.stringify(list2));
    }


    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const savedVisits = localStorage.getItem(`mockVisits_${pId}_${activeEye}`);
    let visitsList = [];
    if (savedVisits) {
      try {
        visitsList = JSON.parse(savedVisits);
      } catch (e) {
        console.error(e);
      }
    } else {
      const pName = patient?.name || passedPatient?.name || "Khanatip Gankingpai";
      if (pName.includes("Khanatip")) {
        if (activeEye === 'os') {
          visitsList = [
            { date: "May 22, 2026", stage: "Intermediate AMD", detection: "Worsening Trend", isLatest: true, lesionPath: "M 210,130 Q 230,110 250,130 Z", strokePath: "M 10,105 L 180,123 Q 230,132 280,127 L 450,127" },
            { date: "Jan 15, 2024", stage: "Early AMD", detection: "1st Detection", isLatest: false, lesionPath: "M 190,132 Q 215,115 240,132 Z", strokePath: "M 10,105 L 180,123 Q 230,130 280,127 L 450,127" },
            { date: "Jul 22, 2023", stage: "Normal", detection: "Baseline", isLatest: false, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" }
          ];
        } else {
          visitsList = [
            { date: "May 22, 2026", stage: "Early AMD", detection: "Stable", isLatest: true, lesionPath: "M 190,132 Q 215,115 240,132 Z", strokePath: "M 10,105 L 180,123 Q 230,130 280,127 L 450,127" },
            { date: "Jan 15, 2024", stage: "Normal", detection: "Baseline", isLatest: false, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" }
          ];
        }
      } else if (pName.includes("Jirawat")) {
        if (activeEye === 'os') {
          visitsList = [
            { date: "May 18, 2026", stage: "Wet AMD", detection: "Worsening", isLatest: true, lesionPath: "M 210,130 Q 230,110 250,130 Z", strokePath: "M 10,105 L 180,123 Q 230,132 280,127 L 450,127" },
            { date: "Dec 10, 2023", stage: "Early AMD", detection: "1st Detection", isLatest: false, lesionPath: "M 180,135 Q 200,120 220,135 Z", strokePath: "M 10,105 L 180,122 Q 230,129 280,127 L 450,127" },
            { date: "Oct 05, 2023", stage: "Normal", detection: "Baseline", isLatest: false, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" }
          ];
        } else {
          visitsList = [
            { date: "May 18, 2026", stage: "Wet AMD", detection: "Worsening", isLatest: true, lesionPath: "M 210,130 Q 230,110 250,130 Z", strokePath: "M 10,105 L 180,123 Q 230,132 280,127 L 450,127" },
            { date: "Oct 05, 2023", stage: "Normal", detection: "Baseline", isLatest: false, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" }
          ];
        }
      } else {
        visitsList = [
          { date: "May 12, 2026", stage: "Normal", detection: "Normal", isLatest: true, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" },
          { date: "Jul 22, 2023", stage: "Normal", detection: "Baseline", isLatest: false, lesionPath: "", strokePath: "M 10,105 L 180,120 Q 230,126 280,127 L 450,127" }
        ];
      }
    }

    const newVisit = {
      date: todayStr,
      stage: riskStatus,
      detection: "บันทึกการรักษา",
      summary: summaryText,
      isLatest: true,
      lesionPath: riskStatus === "Intermediate AMD" ? "M 210,130 Q 230,110 250,130 Z" : riskStatus === "Early AMD" ? "M 190,132 Q 215,115 240,132 Z" : "",
      strokePath: riskStatus === "Intermediate AMD" ? "M 10,105 L 180,123 Q 230,132 280,127 L 450,127" : "M 10,105 L 180,120 Q 230,126 280,127 L 450,127"
    };

    visitsList = visitsList.map(v => ({ ...v, isLatest: false }));
    visitsList.unshift(newVisit);
    localStorage.setItem(`mockVisits_${pId}_${activeEye}`, JSON.stringify(visitsList));

    const savedProgPatients = localStorage.getItem('mockProgressionPatients');
    if (savedProgPatients) {
      try {
        const progList = JSON.parse(savedProgPatients);
        const progIdx = progList.findIndex(p => p.id === pId);
        if (progIdx !== -1) {
          progList[progIdx].stage = riskStatus;
          progList[progIdx].lastVisit = todayStr;
          const isWorsening = ["Intermediate AMD", "Inter. AMD", "Wet AMD", "Active Wet AMD"].includes(riskStatus);
          const isStable = ["Early AMD"].includes(riskStatus);
          progList[progIdx].trend = isWorsening ? "Worsening" : isStable ? "Stable" : "Normal";
          progList[progIdx].trendColor = isWorsening ? "#EF4444" : isStable ? "#3B82F6" : "#22C55E";
          progList[progIdx].dotColor = progList[progIdx].trendColor;
          localStorage.setItem('mockProgressionPatients', JSON.stringify(progList));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Always trigger success state and return back to list
    setIsApproved(true);
    setTimeout(() => {
      setIsApproved(false);
      if (onBack) {
        onBack();
      } else {
        navigate('/diagnostic');
      }
    }, 2000);
  };


  // ── MOUSE/TOUCH DRAG HANDLERS (FUNDUS LINE) ──
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
    let y = e.clientY - rect.top;

    const minY = rect.height * 0.08;
    const maxY = rect.height * 0.92;

    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    const percentY = (y / rect.height) * 100;
    setDragTopPercent(percentY);

    const totalSlices = csvMetadata.length > 0 ? csvMetadata.length : 100;
    const calculatedScale = totalSlices > 1
      ? Math.round(((maxY - y) / (maxY - minY)) * (totalSlices - 1)) + 1
      : 1;
    setScaleValue(calculatedScale);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const totalSlices = csvMetadata.length > 0 ? csvMetadata.length : 100;
    
    setScaleValue(prevScale => {
      let newScale = prevScale;
      if (e.deltaY > 0) {
        newScale -= 1;
      } else {
        newScale += 1;
      }
      
      if (newScale < 1) newScale = 1;
      if (newScale > totalSlices) newScale = totalSlices;
      
      if (newScale !== prevScale) {
        const newPercent = 92 - ((newScale - 1) / (totalSlices - 1)) * (92 - 8);
        setDragTopPercent(newPercent);
      }
      return newScale;
    });
  }, [csvMetadata]);

  useEffect(() => {
    const container = fundusContainerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // โหลดรูปภาพและ overlay ตามชื่อไฟล์จริงจาก CSV metadata (ไดนามิกตามจำนวนจริง)
  const currentImageName = csvMetadata[scaleValue - 1]?.Image_Name || `${datasetId}_${scaleValue}.png`;
  
  const folderPrefix = datasetId.includes('natthawut') ? 'cropped' : 'padded';
  const octImgUrl = showMask 
    ? `/dataset/${datasetId}/${folderPrefix}_overlays/${currentImageName}`
    : `/dataset/${datasetId}/${folderPrefix}_images/${currentImageName}`;

  const originalOctImgUrl = `/dataset/${datasetId}/${folderPrefix}_images/${currentImageName}`;
  const biomarkerOctImgUrl = `/dataset/${datasetId}/${folderPrefix}_overlays/${currentImageName}`;

  const currentSliceData = csvMetadata[scaleValue - 1] || {
    SRF: 0, PED: 0, IRF: 0, SHRM: 0, IS_OS: 0, Total_Lesion_Pixels: 0
  };

  return (
    <div className="diagnostic-workspace-page">
      {/* 🌟 ย้ายส่วนของแถบเมนูด้านบน (Navbar) ออกแล้ว เพื่อให้ MainLayout แสดงผล Navbar ส่วนกลางของระบบแทน */}
      
      {/* พื้นที่เนื้อหาหลักทั้งหมด */}
      <div className="dummy-content">
        
        {/* หัวข้อหน้าแบบแถวเดียว */}
        <div className="page-header">
          <div className="header-left">
            <span className="back-btn" onClick={onBack} style={{ cursor: 'pointer' }}>
              <span className="arrow-container">
                <img src="/downArrow.png" alt="Back" width="32" style={{ transform: 'rotate(90deg)' }} />
              </span>
              Individual Diagnostic
            </span>
          </div>

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
          <div className="header-right"></div>
        </div>

        {/* โครงข่ายคอลัมน์ซ้ายขวา */}
        <div className="main-workspace-grid">
          
          {/* ==================== ฝั่งซ้าย (LEFT COLUMN) ==================== */}
          <div className="col-left">
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
                  style={{ top: `${dragTopPercent}%`, transition: isDraggingRef.current ? 'none' : 'top 0.1s ease' }}
                >
                  <div className="drag-white-line"></div>
                  <div id="dragBadge">{scaleValue}</div>
                </div>
              </div>
            </div>

            <div className="premium-card patient-info-card">
              <div className="card-header-row">
                <p className="pill-label">Patient Info.</p>
                <p className="queue-label">{patient?.queue || passedPatient?.queue || 'Q#001'}</p>
              </div>

              <div className="patient-details-list">
                <div>
                  <p className="detail-title">Name</p>
                  <p className="detail-value text-dark">{patient?.name || passedPatient?.name || 'Khanatip Gankingpai'}</p>
                </div>

                <div className="detail-row-group">
                  <div>
                    <p className="detail-title">Age</p>
                    <p className="detail-value text-dark">{patient?.age || passedPatient?.age || '65'}</p>
                  </div>
                  <div>
                    <p className="detail-title">Sex</p>
                    <p className="detail-value text-dark">{patient?.sex || passedPatient?.sex || 'Male'}</p>
                  </div>
                </div>

                <div>
                  <p className="detail-title">Patient ID</p>
                  <p className="detail-value text-dark">{patient?.id || passedPatient?.id || 'P-2052-112'}</p>
                </div>

                <div>
                  <p className="detail-title">Risk Status</p>
                  <p id="mainRiskStatus" className="detail-value text-dark">{riskStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== ฝั่งขวา (RIGHT COLUMN) ==================== */}
          <div className="col-right">
            <div className="premium-card biomarker-card">
              <div className="card-header-row">
                <p className="pill-label">Biomarker</p>
                <div className="mask-selector-wrapper">
                  <div 
                    className={`mask-tab ${showMask ? 'active' : ''}`} 
                    onClick={() => setShowMask(true)}
                  >
                    AI Mask On
                  </div>
                  <div 
                    className={`mask-tab ${!showMask ? 'active' : ''}`} 
                    onClick={() => setShowMask(false)}
                  >
                    Off
                  </div>
                </div>
              </div>

              <div className="oct-image-container">
                <img src={octImgUrl} alt="OCT Scan" className="oct-img" />
              </div>

              <div className="biomarker-legend-row">
                <div className="legend-item"><span className="dot blue-dot"></span>SRF: {currentSliceData.SRF} px</div>
                <div className="legend-item"><span className="dot red-dot"></span>PED: {currentSliceData.IRF} px</div>
                <div className="legend-item"><span className="dot green-dot"></span>IRF: {currentSliceData.PED} px</div>
                <div className="legend-item"><span className="dot yellow-dot"></span>SHRM: {currentSliceData.SHRM} px</div>
                <div className="legend-item"><span className="dot purple-dot"></span>IS/OS: {currentSliceData.IS_OS} px</div>
              </div>
            </div>

            <div className="premium-card copilot-card">
              <div className="card-header-row">
                <p className="pill-label">Clinical Co-pilot</p>
                <img src="/BotLogo.png" alt="Bot" width="30" />
              </div>

              <div className="copilot-report-body">
                {isDraftLoading ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted, #aaa)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.2s linear infinite', marginBottom: '10px', display: 'block', margin: '0 auto 10px' }}>
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    </svg>
                    <p style={{ margin: 0, fontSize: '13px' }}>Analyzing OCT data with AI...</p>
                  </div>
                ) : (
                  <div className="copilot-two-column">
                    {/* Left Column */}
                    <div style={{ flex: '1 1 50%' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <p className="report-title">Diagnostic Summary:</p>
                        <p id="summaryText" className="report-desc" style={{ whiteSpace: 'pre-wrap', textIndent: '24px' }}>
                          {summaryText}
                        </p>
                      </div>

                      <div>
                        <p className="report-title">Treatment Guideline:</p>
                        <p id="actionText" className="report-desc" style={{ whiteSpace: 'pre-wrap' }}>
                          {actionText ? actionText.replace(/ (\d+\.)/g, '\n$1') : ''}
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ flex: '1 1 50%' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>
                          <p className="report-title" style={{ color: '#EF4444', margin: 0 }}>Present (abnormal)</p>
                          <p className="report-title" style={{ color: '#888', margin: 0, fontSize: '13px' }}>AI Confidence (%)</p>
                        </div>
                        <ul className="report-desc" style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, color: '#333' }}>
                          {currentSliceData.SRF > 0 && (
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>Significant subretinal fluid (SRF)</span>
                              <span style={{ fontWeight: 'bold' }}>{Math.round(currentSliceData.SRF_Conf * 100)}%</span>
                            </li>
                          )}
                          {currentSliceData.PED > 0 && (
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>Pigment epithelial detachment (PED)</span>
                              <span style={{ fontWeight: 'bold' }}>{Math.round(currentSliceData.PED_Conf * 100)}%</span>
                            </li>
                          )}
                          {currentSliceData.IRF > 0 && (
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>Intraretinal fluid (IRF)</span>
                              <span style={{ fontWeight: 'bold' }}>{Math.round(currentSliceData.IRF_Conf * 100)}%</span>
                            </li>
                          )}
                          {currentSliceData.SHRM > 0 && (
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>Subretinal Hyperreflective Material (SHRM)</span>
                              <span style={{ fontWeight: 'bold' }}>{Math.round(currentSliceData.SHRM_Conf * 100)}%</span>
                            </li>
                          )}
                          {currentSliceData.IS_OS > 0 && (
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>Severe IS/OS disruption</span>
                              <span style={{ fontWeight: 'bold' }}>{Math.round(currentSliceData.IS_OS_Conf * 100)}%</span>
                            </li>
                          )}
                          {(!currentSliceData.SRF && !currentSliceData.PED && !currentSliceData.IRF && !currentSliceData.SHRM && !currentSliceData.IS_OS) && (
                            <li style={{ color: '#888', fontStyle: 'italic' }}>No significant abnormalities detected in this slice.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="copy-action-wrapper">
                  <button id="copyBtn" className="copy-to-his-btn" onClick={handleCopyToHIS}>
                    {isCopied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="var(--green)" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy to Hospital HIS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="workspace-actions-row">
              <button className="edit-workspace-btn" onClick={openEditModal}>EDIT TEXT</button>
              <button 
                id="approveBtn" 
                className={`approve-workspace-btn ${isApproved ? 'approved-state' : ''}`}
                onClick={handleTriggerApprove}
              >
                {isApproved ? 'Approved & Saved' : 'Approve & Save'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* POPUP MODAL (EDIT TEXT OVERLAY) */}
      {isEditModalOpen && (
        <div id="modalBackdrop" className="modal-overlay-show" onClick={closeEditModal}>
          <div id="individualModalContainer" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-circle-btn" onClick={closeEditModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div>
              <p className="modal-section-title">Risk Status</p>
              <div className="modal-radio-group">
                <label className="modal-radio-label">
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
                <label className="modal-radio-label">
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
                <label className="modal-radio-label">
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
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '4px' }}>
                  <label className="modal-radio-label" style={{ marginBottom: modalRisk === 'Other' ? '8px' : '0' }}>
                    <input 
                      type="radio" 
                      name="modalRisk" 
                      value="Other" 
                      className="modal-radio-input"
                      checked={modalRisk === 'Other'}
                      onChange={(e) => setModalRisk(e.target.value)}
                    />
                    Other...
                  </label>
                  {modalRisk === 'Other' && (
                    <input 
                      type="text" 
                      placeholder="Type status..." 
                      className="modal-text-input" 
                      value={modalRiskOther}
                      onChange={(e) => setModalRiskOther(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              </div>
            </div>

            <hr className="modal-divider" />

            <div>
              <p className="modal-section-title">Drafted Summary</p>
              <textarea 
                className="modal-textarea" 
                value={modalSummary}
                onChange={(e) => setModalSummary(e.target.value)}
              ></textarea>
            </div>

            <div>
              <p className="modal-section-title">Suggested Action</p>
              <textarea 
                className="modal-textarea action-box" 
                value={modalAction}
                onChange={(e) => setModalAction(e.target.value)}
              ></textarea>
            </div>

            <div className="modal-submit-center">
              <button 
                id="modalSaveBtn" 
                className={isSavedBtnState ? 'saved-state' : ''}
                onClick={handleSaveModalChanges}
              >
                {isSavedBtnState ? 'Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL ขยายภาพ B-SCAN */}
      {isOctModalOpen && (
        <div id="octModalBackdrop" className="modal-overlay-show" onClick={() => { document.body.style.overflow = ''; setIsOctModalOpen(false); }}>
          <div id="octModalContainer" onClick={(e) => e.stopPropagation()}>
            <div className="oct-modal-header">
              <span className="oct-back-link" onClick={() => { document.body.style.overflow = ''; setIsOctModalOpen(false); }}>
                <span className="arrow-back">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </span>
                Back
              </span>
            </div>

            <div className="oct-modal-block">
              <p className="pill-label sub-label">Original OCT</p>
              <div className="oct-modal-img-wrapper grayscale-filter">
                <img src={originalOctImgUrl} alt="Original OCT Scan" />
              </div>
            </div>

            <hr className="modal-divider" />

            <div className="oct-modal-block">
              <p className="pill-label sub-label">JaksuBiomarker OCT</p>
              <div className="oct-modal-img-wrapper">
                <img src={biomarkerOctImgUrl} alt="JaksuBiomarker OCT Scan" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}