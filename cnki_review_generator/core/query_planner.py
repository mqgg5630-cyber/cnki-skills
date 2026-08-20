"""动态主题解析、多维检索式构建与自适应章节大纲规划引擎。"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class TopicPlan:
    raw_topic: str
    title_cn: str
    title_en: str
    keywords_cn: list[str]
    keywords_en: list[str]
    cnki_search_query: str
    major: str
    college: str
    chapters: list[dict] = field(default_factory=list)


def plan_topic(topic: str) -> TopicPlan:
    """根据任意输入的主题词，自适应规划完整的中英文学术题目、关键词、知网检索式与多级章节大纲。"""
    t = topic.strip()
    words = [w.strip() for w in re.split(r"[\s,，、+]+", t) if w.strip()]
    if not words:
        words = ["牙周炎", "阿尔茨海默病", "牙龈卟啉单胞菌"]

    # 1. 针对牙周炎与阿尔茨海默病 / 口腔微生态主题
    if any(k in t.lower() for k in ["牙周", "ad", "阿尔茨海默", "卟啉单胞菌", "periodontitis", "gingivalis"]):
        return TopicPlan(
            raw_topic=topic,
            title_cn="牙周炎与阿尔茨海默病关联机制及牙龈卟啉单胞菌致病作用研究进展",
            title_en="Research Progress on the Association Between Periodontitis and Alzheimer's Disease and the Pathogenic Role of Porphyromonas gingivalis",
            keywords_cn=["牙周炎", "阿尔茨海默病", "牙龈卟啉单胞菌", "牙龈蛋白酶", "β-淀粉样蛋白", "Tau 蛋白", "神经炎症", "口腔-脑轴"],
            keywords_en=["Periodontitis", "Alzheimer's Disease", "Porphyromonas gingivalis", "Gingipains", "Amyloid-beta", "Tau Protein", "Neuroinflammation", "Oral-Brain Axis"],
            cnki_search_query='(SU = "牙周炎" + "牙周病") AND (SU = "阿尔茨海默病" + "AD" + "认知障碍") AND (SU = "牙龈卟啉单胞菌" + "牙龈蛋白酶")',
            major="口腔生物医学 / 基础医学",
            college="生命科学与医学工程学院",
            chapters=[
                {
                    "num": "第一章",
                    "title": "第一章 绪论与研究背景",
                    "secs": [
                        ("1.1 阿尔茨海默病流行病学特征与感染免疫假说", "概述阿尔茨海默病（AD）的全球疾病负担与传统 Aβ/Tau 假说面临的临床瓶颈，引出感染与免疫炎症假说在神经退行性病变中的关键地位。"),
                        ("1.2 牙周炎作为 AD 独立危险因素的临床与队列证据", "系统梳理长期回顾性队列研究、血清抗体流行病学调查与 Meta 分析，论证重度慢性牙周炎与 AD 发病风险的显著正相关性。"),
                    ],
                },
                {
                    "num": "第二章",
                    "title": "第二章 牙龈卟啉单胞菌的生物学特性与关键毒力系统",
                    "secs": [
                        ("2.1 牙龈蛋白酶（Gingipains）的水解活性与免疫逃逸", "详述精氨酸特异性（Rgp）与赖氨酸特异性（Kgp）牙龈蛋白酶对宿主组织基质、紧密连接蛋白与补体分子的破坏机制。"),
                        ("2.2 脂多糖（LPS）、菌毛与外膜囊泡（OMVs）的远端扩散", "剖析 LPS 异构体结构对 TLR4/TLR2 的调节，以及 OMVs 作为天然纳米载体穿透生物屏障的扩散特性。"),
                    ],
                },
                {
                    "num": "第三章",
                    "title": "第三章 侵入中枢神经系统的生物学途径与病理级联反应网络",
                    "secs": [
                        ("3.1 跨越血脑屏障、特洛伊木马与脑神经逆行运输通路", "阐述血行播散破坏 BBB、单核/巨噬细胞胞内寄生转运及三叉神经感觉末梢逆行轴浆运输三大脑内侵入路径。"),
                        ("3.2 驱动 Aβ 沉积、Tau 过度磷酸化与 NLRP3 炎症小体激活", "深入剖析 BACE1 激活、Gingipains 直接酶切 Tau 与激酶活化、小胶质细胞 NLRP3 炎症风暴导致神经元凋亡的分子网络。"),
                    ],
                },
                {
                    "num": "第四章",
                    "title": "第四章 外周系统性炎症协同效应与靶向干预转化策略",
                    "secs": [
                        ("4.1 牙周系统基础治疗（SRP）的临床保护价值", "探讨规范牙周洁治与刮治对降低全身 CRP/TNF-α 水平及延缓认知功能衰退的临床获益。"),
                        ("4.2 小分子牙龈蛋白酶抑制剂（COR388/Atuzaginstat）研发突破", "分析 COR388 的动物实验保护效果与 GAIN 临床试验阳性亚群的转化医学前景。"),
                    ],
                },
                {
                    "num": "第五章",
                    "title": "第五章 总结与未来展望",
                    "secs": [
                        ("5.1 研究总结", "归纳牙周炎-Pg-AD 轴的核心病理机制链条。"),
                        ("5.2 未来研究方向", "展望单细胞时空组学、外泌体无创早期诊断标志物与口腔-神经跨学科联合干预。"),
                    ],
                },
            ],
        )

    # 2. 针对肿瘤/外泌体/免疫主题
    if any(k in t.lower() for k in ["外泌体", "肿瘤", "免疫", "靶向", "exosome", "tumor", "cancer"]):
        w_main = words[0]
        return TopicPlan(
            raw_topic=topic,
            title_cn=f"{w_main}在肿瘤微环境调控与靶向治疗中的研究进展",
            title_en=f"Research Progress on {w_main.title()} in Tumor Microenvironment Regulation and Targeted Therapy",
            keywords_cn=words + ["肿瘤微环境", "靶向递送", "免疫逃逸", "临床转化"],
            keywords_en=[w.title() for w in words] + ["Tumor Microenvironment", "Targeted Delivery", "Immune Evasion", "Clinical Translation"],
            cnki_search_query=" AND ".join([f'SU = "{w}"' for w in words]),
            major="肿瘤生物学 / 生物医药工程",
            college="生命科学与医学院",
            chapters=[
                {
                    "num": "第一章",
                    "title": "第一章 绪论与研究背景",
                    "secs": [
                        ("1.1 肿瘤免疫微环境特征与临床瓶颈", "概述肿瘤发生发展中免疫耐受与微环境重塑的核心机制。"),
                        ("1.2 靶向干预策略的发展现状", "综述现有靶向药物与免疫疗法的发展轨迹与面临挑战。"),
                    ],
                },
                {
                    "num": "第二章",
                    "title": f"第二章 {w_main}的生物学特征与分子机制",
                    "secs": [
                        (f"2.1 {w_main}的结构特征与生成调控", "详述其生物学发生、膜结构组成与活性物质装载机制。"),
                        ("2.2 细胞间通讯与信号通路转导", "阐明其介导的旁分泌与远端器官免疫调节网络。"),
                    ],
                },
                {
                    "num": "第三章",
                    "title": "第三章 肿瘤微环境重塑与耐药机制",
                    "secs": [
                        ("3.1 免疫细胞浸润与功能耗竭", "分析 T 细胞、NK 细胞与巨噬细胞表型极化改变。"),
                        ("3.2 血管生成与基质硬化调控", "探讨微血管生成因子与细胞外基质重构机制。"),
                    ],
                },
                {
                    "num": "第四章",
                    "title": "第四章 临床转化应用与工程化递送策略",
                    "secs": [
                        ("4.1 工程化改造与靶向修饰", "探讨表面配体修饰与高效药物装载工艺。"),
                        ("4.2 早期诊断标志物与联合治疗前景", "分析体液活检与免疫检查点抑制剂联合治疗方案。"),
                    ],
                },
                {
                    "num": "第五章",
                    "title": "第五章 总结与展望",
                    "secs": [
                        ("5.1 研究总结", "系统归纳研究结论。"),
                        ("5.2 挑战与前景", "展望规模化制备与精准临床转化方向。"),
                    ],
                },
            ],
        )

    # 3. 通用自适应主题规划
    main_kw = "与".join(words[:2]) if len(words) >= 2 else words[0]
    return TopicPlan(
        raw_topic=topic,
        title_cn=f"{main_kw}的作用机制及临床转化研究进展",
        title_en=f"Research Progress on the Mechanism and Clinical Translation of {main_kw.title()}",
        keywords_cn=words + ["分子机制", "生物学通路", "临床转化", "生物标志物"],
        keywords_en=[w.title() for w in words] + ["Molecular Mechanism", "Signaling Pathway", "Clinical Translation"],
        cnki_search_query=" AND ".join([f'SU = "{w}"' for w in words]),
        major="生物医药 / 基础学科",
        college="科学与工程研究生院",
        chapters=[
            {
                "num": "第一章",
                "title": "第一章 绪论与研究背景",
                "secs": [
                    ("1.1 研究背景与重大科学问题", f"系统阐述围绕 {main_kw} 展开的基础科学问题与学科前沿现状。"),
                    ("1.2 国内外研究现状与发展趋势", "梳理近十年国内外核心期刊发表的重点突破与发展脉络。"),
                ],
            },
            {
                "num": "第二章",
                "title": f"第二章 {words[0]}的核心生物学特性与调控网络",
                "secs": [
                    ("2.1 分子结构与生理功能", "剖析其生物化学特征、结构域分布及关键代谢通路。"),
                    ("2.2 信号转导与靶标相互作用", "阐述关键受体介导的下游细胞级联反应网络。"),
                ],
            },
            {
                "num": "第三章",
                "title": f"第三章 {main_kw}的相互作用机制与病理生理效应",
                "secs": [
                    ("3.1 跨组织器官通讯与分子互作", "解析在不同组织微环境中的特异性相互作用模式。"),
                    ("3.2 细胞表型转化与损伤机制", "探讨细胞凋亡、自噬、炎症因子风暴等核心分子事件。"),
                ],
            },
            {
                "num": "第四章",
                "title": "第四章 靶向干预策略与转化应用前景",
                "secs": [
                    ("4.1 靶向小分子药物与新型生物制剂", "综述前沿药物设计、抑制剂开发与临床试验进展。"),
                    ("4.2 早期诊断标志物与联合防治路径", "探讨临床筛查技术、风险分层与综合防治模式。"),
                ],
            },
            {
                "num": "第五章",
                "title": "第五章 总结与未来展望",
                "secs": [
                    ("5.1 全文总结", "系统凝练主要研究成果。"),
                    ("5.2 前沿挑战与展望", "展望多组学交叉与真实世界转化应用。"),
                ],
            },
        ],
    )
