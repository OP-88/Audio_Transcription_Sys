@echo off
REM Verba Audio Setup for Windows
REM Enables system audio capture (Stereo Mix or Virtual Cable)

echo ========================================
echo   Verba Audio Setup - Windows
echo ========================================
echo.
echo This script will help you set up system audio capture
echo so you can record Zoom meetings, browser audio, etc.
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTICE] This script works better with administrator privileges.
    echo [NOTICE] Right-click and select "Run as administrator" for automatic setup.
    echo.
)

echo Checking for audio devices...
echo.

REM Use PowerShell to check for Stereo Mix
powershell -Command "$devices = Get-CimInstance Win32_SoundDevice; if ($devices) { Write-Host '[OK] Audio devices found' } else { Write-Host '[WARNING] No audio devices detected' }"
echo.

echo ========================================
echo   Audio Capture Options for Windows
echo ========================================
echo.
echo There are TWO ways to capture system audio on Windows:
echo.
echo [OPTION 1] Stereo Mix (Built-in, if available)
echo   - Pros: Free, built into Windows
echo   - Cons: Not available on all PCs, quality varies
echo   - Status: Checking...
echo.

REM Try to detect if Stereo Mix exists
powershell -Command "$devices = Get-PnpDevice -Class 'MEDIA' -Status 'OK','Unknown' | Where-Object { $_.FriendlyName -like '*Stereo Mix*' -or $_.FriendlyName -like '*Wave Out Mix*' }; if ($devices) { Write-Host '[FOUND] Stereo Mix is available on your system!' -ForegroundColor Green; Write-Host 'We will attempt to enable it.' } else { Write-Host '[NOT FOUND] Stereo Mix not available on this PC' -ForegroundColor Yellow }"
echo.

echo [OPTION 2] VB-Audio Virtual Cable (Recommended)
echo   - Pros: Works on ALL Windows PCs, high quality
echo   - Cons: Requires one-time download ^& install
echo   - Download: https://vb-audio.com/Cable/
echo.

echo ========================================
set /p CHOICE="Would you like to try enabling Stereo Mix? (Y/N): "

if /i "%CHOICE%"=="Y" (
    echo.
    echo [INFO] Attempting to enable Stereo Mix...
    echo.
    
    REM PowerShell script to enable Stereo Mix
    powershell -Command "$audioDevices = Get-CimInstance -Namespace root/cimv2 -ClassName Win32_SoundDevice; foreach ($device in $audioDevices) { if ($device.Name -like '*Stereo Mix*' -or $device.Name -like '*Wave Out Mix*') { Write-Host 'Found: ' $device.Name; } }; Write-Host ''; Write-Host 'Please enable Stereo Mix manually:' -ForegroundColor Cyan; Write-Host '1. Right-click the Sound icon in system tray' -ForegroundColor White; Write-Host '2. Select Sound Settings' -ForegroundColor White; Write-Host '3. Scroll down and click Sound Control Panel' -ForegroundColor White; Write-Host '4. Go to Recording tab' -ForegroundColor White; Write-Host '5. Right-click empty space and check Show Disabled Devices' -ForegroundColor White; Write-Host '6. Find Stereo Mix, right-click and select Enable' -ForegroundColor White; Write-Host '7. Set it as Default Device (right-click - Set as Default)' -ForegroundColor White"
    
    echo.
    echo [NEXT STEP] Once enabled, Verba will detect it automatically!
    echo.
) else (
    echo.
    echo [INFO] Stereo Mix setup skipped.
    echo.
)

echo ========================================
echo   Alternative: VB-Audio Virtual Cable
echo ========================================
echo.
echo If Stereo Mix doesn't work or isn't available:
echo.
echo 1. Download VB-Audio Virtual Cable:
echo    https://vb-audio.com/Cable/
echo.
echo 2. Install it (free, safe, trusted software)
echo.
echo 3. In Windows Sound Settings:
echo    - Set "CABLE Input" as your Default Playback Device
echo    - Keep your speakers/headphones as communication device
echo.
echo 4. In Verba's browser interface:
echo    - Select "CABLE Output" as your recording device
echo.
echo 5. You'll hear audio through your speakers while recording!
echo.

echo ========================================
echo   Browser-Based Alternative
echo ========================================
echo.
echo You can also use Chrome/Edge screen sharing:
echo.
echo 1. In Verba, click Record
echo 2. Select "System Audio" when prompted
echo 3. Browser will ask to "Share your screen"
echo 4. Select the Zoom window or browser tab
echo 5. CHECK the "Share audio" checkbox
echo 6. This captures audio without any setup!
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Note: Verba will automatically detect any enabled
echo audio devices when you click Record.
echo.
pause
