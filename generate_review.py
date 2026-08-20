#!/usr/bin/env python3
"""知网学术综述生成器一键启动入口 (CNKI Review Generator)。

用法:
    python generate_review.py
    python generate_review.py --topic "牙周炎 AD 牙龈卟啉单胞菌"
"""

import sys
from pathlib import Path

# 添加当前目录到 sys.path
ROOT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(ROOT_DIR))

from cnki_review_generator.app import main

if __name__ == "__main__":
    main()
