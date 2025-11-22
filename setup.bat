@echo off
REM Verba One-Time Setup Script for Windows
REM Run this once after cloning the repository

echo ========================================
echo    Verba Setup - Installing...
echo ========================================
echo.

cd /d "%~dp0"

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is required but not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/npm is required but not found. Please install Node.js 16+
    pause
    exit /b 1
)

echo [OK] Python and Node.js found
echo.

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..
echo [OK] Backend dependencies installed
echo.

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed
echo.

REM Create Start Menu shortcut
echo [INFO] Creating Start Menu shortcut...
set SCRIPT_DIR=%~dp0
set SHORTCUT_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs

REM Create a simple VBS script to create the shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT_DIR%\Verba.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_DIR%start-verba.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Verba - Audio Transcription System" >> CreateShortcut.vbs
echo oLink.IconLocation = "%SCRIPT_DIR%verba-icon.png" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs
echo [OK] Start Menu shortcut created - Find 'Verba' in Start Menu
echo.

echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo You can now launch Verba:
echo   1. Search for 'Verba' in Start Menu
echo   2. Or double-click: start-verba.bat
echo   3. Or use: python start-verba.py
echo.
pause
