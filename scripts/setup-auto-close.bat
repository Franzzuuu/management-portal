@echo off
echo ============================================================
echo AUTO-CLOSE VIOLATIONS - QUICK SETUP
echo ============================================================
echo.

REM Check if node is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js first.
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo.

echo Step 2: Running database migration...
call npm run migrate:auto-close
if %errorlevel% neq 0 (
    echo ERROR: Migration failed. Check your .env.local database settings.
    pause
    exit /b 1
)
echo.

echo Step 3: Setting up scheduled task...
echo.
echo NOTE: To set up the Windows Scheduled Task, run PowerShell as Administrator and execute:
echo.
echo   .\scripts\setup-auto-close-task.ps1
echo.
echo Or manually run the auto-close daily with:
echo   npm run auto-close-violations
echo.
echo ============================================================
echo SETUP COMPLETE!
echo ============================================================
echo.
pause
