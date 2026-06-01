import React, { useState, useRef } from 'react';
import './IndividualDiagnostic.css';
import { useLocation } from 'react-router-dom';

export default function IndividualDiagnostic({ patient, onBack }) {
  // ── STATE MANAGEMENT ──
  const location = useLocation();
  const passedPatient = location.state?.patient;
  
  const [activeEye, setActiveEye] = useState('os'); // 'os' หรือ 'od'
  
  // กำหนดค่าเริ่มต้นของ State จาก Props หรือ Location State (แบบไดนามิกเต็มรูปแบบ)
  const [riskStatus, setRiskStatus] = useState(patient?.diagnosis || passedPatient?.diagnosis || 'Intermediate AMD');
  const [summaryText, setSummaryText] = useState(
    'Recent OCT analysis reveals a moderate accumulation of Subretinal Fluid (SRF) and the presence of Intraretinal Fluid (IRF). Disruption of the IS/OS junction is also noted. The lesions indicate a high risk of active disease progression.'
  );
  const [actionText, setActionText] = useState(
    'Recommend reassessing visual acuity and considering Anti-VEGF intravitreal injection. Schedule close follow-up within 2-4 weeks.'
  );

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

  // ระบบลากขีดแนวแกนสแกนพิกัดบน Fundus (Draggable Scale 1-100)
  const [dragTopPercent, setDragTopPercent] = useState(92);
  const [scaleValue, setScaleValue] = useState(1);
  const isDraggingRef = useRef(false);
  const fundusContainerRef = useRef(null);
  const dragLineRef = useRef(null);

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
  const handleSaveModalChanges = () => {
    setIsSavedBtnState(true);
    
    let finalRisk = modalRisk;
    if (modalRisk === 'Other') {
      finalRisk = modalRiskOther.trim() !== '' ? modalRiskOther.trim() : 'Custom AMD';
    }

    setRiskStatus(finalRisk);
    setSummaryText(modalSummary);
    setActionText(modalAction);

    setTimeout(() => {
      closeEditModal();
    }, 800);
  };

  // ฟังก์ชัน Approve & Save บล็อกล่างสุด
  const handleTriggerApprove = () => {
    setIsApproved(true);
    setTimeout(() => {
      setIsApproved(false);
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

    const calculatedScale = Math.round(((maxY - y) / (maxY - minY)) * 99) + 1;
    setScaleValue(calculatedScale);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
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
                <img src="/fundus.png" alt="Fundus Image" className="fundus-img" />
                
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
                <a href="#progression-link" className="progression-nav-link">
                  Progression <span>→</span>
                </a>
              </div>

              <div className="oct-image-container">
                <img src="/OCT.png" alt="OCT Scan" className="oct-img" />
                <button className="fullscreen-modal-trigger" onClick={() => { document.body.style.overflow = 'hidden'; setIsOctModalOpen(true); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6"/>
                  </svg>
                </button>
              </div>

              <div className="biomarker-legend-row">
                <div className="legend-item"><span className="dot blue-dot"></span>SRF</div>
                <div className="legend-item"><span className="dot green-dot"></span>PED</div>
                <div className="legend-item"><span className="dot red-dot"></span>IRF</div>
                <div className="legend-item"><span className="dot yellow-dot"></span>SHRM</div>
                <div className="legend-item"><span className="dot purple-dot"></span>IS/OS</div>
              </div>
            </div>

            <div className="premium-card copilot-card">
              <div className="card-header-row">
                <p className="pill-label">Clinical Co-pilot</p>
                <img src="/BotLogo.png" alt="Bot" width="30" />
              </div>

              <div className="copilot-report-body">
                <div>
                  <p className="report-title">Drafted Summary:</p>
                  <p id="summaryText" className="report-desc">{summaryText}</p>
                </div>

                <div>
                  <p className="report-title">Suggested Action:</p>
                  <p id="actionText" className="report-desc">{actionText}</p>
                </div>

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
          <div id="modalContainer" onClick={(e) => e.stopPropagation()}>
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
                <label className="modal-radio-label">
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
                    value={modalRiskOther}
                    onChange={(e) => {
                      setModalRisk('Other');
                      setModalRiskOther(e.target.value);
                    }}
                  />
                </label>
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
                <img src="/OCT.png" alt="Original OCT Scan" />
              </div>
            </div>

            <hr className="modal-divider" />

            <div className="oct-modal-block">
              <p className="pill-label sub-label">JaksuBiomarker OCT</p>
              <div className="oct-modal-img-wrapper">
                <img src="/OCT.png" alt="JaksuBiomarker OCT Scan" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}