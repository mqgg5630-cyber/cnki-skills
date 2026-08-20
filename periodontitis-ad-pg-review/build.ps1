# PowerShell 一键构建脚本 (Windows)
# 用法: powershell -ExecutionPolicy Bypass -File .\build.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "[1/3] 转换参考文献 .bib -> CSL-JSON (metadata) ..." -ForegroundColor Cyan
python tools/bib2csljson.py references.bib | Out-File -Encoding utf8 references.json

Write-Host "[2/3] 获取 pandoc 路径并执行渲染 ..." -ForegroundColor Cyan
$PandocPath = python -c "import pypandoc; print(pypandoc.get_pandoc_path())" 2>$null
if (-not $PandocPath -or -not (Test-Path $PandocPath)) {
    $PandocPath = "pandoc"
}

& $PandocPath periodontitis-ad-pg-review.tex `
  --citeproc `
  --metadata-file=references.json `
  --csl=china-national-standard-gb-t-7714-2015-numeric.csl `
  --lua-filter=strip-thebib.lua `
  --toc `
  -o periodontitis-ad-pg-review.docx

Write-Host "[3/3] docx 格式后处理（中英文字体 + 目录汉化）..." -ForegroundColor Cyan
python tools/postprocess_docx.py periodontitis-ad-pg-review.docx

Write-Host "构建成功: periodontitis-ad-pg-review.docx" -ForegroundColor Green
