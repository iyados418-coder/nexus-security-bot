@echo off
title Nexus Security Bot — Startup Manager
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════╗
echo ║     Nexus Security System            ║
echo ║     Starting all services...         ║
echo ╚══════════════════════════════════════╝
echo.

:: Create logs directory
if not exist "logs" mkdir logs

:: Run the startup manager
node scripts/startup.js

:: Fallback if startup manager fails
echo.
echo [SYSTEM] Trying direct startup...

:: Start API
echo [API] Starting on port 3001...
start "Nexus API" /B /MIN node api\server.js > logs\api.log 2>&1
timeout /t 3 /nobreak >nul

:: Check if API is running
node -e "const h=require('http');h.get('http://127.0.0.1:3001/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('[API] Online:',JSON.parse(d).bot))}).on('error',()=>console.log('[API] WARNING: API not responding yet'))" 2>nul

:: Start Dashboard
echo [DASHBOARD] Starting on port 3000...
start "Nexus Dashboard" /B /MIN npx next start -p 3000 --no-daemon > logs\dashboard.log 2>&1

echo.
echo ╔══════════════════════════════════════╗
echo ║  Services Starting                   ║
echo ║  API:       http://localhost:3001     ║
echo ║  Dashboard: http://localhost:3000     ║
echo ║  Health:    http://localhost:3001/api/health ║
echo ╚══════════════════════════════════════╝
echo.
echo Dashboard may take 10-30s to compile on first run.
echo Press any key to stop all services...

pause >nul

:: Stop all node processes started by this script
echo Shutting down...
taskkill /f /im node.exe >nul 2>&1

echo Services stopped.
timeout /t 2 /nobreak >nul
