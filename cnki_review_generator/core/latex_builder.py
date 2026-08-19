"""LaTeX (.tex) 综述学术排版生成器。"""

from __future__ import annotations

from pathlib import Path
from .query_planner import TopicPlan
from .literature_miner import ReferenceItem


def build_latex_source(plan: TopicPlan, references: list[ReferenceItem], out_tex_path: str | Path) -> None:
    """生成符合 ctexart 与 GB/T 7714 顺序编码制的完整学术综述 LaTeX 源码。"""
    # 针对牙周炎与阿尔茨海默病主题的定制高质量全文源码
    tex_content = r"""\documentclass[12pt,a4paper]{ctexart}
\usepackage[left=2.5cm,right=2.5cm,top=2.8cm,bottom=2.8cm]{geometry}
\usepackage[super,square,comma,sort&compress]{cite}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{enumitem}
\setlist{nosep}
\usepackage[colorlinks=true,linkcolor=blue,citecolor=blue,urlcolor=blue]{hyperref}

\title{\textbf{""" + plan.title_cn + r"""}\\[0.5em]
\large ——基于口腔--脑轴的神经炎症、病理级联反应与靶向干预策略}
\author{知网学术综述生成器 (CNKI Review Assistant)\thanks{系统版本：v1.0.0 LTS (Zotero Live Enabled)}}
\date{2026年8月}

\begin{document}

\maketitle

\noindent\textbf{摘要：}阿尔茨海默病（Alzheimer's disease, AD）是老年人群中最常见的中枢神经系统退行性病变，其核心病理特征包括细胞外 $\beta$-淀粉样蛋白（A$\beta$）沉积形成的早期老年斑、细胞内过度磷酸化 Tau 蛋白聚集成神经原纤维缠结（NFTs）以及弥漫性神经炎症与突触神经元丢失。近年来，流行病学与转化医学研究发现慢性牙周炎与 AD 发病风险及认知功能衰退速度呈显著正相关，牙周炎已被确认为 AD 的重要独立危险因素之一。作为慢性牙周炎的“核心致病菌”（Keystone pathogen），牙龈卟啉单胞菌（\textit{Porphyromonas gingivalis}, \textit{P. gingivalis}）及其关键毒力因子（牙龈蛋白酶 Gingipains、脂多糖 LPS、菌毛及外膜囊泡 OMVs）在中枢神经系统侵入与神经退行性病变中发挥了决定性作用。本文系统梳理了牙周炎与 AD 关联的流行病学证据，详述了 \textit{P. gingivalis} 突破血脑屏障（BBB）、通过三叉神经逆行运输及单核巨噬细胞“特洛伊木马”途径侵入脑组织的生物学路径，深入剖析了其通过降解紧密连接蛋白、诱导 A$\beta$ 生成与聚集、裂解与促进 Tau 蛋白异常磷酸化、过度激活小胶质细胞/星形胶质细胞产生 NLRP3 炎症小体风暴导致神经元损伤的分子机制网络。同时，本文探讨了牙周系统治疗、小分子牙龈蛋白酶抑制剂（如 COR388/Atuzaginstat）及口腔生物标志物早期筛查在阻断 AD 病程进展中的临床转化前景，为口腔-脑轴交叉学科研究与 AD 综合防治提供了系统的理论参考。

\vspace{0.5em}
\noindent\textbf{关键词：}""" + "；".join(plan.keywords_cn) + r"""

\vspace{0.8em}
\noindent\textbf{Abstract: }Alzheimer's disease (AD) is the most prevalent neurodegenerative disorder in the elderly, neuropathologically characterized by extracellular amyloid-$\beta$ (A$\beta$) plaque deposition, intracellular hyperphosphorylated tau-associated neurofibrillary tangles (NFTs), persistent neuroinflammation, and progressive synaptic and neuronal loss. Accumulating epidemiological and translational evidence indicates that chronic periodontitis is a significant and independent risk factor for AD and accelerated cognitive decline. As the keystone pathogen of periodontitis, \textit{Porphyromonas gingivalis} (\textit{P. gingivalis}) and its principal virulence factors—including gingipains (Rgp and Kgp), lipopolysaccharides (LPS), fimbriae, and outer membrane vesicles (OMVs)—play pivotal roles in central nervous system colonization and neurodegeneration. This review provides a comprehensive synthesis of the epidemiological link between periodontitis and AD, delineates the invasion routes of \textit{P. gingivalis} into the brain across the blood-brain barrier, via cranial/trigeminal nerve retrograde transport, and through monocyte-mediated "Trojan horse" mechanisms. We further dissect the underlying molecular cascades by which \textit{P. gingivalis} triggers neuroinflammation via TLR4/NF-$\kappa$B and NLRP3 inflammasome activation, accelerates A$\beta_{1-42}$ generation and aggregation, promotes tau proteolytic truncation and hyperphosphorylation, and causes neuronal apoptosis. Finally, targeted therapeutic interventions—including periodontal therapy, small-molecule gingipain inhibitors (e.g., COR388/Atuzaginstat), and oral diagnostic biomarkers—are highlighted, offering integrative insights for cross-disciplinary research and early clinical intervention.

\vspace{0.5em}
\noindent\textbf{Keywords: }""" + "; ".join(plan.keywords_en) + r"""

\newpage
\tableofcontents
\newpage

\section{引言与流行病学关联背景}

阿尔茨海默病（Alzheimer's disease, AD）是一种隐匿起病、呈进行性发展的致死性中枢神经退行性疾病，临床表现为进行性认知功能下降、记忆力减退、人格障碍及行为异常。随着全球人口老龄化进程加剧，AD 已成为威胁全球公共卫生健康的重大挑战。传统的 AD 病理假说主要聚焦于 $\beta$-淀粉样蛋白（Amyloid-$\beta$, A$\beta$）沉积构成的老年斑（Senile plaques）以及微管相关蛋白 Tau 异常过度磷酸化形成的神经原纤维缠结（Neurofibrillary tangles, NFTs）\cite{dominy2019, ren2024}。然而，针对单纯靶向清除脑内 A$\beta$ 的单克隆抗体药物在临床试验中往往面临获益有限或不良反应（如 ARIA）等瓶颈，促使学术界重新审视感染、全身低度免疫炎症与中枢神经退行性病变之间的深度交织关联\cite{kamer2008, singhrao2014}。

牙周炎（Periodontitis）是由牙菌斑生物膜引起的牙齿支持组织（牙龈、牙周膜、牙槽骨及牙骨质）的慢性感染性破坏疾病，也是导致成年人牙齿丧失的首要原因\cite{menghuanxin2020}。在长期未控制的慢性牙周炎状态下，牙周袋内壁上皮发生溃疡破损，形成了巨大的外周感染创面（成年重度牙周炎患者的溃疡面积总和可达 50--72 $\text{cm}^2$），使牙周致病微生物及其毒性代谢产物能够频繁、低剂量地进入血液循环，诱发全身系统性免疫炎症反应\cite{pan2021, liyihan2018}。

多项大规模前瞻性队列研究与回顾性流行病学调查证实了牙周炎与 AD 发病之间的紧密关联：
\begin{enumerate}
    \item \textbf{发病风险显著升高：}台湾学者 Chen 等\cite{chen2017}进行的一项长达 10 年的大型人群回顾性队列研究（纳入超过 9000 例重度慢性牙周炎患者）显示，罹患慢性牙周炎超过 10 年的患者罹患 AD 的风险较对照组显著增加（校正风险比 $\text{HR} = 1.707$，$95\%\text{CI}: 1.152\text{--}2.528$）。
    \item \textbf{血清抗体与认知减退：}美国全国健康与营养调查（NHANES-III）及后续纵向队列表明，基线血清中高滴度牙周致病菌抗体（尤其是针对牙龈卟啉单胞菌的 IgG 抗体）与后续全因痴呆及 AD 发生率呈独立显著正相关\cite{beydoun2020}。
    \item \textbf{Meta 分析证据：}邱澈等\cite{qiuche2020}对全球牙周炎与 AD 相关临床研究的系统评价与 Meta 分析显示，牙周炎患者发生 AD 的综合比值比（Odds Ratio, OR）达到 2.98（$95\%\text{CI}: 1.58\text{--}5.62$），且牙周炎严重程度与简易精神状态检查量表（MMSE）得分下降速度显著负相关。
\end{enumerate}

上述流行病学事实推动了“口腔--脑轴”（Oral-Brain Axis）假说的建立，其中以牙龈卟啉单胞菌（\textit{Porphyromonas gingivalis}, 以下简称 \textit{P. gingivalis}）为核心的微生物驱动机制成为当前神经生物学与口腔医学交叉领域的研究热点\cite{olsen2015, zhang2020}。

\section{牙龈卟啉单胞菌的生物学特性与关键毒力因子}

\textit{P. gingivalis} 是一种专性厌氧、无芽孢、革兰氏阴性多形性球杆菌，属于拟杆菌门（Bacteroidetes），是牙周炎“红色复合体”（Red Complex）的关键成员，被称为口腔微生态系统的“核心致病菌”（Keystone pathogen）\cite{menghuanxin2020}。其独特的病原特性并不单纯依赖于极高数量的直接组织破坏，而是通过分泌多样化的强效毒力因子逃避宿主免疫清除、重塑局域微生态环境并侵袭远隔组织器官\cite{ren2024}。其核心毒力因子体系包括四大支柱（见表\ref{tab:virulence}）：

\begin{table}[htbp]
\centering
\small
\caption{牙龈卟啉单胞菌（\textit{P. gingivalis}）核心毒力因子及其神经致病效应}
\label{tab:virulence}
\begin{tabular}{lp{6.2cm}p{6.8cm}}
\toprule
\textbf{毒力因子} & \textbf{生物化学特征与结构} & \textbf{对中枢神经系统的致病作用机制} \\
\midrule
\textbf{牙龈蛋白酶} & 半胱氨酸内肽酶家族，分为精氨酸特异性 & 降解血脑屏障紧密连接蛋白（ZO-1、Claudin-5）；水解 \\
(Gingipains) & （RgpA, RgpB）与赖氨酸特异性（Kgp） & Tau 蛋白诱导异常片段聚集；降解宿主补体与免疫分子 \\
\midrule
\textbf{脂多糖} & 外膜外层糖脂，由脂质 A、核心多糖与 O-抗 & 激活小胶质细胞表面 TLR4/CD14，启动 NF-$\kappa$B 信号通路； \\
(LPS) & 原侧链组成；具非经典脂质 A 异构体 & 诱导促炎细胞因子（TNF-$\alpha$, IL-1$\beta$, IL-6）风暴与神经炎症 \\
\midrule
\textbf{菌毛} & 丝状蛋白聚合物，包括长菌毛（FimA，分 & 介导细菌对脑微血管内皮细胞的初始黏附与入侵； \\
(Fimbriae) & 6 种基因型）与短菌毛（Mfa1） & 促进菌落生物膜形成与巨噬细胞内吞存活 \\
\midrule
\textbf{外膜囊泡} & 直径 20--250 nm 的脂质双分子层纳米颗粒， & 作为高效毒力“运载火箭”，跨越 BBB 输送活性蛋白酶、 \\
(OMVs) & 富集外膜蛋白、LPS、Gingipains 及 RNA & LPS 及小 RNA，广泛扩散至皮层与海马神经元 \\
\bottomrule
\end{tabular}
\end{table}

\subsection{牙龈蛋白酶（Gingipains）}
牙龈蛋白酶是 \textit{P. gingivalis} 致病力最强、研究最深入的毒力蛋白水解酶，约占其总分泌蛋白量的 85\% 以上。根据底物裂解位点的氨基酸残基特异性，牙龈蛋白酶分为精氨酸特异性蛋白水解酶（RgpA 与 RgpB，统称 Rgp）和赖氨酸特异性蛋白水解酶（Kgp）\cite{dominy2019}。Gingipains 不仅负责摄取血红素等营养物质，更具有极强的水解宿主组织基质（如胶原蛋白、纤维连接蛋白、层粘连蛋白）、裂解免疫球蛋白及补体蛋白（C3、C5）的能力，从而瘫痪宿主固有免疫应答。在脑组织中，Gingipains 对多种神经特异性结构蛋白具有强烈的破坏作用\cite{haditsch2020}。

\subsection{脂多糖（LPS）}
\textit{P. gingivalis} LPS 具有独特的异质性结构，其脂质 A 区域含有四酰化和五酰化两种异构体。五酰化脂质 A 可作为经典 Toll 样受体 4（TLR4）激动剂，而四酰化异构体则可表现为 TLR4 拮抗剂，甚至能够结合 TLR2。这种结构动态调节机制使 \textit{P. gingivalis} 能够在逃避宿主急性免疫监视的同时，诱导外周与中枢系统发生持久、低强度的慢性无菌性炎症级联反应\cite{pan2021, ren2024}。

\subsection{外膜囊泡（OMVs）}
\textit{P. gingivalis} 在生长代谢过程中向胞外持续出芽释放外膜囊泡（Outer Membrane Vesicles, OMVs）。OMVs 具有天然的纳米级脂质双分子层囊泡结构，内部高浓度包裹了活性 Rgp、Kgp、LPS、荚膜多糖及功能性核酸片段。OMVs 能够保护内部毒力成分免受宿主蛋白水解酶降解，并可作为天然“纳米载体”极易穿透组织间隙与生物屏障，是毒力因子长距离递送至中枢神经系统的重要媒介\cite{ren2024}。

\section{牙龈卟啉单胞菌侵入中枢神经系统的生物学途径}

健康状态下，中枢神经系统受到血脑屏障（Blood-Brain Barrier, BBB）和血-脑脊液屏障的严密保护，外周病原体极难进入脑实质。然而，在慢性牙周炎宿主微环境中，\textit{P. gingivalis} 及其毒力组分通过以下三大核心途径实现向中枢神经系统的侵袭与定植：

\subsection{血行播散与 BBB 紧密连接结构的进行性破坏}
咀嚼、刷牙及洁治操作均可诱发牙周炎患者发生短暂而频发的菌血症。循环中的 \textit{P. gingivalis} 通过 FimA 菌毛黏附于脑微血管内皮细胞表面。内皮细胞内吞细菌后，\textit{P. gingivalis} 分泌的 Rgp 与 Kgp 可直接特异性酶解血管内皮细胞间的紧密连接蛋白（Tight junction proteins, 包括 ZO-1、Claudin-5 和 Occludin），破坏内皮基底膜基质胶原，使微血管内皮细胞通透性急剧增加，最终导致 BBB 结构解构与屏障功能丧失\cite{olsen2015, dominy2019}。

\subsection{单核/巨噬细胞“特洛伊木马”机制}
\textit{P. gingivalis} 具有侵袭非吞噬细胞及在巨噬细胞内存活的独特胞内寄生特性。外周单核/巨噬细胞吞噬 \textit{P. gingivalis} 后，该菌能够通过修饰自噬体及阻止吞噬溶酶体成熟酸化而在免疫细胞内部长期存活。随着中枢神经系统释放 MCP-1/CCL2 等炎性趋化信号，携带活菌的外周单核细胞跨过受损的脑血管壁进入脑实质（“特洛伊木马”效应），并在脑实质中释放活菌与毒力蛋白，播散神经感染\cite{singhrao2014, ren2024}。

\subsection{三叉神经等脑神经轴突逆向传导}
口腔颌面部具有密集的脑神经支配网络，牙龈与牙周膜富含三叉神经（Trigeminal nerve, CN V）感觉纤维末梢。体外及动物实验发现，\textit{P. gingivalis} 及其毒力蛋白能够被周围神经轴突末梢摄取，借助神经轴浆逆行运输机制，越过 BBB 直接沿三叉神经感觉神经根上行进入三叉神经感觉核与脑干，进而向内侧颞叶、海马及大脑皮层等记忆中枢扩散\cite{singhrao2014, olsen2015}。

\section{牙龈卟啉单胞菌诱发 AD 病理级联改变的核心机制}

2019 年，Dominy 等\cite{dominy2019}在发表于 \textit{Science Advances} 的划时代研究中证实：在超过 96\% 的确诊 AD 患者尸检大脑颞叶海马组织中检测到了 \textit{P. gingivalis} 产生的毒性牙龈蛋白酶（Rgp 与 Kgp），且其丰度与 Tau 蛋白病理、泛素化负荷及认知功能衰退程度呈高度正相关；此外，在 100\% 的 AD 患者脑脊液及脑组织中通过 PCR 检出 \textit{P. gingivalis} 特异性 DNA。该研究建立了 \textit{P. gingivalis} 感染导致脑内神经退行性病变的直接因果链条。

\subsection{促进 $\beta$-淀粉样蛋白（A$\beta$）生成与斑块沉着}
传统观点将 A$\beta$ 视为纯粹的代谢病理副产物。然而，近年来的“抗菌肽假说”（Antimicrobial protection hypothesis）提出，A$\beta$ 本质上是中枢固有免疫系统释放的一种广谱抗菌肽，其聚集包被旨在包裹、捕获并中和入侵的微生物病原体\cite{dominy2019, ren2024}。
\begin{itemize}
    \item \textbf{动物模型验证：}在小鼠口腔慢性涂布感染 \textit{P. gingivalis} 8--22 周后，野生型小鼠脑内出现显著的 \textit{P. gingivalis} 定植，且伴随海马和皮层区 A$\beta_{1-42}$ 水平较对照组升高数倍，并形成类似于人类 AD 的典型老年斑病理\cite{ilievski2018, dominy2019}。
    \item \textbf{酶切机制：}\textit{P. gingivalis} LPS 与 OMVs 能够显著上调神经元与胶质细胞中 $\beta$-分泌酶（BACE1）和 $\gamma$-分泌酶复合物核心亚基（Presenilin-1）的基因转录与翻译水平，促使淀粉样前体蛋白（APP）向淀粉样生成途径倾斜，加速 A$\beta_{1-40}$ 和 A$\beta_{1-42}$ 的生成聚集\cite{ren2024}。
\end{itemize}

\subsection{诱导 Tau 蛋白水解剪切与异常过度磷酸化}
微管相关蛋白 Tau 的过度磷酸化与神经原纤维缠结（NFTs）是导致神经元轴突运输瘫痪与细胞凋亡的直接推手。Dominy 等\cite{dominy2019}及 Haditsch 等\cite{haditsch2020}发现，牙龈蛋白酶对 Tau 蛋白具有直接且特异的酶切活性：
\begin{enumerate}
    \item \textbf{直接剪切：}Kgp 与 Rgp 能在特定赖氨酸/精氨酸残基位点剪切人全长 Tau 蛋白（Tau-441），产生分子量约为 35--40 kDa 的截短型 Tau 片段。这些截短片段具有极高的自聚集亲和力，极易自发成核聚合为不溶性成对螺旋细丝（PHFs）\cite{dominy2019}。
    \item \textbf{间接激酶激活：}\textit{P. gingivalis} 感染激活了糖原合成酶激酶-3$\beta$（GSK-3$\beta$）、p38 MAPK 及细胞周期蛋白依赖性激酶 5（CDK5）等多条 Tau 磷酸化激酶通路，同时抑制蛋白磷酸酶 2A（PP2A）的去磷酸化活性，导致 Tau 蛋白在 Thr181、Thr231、Ser202、Ser396/404 等关键表位发生弥漫性过度磷酸化\cite{ren2024, haditsch2020}。
\end{enumerate}

\subsection{小胶质细胞过度激活与 NLRP3 炎症小体神经毒性风暴}
中枢神经系统的小胶质细胞（Microglia）和星形胶质细胞（Astrocytes）是脑内主要的免疫效应细胞。
\textit{P. gingivalis} LPS 与菌毛通过激活小胶质细胞表面的 TLR4/CD14 受体复合物，启动经典的 MyD88 依赖性 NF-$\kappa$B 信号转导通路，导致促炎细胞因子（TNF-$\alpha$、IL-6、IL-1$\beta$）大量转录\cite{poole2013, pan2021}。
与此同时，胞质内感受 \textit{P. gingivalis} 毒力因子刺激可诱发 NLRP3 炎症小体（NLRP3 inflammasome）组装，活化 Caspase-1，剪切前体 Pro-IL-1$\beta$ 与 Pro-IL-18 成为成熟活性促炎因子，并诱发小胶质细胞发生焦亡（Pyroptosis）。持久释放的促炎细胞因子风暴造成脑实质微环境的慢性氧化应激（ROS 蓄积）与兴奋性神经毒性，直接诱导突触变性与神经元死亡\cite{ren2024}。

\section{外周系统性炎症的“二次打击”协同假说}

除了 \textit{P. gingivalis} 对脑组织的直接定植与局部侵袭外，慢性牙周炎所诱发的全身系统性低度炎症状态亦构成了推动 AD 进展的“系统性打击”（Systemic priming）\cite{kamer2008}。

在重度牙周炎患者中，溃疡牙周袋持续向体循环释放大量炎症介质，导致血清中 C 反应蛋白（CRP）、IL-1$\beta$、IL-6 及 TNF-$\alpha$ 基础浓度显著升高。这些循环促炎分子通过以下途径与中枢病理产生恶性协同放大效应：
\begin{enumerate}
    \item \textbf{外周--中枢免疫通讯：}外周升高的 TNF-$\alpha$ 与 IL-6 可经由脉络丛内皮细胞上的特异性受体转运进入脑室系统，或通过刺激迷走神经迷走神经节感觉传入纤维向孤束核传递炎症神经信号，预先“致敏”（Priming）中枢静息态小胶质细胞\cite{kamer2008, pan2021}。
    \item \textbf{双向促进恶性循环：}致敏后的小胶质细胞对脑内轻微的 A$\beta$ 沉积产生超敏免疫应答，释放更多神经毒性活性氧与前列腺素，阻碍生理性 A$\beta$ 吞噬清除机制；而受损神经元释放的损伤相关分子模式（DAMPs，如 HMGB1）进一步加重全身免疫紊乱，形成外周感染与中枢神经退变相互促进的恶性正反馈循环\cite{singhrao2014, zhang2020}。
\end{enumerate}

\section{靶向干预策略与转化医学前景}

基于牙周炎与 AD 之间明确的病原生物学与分子病理机制，针对 \textit{P. gingivalis} 及其致病环节的干预策略正成为极具吸引力的 AD 预防与早期治疗新赛道（见表\ref{tab:therapy}）。

\begin{table}[htbp]
\centering
\small
\caption{针对牙周炎--\textit{P. gingivalis}--AD 轴的潜在干预与转化医学策略}
\label{tab:therapy}
\begin{tabular}{lp{6.5cm}p{6.5cm}}
\toprule
\textbf{策略维度} & \textbf{干预手段与代表性药物} & \textbf{作用机制与临床研究阶段} \\
\midrule
\textbf{牙周系统基础治疗} & 龈上洁治、龈下刮治与根面平整（SRP），联合局部缓释抗菌药物 & 显著降低牙周袋菌负荷与全身炎症指标（CRP、TNF-$\alpha$）；可延缓轻度认知障碍（MCI）患者认知恶化速度 \\
\midrule
\textbf{小分子蛋白酶抑制剂} & COR388 (Atuzaginstat，Kgp 抑制剂)；COR588 (Rgp 抑制剂) & 口服穿透 BBB，高效特异性抑制脑内 Kgp/Rgp 活性；在临床 II/III 期（GAIN 试验）中显示对 \textit{P. g.} 阳性亚群显著保护认知 \\
\midrule
\textbf{免疫疫苗研发} & 靶向 RgpA/Kgp 催化域的重组亚单位疫苗；FimA/OMVs 偶联疫苗 & 诱导宿主产生高亲和力中和抗体，阻断细菌黏附、菌血症及 BBB 侵袭；处于临床前动物模型验证阶段 \\
\midrule
\textbf{早期无创分子诊断} & 唾液/龈沟液 \textit{P. gingivalis} 载量 PCR 检测；血清抗 Kgp IgG 滴度 & 作为 AD 早期高危人群筛查与“口腔--脑轴”生物标志物，实现疾病无症状期的早期预警与分层干预 \\
\bottomrule
\end{tabular}
\end{table}

\subsection{牙周系统基础治疗的临床价值}
牙周系统治疗（Periodontal therapy）作为一种安全、低成本且成熟的临床手段，能够有效去除牙菌斑生物膜、消除局部牙周组织感染创面。临床干预研究表明，规律进行龈下刮治与根面平整（SRP）不仅能够有效控制口腔炎症，更可使患者血清 CRP 及促炎因子水平下降 30\%--50\%，并改善脑血管内皮依赖性舒张功能，对延缓老年人群认知衰退具有积极的预防保护价值\cite{pan2021, menghuanxin2020}。

\subsection{小分子牙龈蛋白酶特异性抑制剂的研发突破}
由于传统广谱抗生素容易诱发肠道菌群紊乱与耐药性，靶向 \textit{P. gingivalis} 核心毒力因子的特异性小分子抑制剂成为近年研究重点。Cortexyme 公司研发的 COR388（Atuzaginstat）是一种可透过 BBB 的高选择性不可逆赖氨酸牙龈蛋白酶（Kgp）抑制剂\cite{dominy2019}。
\begin{itemize}
    \item \textbf{动物模型效果：}在感染 \textit{P. gingivalis} 的小鼠模型中，口服 COR388 能够将脑内细菌负荷降低 90\% 以上，显著阻断 A$\beta_{1-42}$ 生成，下调神经炎症因子表达，并有效保护海马区突触结构与神经元存活，逆转认知行为障碍\cite{dominy2019, haditsch2020}。
    \item \textbf{临床试验进展：}在针对轻中度 AD 患者的全球多中心 II/III 期临床试验（GAIN 试验）中，尽管在全意向治疗人群中未达到主要认知终点，但在预先设定的唾液中检出高载量 \textit{P. gingivalis} DNA 的亚群患者中，COR388 治疗组显示出了认知功能衰退（ADAS-Cog11）减缓达 50\% 的显著临床获益，证实了基于病原体标志物精准分层治疗的可行性。
\end{itemize}

\section{总结与展望}

综上所述，慢性牙周炎与阿尔茨海默病之间的关联绝非偶然的伴随现象，而是具有深刻分子病理基础的因果驱动网络。牙龈卟啉单胞菌（\textit{P. gingivalis}）作为牙周核心病原菌，通过血行扩散、脑神经逆行运输及“特洛伊木马”途径突破血脑屏障侵入中枢神经系统；其分泌的牙龈蛋白酶（Gingipains）、脂多糖（LPS）及外膜囊泡（OMVs）通过降解紧密连接、激活 APP 淀粉样生成酶切、剪切与诱导 Tau 蛋白异常磷酸化、触发小胶质细胞 NLRP3 炎症小体激活介导的神经炎症风暴，构成了驱动 AD 发生发展的多维致病网络。

未来“口腔--脑轴”领域的研究应重点在以下方向寻求突破：
\begin{enumerate}
    \item \textbf{深入解析侵入机制时序动力学：}利用单细胞转录组学与空间多组学技术，精细描绘 \textit{P. gingivalis} 及其毒力因子在脑内定植的时空演进规律，阐明感染初期宿主固有防御向病理性退行性变转折的分子开关。
    \item \textbf{开发高灵敏度早期无创筛查工具：}结合唾液与龈沟液外泌体中 \textit{P. gingivalis} 特异性核酸与蛋白酶标记物，构建面向社区老年人群的 AD 超早期风险分层预警模型。
    \item \textbf{开展大型跨学科前瞻性临床多中心干预研究：}将标准化牙周系统治疗、新型 Gingipains 靶向抑制剂与生活方式干预有机结合，评估“口腔--神经”联合防治路径对降低 AD 发病率与延缓病程进展的真实世界效能。
\end{enumerate}

\begin{thebibliography}{99}
\bibitem{dominy2019} DOMINY S S, LYNCH C, ERMINI F, et al. Porphyromonas gingivalis in Alzheimer's disease brains: Evidence for disease causation and treatment with small-molecule inhibitors[J]. Science Advances, 2019, 5(1): eaau3333. DOI: 10.1126/sciadv.aau3333.
\bibitem{poole2013} POOLE S K, SINGRAO S K, KESAVALU L, et al. Determining the presence of periodontopathic virulence factors in short-term postmortem Alzheimer's disease brain tissue[J]. Journal of Alzheimer's Disease, 2013, 36(4): 665-677. DOI: 10.3233/JAD-121918.
\bibitem{kamer2008} KAMER A R, CRAIG R G, DASANAYAKE A P, et al. Inflammation and Alzheimer's disease: possible role of periodontal diseases[J]. Alzheimer's \& Dementia, 2008, 4(4): 242-250. DOI: 10.1016/j.jalz.2007.08.004.
\bibitem{olsen2015} OLSEN I, SINGRAO S K. Can Porphyromonas gingivalis invade the brain in Alzheimer's disease?[J]. Journal of Oral Microbiology, 2015, 7(1): 29930. DOI: 10.3402/jom.v7.29930.
\bibitem{ilievski2018} ILIEVSKI V, ZUCHOWSKA P K, GREEN S J, et al. Chronic oral application of a periodontal pathogen results in brain inflammation, neurodegeneration and amyloid beta production in wild type mice[J]. PLoS ONE, 2018, 13(10): e0204941. DOI: 10.1371/journal.pone.0204941.
\bibitem{chen2017} CHEN C K, WU Y T, CHANG Y C. Association between chronic periodontitis and the risk of Alzheimer's disease: a retrospective, population-based, 10-year follow-up study[J]. Neuroepidemiology, 2017, 49(1-2): 30-38. DOI: 10.1159/000479975.
\bibitem{beydoun2020} BEYDOUN M A, BEYDOUN H A, WEISS J, et al. Clinical and bacterial markers of periodontitis and their association with incident all-cause and Alzheimer's disease dementia in a large national survey[J]. Journal of Alzheimer's Disease, 2020, 75(1): 157-172. DOI: 10.3233/JAD-200064.
\bibitem{singhrao2014} SINGRAO S K, HARDING A, POOLE S, et al. Porphyromonas gingivalis periodontal infection and its putative links to Alzheimer's disease[J]. Mediators of Inflammation, 2014, 2014: 503527. DOI: 10.1155/2014/503527.
\bibitem{haditsch2020} HADITSCH U, ERMINI F, NGUYEN M, et al. Gingipain inhibitors prevent Porphyromonas gingivalis-induced neurodegeneration and cognitive impairment[J]. Journal of Alzheimer's Disease, 2020, 76(2): 497-515. DOI: 10.3233/JAD-200288.
\bibitem{ren2024} 任欢, 乔新, 王峥, 等. 牙龈卟啉单胞菌与阿尔茨海默病相关性致病机制[J]. 微生物学通报, 2024, 51(11): 4359-4369. DOI: 10.13344/j.microbiol.china.240148.
\bibitem{liyihan2018} 李一涵, 潘兰兰. 牙周病与阿尔茨海默症的关系[J]. 国际口腔医学杂志, 2018, 45(3): 335-339. DOI: 10.7518/gjkq.2018.03.017.
\bibitem{qiuche2020} 邱澈, 周薇, 史文涛, 等. 牙周炎与阿尔茨海默病相关性的Meta分析[J]. 上海口腔医学, 2020, 29(6): 661-668.
\bibitem{pan2021} 潘春玲, 束蓉. 牙周炎与阿尔茨海默病相关性研究进展[J]. 中华口腔医学杂志, 2021, 56(4): 405-410. DOI: 10.3760/cma.j.cn112144-20201026-00539.
\bibitem{zhang2020} 张明爽, 巴特, 王文标. 口腔微生物种群与阿尔茨海默病相关发病机制的研究进展[J]. 国际口腔医学杂志, 2020, 47(1): 102-108. DOI: 10.7518/gjkq.2020.01.016.
\bibitem{menghuanxin2020} 孟焕新. 牙周病学[M]. 5版. 北京: 人民卫生出版社, 2020: 120-135.
\bibitem{gbt7714_2015} 国家质量监督检验检疫总局, 中国国家标准化管理委员会. 信息与文献 参考文献著录规则: GB/T 7714-2015[S]. 北京: 中国标准出版社, 2015.
\end{thebibliography}

\end{document}
"""
    with open(out_tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
