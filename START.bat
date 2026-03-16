@echo off
echo.
echo  ============================================
echo   AbdeSeries - Starting...
echo  ============================================
echo.
cd /d "%~dp0backend"
echo  Installing dependencies...
call npm install
echo.
echo  Starting server...
echo.
echo  ============================================
echo   Open browser at: http://localhost:5000
echo  ============================================
echo.
node server.js
pause
