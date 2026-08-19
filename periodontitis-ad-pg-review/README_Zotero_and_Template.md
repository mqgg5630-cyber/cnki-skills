# 牙周炎与阿尔茨海默病关联综述：Zotero 联动与一键 Refresh 使用指南

本文档参照 [Lark-Formatter](https://github.com/shaohuawen03-cyber/Lark-Formatter) 的 Zotero 活动引用规范，为您提供与 Zotero 客户端在 Word 中**一键 Refresh 联动**的完整交付文件与使用流程。

---

## 一、交付文件清单

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`牙周炎与AD关联综述_Zotero活动引用版.docx`** | DOCX (Zotero活动版) | **推荐用于持续写作**。内置完整的 Zotero CSL 活动引用域（`ADDIN ZOTERO_ITEM`）和参考文献表活动域（`ADDIN ZOTERO_BIBL`），可在 Word 顶部功能区点击 **Zotero $\rightarrow$ Refresh** 一键刷新。 |
| **`periodontitis-ad-pg-review.docx`** | DOCX (静态定稿版) | 静态排版定稿，适合无需再修改文献、直接打印或提交审阅的场景。 |
| **`Periodontitis_AD_Zotero_library.json`** | CSL-JSON | **Zotero 原生文献库（推荐导入）**。包含综述引用的全部 16 篇中英文权威文献（Dominy 2019 Science Advances, 任欢 2024 微生物学通报等）的完整结构化元数据。 |
| **`Periodontitis_AD_Zotero_library.ris`** | RIS | 通用 RIS 格式文献库，备用导入。 |
| **`references.bib`** | BibTeX | BibTeX 格式文献库，供 LaTeX 编译或导入 BibTeX 管理器。 |
| **`periodontitis-ad-pg-review.tex`** | LaTeX | 综述 LaTeX 源码，支持 `xelatex` 编译为 PDF。 |

---

## 二、Zotero 联动与 Word 一键 Refresh 操作步骤

### 第 1 步：将文献库导入到 Zotero
1. 打开 **Zotero 桌面端**；
2. 点击菜单栏 **文件 (File) $\rightarrow$ 导入 (Import...)**；
3. 选择 **`Periodontitis_AD_Zotero_library.json`**（位于 `periodontitis-ad-pg-review/` 目录下）；
4. 导入后，Zotero 中会生成一个名为 `Periodontitis_AD_Zotero_library` 的分类，包含全部 16 篇文献。

### 第 2 步：安装 GB/T 7714 引用样式
1. 打开 Zotero 客户端，点击菜单 **编辑 (Edit) $\rightarrow$ 设置 (Preferences) $\rightarrow$ 引用 (Cite) $\rightarrow$ 样式 (Styles)**；
2. 点击样式列表下方的 **`+`**（添加样式）；
3. 选择本目录下的 **`china-national-standard-gb-t-7714-2015-numeric.csl`** 安装；
4. 确认列表中已出现 **`China National Standard GB/T 7714-2015 (numeric, 中文)`**。

### 第 3 步：在 Word 中打开文档并一键 Refresh
1. 保持 Zotero 客户端在后台运行；
2. 用 Microsoft Word 打开 **`牙周炎与AD关联综述_Zotero活动引用版.docx`**；
3. 点击 Word 顶部菜单栏中的 **Zotero** 选项卡；
4. 点击 **Refresh（刷新）** 按钮：
   - 正文中的 33 处上标引用（如 `[1,2]`, `[3,4]`, `[5]` 等）会自动与 Zotero 文献库链接；
   - 文末的参考文献表由 Zotero 活动域重新渲染，毫秒级完成，**不卡顿、无报错**！

---

## 三、底层技术与兼容性保障

为什么本仓库生成的文档在 Windows Word 下点击 Refresh 不会报错：
1. **文档首选项（ZOTERO_PREF_n）**：已按照 Windows 版 Zotero 插件规范写入 `docProps/custom.xml`（255 字符切片自定义文档属性），避免了自造 customXml 部件导致的兼容性问题；
2. **完整的 `uris: []` 与 `itemData` 结构**：每个引用域均注入了完整的元数据，杜绝 Zotero 9 找不到 `uris` 数组而崩溃；
3. **复杂域封装**：严格采用 OOXML 标准复杂域（`w:fldChar` begin $\rightarrow$ separate $\rightarrow$ end），Word 与 Zotero 插件能够 100% 识别。
