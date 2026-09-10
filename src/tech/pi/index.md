---
layout: doc
title: Pi 文档（中文翻译）
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  variant="full"
  project="Pi"
  source="https://pi.dev/docs/latest"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 是一个极简的终端编码工具。它的核心理念是保持精简，同时支持通过 TypeScript 扩展、技能（Skills）、提示词模板、主题以及 Pi 包进行扩展。

## 快速开始

通过 npm 安装 Pi：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 在安装过程中会禁用依赖项的生命周期脚本。Pi 在常规的 npm 安装中无需执行任何安装脚本。

在 Linux 或 macOS 上，你也可以使用安装脚本：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

若要卸载 pi 本身，请针对通过 npm 安装（包括 curl 安装脚本安装）的版本，使用 npm 卸载命令：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

对于通过 pnpm、Yarn 或 Bun 安装的版本，请使用对应的全局卸载命令：`pnpm remove -g @earendil-works/pi-coding-agent`、`yarn global remove @earendil-works/pi-coding-agent` 或 `bun uninstall -g @earendil-works/pi-coding-agent`。

然后在项目目录下运行：

```bash
pi
```

对于订阅型服务，请使用 `/login` 命令完成身份验证；也可以在启动 pi 之前设置 `ANTHROPIC_API_KEY` 之类的 API 密钥。

关于完整的首次运行流程，请参见[快速入门](quickstart.md)。

## 从这里开始

- [快速入门](quickstart.md) - 安装、身份验证，并运行第一个会话。
- [使用 Pi](usage.md) - 交互模式、斜杠命令、上下文文件以及命令行参考。
- [服务提供商](providers.md) - 内置提供商的订阅与 API 密钥配置。
- [llama.cpp](llama-cpp.md) - 运行本地路由器，并通过 `/llama` 管理模型。
- [安全](security.md) - 项目信任、沙箱边界与漏洞报告。
- [容器化](containerization.md) - 使用 Gondolin、Docker 或 OpenShell 将 pi 沙箱化。
- [设置](settings.md) - 全局与项目级别的设置。
- [按键绑定](keybindings.md) - 默认快捷键与自定义按键绑定。
- [会话](sessions.md) - 会话管理、分支与树形导航。
- [压缩](compaction.md) - 上下文压缩与分支摘要。

## 自定义

- [扩展](extensions.md) - 用于工具、命令、事件以及自定义 UI 的 TypeScript 模块。
- [技能](skills.md) - 可按需复用的 Agent Skills。
- [提示词模板](prompt-templates.md) - 可由斜杠命令展开的复用提示词。
- [主题](themes.md) - 内置与自定义的终端主题。
- [Pi 包](packages.md) - 打包并分享扩展、技能、提示词与主题。
- [自定义模型](models.md) - 为受支持的提供商 API 添加模型条目。
- [自定义提供商](custom-provider.md) - 实现自定义 API 与 OAuth 流程。

## 编程式使用

- [SDK](sdk.md) - 在 Node.js 应用中嵌入 pi。
- [RPC 模式](rpc.md) - 通过 stdin/stdout JSONL 进行集成。
- [JSON 事件流模式](json.md) - 输出结构化事件的打印模式。
- [TUI 组件](tui.md) - 为扩展构建自定义终端 UI。

## 参考

- [环境变量](environment-variables.md) - Pi 进程配置以及 bash 工具可访问的会话元数据。
- [会话格式](session-format.md) - JSONL 会话文件格式、条目类型与 SessionManager API。

## 平台设置

- [Windows](windows.md)
- [Android 上的 Termux](termux.md)
- [tmux](tmux.md)
- [终端设置](terminal-setup.md)
- [Shell 别名](shell-aliases.md)

## 开发

- [开发](development.md) - 本地设置、项目结构与调试。

## 版权与许可 {#license}

"Pi" 等名称、商标归其各自所有者所有；本项目仅作翻译引用。如原作者认为本翻译存在不当之处，欢迎通过 issue 联系，我们会及时调整或移除。

Pi 及其文档以 MIT 许可证发布。本翻译为衍生作品，同样以 MIT 许可证提供，并按其要求保留原始版权与许可声明：

> Copyright (c) 2025 Mario Zechner — Licensed under the MIT License. 原始许可证见 [earendil-works/pi · LICENSE](https://github.com/earendil-works/pi/blob/main/LICENSE)，完整全文见下方折叠内容。

<details>
<summary>展开查看 MIT License 全文</summary>

```text
MIT License

Copyright (c) 2025 Mario Zechner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>
