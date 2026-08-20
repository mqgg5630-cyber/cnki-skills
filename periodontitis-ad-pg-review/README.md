# 《牙周炎与阿尔茨海默病关联机制及牙龈卟啉单胞菌致病作用研究进展》

本目录包含一篇关于**牙周炎、阿尔茨海默病（AD）与牙龈卟啉单胞菌（*Porphyromonas gingivalis*, Pg）关联机制**的学术综述范例，完整演示了 **LaTeX 撰写 $\rightarrow$ GB/T 7714-2015 自动化引用 $\rightarrow$ Word (.docx) 导出** 的完整流水线。

---

## 目录结构

```text
periodontitis-ad-pg-review/
├── periodontitis-ad-pg-review.tex     # LaTeX 综述正文源码（含章节、图表与手工 bibitem 兜底）
├── references.bib                     # 严谨中英文权威文献 BibTeX 数据库
├── periodontitis-ad-pg-review.docx    # 自动编译生成的 Word 交付文档
├── china-national-standard-gb-t-7714-2015-numeric.csl  # GB/T 7714 顺序编码制样式
├── china-national-standard-gb-t-7714-2025-numeric.csl  # 2025 最新国标样式备选
├── strip-thebib.lua                   # Lua 过滤器：转 docx 时剔除手工 thebibliography
├── build.sh                           # Linux / macOS 一键构建脚本
├── build.ps1                          # Windows PowerShell 一键构建脚本
├── build.bat                          # Windows CMD 一键构建批处理
├── tools/
│   ├── bib2csljson.py                 # 将 .bib 转换为 CSL-JSON 并规范化标准/人名格式
│   └── postprocess_docx.py            # docx 格式后处理（字体设定与目录标签汉化）
└── README.md                          # 本说明文档
```

---

## 核心综述内容概览

1. **引言与流行病学关联背景**：
   - 传统 A$\beta$/Tau 假说面临的临床瓶颈与感染/免疫假说兴起；
   - 牙周炎造成的外周巨大溃疡创面与低度菌血症；
   - 10 年回顾性队列研究（$\text{HR} = 1.707$）、NHANES-III 纵向抗体研究及全球 Meta 分析（$\text{OR} = 2.98$）。
2. **牙龈卟啉单胞菌（*P. gingivalis*）核心生物学特性与四大毒力体系**：
   - 牙龈蛋白酶（Gingipains：RgpA/RgpB, Kgp）的强效水解与免疫逃逸；
   - 脂多糖（LPS）结构异质性与 TLR4/TLR2 调控；
   - 菌毛（Fimbriae：FimA, Mfa1）对血管内皮黏附侵袭；
   - 外膜囊泡（OMVs）作为天然纳米载体跨屏障转运。
3. **侵入中枢神经系统（CNS）的三大生物学通路**：
   - 通路一：血行播散与降解 ZO-1/Claudin-5 破坏血脑屏障（BBB）；
   - 通路二：单核/巨噬细胞介导的“特洛伊木马”细胞内寄生转运；
   - 通路三：三叉神经末梢摄取与轴突逆行轴浆运输。
4. **诱发阿尔茨海默病核心神经病理改变的分子网络**：
   - **A$\beta$ 级联反应**：上调 BACE1 与 $\gamma$-分泌酶，抗菌肽假说与老年斑沉积；
   - **Tau 蛋白异常修饰**：Gingipains 直接位点酶切 Tau 蛋白产生聚集片段，激活 GSK-3$\beta$ 诱发弥漫性过度磷酸化；
   - **神经炎症风暴**：LPS 激活 TLR4/NF-$\kappa$B 信号并组装 NLRP3 炎症小体，释放 IL-1$\beta$/TNF-$\alpha$ 引发小胶质细胞焦亡与氧化应激；
   - **突触损伤与凋亡**：降解 Synaptophysin 和 PSD-95，导致海马锥体神经元凋亡与认知障碍。
5. **外周系统性炎症的“二次打击”协同假说**：
   - 循环炎性细胞因子（TNF-$\alpha$, IL-6, CRP）跨脉络丛致敏中枢静息态小胶质细胞；
   - 外周--中枢免疫恶性正反馈循环。
6. **靶向干预策略与转化医学应用**：
   - 牙周系统基础治疗（SRP）改善认知指标与全身炎症水平；
   - 小分子牙龈蛋白酶抑制剂（COR388/Atuzaginstat）动物逆转及 GAIN 临床试验阳性亚群获益；
   - 靶向 RgpA/Kgp 亚单位疫苗与外膜囊泡免疫；
   - 唾液/龈沟液核酸与蛋白酶早期无创筛查生物标志物。

---

## 本地编译与构建方法

### 1. 依赖安装

```bash
# 安装 Python 依赖（推荐在 Anaconda / venv 环境中）
pip install pypandoc-binary python-docx
```

### 2. 一键编译生成 Word (.docx)

- **Windows PowerShell**:
  ```powershell
  cd E:\0writing\cnki-skills\periodontitis-ad-pg-review
  powershell -ExecutionPolicy Bypass -File .\build.ps1
  ```
- **Windows CMD**:
  ```cmd
  cd E:\0writing\cnki-skills\periodontitis-ad-pg-review
  build.bat
  ```
- **Linux / macOS**:
  ```bash
  cd periodontitis-ad-pg-review
  ./build.sh
  ```

### 3. LaTeX 编译生成 PDF（如本地安装了 TeX Live / MacTeX / MikTeX）

```bash
xelatex periodontitis-ad-pg-review.tex
bibtex periodontitis-ad-pg-review
xelatex periodontitis-ad-pg-review.tex
xelatex periodontitis-ad-pg-review.tex
```
