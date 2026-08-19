#!/usr/bin/env bash
# ============================================================
# 一键构建：LaTeX 源码 -> Word (.docx)
#   1) 用 pandoc 把 references.bib 转成 CSL-JSON 文献数据（修正 [S] 类型）
#   2) pandoc --citeproc + GB/T 7714 CSL 渲染引用，Lua 过滤器去除手工文献表
#   3) python-docx 后处理：中文字体 + 标题块
# LaTeX 版请用 xelatex 编译（见 README）：
#   xelatex cnki-citation-review.tex && xelatex cnki-citation-review.tex
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

PANDOC="$(python3 - <<'EOF'
import pypandoc, os
print(pypandoc.get_pandoc_path())
EOF
)"
CSL="china-national-standard-gb-t-7714-2015-numeric.csl"
BIB="references.bib"
TEX="cnki-citation-review.tex"
OUT="cnki-citation-review.docx"

echo "[1/3] 转换参考文献 .bib -> CSL-JSON (metadata) ..."
python3 tools/bib2csljson.py "$BIB" > references.json

echo "[2/3] pandoc --citeproc: $TEX -> $OUT ..."
"$PANDOC" "$TEX" \
  --citeproc \
  --metadata-file=references.json \
  --csl="$CSL" \
  --lua-filter=strip-thebib.lua \
  --toc \
  -o "$OUT"

echo "[3/3] docx 后处理（字体 + 标题块）..."
python3 tools/postprocess_docx.py "$OUT"

echo "完成: $OUT"
