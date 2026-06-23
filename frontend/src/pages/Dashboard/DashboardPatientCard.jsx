import React from 'react';
import './DashboardPatientCard.css';

const DashboardPatientCard = ({ patient }) => {
  return (
    <div className="dash-patient-card" style={{ borderLeft: `12px solid ${patient.colorCode}` }}>
      <div className="dash-patient-col dash-diagnosis-col">
        <p className="dash-patient-diagnosis">{patient.diagnosis}</p>
        <p className="dash-patient-risk" style={{ color: patient.colorCode }}>{patient.riskLevel}</p>
      </div>
      <div className="dash-patient-col dash-info-col">
        <p className="dash-patient-name" title={patient.name}>{patient.name}</p>
        <p className="dash-patient-id">{patient.id}</p>
      </div>
      <div className="dash-patient-col dash-queue-col">
        <p className="dash-patient-queue">{patient.queue}</p>
        <p className="dash-patient-time">{patient.time}</p>
      </div>
    </div>
  );
};

export default DashboardPatientCard;
