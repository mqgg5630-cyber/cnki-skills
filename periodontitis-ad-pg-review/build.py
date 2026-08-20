#!/usr/bin/env python3
"""一键构建脚本（纯 Python 跨平台版，推荐在 Windows / macOS / Linux 下运行）

构建产物（全部默认内置 Zotero CSL 活动引用域，支持 Word / WPS 顶部“Zotero -> Refresh”一键刷新）：
1. periodontitis-ad-pg-review.docx —— 主交付 Word 文档（已注入 Zotero 活动引用域）
2. 鲁东大学学术硕士学位论文_标准定稿版.docx —— 集成 Lark-Formatter 官方封面、中英文摘要、自动目录、三线表与致谢的学术学位论文
3. Periodontitis_AD_Zotero_library.json —— Zotero 原生文献库导入文件（CSL-JSON，包含 16 篇权威文献）
4. Periodontitis_AD_Zotero_library.ris —— Zotero 通用文献库导入文件（RIS）

用法:
    python build.py
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# 确保在当前脚本所在目录运行
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)
ROOT_DIR = Path(SCRIPT_DIR).parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "tools"))


def get_pandoc_executable():
    try:
        import pypandoc
        path = pypandoc.get_pandoc_path()
        if os.path.isfile(path) or (sys.platform == "win32" and os.path.isfile(path + ".exe")):
            return path
    except Exception:
        pass
    return "pandoc"


def step1_bib2csljson(bib_path, out_json_path, pandoc_bin):
    print("[1/5] 转换参考文献 .bib -> CSL-JSON (metadata) ...")
    res = subprocess.run(
        [pandoc_bin, bib_path, "-t", "csljson"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    refs = json.loads(res.stdout)
    for r in refs:
        if r.get("type") == "legislation":
            r["type"] = "standard"
        for role in ("author", "editor", "translator"):
            names = r.get(role)
            if not isinstance(names, list):
                continue
            for n in names:
                fam = n.get("family")
                given = n.get("given")
                if not fam:
                    continue
                if not given and re.fullmatch(r"[A-Za-z0-9\-\.]+", fam):
                    n.clear()
                    n["literal"] = fam
                elif re.search(r"[A-Za-z]", fam):
                    n["family"] = fam.upper()
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump({"references": refs}, f, ensure_ascii=False, indent=2)


def step2_render_pandoc(tex_path, docx_path, json_path, csl_path, lua_path, pandoc_bin):
    print(f"[2/5] 执行 pandoc --citeproc 渲染: {tex_path} -> {docx_path} ...")
    cmd = [
        pandoc_bin,
        tex_path,
        "--citeproc",
        f"--metadata-file={json_path}",
        f"--csl={csl_path}",
        f"--lua-filter={lua_path}",
        "--toc",
        "-o",
        docx_path,
    ]
    subprocess.run(cmd, check=True)


def step3_postprocess_docx(docx_path):
    print("[3/5] docx 格式后处理（中英文字体 + 目录汉化）...")
    from postprocess_docx import style_fonts, translate_labels
    from docx import Document

    doc = Document(docx_path)
    style_fonts(doc)
    translate_labels(doc)
    doc.save(docx_path)


def step4_zotero_live_integration(main_docx, tex_file, json_file, base_lib):
    print("[4/5] 注入 Zotero 活动引用域（支持 Word/WPS 一键 Refresh）并导出文献库 ...")
    from zotero_word_fields import convert_docx_to_zotero_live, export_zotero_libraries
    convert_docx_to_zotero_live(main_docx, main_docx, tex_file, json_file)
    export_zotero_libraries(json_file, base_lib)


def step5_build_thesis(json_file, thesis_docx):
    print("[5/5] 构建 Lark-Formatter 鲁东大学学术硕士学位论文标准版...")
    from cnki_review_generator.core.query_planner import plan_topic
    from cnki_review_generator.core.thesis_builder import build_thesis_document
    plan = plan_topic("牙周炎 AD 牙龈卟啉单胞菌")
    build_thesis_document(plan, Path(json_file), Path(thesis_docx))


def main():
    tex_file = "periodontitis-ad-pg-review.tex"
    bib_file = "references.bib"
    json_file = "references.json"
    docx_file = "periodontitis-ad-pg-review.docx"
    thesis_file = "鲁东大学学术硕士学位论文_标准定稿版.docx"
    base_lib = "Periodontitis_AD_Zotero_library"
    csl_file = "china-national-standard-gb-t-7714-2015-numeric.csl"
    lua_file = "strip-thebib.lua"

    pandoc_bin = get_pandoc_executable()
    step1_bib2csljson(bib_file, json_file, pandoc_bin)
    step2_render_pandoc(tex_file, docx_file, json_file, csl_file, lua_file, pandoc_bin)
    step3_postprocess_docx(docx_file)
    step4_zotero_live_integration(docx_file, tex_file, json_file, base_lib)
    step5_build_thesis(json_file, thesis_file)

    print("\n" + "=" * 60)
    print(" 全部构建完成！交付文件清单：")
    print(f"  1. 学术综述 (Zotero活动版): {os.path.abspath(docx_file)}")
    print(f"  2. 鲁东大学学位论文标准版: {os.path.abspath(thesis_file)}")
    print(f"  3. Zotero文献库 (CSL-JSON): {os.path.abspath(base_lib + '.json')}")
    print(f"  4. Zotero文献库 (RIS): {os.path.abspath(base_lib + '.ris')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
