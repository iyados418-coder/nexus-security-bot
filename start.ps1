# Nexus Security Bot - Persistent Startup Script
# Uses Start-Process (OS-level processes, survives terminal close)

param(
    [switch]$Wait,
    [switch]$NoBrowser
)

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPort = 3001
$dashPort = 3000

# Kill any stale processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Nexus Security Bot" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Bot + API
Write-Host "[1/3] Starting Bot + API server..." -ForegroundColor Yellow
$api = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $rootDir -WindowStyle Hidden -PassThru
if ($api.Id) {
    Write-Host "  PID: $($api.Id)" -ForegroundColor Green
} else {
    Write-Host "  FAILED to start API" -ForegroundColor Red
}

Start-Sleep -Seconds 15

# 2. Start Dashboard
Write-Host "[2/3] Starting Dashboard..." -ForegroundColor Yellow
$dashboard = Start-Process -FilePath "node" -ArgumentList "scripts\start-dashboard.js" -WorkingDirectory $rootDir -WindowStyle Hidden -PassThru
if ($dashboard.Id) {
    Write-Host "  PID: $($dashboard.Id)" -ForegroundColor Green
} else {
    Write-Host "  FAILED to start Dashboard" -ForegroundColor Red
}

Start-Sleep -Seconds 10

# 3. Validate
Write-Host "[3/3] Validating..." -ForegroundColor Yellow

$apiOk = $false
$dashOk = $false

try {
    $h = Invoke-RestMethod -Uri "http://localhost:$apiPort/api/health" -ErrorAction Stop
    $apiOk = $true
    Write-Host "  API:       ONLINE (Bot: $($h.bot))" -ForegroundColor Green
} catch {
    Write-Host "  API:       OFFLINE" -ForegroundColor Red
}

try {
    $d = Invoke-WebRequest -Uri "http://localhost:$dashPort" -UseBasicParsing -ErrorAction Stop
    $dashOk = $true
    Write-Host "  Dashboard: ONLINE (HTTP $($d.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  Dashboard: OFFLINE" -ForegroundColor Red
}

Write-Host ""
if ($apiOk -and $dashOk) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ALL SYSTEMS RUNNING" -ForegroundColor Green
    Write-Host "  Dashboard: http://localhost:$dashPort" -ForegroundColor White
    Write-Host "  API:       http://localhost:$apiPort" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    if (-not $NoBrowser) {
        Start-Process "http://localhost:$dashPort"
    }
} else {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  WARNING: Some services are offline" -ForegroundColor Yellow
    Write-Host "  Check the console for errors above." -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
}

if ($Wait) {
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Gray
    try {
        while ($true) { Start-Sleep -Seconds 10 }
    } finally {
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "Stopped all services." -ForegroundColor Yellow
    }
}