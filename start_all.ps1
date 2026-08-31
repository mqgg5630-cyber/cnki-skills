# ============================================================
# CNKI Scholar Assistant - One-Click Start Script
# Run: PS E:\0writing\cnki-skills> .\start_all.ps1
# ============================================================

$RepoDir = "E:\0writing\cnki-skills"
$Branch  = "arena/01a01cb0-cnki-skills"

Write-Host ""
Write-Host "============================================"
Write-Host "  CNKI Scholar Assistant - Startup"
Write-Host "============================================"
Write-Host ""

# 1. Sync latest code
Write-Host "[1/3] Syncing latest code from GitHub..."
Set-Location $RepoDir
git fetch origin 2>&1 | Out-Null
git reset --hard "origin/$Branch" 2>&1 | Out-Null
$commit = git log --oneline -1
Write-Host "  Current: $commit"
Write-Host ""

# 2. Check plugin files
Write-Host "[2/3] Checking plugin files..."
$ok = $true
@("browser-extension\manifest.json",
  "browser-extension\popup\popup_bundle.js",
  "browser-extension\background\service_worker.js",
  "browser-extension\content\content.js") | ForEach-Object {
    if (Test-Path "$RepoDir\$_") {
        Write-Host "  [OK] $_"
    } else {
        Write-Host "  [MISSING] $_"
        $ok = $false
    }
}

if (-not $ok) {
    Write-Host "  Some files missing, please check sync." -ForegroundColor Red
    pause; exit 1
}

Write-Host ""
Write-Host "[3/3] Starting local API server (port 7721)..."

# Kill any existing server on port 7721
$existing = Get-NetTCPConnection -LocalPort 7721 -ErrorAction SilentlyContinue
if ($existing) {
    $pid = $existing.OwningProcess
    Write-Host "  Stopping existing process (PID $pid)..."
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start API server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$RepoDir'; `
     Write-Host 'CNKI API Server - Port 7721' -ForegroundColor Cyan; `
     python review_api_server.py" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# Test API
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:7721/health" -TimeoutSec 3
    Write-Host "  API server running: $($resp.service) v$($resp.version)" -ForegroundColor Green
} catch {
    Write-Host "  API server starting... (may take a few seconds)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================"
Write-Host "  All started!"
Write-Host ""
Write-Host "  Plugin dir:  $RepoDir\browser-extension"
Write-Host "  API server:  http://localhost:7721"
Write-Host "  API docs:    http://localhost:7721/openapi"
Write-Host ""
Write-Host "  To reload plugin in Edge/Chrome:"
Write-Host "  edge://extensions/  or  chrome://extensions/"
Write-Host "  -> Find CNKI Scholar Assistant -> click Reload"
Write-Host "============================================"
Write-Host ""
pause
