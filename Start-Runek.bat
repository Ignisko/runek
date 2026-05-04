@echo off
setlocal
echo ========================================================
echo [RUNEK] Autonomous Career Agent
echo ========================================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)

cd runek-app

REM Install dependencies if node_modules is missing
if not exist node_modules (
    echo [1/3] Installing dependencies (this may take a minute)...
    call npm install
)

echo [2/3] Starting Runek Dashboard...
start /b npm run dev

echo [3/3] Opening Dashboard in your browser...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo ========================================================
echo RUNEK IS LIVE at http://localhost:3000
echo Keep this window open while using the agent.
echo ========================================================
echo.
echo Press any key to stop the server and exit.
pause >nul

REM Kill the background npm process
taskkill /f /im node.exe >nul 2>nul
exit
