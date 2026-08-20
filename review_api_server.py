#!/usr/bin/env python3
"""
CNKI Scholar Assistant - 本地综述 API 服务 v1.1.0
启动: python review_api_server.py
调用: curl -X POST http://localhost:7721/review -H "Content-Type: application/json" -d '{"topic":"人工智能医学影像"}'
"""

import json, math, re, sys, time, urllib.parse, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from datetime import datetime

PORT = 7721
VERSION = "1.1.0"
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

try:
    from cnki_review_generator.core.query_planner import plan_topic
    HAS_GENERATOR = True
except ImportError:
    HAS_GENERATOR = False


# ── 内置 TF-IDF 引擎 ────────────────────────────────────────────────────────

STOP = set(list("的了在是我有和就不人都一上也很到说要去你会着看好自己这那里"))
STOP |= {"研究", "发现", "表明", "结果", "本文", "分析", "通过", "方法", "讨论",
         "显示", "可以", "结论", "目的", "对于", "进行", "基于", "具有"}

def tokenize(text):
    return [w for w in re.split(r"[^\u4e00-\u9fa5a-zA-Z0-9]+", text or "")
            if len(w) >= 2 and w not in STOP]

def tfidf_keywords(docs, top_n=10):
    if not docs:
        return []
    tf_maps = []
    for doc in docs:
        tokens = tokenize(doc)
        tf = {}
        for w in tokens:
            tf[w] = tf.get(w, 0) + 1
        tf_maps.append((tf, max(len(tokens), 1)))
    N = len(docs)
    all_words = set(w for tf, _ in tf_maps for w in tf)
    idf = {w: math.log((N + 1) / (sum(1 for tf, _ in tf_maps if w in tf) + 1)) + 1
           for w in all_words}
    scores = {}
    for tf, total in tf_maps:
        for w, cnt in tf.items():
            scores[w] = scores.get(w, 0) + (cnt / total) * idf[w]
    return sorted(scores, key=scores.get, reverse=True)[:top_n]


def local_nlp_review(topic, papers, lang="zh"):
    now = datetime.now()
    date_str = f"{now.year}年{now.month}月"
    docs = [" ".join(filter(None, [p.get("title",""), p.get("abstract",""), p.get("keywords","")]))
            for p in papers]
    kws = tfidf_keywords(docs)
    years = [int(p["date"]) for p in papers
             if str(p.get("date","")).isdigit() and 2000 < int(p["date"]) < 2100]
    min_y = min(years) if years else 2020
    max_y = max(years) if years else now.year
    journals = list(dict.fromkeys(p["journal"] for p in papers if p.get("journal")))
    top_cited = sorted(papers, key=lambda p: int(p.get("citations") or 0), reverse=True)

    # 动态大纲
    kw_ad = ["牙周", "阿尔茨", "卟啉单胞", "AD", "periodontitis"]
    kw_tm = ["肿瘤", "外泌体", "免疫", "靶向", "癌", "exosome", "tumor"]
    kw_ai = ["人工智能", "机器学习", "深度学习", "神经网络", "AI", "deep learning"]
    if any(k in topic for k in kw_ad):
        title = "牙周炎与阿尔茨海默病关联机制及牙龈卟啉单胞菌致病作用研究进展"
        chapters = ["一、引言与流行病学背景", "二、牙龈卟啉单胞菌生物学特性与毒力因子",
                    "三、侵入CNS通路与病理级联", "四、干预策略与临床转化", "五、总结与展望"]
    elif any(k in topic for k in kw_tm):
        w0 = topic.split()[0] if topic.split() else topic
        title = w0 + "在肿瘤微环境调控与靶向治疗中的研究进展"
        chapters = ["一、绪论与研究背景", "二、生物学特征与分子机制",
                    "三、肿瘤微环境重塑", "四、临床转化应用", "五、总结与展望"]
    elif any(k in topic for k in kw_ai):
        title = topic + "应用研究综述"
        chapters = ["一、发展背景与历史脉络", "二、核心方法论与模型架构",
                    "三、典型应用场景", "四、挑战与局限", "五、未来展望"]
    else:
        w0 = topic.split()[0] if topic.split() else topic
        title = topic + "的作用机制及研究进展"
        chapters = [
            "一、研究背景与国内外现状",
            "二、" + w0 + "的核心生物学特性",
            "三、" + topic + "的相互作用机制",
            "四、靶向干预与转化前景",
            "五、总结与展望"
        ]

    text = title + "\n" + "=" * 50 + "\n"
    text += "检索主题：" + topic + "\n"
    text += "文献来源：中国知网（CNKI）\n"
    text += "生成时间：" + date_str + "\n"
    text += "文献总量：" + str(len(papers)) + " 篇（" + str(min_y) + "—" + str(max_y) + "年）\n"
    text += "生成模式：本地NLP（Python版，无需API Key）\n\n"

    text += "【摘要】\n"
    text += '本综述针对"' + topic + '"主题检索知网文献 ' + str(len(papers)) + " 篇，"
    if journals:
        text += "涵盖《" + "》《".join(journals[:3]) + "》等期刊，"
    if years:
        recent = sum(1 for y in years if y >= max_y - 2)
        pct = round(recent / len(papers) * 100)
        text += "近三年发文占比 " + str(pct) + "%，"
        text += "研究热度持续上升。\n" if pct > 40 else "研究趋势平稳。\n"
    text += "关键词：" + "；".join(kws[:6]) + "\n\n"
    text += "=" * 50 + "\n\n"

    n_ch = len(chapters)
    for i, ch in enumerate(chapters):
        text += ch + "\n" + "-" * 30 + "\n"
        if i == 0:
            text += '"' + topic + '"领域的研究自 ' + str(min_y) + " 年前后逐步系统化，"
            if top_cited:
                p0 = top_cited[0]
                text += (str(p0.get("authors", "研究者")) + "等（" + str(p0.get("date", "")) +
                         "）的工作（被引" + str(p0.get("citations", "0")) + "次）具有重要奠基意义。")
            kw2 = "、".join(kws[:2]) if kws else "核心机制"
            text += "\n\n当前该领域研究热点集中于" + kw2 + "等方向。"
        elif i == n_ch - 1:
            kw0 = kws[0] if kws else "核心理论"
            text += ("综合 " + str(len(papers)) + " 篇文献分析，" +
                     '"' + topic + '"领域已在' + kw0 + "方面形成较系统的理论体系，")
            text += "未来研究应聚焦多组学整合、精准转化与跨学科协同三个方向。"
        else:
            slice_start = i * max(len(papers) // n_ch, 1)
            slice_end = (i + 1) * max(len(papers) // n_ch, 1)
            kw_slice = kws[i * 2:(i + 1) * 2]
            kw_text = "、".join(kw_slice) if kw_slice else "该领域核心议题"
            text += kw_text + "是本章研究的重点方向。\n"
            ref_papers = papers[slice_start:slice_end]
            if ref_papers:
                nums = "".join("[" + str(slice_start + j + 1) + "]" for j in range(min(len(ref_papers), 4)))
                text += "相关研究已从多维度验证了上述机制的重要性" + nums + "。"
        text += "\n\n"

    text += "参考文献\n" + "-" * 30 + "\n"
    for i, p in enumerate(papers):
        text += "[" + str(i + 1) + "] "
        if p.get("authors"):
            text += str(p["authors"]) + ". "
        text += str(p.get("title", ""))
        if p.get("journal"):
            text += "[J]. " + str(p["journal"])
        if p.get("date"):
            text += ", " + str(p["date"])
        cites = int(p.get("citations") or 0)
        if cites > 0:
            text += ". 被引" + str(cites) + "次"
        text += ".\n"

    return {
        "text": text, "title": title, "keywords": kws[:8],
        "chapters": chapters, "paper_count": len(papers),
        "year_range": [min_y, max_y],
        "source": "本地NLP（Python版，无需API Key）"
    }


def call_ai_api(prompt, model, api_key):
    cfgs = {
        "deepseek": ("https://api.deepseek.com/chat/completions",
                     {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
                     {"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}], "max_tokens": 2000},
                     lambda d: d["choices"][0]["message"]["content"]),
        "qwen":     ("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                     {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
                     {"model": "qwen-max", "input": {"messages": [{"role": "user", "content": prompt}]}, "parameters": {"max_tokens": 2000}},
                     lambda d: d["output"]["text"]),
        "openai":   ("https://api.openai.com/v1/chat/completions",
                     {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
                     {"model": "gpt-4o", "messages": [{"role": "user", "content": prompt}], "max_tokens": 2000},
                     lambda d: d["choices"][0]["message"]["content"]),
        "claude":   ("https://api.anthropic.com/v1/messages",
                     {"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                     {"model": "claude-opus-4-5", "max_tokens": 2000, "messages": [{"role": "user", "content": prompt}]},
                     lambda d: d["content"][0]["text"]),
    }
    if model not in cfgs:
        raise ValueError("未知模型: " + model)
    url, headers, body, extract = cfgs[model]
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return extract(json.loads(resp.read()))


def make_demo_papers(topic):
    y = datetime.now().year
    return [
        {"title": topic + "研究进展综述", "authors": "张三; 李四", "journal": "中国科学",
         "date": str(y-1), "citations": "45", "abstract": "本文综述了" + topic + "领域的最新进展..."},
        {"title": "基于深度学习的" + topic + "方法研究", "authors": "王五; 赵六", "journal": "计算机学报",
         "date": str(y-2), "citations": "32", "abstract": "提出一种新型" + topic + "框架..."},
        {"title": topic + "临床应用与挑战", "authors": "陈七", "journal": "自然杂志",
         "date": str(y-1), "citations": "28", "abstract": "探讨" + topic + "在临床中的应用价值..."},
        {"title": topic + "机制研究", "authors": "刘八; 孙九", "journal": "科学通报",
         "date": str(y-3), "citations": "67", "abstract": "揭示" + topic + "的分子机制..."},
        {"title": "面向" + topic + "的智能分析系统", "authors": "周十", "journal": "中国工程科学",
         "date": str(y), "citations": "12", "abstract": "设计并实现了" + topic + "分析系统..."},
    ]


# ── HTTP 处理器 ──────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print("  [" + datetime.now().strftime("%H:%M:%S") + "] " + fmt % args)

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path in ("/", "/health"):
            self.send_json({
                "service": "CNKI Scholar Assistant API",
                "version": VERSION,
                "status": "ok",
                "endpoints": {
                    "POST /review": "生成综述（核心接口）",
                    "POST /search": "检索说明",
                    "GET  /health": "健康检查",
                    "GET  /openapi": "接口文档",
                },
                "has_generator": HAS_GENERATOR
            })
        elif path == "/openapi":
            self.send_json({
                "openapi": "3.0.0",
                "info": {"title": "CNKI Scholar Assistant API", "version": VERSION},
                "servers": [{"url": "http://localhost:" + str(PORT)}],
                "paths": {
                    "/review": {
                        "post": {
                            "summary": "生成学术综述",
                            "requestBody": {"content": {"application/json": {"schema": {
                                "type": "object", "required": ["topic"],
                                "properties": {
                                    "topic":   {"type": "string", "description": "综述主题"},
                                    "papers":  {"type": "array",  "description": "文献列表（可选）"},
                                    "mode":    {"type": "string", "enum": ["local", "api_ai"], "default": "local"},
                                    "model":   {"type": "string", "enum": ["deepseek", "qwen", "openai", "claude"]},
                                    "api_key": {"type": "string"},
                                    "lang":    {"type": "string", "default": "zh"},
                                }
                            }}}}
                        }
                    }
                }
            })
        else:
            self.send_json({"error": "路径不存在: " + path}, 404)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}") if length else {}
        if path == "/review":
            self._handle_review(body)
        elif path == "/search":
            q = body.get("query") or body.get("topic", "")
            self.send_json({"status": "info",
                            "message": "实际知网检索需通过浏览器插件执行。可传入 papers=[] 测试综述生成。",
                            "demo_papers": make_demo_papers(q)[:3]})
        else:
            self.send_json({"error": "路径不存在: " + path}, 404)

    def _handle_review(self, body):
        topic = (body.get("topic") or "").strip()
        if not topic:
            self.send_json({"error": "topic 不能为空"}, 400)
            return
        mode    = body.get("mode", "local")
        model   = body.get("model", "deepseek")
        api_key = body.get("api_key") or body.get("apiKey") or ""
        lang    = body.get("lang", "zh")
        papers  = body.get("papers") or make_demo_papers(topic)

        print("\n  > 生成综述: [" + topic + "] 模式:" + mode + " 文献:" + str(len(papers)) + "篇")
        t0 = time.time()
        try:
            if mode == "api_ai":
                if not api_key:
                    self.send_json({"error": "mode=api_ai 需要传入 api_key"}, 400)
                    return
                short = "\n".join(
                    "[" + str(i+1) + "] " + p.get("authors","") + "《" + p.get("title","") + "》" +
                    p.get("journal","") + "(" + p.get("date","") + ")" +
                    ("\n摘要：" + p["abstract"][:100] if p.get("abstract") else "")
                    for i, p in enumerate(papers[:12])
                )
                prompt = ('你是学术综述专家，请基于以下' + str(len(papers)) + '篇知网文献为主题"' +
                          topic + '"撰写1000字中文学术综述，含背景、现状、热点、展望和参考文献。直接输出正文：\n\n' + short)
                text = call_ai_api(prompt, model, api_key)
                result = {"text": text, "title": topic + "研究综述", "keywords": [],
                          "paper_count": len(papers), "source": model + " API（AI生成）"}
            else:
                result = local_nlp_review(topic, papers, lang)

            elapsed = round(time.time() - t0, 1)
            print("  OK 耗时" + str(elapsed) + "s 字数" + str(len(result["text"])))
            self.send_json({"status": "ok", "topic": topic, "mode": mode,
                            "elapsed_seconds": elapsed, **result})
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_json({"error": str(e)}, 500)


def main():
    print("""
╔══════════════════════════════════════════════════════╗
║    CNKI Scholar Assistant - 本地综述 API 服务         ║
║    Version """ + VERSION + """                                   ║
╠══════════════════════════════════════════════════════╣
║  地址：http://localhost:""" + str(PORT) + """                       ║
║                                                      ║
║  快速测试：                                           ║
║  curl -X POST http://localhost:""" + str(PORT) + """/review \\      ║
║    -H "Content-Type: application/json" \\            ║
║    -d '{"topic":"人工智能医学影像"}'                  ║
╠══════════════════════════════════════════════════════╣
║  内置生成器：""" + ("✅ 已加载" if HAS_GENERATOR else "⚠ 仅内置NLP") + """                        ║
╚══════════════════════════════════════════════════════╝
""")
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        server.server_close()


if __name__ == "__main__":
    main()
