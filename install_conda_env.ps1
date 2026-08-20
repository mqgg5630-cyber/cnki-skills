# 一键安装 Conda / Mamba 独立运行环境脚本 (Windows PowerShell)
# 支持指定 prefix 路径: E:\spider\Library\envs\cnki-review 或复用现有环境

param(
    [string]$EnvPath = "E:\spider\Library\envs\cnki-review"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " [CNKI Review Generator] 开始配置 Conda / Mamba 环境..." -ForegroundColor Cyan
Write-Host " 目标环境路径: $EnvPath" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# 1. 优先检测 mamba，若无则使用 conda
$Tool = "mamba"
if (-not (Get-Command mamba -ErrorAction SilentlyContinue)) {
    $Tool = "conda"
}
Write-Host " 使用包管理器: $Tool" -ForegroundColor Green

# 2. 创建或更新指定 prefix 环境
Write-Host "`n[1/2] 安装核心依赖 (pypandoc-binary, python-docx, lxml)..." -ForegroundColor Yellow

if (Test-Path $EnvPath) {
    Write-Host " 检测到环境已存在，正在更新依赖..." -ForegroundColor Cyan
    & $Tool env update -p $EnvPath -f environment.yml --prune
} else {
    Write-Host " 正在创建新环境..." -ForegroundColor Cyan
    & $Tool env create -p $EnvPath -f environment.yml
}

Write-Host "`n[2/2] 环境配置完成！" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host " 激活并运行生成器命令：" -ForegroundColor Cyan
Write-Host "   conda activate $EnvPath" -ForegroundColor Yellow
Write-Host "   python generate_review.py --topic `"牙周炎 AD 牙龈卟啉单胞菌`"" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
