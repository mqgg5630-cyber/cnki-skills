#!/usr/bin/env python3
"""docx 后处理：设置中文字体，并把“Table of Contents”标签改为“目录”。

标题块由 pandoc 依据 LaTeX 的 \\title/\\author/\\date 元数据自动生成
（Word 的 Title/Author/Date 样式，居中），无需再手工插入。
正文默认字体设为 Times New Roman（西文）/ 宋体（中文），标题设为黑体。
"""
import sys

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


def set_east_asia(el, name):
    """el 为可调用 get_or_add_rPr() 的 XML 元素（run 或 style）。"""
    rPr = el.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = rPr.makeelement(qn("w:rFonts"), {})
        rPr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), name)


def style_fonts(doc):
    # 正文样式：西文 Times New Roman，中文 宋体，小四(12pt)
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    set_east_asia(normal.element, "宋体")
    # 标题样式：黑体
    for name, sz in (("Heading 1", 16), ("Heading 2", 14), ("Heading 3", 13)):
        try:
            st = doc.styles[name]
            st.font.name = "Times New Roman"
            st.font.size = Pt(sz)
            st.font.bold = True
            set_east_asia(st.element, "黑体")
        except KeyError:
            pass


def translate_labels(doc):
    """把 pandoc 自动生成的英文标签改为中文（含 sdt 内的 TOC 标题）。"""
    from docx.oxml.ns import qn
    for t in doc.element.body.iter(qn("w:t")):
        if t.text and t.text.strip() == "Table of Contents":
            t.text = "目录"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "cnki-citation-review.docx"
    doc = Document(path)
    style_fonts(doc)
    translate_labels(doc)
    doc.save(path)
    print(f"已后处理: {path}")


if __name__ == "__main__":
    main()
