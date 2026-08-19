# 一键修复 Conda / Mamba 国内高速镜像源 (清华大学 TUNA / 阿里云)
# 自动移除已失效报 404 的 pkgs/free 频道

$condarcContent = @"
channels:
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/msys2
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge
show_channel_urls: true
default_channels:
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/msys2
custom_channels:
  conda-forge: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge
  msys2: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/msys2
  bioconda: https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/bioconda
"@

$condarcPath = "$HOME\.condarc"
$condarcContent | Out-File -FilePath $condarcPath -Encoding utf8 -Force

Write-Host "============================================================" -ForegroundColor Green
Write-Host " [成功] 已更新国内高速镜像源到: $condarcPath" -ForegroundColor Green
Write-Host " 已自动清理失效报 404 的 pkgs/free 频道！" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
