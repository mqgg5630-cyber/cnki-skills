"""
CNKI Scholar Assistant — Codex / 外部工具调用示例
=================================================
需要先启动 review_api_server.py：
    python review_api_server.py

然后运行本文件，或在 Codex / 反重力 / Jupyter 中直接调用。
"""

import json
import urllib.request
import urllib.error

API = "http://localhost:7721"


def generate_review(topic: str, papers: list = None,
                    mode: str = "local",
                    model: str = "deepseek",
                    api_key: str = "") -> dict:
    """
    调用本地 CNKI 综述 API 生成综述

    参数：
        topic   - 综述主题，如 "人工智能在医学影像中的应用"
        papers  - 文献列表（从知网检索到的），不传则用示例文献
        mode    - "local"（无需Key）或 "api_ai"（需要api_key）
        model   - "deepseek" / "qwen" / "openai" / "claude"
        api_key - AI模型的API Key（mode=api_ai时必填）

    返回：
        dict 包含 text（综述全文）、title、keywords、source 等字段
    """
    payload = {"topic": topic, "mode": mode, "lang": "zh"}
    if papers:    payload["papers"] = papers
    if model:     payload["model"]   = model
    if api_key:   payload["api_key"] = api_key

    req = urllib.request.Request(
        f"{API}/review",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"无法连接 API 服务（{API}）。\n"
            f"请先运行：python review_api_server.py\n"
            f"原始错误：{e}"
        )


def save_review(result: dict, output_dir: str = ".") -> str:
    """把综述结果保存为 txt 文件"""
    from pathlib import Path
    from datetime import datetime

    title = result.get("title", "综述").replace("/", "_").replace("\\", "_")
    fname = f"{title[:30]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    out = Path(output_dir) / fname
    out.write_text(result["text"], encoding="utf-8")
    print(f"✅ 综述已保存：{out}")
    return str(out)


# ── 示例调用 ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    topic = sys.argv[1] if len(sys.argv) > 1 else "人工智能在医学影像诊断中的应用"
    mode  = sys.argv[2] if len(sys.argv) > 2 else "local"

    print(f"\n📚 CNKI 综述生成器")
    print(f"   主题：{topic}")
    print(f"   模式：{mode}")
    print(f"   API ：{API}\n")

    # ── 示例一：纯本地NLP（无需任何Key）
    print("=" * 50)
    print("【示例一：本地NLP模式（无需API Key）】")
    result = generate_review(
        topic=topic,
        mode="local",
    )
    print(f"✅ 生成完成 | 字数：{len(result['text'])} | 来源：{result.get('source')}")
    print(f"   标题：{result.get('title')}")
    print(f"   关键词：{'、'.join(result.get('keywords', [])[:5])}")
    print("\n── 综述正文（前500字）──")
    print(result["text"][:500] + "...")

    # 保存到文件
    save_review(result, output_dir=".")

    # ── 示例二：API Key模式（取消注释并填入Key）
    # print("\n" + "=" * 50)
    # print("【示例二：DeepSeek API 模式】")
    # result2 = generate_review(
    #     topic=topic,
    #     mode="api_ai",
    #     model="deepseek",
    #     api_key="sk-xxxxxxxxxxxxxxxx",  # 填入你的 DeepSeek API Key
    # )
    # print(f"✅ 生成完成 | 字数：{len(result2['text'])} | 来源：{result2.get('source')}")
    # save_review(result2, output_dir=".")

    print("\n完成！")
