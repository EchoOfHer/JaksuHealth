@echo off
title JaksuHealth Startup Manager
echo ===================================================
echo  Welcome to JaksuHealth Local Server Startup
echo ===================================================

echo.
echo [1/2] Starting Backend API Server (Port 8000)...
start "JaksuHealth Backend" cmd /k "cd /d D:\JaksuHealth\backend && py -m uvicorn app.main:app --reload"

echo.
echo [2/2] Starting Frontend Web Server (Port 5173)...
start "JaksuHealth Frontend" cmd /k "cd /d D:\JaksuHealth\frontend && npm run dev"

echo.
echo ===================================================
echo  Both servers are starting in separate windows.
echo  Please visit: http://localhost:5173 in your browser.
echo ===================================================
echo.
pause
