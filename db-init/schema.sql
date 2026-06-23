-- ============================================================
-- JaksuHealth Database Schema & Sample Queries
-- PostgreSQL Dialect
-- ============================================================

-- ------------------------------------------------------------
-- 1. Database Tables (DDL)
-- ------------------------------------------------------------

-- 1.1 Doctors Table
-- Stores clinician accounts and credentials
CREATE TABLE Doctors (
    doctor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- 1.2 Patient Table
-- Primary master data for patients
CREATE TABLE Patient (
    patient_id VARCHAR(20) PRIMARY KEY,
    patient_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    age INT,
    sex VARCHAR NOT NULL CHECK (sex IN ('Male', 'Female')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 Visits Table
-- Tracks scheduled appointments and queue numbers
CREATE TABLE Visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES Doctors(doctor_id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    queue_number VARCHAR(20) NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETE', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Diagnostics Table
-- Stores AI detection results and clinical summaries
CREATE TABLE Diagnostics (
    diagnostic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES Visits(visit_id) ON DELETE CASCADE,
    eye_side VARCHAR(2) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    condition_stage VARCHAR(200) NOT NULL,
    ai_trend VARCHAR(50) NOT NULL,
    drafted_summary TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    exported_to_his BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Eye Examinations Table
-- Details of the left (OS) and right (OD) eye biomarker scan results
CREATE TABLE Eye_Examinations (
    exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id UUID NOT NULL REFERENCES Diagnostics(diagnostic_id) ON DELETE CASCADE,
    eye_side VARCHAR(2) NOT NULL CHECK (eye_side IN ('OS', 'OD')), -- OS (left), OD (right)
    biomarker_notes TEXT NOT NULL,
    oct_scan_image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Timeline Table
-- History of condition stages and progressions for each patient
CREATE TABLE Timeline (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    diagnostic_id UUID NOT NULL UNIQUE REFERENCES Diagnostics(diagnostic_id) ON DELETE CASCADE, -- One-to-One
    detected_stage VARCHAR(50) NOT NULL,
    progression_summary TEXT NOT NULL,
    detection_date DATE NOT NULL,
    tag_line VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 Refresh Tokens Table
-- Manages session refresh tokens for authentication
CREATE TABLE Refresh_Tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES Doctors(doctor_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);


-- ------------------------------------------------------------
-- 2. Application SQL Queries (DML)
-- ------------------------------------------------------------

-- 2.1 Doctor Management & Auth
-- Register
-- :username, :first_name, :last_name, :password_hash
-- INSERT INTO Doctors (username, first_name, last_name, password_hash) VALUES (:username, :first_name, :last_name, :password_hash);

-- Fetch Credentials by Username
-- :username
-- SELECT doctor_id, username, password_hash FROM Doctors WHERE username = :username;

-- 2.2 Patient Directory
-- Add Patient
-- :patient_id, :patient_code, :first_name, :last_name, :age, :sex
-- INSERT INTO Patient (patient_id, patient_code, first_name, last_name, age, sex) VALUES (:patient_id, :patient_code, :first_name, :last_name, :age, :sex);

-- Search Patient
-- :search_query, :search_query_like
-- SELECT * FROM Patient WHERE patient_code = :search_query OR LOWER(first_name) LIKE LOWER(:search_query_like) OR LOWER(last_name) LIKE LOWER(:search_query_like) ORDER BY created_at DESC;

-- 2.3 Visits & Queue Management
-- Create Visit Queue
-- :patient_id, :doctor_id, :visit_date, :visit_time, :queue_number
-- INSERT INTO Visits (patient_id, doctor_id, visit_date, visit_time, queue_number, status) VALUES (:patient_id, :doctor_id, :visit_date, :visit_time, :queue_number, 'PENDING');

-- Fetch Today's Queue
-- :doctor_id
-- SELECT v.visit_id, v.queue_number, v.visit_time, v.status, p.patient_id, p.patient_code, p.first_name, p.last_name FROM Visits v JOIN Patient p ON v.patient_id = p.patient_id WHERE v.doctor_id = :doctor_id AND v.visit_date = CURRENT_DATE AND v.status != 'COMPLETE' ORDER BY v.visit_time ASC;

-- Update Queue Status
-- :status, :visit_id
-- UPDATE Visits SET status = :status WHERE visit_id = :visit_id;

-- 2.4 Diagnostics & Eye Scans
-- Insert Diagnostic Result
-- :patient_id, :visit_id, :risk_level, :condition_stage, :ai_trend, :drafted_summary, :suggested_action
-- INSERT INTO Diagnostics (patient_id, visit_id, risk_level, condition_stage, ai_trend, drafted_summary, suggested_action) VALUES (:patient_id, :visit_id, :risk_level, :condition_stage, :ai_trend, :drafted_summary, :suggested_action) RETURNING diagnostic_id;

-- Save Scan Info (OS/OD)
-- :diagnostic_id, :eye_side, :biomarker_notes, :oct_scan_image_url
-- INSERT INTO Eye_Examinations (diagnostic_id, eye_side, biomarker_notes, oct_scan_image_url) VALUES (:diagnostic_id, :eye_side, :biomarker_notes, :oct_scan_image_url);

-- Get Visit Diagnostic Detail
-- :visit_id
-- SELECT d.diagnostic_id, d.risk_level, d.condition_stage, d.ai_trend, d.drafted_summary, d.suggested_action, d.exported_to_his, d.eye_side, e.biomarker_notes, e.oct_scan_image_url FROM Diagnostics d LEFT JOIN Eye_Examinations e ON d.diagnostic_id = e.diagnostic_id WHERE d.visit_id = :visit_id;

-- 2.5 Timeline (Progression)
-- Get Timeline
-- :patient_id
-- SELECT t.detection_date, t.detected_stage, t.tag_line, t.progression_summary, d.risk_level, d.ai_trend FROM Timeline t JOIN Diagnostics d ON t.diagnostic_id = d.diagnostic_id WHERE t.patient_id = :patient_id ORDER BY t.detection_date DESC;

-- Insert Timeline Entry
-- :patient_id, :diagnostic_id, :detected_stage, :progression_summary, :tag_line
-- INSERT INTO Timeline (patient_id, diagnostic_id, detected_stage, progression_summary, detection_date, tag_line) VALUES (:patient_id, :diagnostic_id, :detected_stage, :progression_summary, CURRENT_DATE, :tag_line);
