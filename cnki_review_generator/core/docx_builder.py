"""Word (.docx) 排版渲染与 Zotero 活动引用构建器。"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


def get_pandoc_bin() -> str:
    try:
        import pypandoc
        p = pypandoc.get_pandoc_path()
        if os.path.isfile(p) or (sys.platform == "win32" and os.path.isfile(p + ".exe")):
            return p
    except Exception:
        pass
    return "pandoc"


def set_east_asia(el, name: str):
    rPr = el.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = rPr.makeelement(qn("w:rFonts"), {})
        rPr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), name)


def postprocess_fonts_and_labels(docx_path: str | Path):
    doc = Document(str(docx_path))
    # 正文样式
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    set_east_asia(normal.element, "宋体")
    # 标题样式
    for name, sz in (("Heading 1", 16), ("Heading 2", 14), ("Heading 3", 13)):
        try:
            st = doc.styles[name]
            st.font.name = "Times New Roman"
            st.font.size = Pt(sz)
            st.font.bold = True
            set_east_asia(st.element, "黑体")
        except KeyError:
            pass
    # 目录标题汉化
    for t in doc.element.body.iter(qn("w:t")):
        if t.text and t.text.strip() == "Table of Contents":
            t.text = "目录"
    doc.save(str(docx_path))


def build_word_with_pandoc(
    tex_path: str | Path,
    json_path: str | Path,
    out_docx_path: str | Path,
    csl_path: str | Path,
    lua_filter_path: str | Path,
) -> None:
    pandoc_bin = get_pandoc_bin()
    cmd = [
        pandoc_bin,
        str(tex_path),
        "--citeproc",
        f"--metadata-file={str(json_path)}",
        f"--csl={str(csl_path)}",
        f"--lua-filter={str(lua_filter_path)}",
        "--toc",
        "-o",
        str(out_docx_path),
    ]
    subprocess.run(cmd, check=True)
    postprocess_fonts_and_labels(out_docx_path)
