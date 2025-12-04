# Setup Auto-Close Violations Scheduled Task
# Run this script as Administrator on each machine

param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$Time = "12:00AM"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "AUTO-CLOSE VIOLATIONS - SCHEDULED TASK SETUP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Task may not be created." -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
}

# Verify project path
$scriptPath = Join-Path $ProjectPath "scripts\auto-close-violations.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: Could not find auto-close-violations.js at:" -ForegroundColor Red
    Write-Host "  $scriptPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run this script from the project root directory, or specify the path:" -ForegroundColor Yellow
    Write-Host "  .\scripts\setup-auto-close-task.ps1 -ProjectPath 'D:\Projects\management-portal'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Project Path: $ProjectPath" -ForegroundColor Green
Write-Host "Schedule Time: $Time" -ForegroundColor Green
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName "AutoCloseViolations" -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Existing task found. Removing..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName "AutoCloseViolations" -Confirm:$false
    Write-Host "Removed existing task." -ForegroundColor Green
}

# Create the scheduled task
Write-Host "Creating scheduled task..." -ForegroundColor Cyan

try {
    $action = New-ScheduledTaskAction -Execute "node" -Argument "scripts/auto-close-violations.js" -WorkingDirectory $ProjectPath
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Register-ScheduledTask -TaskName "AutoCloseViolations" -Action $action -Trigger $trigger -Settings $settings -Description "Automatically close pending violations after 7 days" | Out-Null
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "SUCCESS! Scheduled task created." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: AutoCloseViolations"
    Write-Host "  Schedule: Daily at $Time"
    Write-Host "  Working Directory: $ProjectPath"
    Write-Host ""
    
    # Show next run time
    $taskInfo = Get-ScheduledTask -TaskName "AutoCloseViolations" | Get-ScheduledTaskInfo
    Write-Host "Next Run: $($taskInfo.NextRunTime)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To test manually, run:" -ForegroundColor Cyan
    Write-Host "  npm run auto-close-violations" -ForegroundColor White
    Write-Host ""
    Write-Host "To view/edit the task:" -ForegroundColor Cyan
    Write-Host "  Open Task Scheduler > Find 'AutoCloseViolations'" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create scheduled task." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you're running PowerShell as Administrator." -ForegroundColor Yellow
    exit 1
}
