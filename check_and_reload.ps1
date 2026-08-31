# ============================================================
# CNKI Plugin File Checker
# Run: PS E:\0writing\cnki-skills> .\check_and_reload.ps1
# ============================================================

$ExtDir = "E:\0writing\cnki-skills\browser-extension"
$ExpectedVersion = "1.1.0"
$ExpectedFix = "withTimeout"

Write-Host ""
Write-Host "=== CNKI Plugin File Check ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check extension directory
if (-not (Test-Path "$ExtDir\manifest.json")) {
    Write-Host "[FAIL] Extension directory not found: $ExtDir" -ForegroundColor Red
    Write-Host "Please run: git reset --hard origin/arena/01a01cb0-cnki-skills" -ForegroundColor Yellow
    pause
    exit 1
}

# 2. Check version in manifest.json
$manifest = Get-Content "$ExtDir\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
Write-Host "manifest.json version: $version" -NoNewline
if ($version -eq $ExpectedVersion) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FAIL] expected $ExpectedVersion" -ForegroundColor Red
    Write-Host "File not updated. Please run:" -ForegroundColor Yellow
    Write-Host "  git fetch origin" -ForegroundColor Yellow
    Write-Host "  git reset --hard origin/arena/01a01cb0-cnki-skills" -ForegroundColor Yellow
    pause
    exit 1
}

# 3. Check bug fix code exists in popup.js
$popupContent = Get-Content "$ExtDir\popup\popup.js" -Raw -Encoding UTF8
if ($popupContent -match [regex]::Escape($ExpectedFix)) {
    Write-Host "popup.js has $ExpectedFix()   [OK] - freeze bug fixed" -ForegroundColor Green
} else {
    Write-Host "popup.js missing $ExpectedFix()   [FAIL] - old file!" -ForegroundColor Red
    Write-Host "Please run: git reset --hard origin/arena/01a01cb0-cnki-skills" -ForegroundColor Yellow
    pause
    exit 1
}

# 4. Check review_engine_bundle.js exists
if (Test-Path "$ExtDir\review\review_engine_bundle.js") {
    Write-Host "review_engine_bundle.js   [OK]" -ForegroundColor Green
} else {
    Write-Host "review_engine_bundle.js   [FAIL] missing" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "=== All checks passed ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open chrome://extensions/"
Write-Host "  2. Find [CNKI Scholar Assistant]"
Write-Host "  3. Click the refresh button on the plugin card"
Write-Host "  4. Click the plugin icon - status should show immediately"
Write-Host ""

# 5. Open Chrome extensions page
$answer = Read-Host "Open Chrome extensions page now? (Y/n)"
if ($answer -ne 'n' -and $answer -ne 'N') {
    $opened = $false
    try {
        Start-Process "chrome.exe" "chrome://extensions/"
        $opened = $true
    } catch {}
    if (-not $opened) {
        try {
            Start-Process "msedge.exe" "edge://extensions/"
            $opened = $true
        } catch {}
    }
    if (-not $opened) {
        Write-Host "Could not open browser automatically." -ForegroundColor Yellow
        Write-Host "Please manually open: chrome://extensions/" -ForegroundColor Yellow
    }
}

Write-Host ""
pause
