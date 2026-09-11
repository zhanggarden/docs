---
layout: doc
title: 使用 Pi
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/usage"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

本页面汇总了快速入门页面上放不下的日常使用细节。

## 交互模式

<p align="center"><img src="./images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

界面有四个主要区域：

- **启动头** - 快捷键、已加载的上下文文件、提示词模板、技能和扩展
- **消息区** - 用户消息、助手响应、工具调用、工具结果、通知、错误和扩展 UI
- **编辑器** - 你输入的地方；边框颜色指示当前思考等级
- **页脚** - 工作目录、会话名称、token/缓存用量、成本、上下文用量和当前模型。总量包括助手响应、工具上报的用量和摘要生成。

编辑器可以被内置 UI（如 `/settings`）或自定义扩展 UI 临时替换。

### 编辑器功能

| 功能 | 方式 |
| --- | --- |
| 文件引用 | 输入 `@` 模糊搜索项目文件 |
| 路径补全 | 按 Tab 补全路径 |
| 多行输入 | Shift+Enter，或在 Windows Terminal 上用 Ctrl+Enter |
| 复制响应 | 在 `/tree` 中按 Ctrl+X 复制所选消息；否则复制最后一条助手消息，或当 `fullscreenCopyOnSelect` 被禁用时复制活动全屏文本选择 |
| 图片 | 用 Ctrl+V 粘贴，Windows 上为 Alt+V，或拖入终端 |
| Shell 命令 | `!command` 运行并将输出发送给模型 |
| 隐藏 Shell 命令 | `!!command` 运行但不将输出发送给模型 |
| 外部编辑器 | Ctrl+G 打开 `externalEditor`、`$VISUAL`、`$EDITOR`、Windows 上的 Notepad，或其他平台的 `nano` |

所有快捷键和自定义参见[按键绑定](keybindings.md)。

## 斜杠命令

在编辑器中输入 `/` 打开命令补全。扩展可以注册自定义命令，技能以 `/skill:name` 提供，提示词模板通过 `/templatename` 展开。

| 命令                     | 描述                                                   |
| ------------------------ | ------------------------------------------------------ |
| `/login`、`/logout`      | 管理 OAuth 或 API 密钥凭据                             |
| [`/llama`](llama-cpp.md) | 下载、加载和卸载 llama.cpp 路由器模型                  |
| `/model`                 | 切换模型；选择器中按 Ctrl+S 保存启动默认值             |
| `/thinking`              | 切换思考等级；选择器中按 Ctrl+S 保存启动默认值         |
| `/scoped-models`         | 启用/禁用用于 Ctrl+P 循环的模型                        |
| `/settings`              | 主题、消息投递、传输和其他偏好设置                     |
| `/resume`                | 从之前的会话中选择                                     |
| `/new`                   | 开始一个新会话                                         |
| `/name <name>`           | 设置会话显示名称                                       |
| `/session`               | 显示会话文件、ID、消息、token 和成本                   |
| `/tree`                  | 跳转到会话中的任意点并从那里继续                       |
| `/trust`                 | 为未来会话保存项目信任决定                             |
| `/fork`                  | 从之前的用户消息创建新会话                             |
| `/clone`                 | 将当前活动分支复制到一个新会话                         |
| `/compact [prompt]`      | 手动压缩上下文，可附带自定义指令                       |
| `/copy`                  | 将最后一条助手消息复制到剪贴板                         |
| `/export [file]`         | 将会话导出为 HTML 或 JSONL                             |
| `/import <file>`         | 从 JSONL 文件导入并恢复会话                            |
| `/share`                 | 上传为私有 GitHub gist，附带可分享的 HTML 链接         |
| `/reload`                | 重新加载按键绑定、扩展、技能、提示词、主题和上下文文件 |
| `/hotkeys`               | 显示所有键盘快捷键                                     |
| `/changelog`             | 显示版本历史                                           |
| `/quit`                  | 退出 pi                                                |

## 消息队列

你可以在智能体仍在工作时提交消息：

- **Enter** 排队一条 steering 消息，在当前助手轮次执行完其工具调用后投递。
- **Alt+Enter** 排队一条后续消息，在智能体完成所有工作后投递。
- **Escape** 中止并将排队的消息恢复到编辑器。
- **Alt+Up** 将排队的消息取回到编辑器。

在 Windows Terminal 上，Alt+Enter 默认是全屏。如果你希望 pi 收到该快捷键，请按[终端设置](terminal-setup.md)中的说明重映射它。

在[设置](settings.md)中用 `steeringMode` 和 `followUpMode` 配置投递。

## 会话

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。

```bash
pi -c                  # 继续最近的会话
pi -r                  # 浏览并选择一个会话
pi --no-session        # 临时模式；不保存
pi --name "my task"    # 在启动时设置会话显示名称
pi --session <path|id> # 使用特定的会话文件或会话 ID
pi --fork <path|id>    # 将会话派生为新的会话文件
```

有用的会话命令：

- `/session` 显示当前会话文件和 ID。
- `/tree` 导航文件内会话树，并可摘要被放弃的分支。
- `/fork` 从较早的用户消息创建新会话。
- `/clone` 将当前活动分支复制到一个新会话文件。
- `/compact` 摘要较旧的消息以释放上下文。

详情参见[会话](sessions.md)和[压缩](compaction.md)。

## 上下文文件

Pi 在启动时从以下位置加载 `AGENTS.md` 或 `CLAUDE.md`：

- `~/.pi/agent/AGENTS.md` 用于全局指令
- 父目录，从当前工作目录逐级向上
- 当前目录

如果某个目录包含 `AGENTS.override.md`，Pi 会加载它，而不是该目录中的 `AGENTS.md` 或 `CLAUDE.md`。其他目录的上下文文件仍正常分层。

使用上下文文件存放项目约定、命令、安全规则和偏好设置。使用 `--no-context-files` 或 `-nc` 禁用加载。

### 系统提示词文件

使用以下内容替换默认系统提示词：

- 项目的 `.pi/SYSTEM.md`
- 全局的 `~/.pi/agent/SYSTEM.md`

在上述任一位置使用 `APPEND_SYSTEM.md`，即可在不替换的情况下追加到默认提示词。

### 项目信任

在交互式启动时，如果某个项目文件夹包含项目本地设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中没有该文件夹或其父文件夹的已保存决定，pi 会在信任该文件夹之前询问。信任一个项目允许 pi 加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目包，并执行项目扩展。

在信任决定之前，pi 只加载上下文文件、用户/全局扩展和 CLI `-e` 扩展，以便它们能处理 `project_trust` 事件。项目本地扩展、项目包管理的扩展和项目设置只有在项目被信任后才会加载。当切换到来自不同 cwd、且其信任在当前进程中尚未解决的会话时，也适用这种分离。

非交互模式（`-p`、`--mode json` 和 `--mode rpc`）不会显示信任提示。在没有适用的已保存信任决定时，它们使用全局设置中的 `defaultProjectTrust`：`ask`（默认）和 `never` 忽略这些项目资源，而 `always` 信任它们。传入 `--approve`/`-a` 或 `--no-approve`/`-na` 可为单次运行覆盖项目信任。

如果没有适用的扩展或已保存决定，`defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设为 `"ask"`、`"always"` 或 `"never"`，或用 `/settings` 更改。

`pi config` 和包命令使用相同的项目信任流程，但 `pi update` 从不提示。传入 `--approve` 可为单条命令信任项目本地设置，或 `--no-approve` 忽略它们。

在交互模式下使用 `/trust` 为未来会话保存项目信任决定，包括对直接父文件夹的信任。它只写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 使更改生效。

## 导出和分享会话

使用 `/export [file]` 将会话写入 HTML。

使用 `/share` 上传一个私有 GitHub gist，附带可分享的 HTML 链接。

如果你使用 pi 进行开源工作，并希望发布会话用于模型、提示词、工具和评估研究，请参见 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。它会将会话发布到 Hugging Face 数据集。

## CLI 参考

```bash
pi [options] [--] [@files...] [messages...]
```

### 包命令

```bash
pi install <source> [-l]     # 安装包，-l 表示项目本地
pi remove <source> [-l]      # 移除包
pi uninstall <source> [-l]   # remove 的别名
pi update [source|self|pi]   # 仅更新 pi，或更新一个包来源
pi update --all              # 更新 pi 和包；协调固定的 git ref
pi update --extensions       # 仅更新包；协调固定的 git ref
pi update --models           # 仅刷新模型目录
pi update --self             # 仅更新 pi
pi update --extension <src>  # 更新一个包
pi list                      # 列出已安装的包
pi config                    # 启用/禁用包资源
```

这些命令管理 pi 包，`pi update` 可以更新 pi CLI 安装。要卸载 pi 本身，请参见[快速入门](quickstart.md#uninstall)。`pi config` 和项目包命令接受 `--approve`/`--no-approve`，用于为单条命令信任或忽略项目本地设置。`pi update` 从不提示项目信任。

包来源和安全说明参见 [Pi 包](packages.md)。

### 模式

| 标志                  | 描述                                                   |
| --------------------- | ------------------------------------------------------ |
| 默认                  | 交互模式                                               |
| `-p`、`--print`       | 打印响应并退出                                         |
| `--mode json`         | 将所有事件输出为 JSON 行；参见 [JSON 模式](json.md)    |
| `--mode rpc`          | 通过 stdin/stdout 的 RPC 模式；参见 [RPC 模式](rpc.md) |
| `--export <in> [out]` | 将会话导出为 HTML                                      |

在打印模式下，pi 也会读取管道输入的 stdin 并将其合并到初始提示词中：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项

| 选项                     | 描述                                                      |
| ------------------------ | --------------------------------------------------------- |
| `--provider <name>`      | 提供商，如 `anthropic`、`openai` 或 `google`              |
| `--model <pattern>`      | 模型模式或 ID；支持 `provider/id` 和可选的 `:<thinking>`  |
| `--api-key <key>`        | API 密钥，覆盖环境变量                                    |
| `--thinking <level>`     | `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `--models <patterns>`    | 逗号分隔的模式，用于 Ctrl+P 循环                          |
| `--list-models [search]` | 列出可用模型                                              |

### 会话选项

| 选项                         | 描述                                 |
| ---------------------------- | ------------------------------------ |
| `-c`、`--continue`           | 继续最近的会话                       |
| `-r`、`--resume`             | 浏览并选择一个会话                   |
| `--session <path\|id>`       | 使用特定的会话文件或部分 UUID        |
| `--fork <path\|id>`          | 将会话文件或部分 UUID 派生为新的会话 |
| `--session-dir <dir>`        | 自定义会话存储目录                   |
| `--no-session`               | 临时模式；不保存                     |
| `--name <name>`、`-n <name>` | 在启动时设置会话显示名称             |

### 工具选项

| 选项                                   | 描述                                    |
| -------------------------------------- | --------------------------------------- |
| `--tools <list>`、`-t <list>`          | 白名单特定的内置、扩展和自定义工具      |
| `--exclude-tools <list>`、`-xt <list>` | 禁用特定的内置、扩展和自定义工具        |
| `--no-builtin-tools`、`-nbt`           | 禁用内置工具，但保持扩展/自定义工具启用 |
| `--no-tools`、`-nt`                    | 禁用所有工具                            |

内置工具：`read`、`bash`、`powershell`（Windows）、`edit`、`write`、`grep`、`find`、`ls`。

### 资源选项

| 选项                         | 描述                                 |
| ---------------------------- | ------------------------------------ |
| `-e`、`--extension <source>` | 从路径、npm 或 git 加载扩展；可重复  |
| `--no-extensions`            | 禁用扩展发现                         |
| `--skill <path>`             | 加载一个技能；可重复                 |
| `--no-skills`                | 禁用技能发现                         |
| `--prompt-template <path>`   | 加载一个提示词模板；可重复           |
| `--no-prompt-templates`      | 禁用提示词模板发现                   |
| `--theme <path>`             | 加载一个主题；可重复                 |
| `--no-themes`                | 禁用主题发现                         |
| `--no-context-files`、`-nc`  | 禁用 `AGENTS.md` 和 `CLAUDE.md` 发现 |

将 `--no-*` 与显式标志结合，只加载你需要的内容，忽略设置。示例：

```bash
pi --no-extensions -e ./my-extension.ts
```

### 其他选项

| 选项                            | 描述                                               |
| ------------------------------- | -------------------------------------------------- |
| `--system-prompt <text>`        | 替换默认提示词；上下文文件和技能仍会追加           |
| `--append-system-prompt <text>` | 追加到系统提示词                                   |
| `--tui-mode <mode>`             | TUI 模式：`regular`（默认）或实验性的 `fullscreen` |
| `--use-theme <name[/name]>`     | 为本次运行设置初始交互主题，而不更改设置           |
| `--verbose`                     | 强制详细启动                                       |
| `-a`、`--approve`               | 为本次运行信任项目本地文件                         |
| `-na`、`--no-approve`           | 为本次运行忽略项目本地文件                         |
| `--`                            | 停止选项解析；其余参数为提示词或 `@file` 输入      |
| `-h`、`--help`                  | 显示帮助                                           |
| `-v`、`--version`               | 显示版本                                           |

在 `fullscreen` 模式下，记录在终端视口内滚动，而排队的消息、工作状态、扩展组件、编辑器和页脚保持固定在底部。鼠标/触控板输入滚动指针下方的区域；键盘视口操作始终可用。内联图片在支持 Kitty 图形协议的终端中可用，包括 Kitty 和 Ghostty。在 iTerm2 中，它们会渲染为文本占位符，因为其内联图片协议无法在应用程序拥有的滚动过程中删除或裁剪放置。在 `regular` 模式下，pi 使用主屏幕和终端拥有的回滚，iTerm2 内联图片继续正常渲染。终端特定的设置和变通方案参见[终端设置](terminal-setup.md)。

在 `/settings` 中设置 **TUI 模式**，可在 `regular` 和 `fullscreen` 之间立即切换，并为未来会话选择默认值。**全屏退出输出**控制退出全屏时是打印最终记录，还是恢复之前的屏幕并仅打印会话恢复提示。

### 文件参数

在文件前加 `@` 将其包含在消息中：

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
pi @code.ts @test.ts "Review these files"
```

### 示例

```bash
# 带初始提示词的交互模式
pi "List all .ts files in src/"

# 非交互模式
pi -p "Summarize this codebase"

# 以短横线开头的提示词
pi -p -- "- Summarize these points"

# 带管道 stdin 的非交互模式
cat README.md | pi -p "Summarize this text"

# 命名的一次性会话
pi --name "release audit" -p "Audit this repository"

# 不同的模型
pi --provider openai --model gpt-4o "Help me refactor"

# 带提供商前缀的模型
pi --model openai/gpt-4o "Help me refactor"

# 带思考等级简写的模型
pi --model sonnet:high "Solve this complex problem"

# 限制模型循环
pi --models "claude-*,gpt-4o"

# 只读模式
pi --tools read,grep,find,ls -p "Review the code"

# 禁用某个扩展或内置工具，同时保持其余可用
pi --exclude-tools ask_question
```

## 设计原则

Pi 保持核心精简，并将工作流特定的行为推入扩展、技能、提示词模板和包中。

它有意不包含内置的 MCP、子智能体、权限弹窗、计划模式、待办事项或后台 bash。你可以将这些工作流构建或安装为扩展或包，或使用容器和 tmux 等外部工具。

完整理由请阅读[博客文章](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。
