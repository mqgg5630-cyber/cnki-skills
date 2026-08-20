@echo off
chcp 65001 >nul
set ENV_PATH=%1
if "%ENV_PATH%"=="" set ENV_PATH=E:\spider\Library\envs\cnki-review

echo ============================================================
echo  [CNKI Review Generator] 开始配置 Conda / Mamba 环境...
echo  目标环境路径: %ENV_PATH%
echo ============================================================

set TOOL=mamba
where mamba >nul 2>nul
if errorlevel 1 set TOOL=conda

echo  使用包管理器: %TOOL%
echo.

if exist "%ENV_PATH%" (
    echo  检测到环境已存在，正在更新依赖...
    call %TOOL% env update -p "%ENV_PATH%" -f environment.yml --prune
) else (
    echo  正在创建新环境...
    call %TOOL% env create -p "%ENV_PATH%" -f environment.yml
)

echo.
echo ============================================================
echo  环境配置完成！激活并运行生成器：
echo    conda activate %ENV_PATH%
echo    python generate_review.py --topic "牙周炎 AD 牙龈卟啉单胞菌"
echo ============================================================
pause
