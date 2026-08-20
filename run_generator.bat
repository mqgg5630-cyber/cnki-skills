@echo off
chcp 65001 >nul
set TOPIC=%1
if "%TOPIC%"=="" set TOPIC=牙周炎 AD 牙龈卟啉单胞菌

echo  [CNKI Review Generator] 正在启动综述生成器...
echo  目标主题: %TOPIC%

call conda run -n cnki-review python generate_review.py --topic "%TOPIC%" 2>nul
if errorlevel 1 (
    python generate_review.py --topic "%TOPIC%"
)
pause
