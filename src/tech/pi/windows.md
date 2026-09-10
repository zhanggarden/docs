---
layout: doc
title: Windows 设置
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/windows"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 在 Windows 上默认使用 Git Bash。检查的位置（按顺序）：

1. `~/.pi/agent/settings.json` 中的自定义路径
2. Git Bash（`C:\Program Files\Git\bin\bash.exe`）
3. PATH 上的 `bash.exe`（Cygwin、MSYS2、WSL）

对于大多数用户而言，[Git for Windows](https://git-scm.com/download/win) 已足够。

## PowerShell 工具

可选的 `powershell` 工具在可用时通过 `pwsh.exe` 运行命令，否则使用 Windows PowerShell。它以 `-NoProfile -NonInteractive -ExecutionPolicy Bypass` 启动 PowerShell。管理员强制执行的执行策略仍可优先于这些参数。

使用 `defaultTools` 替换面向模型的 `bash` 工具：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

或在比较行为时同时启用两者：

```json
{
  "defaultTools": ["read", "bash", "powershell", "edit", "write"]
}
```

`!` 和 `!!` 编辑器命令仍使用 Bash。

## 自定义 Bash 路径

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```
