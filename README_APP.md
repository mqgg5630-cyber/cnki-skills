# 知网学术综述生成器 (CNKI Review Generator) 应用版使用指南

本工具已全面升级为**企业级/开箱即用的独立桌面应用**，支持双击运行、图形界面（GUI）交互、多主题生成与独立 Windows `.exe` 打包。

---

## 一、三种应用运行方式

### 方式 1：双击运行桌面图形界面（最推荐）
直接双击根目录下的 **`一键启动图形界面.bat`**，或在 PowerShell 中执行：
```powershell
python start_gui.py
```
即刻唤起现代风格桌面 GUI 界面：
- **主题输入与预设下拉**（预设牙周炎与 AD、口腔微生态、神经炎症、外泌体靶向递送等）；
- **GB/T 7714-2015 顺序编码制标准** 与 **Zotero 活动引用联动** 选项；
- **实时多线程构建进度条与彩色日志输出窗口**；
- 生成完成后可直接点击【📄 打开 Word 文档】与【📁 打开输出目录】。

---

### 方式 2：命令行快速生成（CLI 模式）
适合脚本自动化与批量任务调用：
```powershell
# 激活环境
conda activate E:\spider\Library\envs\cnki-review

# 生成指定主题综述
python generate_review.py --topic "牙周炎 AD 牙龈卟啉单胞菌"
```

---

### 方式 3：打包为独立 Windows 可执行程序 (.exe)
如果您希望将本工具分发给没有安装 Python / Conda 的其他同学或同事使用：

在 PowerShell 中直接运行打包脚本：
```powershell
python package_exe.py
```
*(或双击运行 `package_exe.bat`)*

打包完成后会在 `dist/` 目录下生成独立的 **`CNKI-Review-Generator`** 文件夹，内含 `CNKI-Review-Generator.exe`，**可直接拷贝到任何 Windows 电脑上双击使用，零环境依赖！**

---

## 二、交付物与 Zotero 一键 Refresh 联动全流程

生成完毕后，所有文件集中保存在输出目录中：

| 文件名 | 功能与操作 |
| :--- | :--- |
| **`periodontitis-ad-pg-review.docx`** | **主交付 Word 文档**。已默认注入 Zotero 活动引用域，可在 Word/WPS 中点击 **Zotero $\rightarrow$ Refresh** 一键刷新。 |
| **`Periodontitis_AD_Zotero_library.json`** | **Zotero 原生文献库**。在 Zotero 中点击 **文件 $\rightarrow$ 导入**，选择此文件即可一键导入全部 16 篇权威文献。 |
| **`Periodontitis_AD_Zotero_library.ris`** | **通用 RIS 文献库**。备用导入文件，兼容 EndNote、Mendeley。 |
| **`periodontitis-ad-pg-review.tex`** | **LaTeX 源码**。支持 `xelatex` 编译为印刷级 PDF。 |
