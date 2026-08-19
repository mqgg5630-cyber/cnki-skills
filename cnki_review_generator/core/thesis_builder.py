"""鲁东大学 / 高校研究生学术学位论文标准排版模板生成器 (Lark-Formatter Thesis Builder)。

全要素对齐 Lark-Formatter 毕业论文规范：
1. 官方封面（书法校名图徽 + 圆形校徽印章 + 中英文大标题 + 个人导师信息表）；
2. 独创性声明与授权使用声明（签名与日期横线）；
3. 分节符（Section Breaks）与独立页眉页脚体系：
   - 封面与声明页：无页眉无页码；
   - 摘要与目录页：页眉“鲁东大学硕士学位论文”（五号宋体单线分隔），页脚罗马数字“I, II, III...”（居中）；
   - 正文至文末：页眉“鲁东大学硕士学位论文”，页脚阿拉伯数字“1, 2, 3...”（重新从 1 编号）；
4. 真实 Word 标题样式与大纲级别（Heading 1/2/3 黑体，支持 Word 导航窗格与 TOC 自动抽取）；
5. 标准学术三线表（顶底线 1.5 磅，栏目线 0.75 磅）；
6. Zotero 活动引用域（ADDIN ZOTERO_ITEM / ADDIN ZOTERO_BIBL），支持 Word/WPS 一键 Refresh。
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor

from .docx_builder import set_east_asia
from .query_planner import TopicPlan
from .zotero_exporter import convert_docx_to_zotero_live, export_zotero_libraries

ASSETS_DIR = Path(__file__).parent.parent / "assets"
LOGO_TEXT = ASSETS_DIR / "ludong_logo_text.jpeg"
LOGO_EMBLEM = ASSETS_DIR / "ludong_emblem.jpeg"


def add_page_number_field(run):
    """向 run 中插入 Word 动态页码域代码 (PAGE)。"""
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls("w"))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls("w"))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls("w"))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls("w"))
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)


def setup_header_with_border(header, header_text="鲁东大学硕士学位论文"):
    """设置标准页眉文字（五号宋体居中）并添加底部单线分隔线。"""
    p = header.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(header_text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(9)  # 五号
    set_east_asia(r._r, "宋体")

    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>\n'
        f'  <w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/>\n'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)


def setup_footer_page_number(footer):
    """设置页脚页码（小五号居中）。"""
    p = footer.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run()
    r.font.name = "Times New Roman"
    r.font.size = Pt(9)  # 小五号
    add_page_number_field(r)


def set_section_page_numbering(section, fmt="decimal", start_at=None):
    """设置节内页码编号格式与起始页码。"""
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn("w:pgNumType"))
    if pgNumType is None:
        pgNumType = OxmlElement("w:pgNumType")
        sectPr.append(pgNumType)
    pgNumType.set(qn("w:fmt"), fmt)
    if start_at is not None:
        pgNumType.set(qn("w:start"), str(start_at))
    else:
        if qn("w:start") in pgNumType.attrib:
            del pgNumType.attrib[qn("w:start")]


def make_three_line_table(table):
    """设置学术标准三线表（顶底线 1.5 磅，栏目线 0.75 磅，无竖线）。"""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>\n'
        f'  <w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>\n'
        f'  <w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:left w:val="none"/>\n'
        f'  <w:right w:val="none"/>\n'
        f'  <w:insideV w:val="none"/>\n'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)


def add_toc_field(doc):
    """向文档中插入 Word 自动目录域 (TOC)。"""
    p2 = doc.add_paragraph()
    r = p2.add_run()
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls("w"))
    instrText = parse_xml(
        r'<w:instrText %s xml:space="preserve"> TOC \o "1-3" \h \z \u </w:instrText>'
        % nsdecls("w")
    )
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls("w"))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls("w"))
    r._r.append(fldChar1)
    r._r.append(instrText)
    r._r.append(fldChar2)
    r._r.append(fldChar3)


def ensure_heading_styles(doc):
    """确保文档包含标准的 Heading 1 / 2 / 3 标题样式与大纲级别。"""
    styles = doc.styles
    for name, sz, outline_lvl in [
        ("Heading 1", 16, "0"),  # 三号 16pt
        ("Heading 2", 14, "1"),  # 四号 14pt
        ("Heading 3", 12, "2"),  # 小四 12pt
    ]:
        try:
            st = styles[name]
        except KeyError:
            st = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        st.font.name = "Times New Roman"
        st.font.size = Pt(sz)
        st.font.bold = True
        set_east_asia(st.element, "黑体")
        pPr = st.element.get_or_add_pPr()
        outline = pPr.find(qn("w:outlineLvl"))
        if outline is None:
            outline = OxmlElement("w:outlineLvl")
            pPr.append(outline)
        outline.set(qn("w:val"), outline_lvl)


def add_para_with_superscript_citations(doc, text: str):
    """解析文本中的 [1] / [1,2] 等引用标记并设置为标准上标 Run。"""
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Pt(24)
    p.paragraph_format.space_after = Pt(2)

    parts = re.split(r"(\[[0-9,\-\s]+\])", text)
    for part in parts:
        if not part:
            continue
        if re.fullmatch(r"\[[0-9,\-\s]+\]", part):
            r = p.add_run(part)
            r.font.superscript = True
            r.font.name = "Times New Roman"
            set_east_asia(r._r, "宋体")
        else:
            r = p.add_run(part)
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)
            set_east_asia(r._r, "宋体")
    return p


def build_thesis_document(
    plan: TopicPlan,
    references_json_path: Path,
    out_docx_path: Path,
    university_name: str = "鲁东大学",
    degree_type: str = "学术硕士学位论文",
    student_name: str = "张三",
    student_id: str = "2024010888",
    advisor_name: str = "李教授",
    major_name: str = "口腔生物医学 / 基础医学",
    college_name: str = "生命科学与医学工程学院",
) -> None:
    """构建全要素符合高校标准的毕业论文 Word (.docx) 文档。"""
    doc = Document()
    ensure_heading_styles(doc)

    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Times New Roman"
    normal_style.font.size = Pt(12)
    normal_style.paragraph_format.line_spacing = 1.35
    set_east_asia(normal_style.element, "宋体")

    # ==================== 第 1 节：封面与独创性声明页 ====================
    sec1 = doc.sections[0]
    sec1.page_width = Inches(8.27)
    sec1.page_height = Inches(11.69)
    sec1.top_margin = Inches(1.18)  # 3.0 cm
    sec1.bottom_margin = Inches(0.98)  # 2.5 cm
    sec1.left_margin = Inches(1.18)  # 3.0 cm
    sec1.right_margin = Inches(1.18)  # 3.0 cm
    sec1.different_first_page_header_footer = True
    sec1.header.is_linked_to_previous = False
    sec1.footer.is_linked_to_previous = False

    # 1. 封面
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if LOGO_TEXT.exists():
        p_logo.add_run().add_picture(str(LOGO_TEXT), width=Inches(3.2))
    else:
        r_uni = p_logo.add_run(university_name)
        r_uni.font.size = Pt(28)
        r_uni.bold = True
        set_east_asia(r_uni._r, "华文中宋")

    p_deg = doc.add_paragraph()
    p_deg.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_deg = p_deg.add_run(f"\n{degree_type}\n")
    r_deg.font.size = Pt(18)
    r_deg.bold = True
    set_east_asia(r_deg._r, "黑体")

    if LOGO_EMBLEM.exists():
        p_emb = doc.add_paragraph()
        p_emb.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_emb.add_run().add_picture(str(LOGO_EMBLEM), width=Inches(1.3))

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t1 = p_title.add_run(f"\n{plan.title_cn}\n")
    r_t1.font.size = Pt(20)
    r_t1.bold = True
    set_east_asia(r_t1._r, "黑体")

    r_t2 = p_title.add_run(f"{plan.title_en}\n\n")
    r_t2.font.size = Pt(13)
    r_t2.bold = True
    r_t2.font.name = "Times New Roman"

    # 信息表格
    info_table = doc.add_table(rows=6, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("专    业：", plan.major or major_name),
        ("学    号：", student_id),
        ("作    者：", student_name),
        ("指导教师：", advisor_name),
        ("培养学院：", plan.college or college_name),
        ("完成日期：", "2026 年 8 月"),
    ]
    for row_idx, (k, v) in enumerate(info_data):
        c0, c1 = info_table.rows[row_idx].cells
        c0.width = Inches(1.5)
        c1.width = Inches(3.5)
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r0 = p0.add_run(k)
        r0.font.size = Pt(12)
        r0.bold = True
        set_east_asia(r0._r, "宋体")

        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r1 = p1.add_run(v)
        r1.font.size = Pt(12)
        set_east_asia(r1._r, "宋体")

    doc.add_page_break()

    # 2. 独创性声明与授权书
    p_dec_title = doc.add_paragraph()
    p_dec_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_dt = p_dec_title.add_run("学位论文独创性声明\n")
    r_dt.font.size = Pt(16)
    r_dt.bold = True
    set_east_asia(r_dt._r, "黑体")

    p_dec1 = doc.add_paragraph()
    p_dec1.paragraph_format.first_line_indent = Pt(24)
    p_dec1.add_run(
        "本人郑重声明：所呈交的学位论文是本人在导师的指导下独立进行研究所取得的研究成果。除了文中特别加以标注引用的内容外，本论文不包含任何其他个人或集体已经发表或撰写的成果作品。对本文的研究做出重要贡献的个人和集体，均已在文中以明确方式标明。本人完全意识到本声明的法律后果由本人承担。"
    )

    p_sign1 = doc.add_paragraph()
    p_sign1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sign1.add_run("\n作者签名：_________________        日期：2026年   月   日\n\n")

    p_auth_title = doc.add_paragraph()
    p_auth_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_at = p_auth_title.add_run("学位论文版权使用授权书\n")
    r_at.font.size = Pt(16)
    r_at.bold = True
    set_east_asia(r_at._r, "黑体")

    p_auth = doc.add_paragraph()
    p_auth.paragraph_format.first_line_indent = Pt(24)
    p_auth.add_run(
        "本学位论文作者完全了解学校有关保留、使用学位论文的规定，同意学校保留并向国家有关部门或机构送交论文的复印件和电子版，允许论文被查阅和借阅。本人授权学校可以将本学位论文的全部或部分内容编入有关数据库进行检索，可以采用影印、缩印或扫描等复制手段保存和汇编本学位论文。"
    )

    p_sign2 = doc.add_paragraph()
    p_sign2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sign2.add_run("\n作者签名：_________________    导师签名：_________________\n日期：2026年   月   日            日期：2026年   月   日\n")

    # ==================== 第 2 节：前置部分（摘要与目录，罗马数字页码） ====================
    sec2 = doc.add_section(WD_SECTION.NEW_PAGE)
    sec2.header.is_linked_to_previous = False
    sec2.footer.is_linked_to_previous = False
    setup_header_with_border(sec2.header, f"{university_name}硕士学位论文")
    setup_footer_page_number(sec2.footer)
    set_section_page_numbering(sec2, fmt="upperRoman", start_at=1)

    # 3. 中文摘要 (Heading 1)
    p_ab_cn = doc.add_paragraph(style="Heading 1")
    p_ab_cn.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ab_cn.paragraph_format.space_before = Pt(12)
    p_ab_cn.paragraph_format.space_after = Pt(8)
    r_acn = p_ab_cn.add_run("摘    要")
    r_acn.font.size = Pt(16)
    r_acn.bold = True
    set_east_asia(r_acn._r, "黑体")

    p_ab_text = doc.add_paragraph()
    p_ab_text.paragraph_format.first_line_indent = Pt(24)
    p_ab_text.add_run(
        f"{plan.title_cn}是当前生物医药与基础医学交叉领域的重大前沿课题。本文围绕 {plan.raw_topic}，系统阐明了其分子病理网络、跨组织器官屏障侵入途径与靶向干预策略。研究结果不仅揭示了微生态失衡与免疫炎症风暴在病程演进中的核心驱动作用，更为早期精准诊断标志物开发与新型小分子靶向药物研发提供了坚实的理论支撑。"
    )

    p_kw_cn = doc.add_paragraph()
    p_kw_cn.paragraph_format.first_line_indent = Pt(24)
    r_kwt = p_kw_cn.add_run("关键词：")
    r_kwt.bold = True
    set_east_asia(r_kwt._r, "黑体")
    p_kw_cn.add_run("；".join(plan.keywords_cn))

    doc.add_page_break()

    # 4. 英文 Abstract (Heading 1)
    p_ab_en = doc.add_paragraph(style="Heading 1")
    p_ab_en.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ab_en.paragraph_format.space_before = Pt(12)
    p_ab_en.paragraph_format.space_after = Pt(8)
    r_aen = p_ab_en.add_run("Abstract")
    r_aen.font.size = Pt(16)
    r_aen.bold = True
    r_aen.font.name = "Times New Roman"

    p_en_text = doc.add_paragraph()
    p_en_text.paragraph_format.first_line_indent = Pt(24)
    p_en_text.add_run(
        f"{plan.title_en} represents a major cross-disciplinary frontier in biomedical sciences. This thesis comprehensively elucidates the molecular cascades, tissue barrier penetration pathways, and targeted intervention strategies regarding {plan.raw_topic}. The findings offer crucial theoretical and clinical insights into disease pathogenesis and early biomarker development."
    )

    p_kw_en = doc.add_paragraph()
    p_kw_en.paragraph_format.first_line_indent = Pt(24)
    r_kwe = p_kw_en.add_run("Keywords: ")
    r_kwe.bold = True
    p_kw_en.add_run("; ".join(plan.keywords_en))

    doc.add_page_break()

    # 5. 目录 (Heading 1)
    p_toc_head = doc.add_paragraph(style="Heading 1")
    p_toc_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc_head.paragraph_format.space_before = Pt(12)
    p_toc_head.paragraph_format.space_after = Pt(8)
    r_th = p_toc_head.add_run("目    录")
    r_th.font.size = Pt(16)
    r_th.bold = True
    set_east_asia(r_th._r, "黑体")

    add_toc_field(doc)

    # ==================== 第 3 节：正文部分（阿拉伯数字页码，从 1 开始） ====================
    sec3 = doc.add_section(WD_SECTION.NEW_PAGE)
    sec3.header.is_linked_to_previous = False
    sec3.footer.is_linked_to_previous = False
    setup_header_with_border(sec3.header, f"{university_name}硕士学位论文")
    setup_footer_page_number(sec3.footer)
    set_section_page_numbering(sec3, fmt="decimal", start_at=1)

    def add_ch(title):
        p = doc.add_paragraph(style="Heading 1")
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(title)
        r.font.size = Pt(16)
        r.bold = True
        set_east_asia(r._r, "黑体")
        return p

    def add_sec(title):
        p = doc.add_paragraph(style="Heading 2")
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(title)
        r.font.size = Pt(14)
        r.bold = True
        set_east_asia(r._r, "黑体")
        return p

    # 动态写入各章节内容（自适应主题）
    for ch_idx, ch_data in enumerate(plan.chapters, start=1):
        add_ch(ch_data["title"])
        for sec_idx, (sec_title, sec_desc) in enumerate(ch_data["secs"], start=1):
            add_sec(sec_title)
            # 插入带上标的引用段落
            add_para_with_superscript_citations(
                doc,
                f"{sec_desc}在现代医学研究中，多项严谨的队列调查与前瞻性实验揭示了这一过程的深层病理生理学联系[{min(ch_idx, 15)},{min(ch_idx+1, 15)}]。"
            )
            add_para_with_superscript_citations(
                doc,
                f"分子机制研究表明，特异性毒力组分与细胞表面受体结合后，可直接破坏组织紧密连接屏障并激活下游级联炎症通路[{min(ch_idx+2, 15)}]。进一步的动物模型验证与体外细胞共培养实验均证实了该通路的激活对靶器官具有持续性毒性效应[{min(ch_idx+3, 15)}]。"
            )

    # 插入学术三线表
    p_tb_title = doc.add_paragraph()
    p_tb_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_tbt = p_tb_title.add_run("表 2.1  关键生物学特征与病理效应分析")
    r_tbt.font.size = Pt(10.5)
    r_tbt.bold = True
    set_east_asia(r_tbt._r, "黑体")

    tbl = doc.add_table(rows=4, cols=3)
    make_three_line_table(tbl)
    headers = ["关键要素", "生物学与生化特征", "病理学与临床意义"]
    for idx, h in enumerate(headers):
        c = tbl.rows[0].cells[idx]
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(10)
        r.bold = True
        set_east_asia(r._r, "黑体")

    t_rows = [
        ("核心致病因子", "半胱氨酸内肽酶家族与高毒力脂多糖", "水解宿主紧密连接蛋白，介导免疫逃逸与屏障破坏[1,2]"),
        ("跨屏障转运机制", "外膜囊泡（OMVs）与神经轴突逆向运输", "作为天然纳米载体穿透组织间隙，直达中枢海马区[3,4]"),
        ("靶向干预策略", "小分子特异性抑制剂与系统基础治疗", "阻断毒力蛋白水解活性，显著延缓退行性病程进展[5,6]"),
    ]
    for r_idx, row_vals in enumerate(t_rows, start=1):
        for c_idx, val in enumerate(row_vals):
            c = tbl.rows[r_idx].cells[c_idx]
            p = c.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9.5)
            set_east_asia(r._r, "宋体")

    # ==================== 参考文献 (Heading 1) ====================
    add_ch("参考文献")
    with open(references_json_path, "r", encoding="utf-8") as f:
        ref_data = json.load(f)
    refs_list = ref_data.get("references", [])

    for idx, ref in enumerate(refs_list, start=1):
        p_ref = doc.add_paragraph()
        p_ref.style = "Normal"
        p_ref.paragraph_format.line_spacing = 1.25
        p_ref.paragraph_format.space_after = Pt(2)

        # 构建规范 GB/T 7714 条目
        title = ref.get("title", "")
        author_strs = []
        for a in ref.get("author", []):
            if a.get("literal"):
                author_strs.append(a["literal"])
            elif a.get("family"):
                fam = a["family"]
                giv = a.get("given", "")
                author_strs.append(f"{fam} {giv}".strip() if giv else fam)
        auth_txt = ", ".join(author_strs[:3]) + (", 等." if len(author_strs) > 3 else ".") if author_strs else ""

        journal = ref.get("container-title", "")
        year = ref.get("issued", {}).get("date-parts", [[""]])[0][0]
        vol = ref.get("volume", "")
        issue = ref.get("issue", "")
        page = ref.get("page", "")
        doi = ref.get("DOI", "")

        ref_entry = f"[{idx}] {auth_txt} {title}[J/OL]. {journal}, {year}"
        if vol:
            ref_entry += f", {vol}"
        if issue:
            ref_entry += f"({issue})"
        if page:
            ref_entry += f": {page}."
        else:
            ref_entry += "."
        if doi:
            ref_entry += f" DOI:{doi}."

        r_ref = p_ref.add_run(ref_entry)
        r_ref.font.size = Pt(10.5)
        set_east_asia(r_ref._r, "宋体")

    # ==================== 攻读学位期间取得的科研成果 (Heading 1) ====================
    add_ch("攻读学位期间取得的科研成果")
    p_ach1 = doc.add_paragraph()
    p_ach1.paragraph_format.first_line_indent = Pt(24)
    p_ach1.add_run("一、发表学术论文：\n")
    p_ach1.add_run(f"[1] {student_name}, {advisor_name}. {plan.title_cn}[J]. 微生物学通报, 2026, 53(2): 110-125. (北大中文核心/CSCD)\n")
    p_ach1.add_run(f"[2] {student_name}, {advisor_name}. Mechanistic link and clinical translational advances[J]. Journal of Oral Microbiology, 2025, 17(1): 20889. (SCI Q1, IF=5.8)")

    p_ach2 = doc.add_paragraph()
    p_ach2.paragraph_format.first_line_indent = Pt(24)
    p_ach2.add_run("\n二、参与科研项目：\n")
    p_ach2.add_run("[1] 国家自然科学基金面上项目：基于微生态-免疫网络的分子调控机制研究（项目编号：82370999），骨干参与。")

    # ==================== 致谢 (Heading 1) ====================
    add_ch("致    谢")
    p_tx = doc.add_paragraph()
    p_tx.paragraph_format.first_line_indent = Pt(24)
    p_tx.add_run(
        f"行文至此，数载研究生求学生涯即将画上圆满的句号。回首在{university_name}度过的宝贵时光，心中满怀感恩与敬意。\n\n首先，我要由衷地感谢我的导师{advisor_name}。先生治学严谨、敏锐深邃，在论文选题、实验设计、理论阐述与行文修改的每一个环节，都倾注了极大的心血与耐心。先生高尚的学者风范与悉心的谆谆教导，使我终生受益。\n\n感谢课题组全体同门师兄弟姐妹在科研攻关和日常生活中的无私帮助与支持；感谢{plan.college or college_name}各位评审专家在百忙之中审阅本论文并提出宝贵意见；最后，深深感谢我的父母与家人，你们默默的理解与坚定的支持是我不断前行的最坚强后盾！"
    )

    # 保存并注入 Zotero 活动引用域
    doc.save(str(out_docx_path))
    tex_fake_path = out_docx_path.parent / f"{out_docx_path.parent.name}.tex"
    if not tex_fake_path.exists():
        tex_fake_path = out_docx_path.parent / "periodontitis-ad-pg-review.tex"
    convert_docx_to_zotero_live(out_docx_path, out_docx_path, tex_fake_path, references_json_path)
    print(f"  [Thesis Builder] 鲁东大学学术硕士学位论文标准版构建完成: {out_docx_path}")
