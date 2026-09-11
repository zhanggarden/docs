---
layout: doc
title: 设置
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/settings"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 使用 JSON 设置文件，项目设置会覆盖全局设置。

| 位置                        | 作用域           |
| --------------------------- | ---------------- |
| `~/.pi/agent/settings.json` | 全局（所有项目） |
| `.pi/settings.json`         | 项目（当前目录） |

直接编辑，或对常用选项使用 `/settings`。要以交互方式保存启动模型默认值，使用 `/model` 并在所需模型上按 Ctrl+S。要保存启动思考等级，使用 `/thinking` 并按 Ctrl+S。

## 项目信任

在交互式启动时，如果某个项目文件夹包含项目本地设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中没有该文件夹或其父文件夹的已保存决定，pi 会在信任该文件夹之前询问。信任一个项目允许 pi 加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目包，并执行项目扩展。

非交互模式（`-p`、`--mode json` 和 `--mode rpc`）不会显示信任提示。在没有适用的已保存信任决定时，它们使用全局设置中的 `defaultProjectTrust`：`ask`（默认）和 `never` 忽略这些项目资源，而 `always` 信任它们。传入 `--approve`/`-a` 或 `--no-approve`/`-na` 可为单次运行覆盖项目信任。

如果没有适用的扩展或已保存决定，`defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设为 `"ask"`、`"always"` 或 `"never"`，或用 `/settings` 更改。

`pi config` 和包命令使用相同的项目信任流程，但 `pi update` 从不提示。传入 `--approve` 可为单条命令信任项目本地设置，或 `--no-approve` 忽略它们。

在交互模式下使用 `/trust` 为未来会话保存项目信任决定，包括对直接父文件夹的信任。它只写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 使更改生效。

## 所有设置

### 模型与思考

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `defaultProvider` | string | - | 启动提供商（如 `"anthropic"`、`"openai"`；在 `/model` 中用 Ctrl+S 保存，或手动编辑） |
| `defaultModel` | string | - | 启动模型 ID（在 `/model` 中用 Ctrl+S 保存，或手动编辑） |
| `defaultThinkingLevel` | string | - | 启动思考等级（在 `/thinking` 中用 Ctrl+S 保存，或手动编辑）：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` |
| `modelThinkingLevels` | object | - | 按 `"provider/modelId"` 键控的每个模型启动思考等级；在 `/settings` → 每个模型的默认思考等级中配置，或手动编辑 |
| `hideThinkingBlock` | boolean | `false` | 在输出中隐藏思考块 |
| `showCacheMissNotices` | boolean | `false` | 显示显著提示词缓存未命中、压缩或分支摘要用量，以及提供商恢复诊断（如丢弃的 Anthropic 思考块）的记录通知 |
| `thinkingBudgets` | object | - | 每个思考等级的自定义 token 预算。Anthropic、Google 和 Bedrock 原生使用这些。OpenAI 兼容模型在设置了 `compat.thinkingTokenBudgetField`（或 `supportsThinkingTokenBudget`）时使用它们。 |

#### thinkingBudgets

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

### UI 与显示

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `theme` | string | `"dark"` | 主题名称（`"dark"`、`"light"` 或自定义） |
| `externalEditor` | string | `$VISUAL`，然后 `$EDITOR`，再然后 Windows 上的 Notepad 或其他平台的 `nano` | Ctrl+G 外部编辑器的命令；优先于环境变量 |
| `quietStartup` | boolean | `false` | 隐藏启动头 |
| `defaultProjectTrust` | string | `"ask"` | 回退项目信任行为：`"ask"`、`"always"` 或 `"never"`。仅全局设置 |
| `collapseChangelog` | boolean | `false` | 更新后显示精简的变更日志 |
| `enableInstallTelemetry` | boolean | `true` | 发送匿名的安装/更新 ping 和选定的提供商归属头。这不控制更新检查 |
| `enableAnalytics` | boolean | `false` | 选择加入分析数据共享。目前仅在实验性的首次设置（`PI_EXPERIMENTAL=1`）中询问 |
| `trackingId` | string | - | 分析跟踪标识符，在开启 `enableAnalytics` 时生成 |
| `doubleEscapeAction` | string | `"tree"` | 双击 Escape 的动作：`"tree"`、`"fork"` 或 `"none"` |
| `treeFilterMode` | string | `"default"` | `/tree` 的默认过滤：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"` |
| `editorPaddingX` | number | `0` | 输入编辑器的水平内边距（0-3） |
| `outputPad` | number | `1` | 用户消息、助手消息和思考的水平内边距（0 或 1） |
| `autocompleteMaxVisible` | number | `5` | 自动补全下拉框中的最大可见项数（3-20） |
| `showHardwareCursor` | boolean | `false` | 在 TUI 为 IME 支持定位时显示终端光标 |
| `tuiMode` | string | `"regular"` | 交互 TUI 模式：`"regular"` 或实验性的 `"fullscreen"`。从 `/settings` 更改立即生效；`--tui-mode` 在启动时覆盖此设置 |
| `fullscreenExitOutput` | string | `"transcript"` | 全屏退出输出：`"transcript"` 打印最终记录和恢复提示，而 `"resume-hint"` 恢复之前的屏幕并只打印恢复提示。在常规 TUI 模式下无效 |
| `fullscreenScrollbar` | string | `"auto"` | 全屏记录滚动条：`"auto"` 在滚动时或指针位于其最右列轨道上方时临时显示，`"always"` 保留该列并保持可见，`"hidden"` 隐藏它。在常规 TUI 模式下无效 |
| `fullscreenCopyOnSelect` | boolean | `true` | 在全屏模式下自动复制选中的文本。禁用后，选择保持高亮，`Ctrl+X` 复制活动选择 |

对于 VS Code，包含 `--wait`，以便 pi 在编辑器退出后恢复：

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测和更新检查

`enableInstallTelemetry` 控制向 `https://pi.dev/api/report-install` 发送的匿名安装/更新 ping，以及针对 OpenRouter、NVIDIA NIM 和 Cloudflare 提供商请求的 Pi 归属头。选择退出会同时禁用两者。它不会禁用更新检查；Pi 仍可获取 `https://pi.dev/api/latest-version` 来查找最新版本。

设置 `PI_SKIP_VERSION_CHECK=1` 以禁用 Pi 版本更新检查。使用 `--offline` 或 `PI_OFFLINE=1` 以禁用在本文所述的所有启动网络操作，包括更新检查、包更新检查以及安装/更新遥测。

### 网络

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `httpProxy` | string | - | 作为 `HTTP_PROXY` 和 `HTTPS_PROXY` 应用的 HTTP 代理 URL。仅全局设置。 |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `warnings.anthropicExtraUsage` | boolean | `true` | 当 Anthropic 订阅身份验证可能使用付费额外用量时显示警告 |

```json
{
  "warnings": {
    "anthropicExtraUsage": false
  }
}
```

### 压缩

| 设置                          | 类型    | 默认值  | 描述                       |
| ----------------------------- | ------- | ------- | -------------------------- |
| `compaction.enabled`          | boolean | `true`  | 启用自动压缩               |
| `compaction.reserveTokens`    | number  | `16384` | 为 LLM 响应保留的 token    |
| `compaction.keepRecentTokens` | number  | `20000` | 保留（不摘要）的近期 token |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

### 分支摘要

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `branchSummary.reserveTokens` | number | `16384` | 选择分支历史时保留的 token；输出上限为 4096 token |
| `branchSummary.skipPrompt` | boolean | `false` | 在 `/tree` 导航时跳过“是否摘要分支？”提示（默认为不摘要） |

### 重试

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `retry.enabled` | boolean | `true` | 在瞬时错误时启用自动智能体级重试 |
| `retry.maxRetries` | number | `3` | 最大智能体级重试次数 |
| `retry.baseDelayMs` | number | `2000` | 智能体级指数退避的基础延迟（2s、4s、8s） |
| `retry.maxAgentDelayMs` | number | `60000` | 最大智能体级重试延迟（60s） |
| `retry.provider.timeoutMs` | number | SDK 默认值 | 提供商/SDK 请求超时（毫秒） |
| `retry.provider.maxRetries` | number | `0` | 提供商/SDK 重试次数 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | 失败前服务器请求的最大延迟（60s） |

智能体级重试使用受 `retry.maxAgentDelayMs` 上限约束的指数退避，因此长时间的重试运行在长时间中断后仍能保持响应。

当提供商请求的重试延迟超过 `retry.provider.maxRetryDelayMs` 时，请求会立即失败并给出信息性错误，而不是静默等待。设为 `0` 可禁用该限制。

除非明确需要提供商级重试，否则将 `retry.provider.maxRetries` 保持在 `0`。将其设为大于 `0` 可能会让 SDK/提供商重试在 Pi 看到之前处理超出用量限制的错误，这在某些情况下可能会阻塞智能体，直到提供商配额重置。

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "maxAgentDelayMs": 60000,
    "provider": {
      "timeoutMs": 3600000,
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

### 消息投递

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `steeringMode` | string | `"one-at-a-time"` | steering 消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `followUpMode` | string | `"one-at-a-time"` | 后续消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `transport` | string | `"auto"` | 支持多种传输的提供商的首选传输：`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"` |
| `httpIdleTimeoutMs` | number | `300000` | HTTP 头/正文空闲超时（毫秒），也被具有显式流空闲超时的提供商使用。设为 `0` 禁用。 |
| `websocketConnectTimeoutMs` | number | `15000` | 支持 WebSocket 传输的提供商的 WebSocket 连接/打开握手超时（毫秒）。设为 `0` 禁用。 |

### 终端与图片

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `terminal.showImages` | boolean | `true` | 在终端中显示图片（若支持） |
| `terminal.imageWidthCells` | number | `60` | 内联图片的首选宽度（以终端单元格计） |
| `terminal.clearOnShrink` | boolean | `false` | 内容收缩时清除空行（可能导致闪烁） |
| `terminal.hyperlinks` | boolean 或 `"auto"` | `"auto"` | 覆盖 OSC 8 超链接支持（高级，仅 JSON） |
| `terminal.images` | string 或 boolean | `"auto"` | 用 `"kitty"`、`"iterm2"`、`false` 或 `"auto"` 覆盖图片协议支持（高级，仅 JSON） |
| `terminal.trueColor` | boolean 或 `"auto"` | `"auto"` | 覆盖真彩色支持（高级，仅 JSON） |
| `images.autoResize` | boolean | `true` | 将图片调整到最大 2000x2000。适用于 `@file` 附件、`read` 和工具返回的图片 |
| `images.blockImages` | boolean | `false` | 阻止所有图片发送给 LLM |

### Shell

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `shellPath` | string | - | 自定义 shell 路径（例如 Windows 上的 Cygwin）；支持以 `~` 开头的家目录 |
| `shellCommandPrefix` | string | - | 每条 bash 命令的前缀（例如 `"shopt -s expand_aliases"`） |
| `npmCommand` | string[] | - | 用于 npm 包查找/安装操作的命令 argv（例如 `["mise", "exec", "node@20", "--", "npm"]`） |

JSON 中的 Windows 路径必须使用正斜杠或转义的反斜杠：

```json
{
  "shellPath": "C:/Program Files/Git/bin/bash.exe"
}
```

```json
{
  "shellPath": "C:\\Program Files\\Git\\bin\\bash.exe"
}
```

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` 用于所有 npm 包管理操作，包括安装、卸载以及 git 包内部的依赖安装。用户作用域的 npm 包安装到 `~/.pi/agent/npm/` 下；项目作用域的 npm 包安装到 `.pi/npm/` 下。请按进程实际应被启动的方式使用 argv 风格条目。当配置了 `npmCommand` 时，git 包依赖安装使用普通的 `install`，以避免包装器或替代包管理器中的 npm 特定标志。

### 工具

| 设置           | 类型     | 默认值 | 描述                                            |
| -------------- | -------- | ------ | ----------------------------------------------- |
| `defaultTools` | string[] | -      | 初始启用的内置工具。省略时，Pi 使用其标准默认值 |

`defaultTools` 选择启动时启用的内置工具。扩展和 SDK 自定义工具保持启用。可用的内置工具有 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find` 和 `ls`：

```json
{
  "defaultTools": ["bash", "edit", "write"]
}
```

在 Windows 上，选择 `powershell` 而不是 `bash`，或两者都包含：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

空数组表示不启用任何内置工具，同时保留扩展和 SDK 自定义工具。`--tools` 用对所有工具的严格白名单替换此行为，`--no-tools` 禁用所有工具，`--no-builtin-tools` 禁用内置默认值。`--exclude-tools` 过滤结果列表。项目的 `defaultTools` 数组替换全局数组。

### 会话

| 设置         | 类型   | 默认值 | 描述                                               |
| ------------ | ------ | ------ | -------------------------------------------------- |
| `sessionDir` | string | -      | 会话文件的存储目录。接受绝对或相对路径，以及 `~`。 |

```json
{ "sessionDir": ".pi/sessions" }
```

当多个来源指定会话目录时，优先级为 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR`，然后是 settings.json 中的 `sessionDir`。

### 模型循环

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `enabledModels` | string[] | - | 用于 Ctrl+P 循环的模型模式（与 `--models` CLI 标志格式相同） |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| 设置 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `markdown.codeBlockIndent` | string | `"  "` | 代码块的缩进 |
| `markdown.mermaid` | string | `"streaming"` | Mermaid 渲染模式：`"off"`、`"final"` 或 `"streaming"` |

### 资源

这些设置定义从哪里加载扩展、技能、提示词和主题。

`~/.pi/agent/settings.json` 中的路径相对于 `~/.pi/agent` 解析。`.pi/settings.json` 中的路径相对于 `.pi` 解析。支持绝对路径和 `~`。

| 设置                  | 类型     | 默认值 | 描述                            |
| --------------------- | -------- | ------ | ------------------------------- |
| `packages`            | array    | `[]`   | 从中加载资源的 npm/git 包       |
| `extensions`          | string[] | `[]`   | 本地扩展文件路径或目录          |
| `skills`              | string[] | `[]`   | 本地技能文件路径或目录          |
| `prompts`             | string[] | `[]`   | 本地提示词模板路径或目录        |
| `themes`              | string[] | `[]`   | 本地主题文件路径或目录          |
| `enableSkillCommands` | boolean  | `true` | 将技能注册为 `/skill:name` 命令 |

数组支持 glob 模式和排除项。使用 `!pattern` 排除。使用 `+path` 强制包含一个精确路径，`-path` 强制排除一个精确路径。

#### packages

字符串形式加载包的所有资源：

```json
{
  "packages": ["pi-skills", "@org/my-extension"]
}
```

对象形式过滤要加载的资源：

```json
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search", "transcribe"],
      "extensions": []
    }
  ]
}
```

包管理详情参见 [packages.md](packages.md)。

## 示例

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "modelThinkingLevels": {
    "anthropic/claude-sonnet-4-20250514": "high"
  },
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "warnings": {
    "anthropicExtraUsage": true
  },
  "packages": ["pi-skills"]
}
```

## 项目覆盖

项目设置（`.pi/settings.json`）覆盖全局设置。嵌套对象会被合并：

```json
// ~/.pi/agent/settings.json（全局）
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 16384 }
}

// .pi/settings.json（项目）
{
  "compaction": { "reserveTokens": 8192 }
}

// 结果
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 8192 }
}
```
