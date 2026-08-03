@echo off
setlocal enabledelayedexpansion
title Riki Scene - Setup and Launch

echo.
echo  ================================================
echo   RIKI SCENE - Auto Setup and Launch
echo  ================================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found.
    echo  Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER%
echo.

echo  [1/3] Running npm install...
call npm install --loglevel=warn
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed. Check internet and retry.
    pause
    exit /b 1
)
echo  [OK] Packages installed.
echo.

echo  [2/3] Running setup (download uv + TTS env)...
call npm run setup
if %errorlevel% neq 0 (
    echo  [ERROR] Setup failed. Check internet and retry.
    pause
    exit /b 1
)
echo  [OK] Setup complete.
echo.

echo  [3/3] Launching Riki Scene...
echo.
echo  ================================================
echo   Starting app. Have fun!
echo  ================================================
echo.

call npm start

endlocal
