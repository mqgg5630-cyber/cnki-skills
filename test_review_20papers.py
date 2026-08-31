#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CNKI Scholar Assistant - 20篇文献综述生成测试
==========================================
使用方法：
  1. 先启动 API 服务：python review_api_server.py
  2. 运行本脚本：  python test_review_20papers.py

或在 Spyder / Jupyter 里直接运行每个 cell。
"""

import json
import urllib.request
import urllib.error
import os
from datetime import datetime

API = "http://localhost:7721"

# ─────────────────────────────────────────────────────────────────────────────
# 20篇真实结构文献（模拟从知网检索到的数据，涵盖多个子方向）
# 替换成你从知网实际检索到的数据效果更佳
# ─────────────────────────────────────────────────────────────────────────────

PAPERS_AI_MEDICAL = [
    {"title": "深度学习在医学影像分割中的研究进展",
     "authors": "张明; 李华; 王强",
     "journal": "中国图像图形学报", "date": "2024",
     "citations": "89",
     "abstract": "综述深度学习方法在CT、MRI等医学影像分割任务中的最新进展，重点分析U-Net及其变体在器官分割、病灶检测中的应用，探讨数据稀缺、标注成本高等挑战。"},

    {"title": "卷积神经网络辅助诊断肺结节的准确性研究",
     "authors": "赵丽; 陈磊; 刘洋",
     "journal": "中华放射学杂志", "date": "2023",
     "citations": "134",
     "abstract": "基于ResNet-50构建肺结节良恶性分类模型，在LIDC-IDRI数据集上AUC达0.962，与放射科医生诊断准确率相当，具有重要临床应用价值。"},

    {"title": "Transformer在医学影像分析中的应用综述",
     "authors": "孙静; 周峰; 吴勇",
     "journal": "软件学报", "date": "2024",
     "citations": "67",
     "abstract": "系统综述Vision Transformer(ViT)及其衍生模型在医学图像分类、分割、检测任务的应用现状，分析全局注意力机制相比CNN在捕获长距离依赖方面的优势与挑战。"},

    {"title": "多模态融合在脑肿瘤MRI分析中的研究",
     "authors": "郑欣; 黄磊; 林红",
     "journal": "计算机学报", "date": "2023",
     "citations": "56",
     "abstract": "提出多模态MRI融合框架，整合T1、T2、FLAIR和T1ce序列信息，在BraTS2021数据集上肿瘤分割Dice系数达0.921，显著优于单模态方法。"},

    {"title": "联邦学习在医疗数据隐私保护中的应用",
     "authors": "徐波; 许凤; 杨帆",
     "journal": "通信学报", "date": "2024",
     "citations": "43",
     "abstract": "设计基于差分隐私的联邦学习框架，在保护患者数据隐私前提下，实现多中心医学影像模型协同训练，隐私损失ε<1.0，模型精度损失小于2%。"},

    {"title": "基于GAN的医学影像数据增强方法研究",
     "authors": "马丽; 罗晶; 何云",
     "journal": "自动化学报", "date": "2023",
     "citations": "78",
     "abstract": "提出条件生成对抗网络（cGAN）用于医学影像合成与增强，有效缓解标注数据稀缺问题，在皮肤病变分类任务上准确率提升8.3%。"},

    {"title": "小样本学习在罕见病影像诊断中的应用",
     "authors": "方圆; 蒋华; 潘磊",
     "journal": "人工智能学报", "date": "2024",
     "citations": "52",
     "abstract": "面向罕见病样本稀少的挑战，提出原型网络结合元学习的小样本分类框架，在仅5-shot条件下病灶识别准确率达82.4%。"},

    {"title": "AI辅助眼底图像糖尿病视网膜病变筛查",
     "authors": "沈涛; 卢芳; 韩冰",
     "journal": "中华眼科杂志", "date": "2023",
     "citations": "91",
     "abstract": "开发基于深度学习的糖尿病视网膜病变自动分级系统，在10万张眼底照片验证集上灵敏度95.1%、特异度97.3%，达到眼科专家水平。"},

    {"title": "三维医学影像重建与可视化技术进展",
     "authors": "江华; 邱鹏; 秦艳",
     "journal": "中国医学计算机成像杂志", "date": "2024",
     "citations": "34",
     "abstract": "综述基于深度学习的CT/MRI三维重建方法，包括NeRF、3D U-Net等技术在手术规划、解剖教学中的应用，探讨实时渲染与计算效率优化策略。"},

    {"title": "可解释AI在医疗影像辅助决策中的研究",
     "authors": "苗田; 贾丽; 段晨",
     "journal": "计算机科学", "date": "2023",
     "citations": "63",
     "abstract": "综述Grad-CAM、SHAP、LIME等可解释性方法在医学影像AI中的应用，分析不同解释方法的优缺点，讨论如何增强临床医生对AI系统的信任度。"},

    {"title": "深度学习辅助病理切片癌症检测研究",
     "authors": "阮欣; 石磊; 袁红",
     "journal": "肿瘤", "date": "2024",
     "citations": "47",
     "abstract": "基于Vision Transformer构建乳腺癌病理切片自动分析系统，WSI级别AUC达0.981，在乳腺癌亚型分类任务上优于ResNet-50基线14.2%。"},

    {"title": "跨模态医学影像配准方法综述",
     "authors": "余萍; 薛磊; 冯悦",
     "journal": "电子学报", "date": "2023",
     "citations": "38",
     "abstract": "系统综述基于深度学习的CT-MRI、PET-CT等跨模态影像配准方法，分析无监督、弱监督和强化学习范式在配准任务中的性能与适用场景。"},

    {"title": "人工智能在放射治疗计划自动化中的应用",
     "authors": "唐博; 仲华; 丁磊",
     "journal": "中华放射肿瘤学杂志", "date": "2024",
     "citations": "29",
     "abstract": "提出基于深度强化学习的放疗计划自动优化算法，在前列腺癌放疗计划中OAR剂量超出约束减少41%，计划制定时间从3小时缩短至15分钟。"},

    {"title": "医学影像AI模型泛化性评估与改进策略",
     "authors": "龚磊; 卞欣; 符琳",
     "journal": "模式识别与人工智能", "date": "2023",
     "citations": "55",
     "abstract": "针对医学影像AI模型跨医院、跨设备泛化性差的问题，提出基于域适应的多源迁移学习框架，在跨中心胸部X光诊断中泛化精度提升12.6%。"},

    {"title": "心脏超声影像深度学习自动测量研究",
     "authors": "闻静; 卓涛; 樊欣",
     "journal": "中国超声医学杂志", "date": "2024",
     "citations": "41",
     "abstract": "开发基于时序深度学习的心脏超声自动测量系统，实现LVEF、LVDd等参数全自动计算，与人工测量结果相关系数r>0.95，平均误差小于4%。"},

    {"title": "大规模医学影像预训练模型研究进展",
     "authors": "储磊; 谭旭; 耿涛",
     "journal": "中国科学: 信息科学", "date": "2024",
     "citations": "72",
     "abstract": "综述MedSAM、BioViL-T、Med-PaLM等医学影像大模型的预训练策略、数据构建和下游任务迁移方法，探讨通用医学影像基础模型的发展路径。"},

    {"title": "AI辅助内镜检查结直肠息肉实时检测",
     "authors": "毕磊; 谢然; 艾欣",
     "journal": "中华消化内镜杂志", "date": "2023",
     "citations": "83",
     "abstract": "在结直肠镜检查中部署实时AI辅助检测系统，在前瞻性RCT研究中腺瘤漏诊率从16.7%降至9.4%（P<0.001），腺瘤检出率提升7.3个百分点。"},

    {"title": "基于注意力机制的X光骨龄评估方法",
     "authors": "冀磊; 汪涛; 芮欣",
     "journal": "中国医学影像技术", "date": "2024",
     "citations": "27",
     "abstract": "提出多尺度注意力网络用于骨龄自动评估，在RSNA骨龄挑战赛数据上MAE达4.2个月，优于传统GP法，为儿童生长发育评估提供智能工具。"},

    {"title": "医学影像AI伦理与监管政策研究",
     "authors": "闫磊; 裴欣; 鲁涛",
     "journal": "中国卫生信息管理杂志", "date": "2023",
     "citations": "19",
     "abstract": "梳理国内外医疗AI监管框架，分析NMPA、FDA、CE等机构对AI辅助诊断软件的审批要求，探讨算法透明度、数据偏见、责任认定等伦理挑战。"},

    {"title": "人工智能医学影像临床落地实践与挑战",
     "authors": "颜磊; 郭涛; 诸欣",
     "journal": "中国数字医学", "date": "2024",
     "citations": "36",
     "abstract": "调研国内20家三甲医院AI影像系统落地情况，总结工作流集成、科室协作、培训体系等关键成功因素，分析数据质量、系统维护、商业模式等主要挑战。"},
]

# ─────────────────────────────────────────────────────────────────────────────
# 核心调用函数
# ─────────────────────────────────────────────────────────────────────────────

def call_api(endpoint: str, data: dict, timeout: int = 120) -> dict:
    """调用本地 API"""
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API + endpoint,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"Cannot connect to {API}\n"
            f"Please start: python review_api_server.py\n"
            f"Error: {e}"
        )


def save_result(result: dict, prefix: str = "review") -> str:
    """保存综述到文件"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 标题截取，去掉非法字符
    title = result.get("title", "综述")
    safe_title = "".join(c for c in title if c not in r'\/:*?"<>|')[:30]
    filename = f"{prefix}_{safe_title}_{timestamp}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(result.get("text", ""))
    print(f"\n  已保存: {os.path.abspath(filename)}")
    return filename


def print_summary(result: dict):
    """打印结果摘要"""
    print(f"\n{'='*60}")
    print(f"  标题  : {result.get('title', '')}")
    print(f"  文献数: {result.get('paper_count', 0)} 篇")
    print(f"  字数  : {len(result.get('text', ''))} 字")
    print(f"  来源  : {result.get('source', '')}")
    print(f"  耗时  : {result.get('elapsed_seconds', 0)} 秒")
    kws = result.get("keywords", [])
    if kws:
        print(f"  关键词: {' | '.join(kws[:5])}")
    print(f"{'='*60}\n")
    # 打印正文前600字
    print(result.get("text", "")[:600])
    print("...\n(完整内容已保存到文件)")


# ─────────────────────────────────────────────────────────────────────────────
# 测试用例
# ─────────────────────────────────────────────────────────────────────────────

def test_health():
    """测试API服务是否正常"""
    req = urllib.request.Request(API + "/health")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            print(f"  API服务正常 | 版本: {data.get('version')} | 状态: {data.get('status')}")
            return True
    except Exception as e:
        print(f"  [ERROR] API服务未启动: {e}")
        print(f"  请先运行: python review_api_server.py")
        return False


def test_20papers_local():
    """
    测试1：20篇文献 × 本地NLP（无需API Key）
    """
    print("\n" + "─"*60)
    print("测试1: 20篇文献 × 本地NLP模式（无需API Key）")
    print("─"*60)

    result = call_api("/review", {
        "topic": "人工智能在医学影像中的应用",
        "papers": PAPERS_AI_MEDICAL,   # 传入20篇真实结构文献
        "mode": "local",
        "lang": "zh",
    })

    if result.get("status") == "ok":
        print_summary(result)
        save_result(result, "test1_local_20papers")
    else:
        print(f"  [ERROR] {result.get('error')}")
    return result


def test_20papers_count_param():
    """
    测试2：通过count参数控制文献数量（不传papers，API自动生成）
    """
    print("\n" + "─"*60)
    print("测试2: count=20（API自动填充文献）")
    print("─"*60)

    result = call_api("/review", {
        "topic": "深度学习在自然语言处理中的应用",
        "mode": "local",
        "count": 20,       # 不传papers，API用20篇占位文献
        "lang": "zh",
    })

    if result.get("status") == "ok":
        print_summary(result)
        save_result(result, "test2_count20")
    else:
        print(f"  [ERROR] {result.get('error')}")
    return result


def test_custom_topic(topic: str, count: int = 20):
    """
    测试3：自定义主题，指定文献数量
    可在 Spyder / 反重力 / Codex 里直接调用
    """
    print("\n" + "─"*60)
    print(f"自定义主题: 「{topic}」 × {count}篇")
    print("─"*60)

    result = call_api("/review", {
        "topic": topic,
        "mode": "local",
        "count": count,
    })

    if result.get("status") == "ok":
        print_summary(result)
        filename = save_result(result, "custom")
        return result, filename
    else:
        print(f"  [ERROR] {result.get('error')}")
        return result, None


def test_with_api_key(topic: str, model: str, api_key: str, count: int = 20):
    """
    测试4：AI模式（需要API Key）
    model: "deepseek" / "qwen" / "openai" / "claude"
    """
    print("\n" + "─"*60)
    print(f"AI模式: 「{topic}」× {model} × {count}篇")
    print("─"*60)

    result = call_api("/review", {
        "topic": topic,
        "papers": PAPERS_AI_MEDICAL[:count],
        "mode": "api_ai",
        "model": model,
        "api_key": api_key,
        "lang": "zh",
    }, timeout=180)

    if result.get("status") == "ok":
        print_summary(result)
        save_result(result, f"ai_{model}")
    else:
        print(f"  [ERROR] {result.get('error')}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 直接运行
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("="*60)
    print("  CNKI Scholar Assistant - 20篇文献综述测试")
    print("="*60)

    # 检查服务
    if not test_health():
        exit(1)

    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode in ("all", "1"):
        # 测试1：20篇真实结构文献 × 本地NLP
        test_20papers_local()

    if mode in ("all", "2"):
        # 测试2：count参数控制
        test_20papers_count_param()

    if mode == "custom" and len(sys.argv) >= 3:
        # 自定义主题：python test_review_20papers.py custom "你的主题" 20
        topic = sys.argv[2]
        count = int(sys.argv[3]) if len(sys.argv) >= 4 else 20
        test_custom_topic(topic, count)

    if mode == "ai" and len(sys.argv) >= 4:
        # AI模式：python test_review_20papers.py ai deepseek sk-xxxxx
        model   = sys.argv[2]
        api_key = sys.argv[3]
        topic   = sys.argv[4] if len(sys.argv) >= 5 else "人工智能在医学影像中的应用"
        test_with_api_key(topic, model, api_key)

    print("\n所有测试完成！")
