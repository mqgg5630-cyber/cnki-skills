#!/usr/bin/env python3
"""启动知网学术综述生成器桌面图形界面应用 (Desktop GUI)。

用法:
    python start_gui.py
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(ROOT_DIR))

from cnki_review_generator.gui_app import main

if __name__ == "__main__":
    main()
