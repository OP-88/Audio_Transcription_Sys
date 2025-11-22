@echo off
REM Verba Auto-Launcher for Windows
REM Starts backend and frontend servers, then opens the browser

echo ========================================
echo      Starting Verba Application
echo ========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

REM Check if ports are already in use
netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 8000 already in use. Backend may already be running.
) else (
    echo [INFO] Starting backend server...
    start "Verba Backend" /MIN cmd /c "cd backend && python app.py > ..\verba-backend.log 2>&1"
    timeout /t 5 /nobreak >nul
    echo [OK] Backend started
)

netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 5173 already in use. Frontend may already be running.
) else (
    echo [INFO] Starting frontend server...
    start "Verba Frontend" /MIN cmd /c "cd frontend && npm run dev > ..\verba-frontend.log 2>&1"
    timeout /t 5 /nobreak >nul
    echo [OK] Frontend started
)

echo.
echo [INFO] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   Verba is running!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Logs:
echo   Backend:  verba-backend.log
echo   Frontend: verba-frontend.log
echo.
echo Close this window to stop the servers
echo or look for "Verba Backend" and "Verba Frontend" 
echo in Task Manager to stop them manually
echo.
pause
