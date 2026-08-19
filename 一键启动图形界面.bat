@echo off
chcp 65001 >nul
title CNKI Review Generator - 一键知网学术综述生成器

:: 优先检测 cnki-review conda 环境
set ENV_PY=E:\spider\Library\envs\cnki-review\python.exe
if exist "%ENV_PY%" (
    start "" "%ENV_PY%" "%~dp0start_gui.py"
    exit /b
)

:: 次选检测 lark conda 环境
set LARK_PY=E:\spider\Library\envs\lark\python.exe
if exist "%LARK_PY%" (
    start "" "%LARK_PY%" "%~dp0start_gui.py"
    exit /b
)

:: 回退到系统 python
python "%~dp0start_gui.py"
