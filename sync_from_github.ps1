# ============================================================
# CNKI Scholar Assistant — Windows Git 同步脚本
# 用法（在 PowerShell 里执行）：
#   PS E:\0writing> .\sync_from_github.ps1
# ============================================================

param(
    [string]$RepoDir = "E:\0writing\cnki-skills",
    [string]$Remote  = "https://github.com/mqgg5630-cyber/cnki-skills.git",
    [string]$Branch  = "arena/01a01cb0-cnki-skills"
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CNKI Scholar Assistant - Git 同步工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 检查 git 是否安装
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未找到 git，请先安装：https://git-scm.com/download/win" -ForegroundColor Red
    pause; exit 1
}

# ── 情况A：目录不存在 → 首次克隆
if (-not (Test-Path "$RepoDir\.git")) {
    Write-Host "[步骤 1/2] 首次克隆仓库到 $RepoDir ..." -ForegroundColor Yellow
    git clone $Remote $RepoDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 克隆失败，请检查网络连接" -ForegroundColor Red
        pause; exit 1
    }
    Set-Location $RepoDir

    Write-Host "[步骤 2/2] 切换到分支 $Branch ..." -ForegroundColor Yellow
    git checkout -b $Branch origin/$Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 切换分支失败" -ForegroundColor Red
        pause; exit 1
    }
}
# ── 情况B：目录已存在 → 拉取最新
else {
    Set-Location $RepoDir
    Write-Host "[步骤 1/3] 拉取远端信息 (git fetch) ..." -ForegroundColor Yellow
    git fetch origin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] fetch 失败，请检查网络" -ForegroundColor Red
        pause; exit 1
    }

    Write-Host "[步骤 2/3] 切换到分支 $Branch ..." -ForegroundColor Yellow
    git checkout $Branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        # 本地没有这个分支，从远端创建
        git checkout -b $Branch origin/$Branch
    }

    Write-Host "[步骤 3/3] 拉取最新代码 (git pull) ..." -ForegroundColor Yellow
    git pull origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] pull 失败，可能有本地改动冲突" -ForegroundColor Red
        Write-Host "       请运行 git status 查看冲突" -ForegroundColor Yellow
        pause; exit 1
    }
}

Write-Host ""
Write-Host "[完成] 同步成功！" -ForegroundColor Green
Write-Host ""
Write-Host "── 最近 8 条提交 ────────────────────────" -ForegroundColor Cyan
git log --oneline -8
Write-Host ""
Write-Host "── 插件文件位置 ──────────────────────────" -ForegroundColor Cyan
Write-Host "  Chrome扩展目录：$RepoDir\browser-extension\" -ForegroundColor White
Write-Host "  插件ZIP包：     $RepoDir\cnki-scholar-assistant-v1.0.0.zip" -ForegroundColor White
Write-Host ""
Write-Host "── Chrome 加载方法 ───────────────────────" -ForegroundColor Cyan
Write-Host "  1. 地址栏输入：chrome://extensions/" -ForegroundColor White
Write-Host "  2. 右上角开启「开发者模式」" -ForegroundColor White
Write-Host "  3. 点击「加载已解压的扩展程序」" -ForegroundColor White
Write-Host "  4. 选择文件夹：$RepoDir\browser-extension" -ForegroundColor Yellow
Write-Host ""
pause
