@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\qrcode\package.json" (
  echo Installing the local open-source QR and WebSocket dependencies once...
  call npm ci --omit=dev
  if errorlevel 1 (
    echo Dependency setup failed. Install Node.js/npm and run npm ci in this folder.
    pause
    exit /b 1
  )
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
if errorlevel 1 (
  echo Could not start the Guc guy phone bridge. Check that Node.js is installed.
  pause
  exit /b 1
)
echo Guc guy phone bridge started on this PC. Open Guc guy and create a phone QR.
timeout /t 2 >nul
endlocal
