"""一键知网学术综述与毕业论文生成器 - 现代桌面 GUI 应用 (Desktop GUI Application)。

集成 Lark-Formatter 毕业论文模板规范与 Zotero 一键 Refresh 联动。
支持 Windows / macOS / Linux 双击直接运行。
"""

from __future__ import annotations

import os
import sys
import threading
import time
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:
    tk = None


class CNKIReviewApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("CNKI Review & Thesis Generator - 学术综述与毕业论文生成器 v1.2 LTS")
        self.root.geometry("900x700")
        self.root.minsize(820, 620)

        # 设置 Windows 风格现代配色与字体
        self.bg_color = "#f8f9fa"
        self.card_bg = "#ffffff"
        self.primary_color = "#1a73e8"
        self.root.configure(bg=self.bg_color)

        self.setup_styles()
        self.create_widgets()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background=self.bg_color, font=("Microsoft YaHei UI", 9))
        style.configure("TLabel", background=self.bg_color, font=("Microsoft YaHei UI", 9))
        style.configure("Header.TLabel", font=("Microsoft YaHei UI", 15, "bold"), foreground="#202124")
        style.configure("SubHeader.TLabel", font=("Microsoft YaHei UI", 9), foreground="#5f6368")

        style.configure("Card.TFrame", background=self.card_bg, relief="flat")
        style.configure(
            "Primary.TButton",
            background=self.primary_color,
            foreground="#ffffff",
            font=("Microsoft YaHei UI", 10, "bold"),
            padding=(15, 8),
            borderwidth=0,
        )
        style.map("Primary.TButton", background=[("active", "#1557b0"), ("disabled", "#dadce0")])

        style.configure("Action.TButton", font=("Microsoft YaHei UI", 9), padding=(8, 4))

    def create_widgets(self):
        # 顶栏 Header
        top_frame = ttk.Frame(self.root, padding="20 15 20 10")
        top_frame.pack(fill=tk.X)

        title_lbl = ttk.Label(top_frame, text="🎓 一键知网学术综述 & 毕业论文生成器", style="Header.TLabel")
        title_lbl.pack(anchor=tk.W)

        sub_lbl = ttk.Label(
            top_frame,
            text="集成 Lark-Formatter 毕业论文标准模板 · 权威文献挖掘 · 自动 LaTeX + GB/T 7714 规范 Word · 支持 Zotero 一键 Refresh",
            style="SubHeader.TLabel",
        )
        sub_lbl.pack(anchor=tk.W, pady=(2, 0))

        # 主配置卡片 Frame
        config_card = ttk.Frame(self.root, padding=15, style="Card.TFrame")
        config_card.pack(fill=tk.X, padx=20, pady=5)

        # 1. 综述主题输入
        row1 = ttk.Frame(config_card, style="Card.TFrame")
        row1.pack(fill=tk.X, pady=6)

        ttk.Label(row1, text="研究主题 / 关键词：", font=("Microsoft YaHei UI", 10, "bold"), background=self.card_bg).pack(side=tk.LEFT)
        self.topic_var = tk.StringVar(value="牙周炎 AD 牙龈卟啉单胞菌")
        self.topic_combo = ttk.Combobox(
            row1,
            textvariable=self.topic_var,
            font=("Microsoft YaHei UI", 10),
            values=[
                "牙周炎 AD 牙龈卟啉单胞菌",
                "口腔微生态与阿尔茨海默病关联机制",
                "阿尔茨海默病 神经炎症 小胶质细胞",
                "外泌体 靶向递送 肿瘤免疫治疗",
                "肠道菌群 脑肠轴 帕金森病",
            ],
        )
        self.topic_combo.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 0))

        # 2. 论文模板体系与引用标准
        row2 = ttk.Frame(config_card, style="Card.TFrame")
        row2.pack(fill=tk.X, pady=6)

        ttk.Label(row2, text="论文排版模板：", background=self.card_bg).pack(side=tk.LEFT)
        self.mode_var = tk.StringVar(value="全部生成 (学术综述 + 鲁东大学学术硕士学位论文标准版)")
        mode_combo = ttk.Combobox(
            row2,
            textvariable=self.mode_var,
            state="readonly",
            width=42,
            values=[
                "全部生成 (学术综述 + 鲁东大学学术硕士学位论文标准版)",
                "知网学术综述论文 (GB/T 7714 顺序编码制)",
                "鲁东大学学术硕士学位论文 (Lark-Formatter 官方规范版)",
            ],
        )
        mode_combo.pack(side=tk.LEFT, padx=(5, 15))

        self.zotero_var = tk.BooleanVar(value=True)
        zotero_chk = ttk.Checkbutton(row2, text="启用 Zotero 活动引用 (支持 Word/WPS 一键 Refresh)", variable=self.zotero_var)
        zotero_chk.pack(side=tk.LEFT)

        # 3. 输出路径
        row3 = ttk.Frame(config_card, style="Card.TFrame")
        row3.pack(fill=tk.X, pady=6)

        ttk.Label(row3, text="生成输出目录：", background=self.card_bg).pack(side=tk.LEFT)
        self.out_dir_var = tk.StringVar(value=os.path.abspath("periodontitis-ad-pg-review"))
        out_entry = ttk.Entry(row3, textvariable=self.out_dir_var, font=("Microsoft YaHei UI", 9))
        out_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        browse_btn = ttk.Button(row3, text="浏览...", command=self.browse_output_dir)
        browse_btn.pack(side=tk.LEFT)

        # 操作按钮与进度条
        btn_frame = ttk.Frame(self.root, padding="20 10")
        btn_frame.pack(fill=tk.X)

        self.gen_btn = ttk.Button(
            btn_frame,
            text="🚀 一键生成全套成果 (Word + 学位论文 + LaTeX + Zotero)",
            style="Primary.TButton",
            command=self.start_generation_thread,
        )
        self.gen_btn.pack(side=tk.LEFT)

        self.progress = ttk.Progressbar(btn_frame, mode="indeterminate", length=180)
        self.progress.pack(side=tk.LEFT, padx=(12, 0))

        # 快捷操作组 (生成成功后可用)
        self.open_thesis_btn = ttk.Button(btn_frame, text="🎓 打开学位论文", style="Action.TButton", state="disabled", command=self.open_thesis_doc)
        self.open_thesis_btn.pack(side=tk.RIGHT, padx=3)

        self.open_word_btn = ttk.Button(btn_frame, text="📄 打开学术综述", style="Action.TButton", state="disabled", command=self.open_word_doc)
        self.open_word_btn.pack(side=tk.RIGHT, padx=3)

        self.open_dir_btn = ttk.Button(btn_frame, text="📁 打开输出目录", style="Action.TButton", state="disabled", command=self.open_output_dir)
        self.open_dir_btn.pack(side=tk.RIGHT, padx=3)

        # 日志输出区域
        log_frame = ttk.Frame(self.root, padding="20 0 20 15")
        log_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(log_frame, text="实时生成日志与控制台输出：", font=("Microsoft YaHei UI", 9, "bold")).pack(anchor=tk.W, pady=(0, 4))

        self.log_text = tk.Text(
            log_frame,
            wrap=tk.WORD,
            font=("Consolas", 9),
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="#ffffff",
            relief="flat",
            padx=10,
            pady=8,
        )
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scroll = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.config(yscrollcommand=scroll.set)

        self.log("💡 综述与学位论文生成器已就绪，请输入研究主题后点击上方【一键生成】按钮。")

    def log(self, text: str):
        self.log_text.insert(tk.END, text + "\n")
        self.log_text.see(tk.END)

    def browse_output_dir(self):
        d = filedialog.askdirectory(initialdir=self.out_dir_var.get(), title="选择输出目录")
        if d:
            self.out_dir_var.set(d)

    def start_generation_thread(self):
        topic = self.topic_var.get().strip()
        if not topic:
            messagebox.showwarning("提示", "请输入或选择研究主题！")
            return

        self.gen_btn.config(state="disabled")
        self.progress.start(10)
        self.open_word_btn.config(state="disabled")
        self.open_thesis_btn.config(state="disabled")
        self.open_dir_btn.config(state="disabled")

        mode_str = self.mode_var.get()
        mode = "all" if "全部" in mode_str else ("thesis" if "硕士" in mode_str else "review")

        t = threading.Thread(target=self.run_generation, args=(topic, self.out_dir_var.get().strip(), mode))
        t.daemon = True
        t.start()

    def run_generation(self, topic: str, output_dir: str, mode: str):
        try:
            self.log("\n" + "=" * 60)
            self.log(f" [CNKI Generator] 开始生成学术成果: {topic}")
            self.log("=" * 60)

            sys.path.insert(0, str(Path(__file__).parent.parent))
            from cnki_review_generator.app import generate_review_project

            out_path = generate_review_project(topic, output_dir, mode)

            self.last_out_dir = str(out_path)
            self.last_docx_path = str(out_path / f"{out_path.name}.docx")
            self.last_thesis_path = str(out_path / "鲁东大学学术硕士学位论文_标准定稿版.docx")

            self.log("\n[SUCCESS] 生成全部完成！")
            self.log(f"  -> 学术综述: {self.last_docx_path}")
            if os.path.isfile(self.last_thesis_path):
                self.log(f"  -> 学位论文: {self.last_thesis_path}")
            self.log(f"  -> Zotero 文献库: {out_path / 'Periodontitis_AD_Zotero_library.json'}")

            self.root.after(0, self.on_generation_success)
        except Exception as e:
            self.log(f"\n[ERROR] 生成失败: {e}")
            self.root.after(0, lambda: messagebox.showerror("错误", f"生成失败: {e}"))
        finally:
            self.root.after(0, self.on_generation_finish)

    def on_generation_success(self):
        self.open_word_btn.config(state="normal")
        if hasattr(self, "last_thesis_path") and os.path.isfile(self.last_thesis_path):
            self.open_thesis_btn.config(state="normal")
        self.open_dir_btn.config(state="normal")
        messagebox.showinfo(
            "生成完成",
            "🎉 学术综述与鲁东大学学位论文已成功生成！\n\n已注入 Zotero 活动引用域，可在 Word/WPS 中一键 Refresh 联动！",
        )

    def on_generation_finish(self):
        self.progress.stop()
        self.gen_btn.config(state="normal")

    def open_word_doc(self):
        if hasattr(self, "last_docx_path") and os.path.isfile(self.last_docx_path):
            os.startfile(self.last_docx_path) if sys.platform == "win32" else os.system(f'open "{self.last_docx_path}"')

    def open_thesis_doc(self):
        if hasattr(self, "last_thesis_path") and os.path.isfile(self.last_thesis_path):
            os.startfile(self.last_thesis_path) if sys.platform == "win32" else os.system(f'open "{self.last_thesis_path}"')

    def open_output_dir(self):
        if hasattr(self, "last_out_dir") and os.path.isdir(self.last_out_dir):
            os.startfile(self.last_out_dir) if sys.platform == "win32" else os.system(f'open "{self.last_out_dir}"')


def main():
    if tk is None:
        print("Error: 当前 Python 环境缺少 tkinter 图形界面支持。")
        sys.exit(1)
    root = tk.Tk()
    app = CNKIReviewApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
