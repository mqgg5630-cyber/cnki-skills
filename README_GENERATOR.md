# 一键知网学术综述生成器 (CNKI Review Generator)

基于本仓库全部 10 个知网技能与 [Lark-Formatter](https://github.com/shaohuawen03-cyber/Lark-Formatter) 的 Zotero 活动引用规范，构建的**端到端一键学术综述生成应用**。

---

## 一、文献来源与学术权威性说明

本生成器输出的学术参考文献严格遵循 **GB/T 7714-2015** 与国际顶刊著录规范，文献数据来源包含两大支柱：
1. **中国知网（CNKI）核心收录**：
   - 包含知网收录的北大中文核心期刊、CSCD 核心库与国内口腔医学/微生物学顶级期刊（如《微生物学通报》、《国际口腔医学杂志》、《中华口腔医学杂志》、《上海口腔医学》、人卫版《牙周病学》教材等）；
2. **知网外文库与 CrossRef / PubMed 顶级期刊收录**：
   - 包含知网外文数据库索引的国际划时代突破文献（如发表在 *Science Advances* 的 Dominy et al. 2019 经典牙龈蛋白酶与小分子抑制剂论文、*Journal of Alzheimer's Disease*、*Alzheimer's & Dementia*、*PLoS ONE* 等）；
3. **全要素结构化元数据**：
   - 每篇文献均具备精准的作者、中英文篇名、刊名、年卷期、起止页码与 DOI 标识，并同步导出为 Zotero 原生 CSL-JSON 与 RIS 数据库。

---

## 二、安装全新的 Conda 独立运行环境

为避免与其他项目的 Python 依赖冲突，推荐创建一个全新的 Conda 独立环境 `cnki-review`。

### 方式 1：Windows 一键安装脚本
在 PowerShell 中运行：
```powershell
powershell -ExecutionPolicy Bypass -File .\install_conda_env.ps1
```
或者双击运行 `install_conda_env.bat`。

### 方式 2：手动 Conda 命令行安装
```powershell
# 1. 根据配置文件创建全新环境
conda env create -f environment.yml

# 2. 激活新环境
conda activate cnki-review
```

---

## 三、一键生成综述

### 1. 命令行直接生成
```powershell
# 在 cnki-review 环境下运行
python generate_review.py --topic "牙周炎 AD 牙龈卟啉单胞菌"
```

### 2. 一键脚本运行
```powershell
.\run_generator.ps1 -Topic "牙周炎 AD 牙龈卟啉单胞菌"
```

---

## 四、全套交付产物与 Zotero 联动

生成器运行后将自动生成并校验以下 4 大产物：

| 产物文件 | 格式说明 | 核心价值 |
| :--- | :--- | :--- |
| **`periodontitis-ad-pg-review.docx`** | DOCX (Zotero 活动版) | **主交付文档**。正文 7 个章节、三线机制表、目录域，正文 33 处上标引用已注入 Zotero 活动引用域，支持在 Word/WPS 中点击 **Zotero $\rightarrow$ Refresh** 一键刷新。 |
| **`Periodontitis_AD_Zotero_library.json`** | CSL-JSON | **Zotero 原生文献库**。在 Zotero 中点击 **文件 $\rightarrow$ 导入** 即可一键导入全部 16 篇文献。 |
| **`Periodontitis_AD_Zotero_library.ris`** | RIS | 通用文献管理库，兼容 EndNote、Mendeley、NoteExpress。 |
| **`periodontitis-ad-pg-review.tex`** | LaTeX 源码 | 基于 `ctexart` 宏包，支持 `xelatex` 编译为印刷级 PDF。 |
