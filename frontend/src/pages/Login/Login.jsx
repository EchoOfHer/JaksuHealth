import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // ตรวจสอบเงื่อนไขการเข้าสู่ระบบตาม Mockup
    if (username.trim() === 'EchoOfHer' && password === '1234') {
      setErrorMessage('');
      setIsSuccess(true);

      // หน่วงเวลาเล็กน้อยเพื่อให้ปุ่มแสดงแอนิเมชันสำเร็จก่อนขยับหน้าจอ
      setTimeout(() => {
        navigate('/dashboard');
      }, 750);
    } else {
      setErrorMessage('Username or Password wrong!');
      setPassword(''); // ล้างรหัสผ่านเพื่อความปลอดภัย
    }
  };

  return (
    <div className="login-page-container">
      {/* การ์ดฝั่งซ้าย */}
      <div className="login-left-panel">
        <div className="login-brand-text">
          <h1>Every</h1>
          <h1>Vision Matters</h1>
          <hr style={{ border: 0, height: '2px', backgroundColor: 'white', width: '100%' }} />
          <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '20px' }}>
            Retinal Second Sight AI
          </p>
        </div>
      </div>

      {/* การ์ดฝั่งขวา */}
      <div className="login-card">
        <div className="logo-container">
          <img src="/logo.png" alt="JaksuHealth Logo" />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* ฟิลด์ Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* ฟิลด์ Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* แจ้งเตือนข้อผิดพลาดเมื่อพาสเวิร์ดไม่ถูกต้อง */}
          {errorMessage && (
            <div className="error-container">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24px" height="24px">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <hr class="form-divider" />

          {/* ปุ่มส่งฟอร์มล็อกอิน */}
          <button
            type="submit"
            className="btn-login"
            style={
              isSuccess
                ? { background: '#22C55E', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)' }
                : {}
            }
          >
            {isSuccess ? (
              <>
                <span>Login Successful!</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '18px', height: '18px' }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </>
            ) : (
              <>
                <span>Login</span>
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;