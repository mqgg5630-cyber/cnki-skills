#!/usr/bin/env python3
"""一键打包为 Windows 独立可执行程序 (.exe) 工具。

使用 PyInstaller 将本生成器、Pandoc 渲染引擎与 CSL 样式表打包为独立的 Windows 桌面应用。
打包后在任意 Windows 电脑上双击即可直接运行，无需预装 Python 或 Conda。

用法:
    python package_exe.py
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()


def main():
    print("=" * 65)
    print(" [CNKI Review Generator] 开始打包为 Windows 独立应用 (.exe)...")
    print("=" * 65)

    # 1. 确保安装 pyinstaller
    try:
        import PyInstaller
        print(f"  [OK] 检测到 PyInstaller 版本: {PyInstaller.__version__}")
    except ImportError:
        print("  正在安装 pyinstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    # 2. 收集资源路径
    sep = ";" if sys.platform == "win32" else ":"
    templates_dir = ROOT / "cnki_review_generator" / "templates"
    add_data_arg = f"{templates_dir}{sep}cnki_review_generator/templates"

    dist_dir = ROOT / "dist"
    build_dir = ROOT / "build"

    # 3. 运行 PyInstaller
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name=CNKI-Review-Generator",
        "--onedir",
        "--windowed",
        "--noconfirm",
        "--clean",
        f"--add-data={add_data_arg}",
        "--hidden-import=pypandoc",
        "--hidden-import=docx",
        "--hidden-import=lxml",
        str(ROOT / "start_gui.py"),
    ]

    print(f"\n正在执行打包命令:\n{' '.join(cmd)}\n")
    subprocess.run(cmd, check=True)

    out_exe_dir = dist_dir / "CNKI-Review-Generator"
    print("\n" + "=" * 65)
    print(" [打包成功] 独立应用目录已生成：")
    print(f"   -> {out_exe_dir}")
    print(" 交付说明：将整个 'CNKI-Review-Generator' 文件夹压缩分发，")
    print(" 用户双击其中的 'CNKI-Review-Generator.exe' 即可一键打开使用！")
    print("=" * 65)


if __name__ == "__main__":
    main()
