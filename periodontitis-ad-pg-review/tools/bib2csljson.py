#!/usr/bin/env python3
"""把 references.bib 转换为 pandoc --metadata-file 可用的 JSON 文献数据。

pandoc 对 @standard 类型会映射为 CSL 的 legislation（会著录成 [A]），
而 GB/T 7714 中标准应著录为 [S]。本脚本用 pandoc 先转 CSL-JSON，
再把 legislation 修正为 standard，输出 JSON 供 --citeproc 使用，
从而保证 .docx 中文献类型标识正确（[S]、[J]、[M]、[EB/OL] 等）。

同时规范化西文作者姓名格式：
- 西文个人姓名（含 given 或 ASCII 姓氏）：姓全大写，保留名缩写（如 DOMINY S S）
- 西文单一词汇机构名（如 Zotero, Pandoc，无 given）：转为 literal 原样著录
- 中文姓名（如 孟焕新、任欢）：保持原样中文著录

用法: python3 tools/bib2csljson.py references.bib > references.json
"""
import json
import re
import subprocess
import sys

PANDOC = "/usr/local/lib/python3.11/dist-packages/pypandoc/files/pandoc"


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: bib2csljson.py <references.bib>", file=sys.stderr)
        return 1
    bib = sys.argv[1]
    try:
        out = subprocess.run(
            [PANDOC, bib, "-t", "csljson"],
            check=True, capture_output=True, text=True,
        ).stdout
    except (FileNotFoundError, subprocess.SubprocessError):
        out = subprocess.run(
            ["pandoc", bib, "-t", "csljson"],
            check=True, capture_output=True, text=True,
        ).stdout
    refs = json.loads(out)

    # @standard -> CSL standard（文献类型标识 [S]）
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
                # 单一词汇机构名/用户名（无 given，纯英数字短横线，如 Zotero）
                if not given and re.fullmatch(r"[A-Za-z0-9\-\.]+", fam):
                    n.clear()
                    n["literal"] = fam
                elif re.search(r"[A-Za-z]", fam):
                    # 西文人名：姓氏全大写（符合 GB/T 7714 规范）
                    n["family"] = fam.upper()

    print(json.dumps({"references": refs}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
