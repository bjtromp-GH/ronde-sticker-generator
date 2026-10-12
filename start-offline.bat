@echo off
cd /d "%~dp0"
echo ==================================================
echo  Ronde Sticker A4 Generator - Lokaal ^& Offline
echo ==================================================
echo De applicatie wordt gestart op http://localhost:3000...

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo Fout: Node.js is niet gevonden op deze computer.
  echo Download Node.js gratis vanaf: https://nodejs.org
  pause
  exit /b 1
)

start http://localhost:3000
npm run dev
pause
