@echo off
chcp 65001 >nul
echo ============================================================
echo  [CNKI Review Generator] 开始执行 Windows 独立应用打包 (.exe)
echo ============================================================

set ENV_PY=E:\spider\Library\envs\cnki-review\python.exe
if exist "%ENV_PY%" (
    "%ENV_PY%" "%~dp0package_exe.py"
) else (
    python "%~dp0package_exe.py"
)

pause
