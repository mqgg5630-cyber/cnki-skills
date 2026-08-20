@echo off
chcp 65001 >nul
echo 正在配置国内高速镜像源 (清华大学 TUNA，清理 404 失效频道)...

(
echo channels:
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/msys2
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge
echo show_channel_urls: true
echo default_channels:
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
echo   - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/msys2
echo custom_channels:
echo   conda-forge: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge
echo   msys2: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/msys2
echo   bioconda: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/bioconda
) > "%USERPROFILE%\.condarc"

echo.
echo ============================================================
echo  [成功] 已成功配置 Conda/Mamba 镜像源！
echo ============================================================
pause
