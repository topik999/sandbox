@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not in PATH.
  echo Install the current Node.js LTS version, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found. Reinstall Node.js with npm included.
  pause
  exit /b 1
)
if not exist "node_modules\ws" (
  echo Installing server dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
echo Starting Sandbox multiplayer server...
start "Sandbox Multiplayer" http://localhost:3000
node server.js
pause
