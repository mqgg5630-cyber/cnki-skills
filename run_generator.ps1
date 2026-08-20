# 一键启动学术综述生成器 (Windows PowerShell)
# 用法: powershell -ExecutionPolicy Bypass -File .\run_generator.ps1

param(
    [string]$Topic = "牙周炎 AD 牙龈卟啉单胞菌",
    [string]$EnvPath = "E:\spider\Library\envs\cnki-review"
)

Write-Host " [CNKI Review Generator] 正在启动综述生成器..." -ForegroundColor Cyan
Write-Host " 目标主题: $Topic" -ForegroundColor Yellow

# 检查可用的 python 环境
$PyExe = $null
if (Test-Path "$EnvPath\python.exe") {
    $PyExe = "$EnvPath\python.exe"
} elseif (Test-Path "E:\spider\Library\envs\lark\python.exe") {
    $PyExe = "E:\spider\Library\envs\lark\python.exe"
}

if ($PyExe) {
    Write-Host " 使用指定环境 Python: $PyExe" -ForegroundColor Green
    & $PyExe generate_review.py --topic "$Topic"
} else {
    Write-Host " 使用当前环境 Python..." -ForegroundColor Cyan
    python generate_review.py --topic "$Topic"
}
