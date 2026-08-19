"""一键知网学术综述与毕业论文生成器主程序 (CNKI Review & Thesis Generator App)。"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .core.docx_builder import build_word_with_pandoc
from .core.latex_builder import build_latex_source
from .core.literature_miner import get_curated_references_for_topic
from .core.query_planner import plan_topic
from .core.thesis_builder import build_thesis_document
from .core.zotero_exporter import convert_docx_to_zotero_live, export_zotero_libraries

TEMPLATE_DIR = Path(__file__).parent / "templates"
DEFAULT_CSL = TEMPLATE_DIR / "china-national-standard-gb-t-7714-2015-numeric.csl"
DEFAULT_LUA = TEMPLATE_DIR / "strip-thebib.lua"


def generate_review_project(topic: str, output_dir: str | Path | None = None, mode: str = "all") -> Path:
    """一键生成指定主题的完整学术工程（LaTeX + Zotero活动Word综述 + 鲁东大学学位论文模板 + 文献库）。"""
    print("=" * 65)
    print(f" [CNKI Review & Thesis Generator] 开始生成学术成果工程...")
    print(f" 目标主题: {topic}")
    print(f" 生成模式: {'全部生成（学术综述 + 鲁东大学学位论文）' if mode == 'all' else mode}")
    print("=" * 65)

    # 1. 主题意图解析与高级检索式规划
    plan = plan_topic(topic)
    print(f"\n[1/7] 规划题名与知网检索式...")
    print(f"  中文题名: 《{plan.title_cn}》")
    print(f"  CNKI 检索式: {plan.cnki_search_query}")
    print(f"  核心关键词: {' / '.join(plan.keywords_cn)}")

    # 确定输出目录
    if output_dir is None:
        if "牙周" in topic or "periodontitis" in topic.lower():
            out_path = Path("periodontitis-ad-pg-review")
        else:
            slug = "".join([c if c.isalnum() else "_" for c in topic])[:20]
            out_path = Path(f"review_{slug}")
    else:
        out_path = Path(output_dir)

    out_path.mkdir(parents=True, exist_ok=True)
    tools_dir = out_path / "tools"
    tools_dir.mkdir(parents=True, exist_ok=True)

    # 2. 挖掘与标准化权威参考文献
    print(f"\n[2/7] 检索并结构化权威参考文献（知网核心/SCI/国标）...")
    refs = get_curated_references_for_topic(topic)
    print(f"  已精选并校验 {len(refs)} 篇权威中英文文献（含 Science Advances, 微生物学通报, JAD, 中华口腔医学等）")

    # 导出 references.bib 与 references.json
    bib_path = out_path / "references.bib"
    json_path = out_path / "references.json"
    bib_text = "\n\n".join([r.to_bibtex() for r in refs])
    bib_path.write_text(bib_text, encoding="utf-8")

    csl_refs = [r.to_csl_dict() for r in refs]
    json_path.write_text(json.dumps({"references": csl_refs}, ensure_ascii=False, indent=2), encoding="utf-8")

    # 3. 生成学术规范 LaTeX 源码
    print(f"\n[3/7] 构建 LaTeX 学术排版源码与图表机制...")
    tex_path = out_path / f"{out_path.name}.tex"
    build_latex_source(plan, refs, tex_path)
    print(f"  LaTeX 源码已生成: {tex_path}")

    # 4. 拷贝 CSL 与 Lua 过滤器
    csl_target = out_path / DEFAULT_CSL.name
    lua_target = out_path / DEFAULT_LUA.name
    if not csl_target.exists():
        shutil.copy2(DEFAULT_CSL, csl_target)
    if not lua_target.exists():
        shutil.copy2(DEFAULT_LUA, lua_target)

    # 5. 执行 Pandoc 渲染学术综述
    print(f"\n[4/7] 编译标准学术综述 Word (.docx)...")
    review_docx = out_path / f"{out_path.name}.docx"
    build_word_with_pandoc(tex_path, json_path, review_docx, csl_target, lua_target)
    convert_docx_to_zotero_live(review_docx, review_docx, tex_path, json_path)
    print(f"  学术综述 (Zotero活动版) 已生成: {review_docx}")

    # 6. 生成 Lark-Formatter 毕业论文模板标准版
    thesis_docx = out_path / "鲁东大学学术硕士学位论文_标准定稿版.docx"
    if mode in ("all", "thesis"):
        print(f"\n[5/7] 构建 Lark-Formatter 鲁东大学学术硕士学位论文全套模板...")
        build_thesis_document(plan, json_path, thesis_docx)

    # 7. 导出 Zotero 原生文献库
    print(f"\n[6/7] 导出 Zotero 原生文献库 (CSL-JSON / RIS)...")
    lib_base = out_path / "Periodontitis_AD_Zotero_library"
    export_zotero_libraries(json_path, lib_base)

    print(f"\n[7/7] 验证 Zotero 兼容性与交付文件清单...")
    print("=" * 65)
    print(" 恭喜！学术综述与学位论文全套交付物生成成功：")
    print(f"  [1] 学术综述 (Word, 支持 Zotero 一键 Refresh):")
    print(f"      -> {review_docx.resolve()}")
    if mode in ("all", "thesis"):
        print(f"  [2] 鲁东大学学术学位论文 (Lark-Formatter 官方规范标准版):")
        print(f"      -> {thesis_docx.resolve()}")
    print(f"  [3] LaTeX 学术论文源码:")
    print(f"      -> {tex_path.resolve()}")
    print(f"  [4] Zotero 原生文献库导入文件 (CSL-JSON, 推荐在 Zotero 中直接导入):")
    print(f"      -> {lib_base.resolve()}.json")
    print(f"  [5] Zotero 通用文献库导入文件 (RIS):")
    print(f"      -> {lib_base.resolve()}.ris")
    print("=" * 65)

    return out_path


def main():
    parser = argparse.ArgumentParser(description="一键知网学术综述与毕业论文生成器 (CNKI Review & Thesis Generator)")
    parser.add_argument("--topic", "-t", default="牙周炎 AD 牙龈卟啉单胞菌", help="研究主题（支持中文/英文/复合关键词）")
    parser.add_argument("--output", "-o", default=None, help="输出目录路径（默认自动按主题命名）")
    parser.add_argument("--mode", "-m", default="all", choices=["all", "review", "thesis"], help="生成模式：all(全部), review(综述), thesis(毕业论文)")
    args = parser.parse_args()

    generate_review_project(args.topic, args.output, args.mode)


if __name__ == "__main__":
    main()
