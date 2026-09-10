---
layout: doc
title: 快速入门
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/quickstart"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

本页面将引导你完成安装，并跑通首次有价值的 pi 会话。

## 安装

Pi 以 npm 包的形式发布：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会在安装过程中禁用依赖项的生命周期脚本。Pi 的常规 npm 安装无需执行任何安装脚本。

### 卸载

请使用安装 pi 时所用的包管理器。curl 安装脚本本质上是通过 npm 进行全局安装，因此无论是 curl 还是 npm 安装的版本，都需通过 npm 进行卸载：

```bash
# 通过 curl 安装脚本或 npm install -g 安装
npm uninstall -g @earendil-works/pi-coding-agent

# pnpm
pnpm remove -g @earendil-works/pi-coding-agent

# Yarn
yarn global remove @earendil-works/pi-coding-agent

# Bun
bun uninstall -g @earendil-works/pi-coding-agent
```

卸载 pi 后，设置、凭据、会话以及已安装的 pi 包会保留在 `~/.pi/agent/` 目录下。

### 启动

在希望 pi 处理的项目目录下启动：

```bash
cd /path/to/project
pi
```

## 身份验证

Pi 可通过 `/login` 使用订阅型服务，也可通过环境变量或认证文件使用 API 密钥型服务。

### 方式一：订阅登录

启动 pi 并执行：

```text
/login
```

然后选择服务提供商。内置的订阅登录支持 Claude Pro/Max、ChatGPT Plus/Pro（Codex）以及 GitHub Copilot。

### 方式二：API 密钥

在启动 pi 之前设置 API 密钥：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

你也可以运行 `/login` 并选择 API 密钥型服务，将密钥保存到 `~/.pi/agent/auth.json`。

所有受支持的服务提供商、环境变量以及云服务配置，请参见[服务提供商](providers.md)。

## 首次会话

pi 启动后，输入你的请求并按下回车键：

```text
Summarize this repository and tell me how to run its checks.
```

默认情况下，pi 为模型提供以下四个工具：

- `read` - 读取文件
- `write` - 创建或覆盖文件
- `edit` - 修改文件
- `bash` - 执行 shell 命令

更多内置的只读工具（`grep`、`find`、`ls`）可通过工具选项启用。Pi 在当前工作目录下运行，并可修改其中的文件。如需便捷回滚，建议使用 git 或其他支持检查点的版本管理工作流。

## 为 pi 提供项目级指令

Pi 会在启动时加载上下文文件。你可以添加 `AGENTS.md` 文件，告知 pi 在该项目中的工作方式：

```markdown
# Project Instructions

- Run `npm run check` after code changes.
- Do not run production migrations locally.
- Keep responses concise.
```

Pi 会加载：

- `~/.pi/agent/AGENTS.md` 用作全局指令
- 父目录与当前目录下的 `AGENTS.md` 或 `CLAUDE.md`

若目录中存在 `AGENTS.override.md`，Pi 将优先加载该文件，而非同目录下的 `AGENTS.md` 或 `CLAUDE.md`。

修改上下文文件后，请重启 pi 或执行 `/reload` 命令。

## 常见尝试

### 参考文件

在编辑器中输入 `@` 可对文件进行模糊搜索，也可以通过命令行传入文件：

```bash
pi @README.md "Summarize this"
pi @src/app.ts @src/app.test.ts "Review these together"
```

可通过 Ctrl+V（Windows 上为 Alt+V）粘贴图片或文本；图片也可以直接拖入支持的终端。

### 执行 Shell 命令

在交互模式下：

```text
!npm run lint
```

命令输出会一并发送给模型。使用 `!!command` 形式执行命令时，命令输出不会进入模型上下文。

### 切换模型

使用 `/model` 或 Ctrl+L 可为当前会话选择模型。在模型选择器中按 Ctrl+S，可将高亮的模型保存为启动默认模型。使用 `/thinking` 可为当前会话选择思考等级；在该选择器中按 Ctrl+S，可保存启动默认的思考等级。使用 Shift+Tab 可循环切换思考等级。使用 Ctrl+P / Shift+Ctrl+P 可在作用域模型之间循环切换。

### 稍后继续

会话会自动保存：

```bash
pi -c                  # 继续最近的会话
pi -r                  # 浏览历史会话
pi --name "my task"    # 在启动时设置会话显示名称
pi --session <path|id> # 打开指定的会话
```

在 pi 内部，可使用 `/resume`、`/new`、`/tree`、`/fork` 与 `/clone` 进行会话管理。

### 非交互模式

对于一次性提示：

```bash
pi -p "Summarize this codebase"
cat README.md | pi -p "Summarize this text"
pi -p @screenshot.png "What's in this image?"
```

使用 `--mode json` 输出 JSON 事件流；使用 `--mode rpc` 进行进程集成。

## 后续步骤

- [使用 Pi](usage.md) - 交互模式、斜杠命令、会话、上下文文件以及命令行参考。
- [服务提供商](providers.md) - 身份验证与模型配置。
- [设置](settings.md) - 全局与项目级别的配置。
- [按键绑定](keybindings.md) - 快捷键与自定义。
- [Pi 包](packages.md) - 安装共享的扩展、技能、提示词与主题。

平台相关说明：[Windows](windows.md)、[Termux](termux.md)、[tmux](tmux.md)、[终端设置](terminal-setup.md)、[Shell 别名](shell-aliases.md)。
