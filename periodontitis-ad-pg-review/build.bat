@echo off
chcp 65001 >nul
echo [1/3] 转换参考文献 .bib -> CSL-JSON (metadata) ...
python tools\bib2csljson.py references.bib > references.json

echo [2/3] 执行 pandoc --citeproc 渲染 ...
for /f "delims=" %%i in ('python -c "import pypandoc; print(pypandoc.get_pandoc_path())" 2^>nul') do set PANDOC_BIN=%%i
if "%PANDOC_BIN%"=="" set PANDOC_BIN=pandoc

"%PANDOC_BIN%" periodontitis-ad-pg-review.tex --citeproc --metadata-file=references.json --csl=china-national-standard-gb-t-7714-2015-numeric.csl --lua-filter=strip-thebib.lua --toc -o periodontitis-ad-pg-review.docx

echo [3/3] docx 格式后处理（中英文字体 + 目录汉化）...
python tools\postprocess_docx.py periodontitis-ad-pg-review.docx

echo 构建成功: periodontitis-ad-pg-review.docx
