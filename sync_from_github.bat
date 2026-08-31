@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ============================================
echo   CNKI Scholar Assistant -- Git 同步工具
echo ============================================
echo.

:: ── 配置区（按需修改路径）
set REPO_DIR=E:\0writing\cnki-skills
set REMOTE=https://github.com/mqgg5630-cyber/cnki-skills.git
set BRANCH=arena/01a01cb0-cnki-skills

:: ── 检查 git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 git，请先安装：https://git-scm.com/download/win
    pause & exit /b 1
)

:: ── 情况A：目录不存在 → 首次克隆
if not exist "%REPO_DIR%\.git" (
    echo [步骤 1/2] 首次克隆仓库到 %REPO_DIR% ...
    git clone %REMOTE% "%REPO_DIR%"
    if !errorlevel! neq 0 (
        echo [错误] 克隆失败，请检查网络连接
        pause & exit /b 1
    )
    cd /d "%REPO_DIR%"

    echo [步骤 2/2] 切换到分支 %BRANCH% ...
    git checkout -b %BRANCH% origin/%BRANCH%
    if !errorlevel! neq 0 (
        echo [错误] 切换分支失败
        pause & exit /b 1
    )
    goto :show_result
)

:: ── 情况B：目录已存在 → 拉取最新
cd /d "%REPO_DIR%"

echo [步骤 1/3] 拉取远端信息 (git fetch) ...
git fetch origin
if !errorlevel! neq 0 (
    echo [错误] fetch 失败，请检查网络连接
    pause & exit /b 1
)

echo [步骤 2/3] 切换到分支 %BRANCH% ...
git checkout %BRANCH% 2>nul
if !errorlevel! neq 0 (
    git checkout -b %BRANCH% origin/%BRANCH%
)

echo [步骤 3/3] 拉取最新代码 (git pull) ...
git pull origin %BRANCH%
if !errorlevel! neq 0 (
    echo [错误] pull 失败，可能有本地改动冲突
    echo        请运行 git status 查看冲突文件
    pause & exit /b 1
)

:show_result
echo.
echo [完成] 同步成功！
echo.
echo -- 最近 8 条提交 --
git log --oneline -8
echo.
echo -- 插件文件位置 --
echo   Chrome扩展目录：%REPO_DIR%\browser-extension\
echo   插件ZIP包：     %REPO_DIR%\cnki-scholar-assistant-v1.0.0.zip
echo.
echo -- Chrome 加载方法 --
echo   1. 地址栏输入：chrome://extensions/
echo   2. 右上角开启「开发者模式」
echo   3. 点击「加载已解压的扩展程序」
echo   4. 选择文件夹：%REPO_DIR%\browser-extension
echo.
pause
