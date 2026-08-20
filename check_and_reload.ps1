# ============================================================
# CNKI 插件安装校验脚本
# 运行: PS E:\0writing\cnki-skills> .\check_and_reload.ps1
# ============================================================

$ExtDir = "E:\0writing\cnki-skills\browser-extension"
$ExpectedVersion = "1.1.0"
$ExpectedFix = "withTimeout"   # 修复卡死Bug的关键函数名

Write-Host ""
Write-Host "=== CNKI 插件本地文件校验 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查插件目录
if (-not (Test-Path "$ExtDir\manifest.json")) {
    Write-Host "[错误] 未找到插件目录: $ExtDir" -ForegroundColor Red
    Write-Host "请先运行: git reset --hard origin/arena/01a01cb0-cnki-skills" -ForegroundColor Yellow
    pause; exit 1
}

# 2. 检查版本号
$manifest = Get-Content "$ExtDir\manifest.json" | ConvertFrom-Json
$version = $manifest.version
Write-Host "manifest.json 版本: $version" -NoNewline
if ($version -eq $ExpectedVersion) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌ (期望 $ExpectedVersion)" -ForegroundColor Red
    Write-Host "文件未更新，请运行:" -ForegroundColor Yellow
    Write-Host "  git fetch origin" -ForegroundColor Yellow
    Write-Host "  git reset --hard origin/arena/01a01cb0-cnki-skills" -ForegroundColor Yellow
    pause; exit 1
}

# 3. 检查关键 Bug 修复代码
$popupJs = Get-Content "$ExtDir\popup\popup.js" -Raw -Encoding UTF8
if ($popupJs -match $ExpectedFix) {
    Write-Host "popup.js 含 $ExpectedFix(): ✅ (卡死Bug已修复)" -ForegroundColor Green
} else {
    Write-Host "popup.js 缺少 $ExpectedFix(): ❌ (旧版文件！)" -ForegroundColor Red
    Write-Host "文件未更新，请运行 git reset --hard" -ForegroundColor Yellow
    pause; exit 1
}

# 4. 检查 review_engine_bundle.js
if (Test-Path "$ExtDir\review\review_engine_bundle.js") {
    Write-Host "review_engine_bundle.js:   ✅" -ForegroundColor Green
} else {
    Write-Host "review_engine_bundle.js:   ❌ 缺失" -ForegroundColor Red
    pause; exit 1
}

Write-Host ""
Write-Host "=== 所有文件校验通过 ===" -ForegroundColor Green
Write-Host ""
Write-Host "现在请在 Chrome 里重新加载插件：" -ForegroundColor Cyan
Write-Host "  1. 打开 chrome://extensions/"
Write-Host "  2. 找到「知网学术助手」"
Write-Host "  3. 点击插件卡片右下角的 🔄 刷新按钮"
Write-Host "  4. 重新打开 popup，账号状态应立即显示（不再卡转）"
Write-Host ""

# 5. 尝试自动打开 Chrome 扩展页
$answer = Read-Host "是否自动打开 Chrome 扩展管理页? (Y/n)"
if ($answer -ne 'n' -and $answer -ne 'N') {
    Start-Process "chrome" "--new-tab chrome://extensions/" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Start-Process "msedge" "--new-tab edge://extensions/" 2>$null
    }
}
Write-Host ""
pause
