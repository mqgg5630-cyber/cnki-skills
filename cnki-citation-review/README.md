# CNKI 参考文献引用综述（LaTeX + Word 自动排版示例）

本目录是一篇以《CNKI 参考文献引用综述——规范体系、获取方式与自动化工作流》为主题的
综述文档，同时演示了“**先 LaTeX、再转 docx**”的完整自动引用工作流：
正文只需写 `\cite{key}`，引用编号、上标标注与 GB/T 7714 参考文献表全部自动生成。

## 文件说明

| 文件 | 说明 |
|------|------|
| `cnki-citation-review.tex` | LaTeX 源码（xelatex + ctexart 编译），含手工 `thebibliography` 文献表 |
| `cnki-citation-review.docx` | 由 `build.sh` 自动生成的 Word 版（GB/T 7714 引用格式） |
| `references.bib` | 参考文献库（单一事实来源），LaTeX 与 Word 两条路径共用 |
| `china-national-standard-gb-t-7714-2015-numeric.csl` | pandoc 引用渲染用的 CSL（Zotero 官方样式的本仓库修订版，见文件头注释） |
| `china-national-standard-gb-t-7714-2025-numeric.csl` | 备用：GB/T 7714-2025 版 CSL（2026-07-01 起实施的新国标） |
| `strip-thebib.lua` | pandoc Lua 过滤器：转 docx 时去除手工文献表，避免与自动文献表重复 |
| `build.sh` | 一键构建脚本：.bib → CSL-JSON → pandoc --citeproc → docx 后处理 |
| `tools/bib2csljson.py` | 把 references.bib 转成 CSL-JSON 文献数据（修正标准类型 [S]、机构名原样著录） |
| `tools/postprocess_docx.py` | docx 后处理：中文字体（宋体/黑体）、TOC 标签汉化 |

`references.json` 为构建中间产物（build.sh 自动生成），不入库。

## 快速开始

**1. 编译 LaTeX（需要 XeLaTeX + TeX Live，含 ctex 宏包）**

```bash
xelatex cnki-citation-review.tex
xelatex cnki-citation-review.tex   # 第二次运行生成目录与引用编号
```

**2. 生成 Word 版（需要 pandoc + python-docx）**

```bash
pip install pypandoc-binary python-docx   # 若未安装
./build.sh
```

产物为 `cnki-citation-review.docx`。

## 自动引用的工作原理

1. **单一事实来源**：`references.bib` 保存全部参考文献（作者、题名、刊名、年卷期、
   页码、DOI、URL、访问日期）。引用条目均经网络核验（2026-08-18）。
2. **LaTeX 路径**：正文用 `\cite{key}`，配合 `cite` 宏包的 `super` 选项实现
   GB/T 7714 顺序编码制的上标标注（如 `[1]`、`[2,3]`）；文末
   `thebibliography` 按正文首次引用顺序手工著录，编号自动对应。
3. **Word 路径**（`build.sh`）：
   - `tools/bib2csljson.py` 用 pandoc 把 `.bib` 转为 CSL-JSON，并修正：
     `@standard` → CSL `standard`（否则会著录成 `[A]` 而非 `[S]`）；
     机构名/用户名（Zotero、Pandoc、cookjohn）改为 `literal`，按原样著录；
   - `pandoc --citeproc --metadata-file=references.json --csl=…` 将正文
     `\cite` 自动解析为规范上标编号，并在文末生成 GB/T 7714 参考文献表；
   - `--lua-filter=strip-thebib.lua` 去除手工文献表，避免重复；
   - `tools/postprocess_docx.py` 设置宋体/黑体字库，并把目录标签汉化。

## 关于 CSL 修订版

`china-national-standard-gb-t-7714-2015-numeric.csl` 基于 Zotero 官方样式
（CC BY-SA 3.0）做了最小修订：去除对“姓”的全大写变换，使机构名按原样著录
（原样式会把 Zotero 变成 ZOTERO）。外文个人姓名的“姓全大写”由
`tools/bib2csljson.py` 在数据层完成，仍符合 GB/T 7714。

如需使用 2026-07-01 起实施的 GB/T 7714-2025 样式，可把 `build.sh` 中的
`CSL=` 改指 `china-national-standard-gb-t-7714-2025-numeric.csl`
（注意：2025 样式对标准文献采用“编号 + 名称”著录、不显示发布机构，
与本目录手工文献表略有差异，二选一保持一致即可）。

## 与 CNKI skills 的关系

本综述正文第 4 节以本仓库 `skills/` 下全部 10 个 CNKI 技能
（cnki-search、cnki-advanced-search、cnki-parse-results、cnki-navigate-pages、
cnki-paper-detail、cnki-journal-search、cnki-journal-index、cnki-journal-toc、
cnki-download、cnki-export）为例，给出了“检索—筛选—批量导出—Zotero—排版”
的引用工作流，并回答了“引用 CNKI 文献是否需要爬虫”（不需要）。
在装有 Chrome DevTools MCP 的 Claude Code 环境中，可按照文中 4.3 节流程
实际操作，把 `cnki-export` 导出的 RIS/EndNote 数据导入 Zotero 后，
替换本目录 `references.bib` 中的条目再重新构建即可。
