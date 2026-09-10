---
layout: doc
title: 扩展
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/extensions"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

> pi 可以创建扩展。让它为你的使用场景构建一个。

扩展是扩展 pi 行为的 TypeScript 模块。它们可以订阅生命周期事件、注册可供 LLM 调用的自定义工具、添加命令等。

> **放置位置（用于 /reload）：** 将扩展放在 `~/.pi/agent/extensions/`（全局）或 `.pi/extensions/`（项目本地）以便自动发现。仅在进行快速测试时才使用 `pi -e ./path.ts`。位于自动发现位置的扩展可以通过 `/reload` 热重载。

**关键能力：**

- **自定义工具** - 通过 `pi.registerTool()` 注册可供 LLM 调用的工具
- **事件拦截** - 阻止或修改工具调用、注入上下文、自定义压缩
- **用户交互** - 通过 `ctx.ui` 提示用户（select、confirm、input、notify）
- **自定义 UI 组件** - 通过 `ctx.ui.custom()` 实现带键盘输入的完整 TUI 组件，用于复杂交互
- **自定义命令** - 通过 `pi.registerCommand()` 注册 `/mycommand` 之类的命令
- **会话持久化** - 通过 `pi.appendEntry()` 存储能跨重启保留的状态
- **自定义渲染** - 控制工具调用/结果和消息在 TUI 中的显示方式

**示例使用场景：**

- 权限门控（在执行 `rm -rf`、`sudo` 等之前确认）
- Git 检查点（每轮 stash，在分支上恢复）
- 路径保护（阻止写入 `.env`、`node_modules/`）
- 自定义压缩（按你的方式总结对话）
- 对话摘要（参见 `summarize.ts` 示例）
- 交互式工具（提问、向导、自定义对话框）
- 有状态工具（待办列表、连接池）
- 外部集成（文件监听器、webhook、CI 触发器）
- 等待时玩的游戏（参见 `snake.ts` 示例）

参见 [examples/extensions/](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/) 中的可运行实现。

## 目录

- [快速开始](#快速开始)
- [扩展位置](#扩展位置)
- [可用导入](#可用导入)
- [编写扩展](#编写扩展)
  - [扩展样式](#扩展样式)
- [事件](#事件)
  - [生命周期概览](#生命周期概览)
  - [资源事件](#资源事件)
  - [会话事件](#会话事件)
  - [智能体事件](#智能体事件)
  - [模型事件](#模型事件)
  - [工具事件](#工具事件)
- [ExtensionContext](#extensioncontext)
- [ExtensionCommandContext](#extensioncommandcontext)
- [ExtensionAPI 方法](#extensionapi-方法)
- [状态管理](#状态管理)
- [自定义工具](#自定义工具)
  - [动态工具加载](#动态工具加载)
- [自定义 UI](#自定义-UI)
- [错误处理](#错误处理)
- [模式行为](#模式行为)
- [示例索引](#示例索引)

## 快速开始

创建 `~/.pi/agent/extensions/my-extension.ts`：

```typescript
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

export default function (pi: ExtensionAPI) {
  // 响应事件
  pi.on('session_start', async (_event, ctx) => {
    ctx.ui.notify('Extension loaded!', 'info');
  });

  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName === 'bash' && event.input.command?.includes('rm -rf')) {
      const ok = await ctx.ui.confirm('Dangerous!', 'Allow rm -rf?');
      if (!ok) return { block: true, reason: 'Blocked by user' };
    }
  });

  // 注册一个自定义工具
  pi.registerTool({
    name: 'greet',
    label: 'Greet',
    description: 'Greet someone by name',
    parameters: Type.Object({
      name: Type.String({ description: 'Name to greet' })
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: 'text', text: `Hello, ${params.name}!` }],
        details: {}
      };
    }
  });

  // 注册一个命令
  pi.registerCommand('hello', {
    description: 'Say hello',
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || 'world'}!`, 'info');
    }
  });
}
```

使用 `--extension`（或 `-e`）标志进行测试：

```bash
pi -e ./my-extension.ts
```

## 扩展位置

> **安全性：** 扩展以你的完整系统权限运行，可以执行任意代码。只从你信任的来源安装。

扩展会从受信任的位置自动发现。项目本地的 `.pi/extensions` 条目仅在项目被信任后才会加载。

| 位置                                | 作用域             |
| ----------------------------------- | ------------------ |
| `~/.pi/agent/extensions/*.ts`       | 全局（所有项目）   |
| `~/.pi/agent/extensions/*/index.ts` | 全局（子目录）     |
| `.pi/extensions/*.ts`               | 项目本地           |
| `.pi/extensions/*/index.ts`         | 项目本地（子目录） |

通过 `settings.json` 添加额外路径：

```json
{
  "packages": ["npm:@foo/bar@1.0.0", "git:github.com/user/repo@v1"],
  "extensions": ["/path/to/local/extension.ts", "/path/to/local/extension/dir"]
}
```

要通过 npm 或 git 以 pi 包的形式分享扩展，参见 [packages.md](packages.md)。

## 可用导入

| 包                                | 用途                                                 |
| --------------------------------- | ---------------------------------------------------- |
| `@earendil-works/pi-coding-agent` | 扩展类型（`ExtensionAPI`、`ExtensionContext`、事件） |
| `typebox`                         | 工具参数的 Schema 定义                               |
| `@earendil-works/pi-ai`           | AI 工具（用于 Google 兼容枚举的 `StringEnum`）       |
| `@earendil-works/pi-tui`          | 用于自定义渲染的 TUI 组件                            |

npm 依赖也可以使用。在扩展旁边（或父目录中）添加一个 `package.json`，运行 `npm install`，来自 `node_modules/` 的导入就会被自动解析。

对于通过 `pi install`（npm 或 git）安装的分发 pi 包，运行时依赖必须放在 `dependencies` 中。包安装默认使用生产安装（`npm install --omit=dev`），因此 `devDependencies` 在运行时不可用；当配置了 `npmCommand` 时，git 包使用普通的 `install` 以兼容包装器。

Node.js 内置模块（`node:fs`、`node:path` 等）也可用。

## 编写扩展

扩展导出一个接收 `ExtensionAPI` 的默认工厂函数。工厂可以是同步或异步的：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // 订阅事件
  pi.on("event_name", async (event, ctx) => {
    // 使用 ctx.ui 进行用户交互
    const ok = await ctx.ui.confirm("Title", "Are you sure?");
    ctx.ui.notify("Done!", "info");
    ctx.ui.setStatus("my-ext", "Processing...");  // 页脚状态
    ctx.ui.setWidget("my-ext", ["Line 1", "Line 2"]);  // 编辑器上方的组件（默认）
  });

  // 注册工具、命令、快捷键、标志
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

扩展通过 [jiti](https://github.com/unjs/jiti) 加载，因此 TypeScript 无需编译即可工作。

如果工厂返回一个 `Promise`，pi 会在继续启动前 await 它。这意味着异步初始化会在 `session_start` 之前、`resources_discover` 之前、以及通过 `pi.registerProvider()` 排队的服务提供商注册被刷新之前完成。

### 异步工厂函数

使用异步工厂进行一次性启动工作，例如获取远程配置或动态发现可用模型。

```typescript
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export default async function (pi: ExtensionAPI) {
  const response = await fetch('http://localhost:1234/v1/models');
  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_window?: number;
      max_tokens?: number;
    }>;
  };

  pi.registerProvider('local-openai', {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '$LOCAL_OPENAI_API_KEY',
    api: 'openai-completions',
    models: payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096
    }))
  });
}
```

这种模式使获取到的模型在正常启动期间和 `pi --list-models` 中都可用。

### 长生命周期资源与关闭

扩展工厂可能运行在从不启动会话的调用中。不要从工厂启动后台资源，例如进程、套接字、文件监听器或定时器。

将后台资源的启动推迟到 `session_start` 或需要该资源的命令/工具/事件。注册一个幂等的 `session_shutdown` 处理器来关闭你启动的任何会话作用域资源。

### 扩展样式

**单文件** - 最简单，适用于小型扩展：

```text
~/.pi/agent/extensions/
└── my-extension.ts
```

**带 index.ts 的目录** - 适用于多文件扩展：

```text
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts        # 入口点（导出默认函数）
    ├── tools.ts        # 辅助模块
    └── utils.ts        # 辅助模块
```

**带依赖的包** - 适用于需要 npm 包的扩展：

```text
~/.pi/agent/extensions/
└── my-extension/
    ├── package.json    # 声明依赖和入口点
    ├── package-lock.json
    ├── node_modules/   # 在 npm install 之后
    └── src/
        └── index.ts
```

```json
// package.json
{
  "name": "my-extension",
  "dependencies": {
    "zod": "^3.0.0",
    "chalk": "^5.0.0"
  },
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

在扩展目录中运行 `npm install`，之后来自 `node_modules/` 的导入会自动工作。

## 事件

### 生命周期概览

```text
pi 启动
  │
  ├─► project_trust（仅用户/全局和 CLI 扩展，在项目资源加载之前）
  ├─► session_start { reason: "startup" }
  └─► resources_discover { reason: "startup" }
      │
      ▼
用户发送提示词 ───────────────────────────────────────────────┐
  │                                                          │
  ├─► （先检查扩展命令，若命中则跳过）                        │
  ├─► input（可拦截、转换或处理）                             │
  ├─► （若未处理，进行技能/模板展开）                          │
  ├─► before_agent_start（可注入消息、修改系统提示词）          │
  ├─► agent_start                                            │
  ├─► message_start / message_update / message_end           │
  │                                                          │
  │   ┌─── 轮次（在 LLM 调用工具时重复） ────┐                │
  │   │                                      │                │
  │   ├─► turn_start                         │                │
  │   ├─► context（可修改消息）               │                │
  │   ├─► before_provider_headers（可修改请求头）              │
  │   ├─► before_provider_request（可检查或替换载荷）           │
  │   ├─► after_provider_response（状态 + 请求头，在消费流之前） │
  │   │                                      │                │
  │   │   LLM 响应，可能调用工具：              │                │
  │   │     ├─► tool_execution_start         │                │
  │   │     ├─► tool_call（可阻止）            │                │
  │   │     ├─► tool_execution_update        │                │
  │   │     ├─► tool_result（可修改）          │                │
  │   │     └─► tool_execution_end           │                │
  │   │                                      │                │
  │   └─► turn_end                           │                │
  │                                                          │
  ├─► agent_end                                              │
  └─► agent_settled（无剩余重试/压缩/后续）                     │
                                                             │
用户发送另一条提示词 ◄──────────────────────────────────────────┘

/new（新建会话）或 /resume（切换会话）
  ├─► session_before_switch（可取消）
  ├─► session_shutdown
  ├─► session_start { reason: "new" | "resume", previousSessionFile? }
  └─► resources_discover { reason: "startup" }

/fork 或 /clone
  ├─► session_before_fork（可取消）
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/name 或 pi.setSessionName()
  └─► session_info_changed

/compact 或自动压缩
  ├─► session_before_compact（可取消或自定义）
  ├─► session_compact（成功）
  └─► session_compact_failed（失败或中止）

/tree 导航
  ├─► session_before_tree（可取消或自定义）
  └─► session_tree

/model 或 Ctrl+P（模型选择/循环）
  ├─► thinking_level_select（若模型变化改变/钳制了思考等级）
  └─► model_select

思考等级变化（设置、按键绑定、pi.setThinkingLevel()）
  └─► thinking_level_select

退出（Ctrl+C、Ctrl+D、SIGHUP、SIGTERM）
  └─► session_shutdown
```

### 启动事件

#### project_trust

在 pi 决定是否信任带有动态配置（`.pi` 或 `.agents/skills`）的项目之前触发。它在启动期间运行，以及当会话替换（例如 `/resume`）进入一个在当前进程中尚未解析信任的 cwd 时运行。只有用户/全局扩展和 CLI `-e` 扩展参与；项目本地扩展在信任解析完成之前不会加载。

```typescript
pi.on('project_trust', async (event, ctx) => {
  // event.cwd - 当前工作目录
  // ctx 具有有限的信任上下文：cwd、mode、hasUI，以及 select/confirm/input/notify UI 助手
  if (await ctx.ui.confirm('Trust project?', event.cwd)) {
    return { trusted: 'yes', remember: true };
  }
  return { trusted: 'undecided' };
});
```

`project_trust` 处理器必须返回 `{ trusted: "yes" | "no" | "undecided" }`。返回 `"yes"` 或 `"no"` 的用户/全局或 CLI 扩展拥有该决定；第一个 yes/no 决定胜出，并抑制内置的信任提示。使用 `remember: true` 来持久化 yes/no 决定；否则它只适用于当前进程。返回 `"undecided"` 让后续处理器或内置信任流程决定。在提示之前检查 `ctx.hasUI`。如果没有处理器返回 yes/no，则继续正常的信任解析：先应用保存的 `trust.json` 决定，然后 `defaultProjectTrust` 控制 pi 是默认询问、信任还是拒绝。

### 资源事件

#### resources_discover

在 `session_start` 之后触发，以便扩展可以贡献额外的技能、提示词和主题路径。启动路径使用 `reason: "startup"`。重载使用 `reason: "reload"`。

```typescript
pi.on('resources_discover', async (event, _ctx) => {
  // event.cwd - 当前工作目录
  // event.reason - "startup" | "reload"
  return {
    skillPaths: ['/path/to/skills'],
    promptPaths: ['/path/to/prompts'],
    themePaths: ['/path/to/themes']
  };
});
```

### 会话事件

参见 [会话格式](session-format.md) 了解会话存储内部结构和 SessionManager API。

#### session_start

在会话启动、加载或重载时触发。

```typescript
pi.on('session_start', async (event, ctx) => {
  // event.reason - "startup" | "reload" | "new" | "resume" | "fork"
  // event.previousSessionFile - 对 "new"、"resume" 和 "fork" 存在
  ctx.ui.notify(`Session: ${ctx.sessionManager.getSessionFile() ?? 'ephemeral'}`, 'info');
});
```

#### session_info_changed

当当前会话显示名称通过 `/name`、RPC 或 `pi.setSessionName()` 设置时触发。

```typescript
pi.on('session_info_changed', async (event, ctx) => {
  // event.name - 当前规范化名称，若已清除则为 undefined
  ctx.ui.notify(`Session renamed: ${event.name ?? '(none)'}`, 'info');
});
```

#### session_before_switch

在启动新会话（`/new`）或切换会话（`/resume`）之前触发。

```typescript
pi.on('session_before_switch', async (event, ctx) => {
  // event.reason - "new" 或 "resume"
  // event.targetSessionFile - 我们要切换到的会话（仅对 "resume"）

  if (event.reason === 'new') {
    const ok = await ctx.ui.confirm('Clear?', 'Delete all messages?');
    if (!ok) return { cancel: true };
  }
});
```

成功切换或新建会话后，pi 会为旧扩展实例触发 `session_shutdown`，为新会话重新加载并重新绑定扩展，然后触发 `session_start`，其 `reason: "new" | "resume"` 且带 `previousSessionFile`。在 `session_shutdown` 中做清理工作，然后在 `session_start` 中重建任何内存状态。

#### session_before_fork

通过 `/fork` 派生或通过 `/clone` 克隆时触发。

```typescript
pi.on('session_before_fork', async (event, ctx) => {
  // event.entryId - 所选条目的 ID
  // event.position - /fork 为 "before"，/clone 为 "at"
  return { cancel: true }; // 取消派生/克隆
  // 或
  return { skipConversationRestore: true }; // 保留用于未来的对话恢复控制
});
```

成功派生或克隆后，pi 会为旧扩展实例触发 `session_shutdown`，为新会话重新加载并重新绑定扩展，然后触发 `session_start`，其 `reason: "fork"` 且带 `previousSessionFile`。在 `session_shutdown` 中做清理工作，然后在 `session_start` 中重建任何内存状态。

#### session_before_compact / session_compact / session_compact_failed

在压缩时触发。参见 [compaction.md](compaction.md) 了解详情。

```typescript
pi.on('session_before_compact', async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // willRetry - 压缩后是否重试被中止的轮次（溢出恢复）

  // 取消：
  return { cancel: true };

  // 自定义摘要：
  return {
    compaction: {
      summary: '...',
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore
      // usage: summaryResponse.usage, // 可选；包含在会话总计中
    }
  };
});

pi.on('session_compact', async (event, ctx) => {
  // event.compactionEntry - 已保存的压缩
  // event.fromExtension - 是否由扩展提供
  // event.reason - "manual"（/compact）、"threshold" 或 "overflow"
  // event.willRetry - 压缩后是否重试被中止的轮次（溢出恢复）
});

pi.on('session_compact_failed', async (event, ctx) => {
  // event.reason - "manual"（/compact）、"threshold" 或 "overflow"
  // event.errorMessage - 对非中止失败存在
  // event.aborted - 对已取消/中止的压缩为 true
  // event.willRetry - 被中止的轮次在压缩后是否会重试
  // event.fromExtension - 是否正在使用扩展提供的压缩内容
});
```

#### session_before_tree / session_tree

在 `/tree` 导航时触发。参见 [会话](sessions.md) 了解树导航概念。

```typescript
pi.on('session_before_tree', async (event, ctx) => {
  const { preparation, signal } = event;
  return { cancel: true };
  // 或提供自定义摘要：
  return {
    summary: {
      summary: '...',
      // usage: summaryResponse.usage, // 可选；包含在会话总计中
      details: {}
    }
  };
});

pi.on('session_tree', async (event, ctx) => {
  // event.newLeafId、oldLeafId、summaryEntry、fromExtension
});
```

#### session_shutdown

在已启动的会话运行时被拆除之前触发。用它清理从 `session_start` 或其他会话作用域钩子打开的资源。

```typescript
pi.on('session_shutdown', async (event, ctx) => {
  // event.reason - "quit" | "reload" | "new" | "resume" | "fork"
  // event.targetSessionFile - 会话替换流程的目标会话
  // 清理、保存状态等
});
```

### 智能体事件

#### before_agent_start

在用户提交提示词之后、智能体循环之前触发。可以注入消息和/或修改系统提示词。

```typescript
pi.on('before_agent_start', async (event, ctx) => {
  // event.prompt - 用户的提示词文本
  // event.images - 附加的图像（如有）
  // event.systemPrompt - 当前处理器链式系统提示词
  //   （包含来自更早 before_agent_start 处理器的更改）
  // event.systemPromptOptions - 用于构建系统提示词的结构化选项
  //   .customPrompt - 任何自定义系统提示词（来自 --system-prompt、SYSTEM.md 或自定义模板）
  //   .selectedTools - 当前在提示词中激活的工具
  //   .toolSnippets - 每个工具的单行描述
  //   .promptGuidelines - 自定义指南要点
  //   .appendSystemPrompt - 来自 --append-system-prompt 标志的文本
  //   .cwd - 工作目录
  //   .contextFiles - AGENTS.md 文件和其他已加载的上下文文件
  //   .skills - 已加载的技能

  return {
    // 注入一条持久消息（存储在会话中，发送给 LLM）
    message: {
      customType: 'my-extension',
      content: 'Additional context for the LLM',
      display: true
    },
    // 为本轮替换系统提示词（跨扩展链式）
    systemPrompt: event.systemPrompt + '\n\nExtra instructions for this turn...'
  };
});
```

`systemPromptOptions` 字段让扩展能够访问 Pi 用于构建系统提示词的相同结构化数据。这样你可以在不重新发现资源或重新解析标志的情况下检查 Pi 已加载的内容——自定义提示词、指南、工具片段、上下文文件、技能。当你的扩展需要对系统提示词进行深入、有依据的更改，同时尊重用户提供的配置时，请使用它。

在 `before_agent_start` 内部，`event.systemPrompt` 和 `ctx.getSystemPrompt()` 都反映截至当前处理器的链式系统提示词。后续的 `before_agent_start` 处理器仍可再次修改它。

#### agent_start / agent_end / agent_settled

`agent_start` 在底层智能体运行开始时触发。`agent_end` 在该运行结束时触发，但 Pi 可能仍会自动重试、自动压缩并重试，或继续处理排队的后续消息。对于需要知道 Pi 不会再自动继续运行的状态集成，使用 `agent_settled`。

```typescript
pi.on('agent_start', async (_event, ctx) => {});

pi.on('agent_end', async (event, ctx) => {
  // event.messages - 本次底层运行的消息
});

pi.on('agent_settled', async (_event, ctx) => {
  // 除非另一个扩展启动了新的运行，否则此处 ctx.isIdle() 为 true。
});
```

#### ui_prompt_start / ui_prompt_end

针对阻塞式面向用户的扩展 UI 提示的仅通知生命周期事件。它们在 `ctx.ui.select()`、`ctx.ui.confirm()`、`ctx.ui.input()`、`ctx.ui.editor()` 和 `ctx.ui.custom()` 周围触发，以便宿主/状态集成可以报告"等待用户"而不是仅仅"运行中"。

嵌套或重叠的提示会合并为一个外部等待区间。处理器按尽力而为方式调用，在显示或关闭提示之前不会被 await。

```typescript
pi.on('ui_prompt_start', async (event, ctx) => {
  // event.reason === "ui_prompt"
  // event.kind: "select" | "confirm" | "input" | "editor" | "custom"
  // event.title: 提示标题（可用时）
});

pi.on('ui_prompt_end', async (event, ctx) => {
  // Pi 不再等待该 UI 提示区间。
});
```

#### turn_start / turn_end

每一轮（一次 LLM 响应 + 工具调用）触发。

```typescript
pi.on('turn_start', async (event, ctx) => {
  // event.turnIndex、event.timestamp
});

pi.on('turn_end', async (event, ctx) => {
  // event.turnIndex、event.message、event.toolResults
});
```

#### message_start / message_update / message_end

针对消息生命周期更新触发。

- `message_start` 和 `message_end` 针对用户、助手和 toolResult 消息触发。
- `message_update` 针对助手流式更新触发。
- `message_end` 处理器可以返回 `{ message }` 来替换最终消息。替换必须保持相同的 `role`。

```typescript
pi.on('message_start', async (event, ctx) => {
  // event.message
});

pi.on('message_update', async (event, ctx) => {
  // event.message
  // event.assistantMessageEvent（逐 token 的流事件）
});

pi.on('message_end', async (event, ctx) => {
  if (event.message.role !== 'assistant') return;

  return {
    message: {
      ...event.message,
      usage: {
        ...event.message.usage,
        cost: {
          ...event.message.usage.cost,
          total: 0.123
        }
      }
    }
  };
});
```

#### tool_execution_start / tool_execution_update / tool_execution_end

针对工具执行生命周期更新触发。

在并行工具模式下：

- `tool_execution_start` 在预检阶段按助手源顺序触发
- `tool_execution_update` 事件可能在不同工具之间交错
- `tool_execution_end` 在每个工具完成后按工具完成顺序触发
- 最终的 `toolResult` 消息事件仍会在之后按助手源顺序触发

```typescript
pi.on('tool_execution_start', async (event, ctx) => {
  // event.toolCallId、event.toolName、event.args
});

pi.on('tool_execution_update', async (event, ctx) => {
  // event.toolCallId、event.toolName、event.args、event.partialResult
});

pi.on('tool_execution_end', async (event, ctx) => {
  // event.toolCallId、event.toolName、event.result、event.isError
});
```

#### context

在每次 LLM 调用之前触发。以非破坏性方式修改消息。参见 [会话格式](session-format.md) 了解消息类型。

```typescript
pi.on('context', async (event, ctx) => {
  // event.messages - 深拷贝，可安全修改
  const filtered = event.messages.filter((m) => !shouldPrune(m));
  return { messages: filtered };
});
```

#### before_provider_headers

在出站 HTTP 请求头组装完成后触发。用它添加、覆盖或移除请求头。

处理器就地修改 `event.headers`。将键设为字符串以添加或覆盖它，或设为 `null` 以删除它。

```typescript
pi.on('before_provider_headers', (event, ctx) => {
  // 添加或覆盖 — 例如用于网关跟踪/归因的会话 ID
  event.headers['x-session-id'] = ctx.sessionManager.getSessionId();

  // 移除 pi 为本次调用添加的跟踪请求头
  event.headers['X-OpenRouter-Title'] = null;
});
```

每次服务提供商请求运行一次；重试复用相同的请求头，而不是重新触发钩子。

#### before_provider_request

在服务提供商特定的载荷构建完成之后、请求发送之前触发。处理器按扩展加载顺序运行。返回 `undefined` 保持载荷不变。返回任何其他值都会为后续处理器和实际请求替换该载荷。

此钩子可以重写服务提供商级别的系统指令或完全移除它们。这些载荷级别的更改不会反映在 `ctx.getSystemPrompt()` 中，后者报告的是 Pi 的系统提示词字符串，而不是最终序列化的服务提供商载荷。

```typescript
pi.on('before_provider_request', (event, ctx) => {
  console.log(JSON.stringify(event.payload, null, 2));

  // 可选：替换载荷
  // return { ...event.payload, temperature: 0 };
});
```

这主要用于调试服务提供商序列化和缓存行为。

#### after_provider_response

在收到 HTTP 响应之后、消费其流主体之前触发。处理器按扩展加载顺序运行。

```typescript
pi.on('after_provider_response', (event, ctx) => {
  // event.status - HTTP 状态码
  // event.headers - 规范化响应头
  if (event.status === 429) {
    console.log('rate limited', event.headers['retry-after']);
  }
});
```

请求头可用性取决于服务提供商和传输方式。抽象了 HTTP 响应的服务提供商可能不会暴露请求头。

### 模型事件

#### model_select

当模型通过 `/model` 命令、模型循环（`Ctrl+P`）或会话恢复而变化时触发。

```typescript
pi.on('model_select', async (event, ctx) => {
  // event.model - 新选择的模型
  // event.previousModel - 之前的模型（首次选择时为 undefined）
  // event.source - "set" | "cycle" | "restore"

  const prev = event.previousModel
    ? `${event.previousModel.provider}/${event.previousModel.id}`
    : 'none';
  const next = `${event.model.provider}/${event.model.id}`;

  ctx.ui.notify(`Model changed (${event.source}): ${prev} -> ${next}`, 'info');
});
```

用它来更新 UI 元素（状态栏、页脚）或在活动模型变化时执行模型特定的初始化。

#### thinking_level_select

当思考等级变化时触发。这仅是通知；处理器的返回值会被忽略。

```typescript
pi.on('thinking_level_select', async (event, ctx) => {
  // event.level - 新选择的思考等级
  // event.previousLevel - 之前的思考等级

  ctx.ui.setStatus('thinking', `thinking: ${event.level}`);
});
```

当 `pi.setThinkingLevel()`、模型变化或内置思考等级控件改变活动思考等级时，用它更新扩展 UI。

### 工具事件

#### tool_call

在 `tool_execution_start` 之后、工具执行之前触发。**可以阻止。** 使用 `isToolCallEventType` 来缩小类型并获取带类型的输入。

在 `tool_call` 运行之前，pi 会等待先前触发的 Agent 事件通过 `AgentSession` 排空。这意味着 `ctx.sessionManager` 已更新到当前的助手工具调用消息。

在默认的并行工具执行模式下，来自同一助手消息的兄弟工具调用会按顺序预检，然后并发执行。`tool_call` 不能保证在 `ctx.sessionManager` 中看到来自同一助手消息的兄弟工具结果。

`event.input` 是可变的。就地修改它以在执行前修补工具参数。

行为保证：

- 对 `event.input` 的修改会影响实际的工具执行
- 后续的 `tool_call` 处理器会看到更早处理器所做的修改
- 你的修改之后不会进行重新校验
- `tool_call` 的返回值通过 `{ block: true, reason?: string, terminate?: boolean }` 控制阻止
- `terminate` 只适用于被阻止的调用；仅当批次中每个最终结果都是终止的时，智能体才会提前停止

```typescript
import { isToolCallEventType } from '@earendil-works/pi-coding-agent';

pi.on('tool_call', async (event, ctx) => {
  // event.toolName - "bash"、"read"、"write"、"edit" 等
  // event.toolCallId
  // event.input - 工具参数（可变）

  // 内置工具：无需类型参数
  if (isToolCallEventType('bash', event)) {
    // event.input 是 { command: string; timeout?: number }
    event.input.command = `source ~/.profile\n${event.input.command}`;

    if (event.input.command.includes('rm -rf')) {
      return { block: true, reason: 'Dangerous command', terminate: true };
    }
  }

  if (isToolCallEventType('read', event)) {
    // event.input 是 { path: string; offset?: number; limit?: number }
    console.log(`Reading: ${event.input.path}`);
  }
});
```

#### 为自定义工具输入添加类型

自定义工具应导出其输入类型：

```typescript
// my-extension.ts
export type MyToolInput = Static<typeof myToolSchema>;
```

使用带显式类型参数的 `isToolCallEventType`：

```typescript
import { isToolCallEventType } from '@earendil-works/pi-coding-agent';
import type { MyToolInput } from 'my-extension';

pi.on('tool_call', (event) => {
  if (isToolCallEventType<'my_tool', MyToolInput>('my_tool', event)) {
    event.input.action; // 带类型
  }
});
```

#### tool_result

在工具执行完成之后、`tool_execution_end` 及最终工具结果消息事件触发之前触发。**可以修改结果。**

在并行工具模式下，`tool_result` 和 `tool_execution_end` 可能按工具完成顺序交错，而最终的 `toolResult` 消息事件仍会在之后按助手源顺序触发。

`tool_result` 处理器像中间件一样链式运行：

- 处理器按扩展加载顺序运行
- 每个处理器看到前一个处理器更改后的最新结果
- 处理器可以返回部分补丁（`content`、`details`、`isError` 或 `usage`）；省略的字段保持其当前值

在处理器内部使用 `ctx.signal` 进行嵌套异步工作。这使 Esc 能取消模型调用、`fetch()` 以及其他由扩展启动的可中止操作。

```typescript
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event, ctx) => {
  // event.toolName、event.toolCallId、event.input
  // event.content、event.details、event.isError、event.usage

  if (isBashToolResult(event)) {
    // event.details 的类型是 BashToolDetails
  }

  const response = await fetch("https://example.com/summarize", {
    method: "POST",
    body: JSON.stringify({ content: event.content }),
    signal: ctx.signal,
  });

  // 修改结果：
  return { content: [...], details: {...}, isError: false, usage: nestedModelUsage };
});
```

### 用户 Bash 事件

#### user_bash

当用户执行 `!` 或 `!!` 命令时触发。**可以拦截。**

```typescript
import { createLocalBashOperations } from '@earendil-works/pi-coding-agent';

pi.on('user_bash', (event, ctx) => {
  // event.command - bash 命令
  // event.excludeFromContext - 若为 !! 前缀则为 true
  // event.cwd - 工作目录

  // 选项 1：提供自定义操作（例如 SSH）
  return { operations: remoteBashOps };

  // 选项 2：包装 pi 的内置本地 bash 后端
  const local = createLocalBashOperations();
  return {
    operations: {
      exec(command, cwd, options) {
        return local.exec(`source ~/.profile\n${command}`, cwd, options);
      }
    }
  };

  // 选项 3：完全替换 - 直接返回结果
  return { result: { output: '...', exitCode: 0, cancelled: false, truncated: false } };
});
```

### 输入事件

#### input

当收到用户输入时触发，在检查扩展命令之后、技能和模板展开之前。事件看到的是原始输入文本，因此 `/skill:foo` 和 `/template` 尚未展开。

**处理顺序：**

1. 先检查扩展命令（`/cmd`）- 若命中，运行处理器并跳过 input 事件
2. `input` 事件触发 - 可以拦截、转换或处理
3. 若未处理：技能命令（`/skill:name`）展开为技能内容
4. 若未处理：提示词模板（`/template`）展开为模板内容
5. 智能体处理开始（`before_agent_start` 等）

```typescript
pi.on('input', async (event, ctx) => {
  // event.text - 原始输入（在技能/模板展开之前）
  // event.images - 附加的图像（如有）
  // event.source - "interactive"（键入）、"rpc"（API）或 "extension"（通过 sendUserMessage）
  // event.streamingBehavior - "steer" | "followUp" | undefined
  //   空闲时为 undefined，"steer" 用于流中打断，
  //   "followUp" 用于排队到智能体完成的消息

  // 转换：在展开之前重写输入
  if (event.text.startsWith('?quick '))
    return { action: 'transform', text: `Respond briefly: ${event.text.slice(7)}` };

  // 处理：无需 LLM 响应（扩展显示自己的反馈）
  if (event.text === 'ping') {
    ctx.ui.notify('pong', 'info');
    return { action: 'handled' };
  }

  // 按来源路由：跳过扩展注入消息的处理
  if (event.source === 'extension') return { action: 'continue' };

  // 在展开之前拦截技能命令
  if (event.text.startsWith('/skill:')) {
    // 可以转换、阻止或放行
  }

  return { action: 'continue' }; // 默认：放行到展开
});
```

**结果：**

- `continue` - 原样放行（处理器未返回任何内容时的默认值）
- `transform` - 修改文本/图像，然后继续展开
- `handled` - 完全跳过智能体（第一个返回此项的处理器胜出）

转换跨处理器链式进行。参见 [input-transform.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/input-transform.ts) 和 [input-transform-streaming.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/input-transform-streaming.ts) 了解 `streamingBehavior` 感知的路由。

## ExtensionContext

所有处理器都接收 `ctx: ExtensionContext`。

### ctx.ui

用于用户交互的 UI 方法。参见 [自定义 UI](#自定义-UI) 了解完整详情。

### ctx.mode

当前运行模式：`"tui"`、`"rpc"`、`"json"` 或 `"print"`。使用 `ctx.mode === "tui"` 来保护仅终端功能，例如 `custom()`、组件工厂、终端输入和直接 TUI 渲染。

### ctx.hasUI

在 TUI 和 RPC 模式下为 `true`。在打印模式（`-p`）和 JSON 模式下为 `false`。用它保护对话框方法（`select`、`confirm`、`input`、`editor`）以及在 TUI 和 RPC 模式下都可用的即发即弃方法（`notify`、`setStatus`、`setWidget`、`setTitle`、`setEditorText`）。在 RPC 模式下，某些 TUI 特定方法是空操作或返回默认值（参见 [rpc.md](rpc.md#extension-ui-protocol)）。

### ctx.cwd

当前工作目录。

在构造项目本地配置路径时，使用 `CONFIG_DIR_NAME` 而不是硬编码 `.pi`。重新命名的分发版可能使用不同的配置目录名。

```typescript
import { CONFIG_DIR_NAME, type ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { join } from 'node:path';

export default function (pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, 'my-extension.json');
    // ...
  });
}
```

### ctx.isProjectTrusted()

返回当前会话上下文是否激活了项目本地信任。这包括临时信任决定和 CLI 信任覆盖，而不仅仅是全局信任存储中保存的决定。

在读取只应对受信任项目生效的项目本地扩展配置之前使用它。

### ctx.sessionManager

对会话状态的只读访问。参见 [会话格式](session-format.md) 了解完整的 SessionManager API 和条目类型。

对于 `tool_call`，此状态在处理器运行之前已同步到当前的助手消息。在并行工具执行模式下，它仍不能保证包含来自同一助手消息的兄弟工具结果。

```typescript
ctx.sessionManager.getEntries(); // 所有条目
ctx.sessionManager.getBranch(); // 当前分支
ctx.sessionManager.buildContextEntries(); // 应用压缩后的活动分支条目
ctx.sessionManager.getLeafId(); // 当前叶子条目 ID
```

### ctx.modelRegistry / ctx.model / ctx.thinkingLevel / ctx.scopedModels

对模型、服务提供商和已解析身份验证的访问。`ctx.modelRegistry.getProvider(id)` 返回有效的 pi-ai 服务提供商，而 `getProviderAuth(id)` 解析其当前的 API 密钥、请求头、基础 URL 和服务提供商作用域的环境变量，无需加载模型。`ctx.model` 是活动模型，`ctx.thinkingLevel` 是其当前有效的思考等级。

`ctx.scopedModels` 是作用域限定到当前会话的只读模型列表——与 `/scoped-models` 命令显示的集合相同。它在会话启动时从 `--models` CLI 标志和 `enabledModels` 设置中解析（用 minimatch 匹配 `provider/modelId` 或裸 `modelId` 来对照可用目录）。当没有配置作用域时它为空，意味着每个可用模型都可使用。每个条目是 `{ model, thinkingLevel? }`，其中 `thinkingLevel` 仅当某个模式固定了它时才设置（例如 `anthropic/*:high`）。用它来填充一个与内置选择器一致的模型选择器，而不是通过 `ctx.modelRegistry.getAvailable()` 枚举整个目录。

#### 流式模型调用

使用 `ctx.modelRegistry.streamSimple(model, context, options)` 进行服务提供商中立的选项（例如 `reasoning`），或使用 `stream()` 进行 API 特定的选项。两者都使用已配置的服务提供商并解析身份验证，包括通过 `pi.registerProvider()` 注册的服务提供商。用它们代替 `pi-ai/compat` 流式函数，后者无法看到扩展的服务提供商注册。

两者都返回一个 `AssistantMessageEventStream`。迭代它以获取响应事件，并 await `.result()` 获取最终消息。设置失败会产生错误事件和错误结果。

### ctx.signal

当前的智能体中止信号，在没有活动智能体轮次时为 `undefined`。

用它进行由扩展处理器启动的可中止嵌套工作，例如：

- `fetch(..., { signal: ctx.signal })`
- 接受 `signal` 的模型调用
- 接受 `AbortSignal` 的文件或进程助手

`ctx.signal` 通常在活动轮次事件（如 `tool_call`、`tool_result`、`message_update` 和 `turn_end`）期间被定义。在空闲或非轮次上下文（如会话事件、扩展命令和 pi 空闲时触发的快捷键）中通常为 `undefined`。

```typescript
pi.on('tool_result', async (event, ctx) => {
  const response = await fetch('https://example.com/api', {
    method: 'POST',
    body: JSON.stringify(event),
    signal: ctx.signal
  });

  const data = await response.json();
  return { details: data };
});
```

### ctx.isIdle() / ctx.abort() / ctx.hasPendingMessages()

控制流助手。当 Pi 正在处理智能体运行、自动重试、自动压缩重试或排队的继续时，`ctx.isIdle()` 为 false。

### ctx.shutdown()

请求优雅关闭 pi。

- **交互模式：** 推迟到智能体空闲之后（处理完所有排队的 steer 和 follow-up 消息之后）。
- **RPC 模式：** 推迟到下一个空闲状态（完成当前命令响应后，等待下一个命令时）。
- **打印模式：** 空操作。当所有提示词处理完时进程自动退出。

在退出前向所有扩展触发 `session_shutdown` 事件。在所有上下文中可用（事件处理器、工具、命令、快捷键）。

```typescript
pi.on('tool_call', (event, ctx) => {
  if (isFatal(event.input)) {
    ctx.shutdown();
  }
});
```

### ctx.getContextUsage()

返回活动模型的当前上下文用量。在有最后助手用量时使用它，然后估算后续消息的 token。

```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) {
  // ...
}
```

### ctx.compact()

触发压缩而不等待完成。使用 `onComplete` 和 `onError` 进行后续操作。

```typescript
ctx.compact({
  customInstructions: 'Focus on recent changes',
  onComplete: (result) => {
    ctx.ui.notify('Compaction completed', 'info');
  },
  onError: (error) => {
    ctx.ui.notify(`Compaction failed: ${error.message}`, 'error');
  }
});
```

### ctx.getSystemPrompt()

返回 Pi 当前的系统提示词字符串。

- 在 `before_agent_start` 期间，这反映到目前为止为本轮所做的链式系统提示词更改。
- 它不包括后续的 `context` 消息修改。
- 它不包括 `before_provider_request` 载荷重写。
- 如果后续加载的扩展在你的扩展之后运行，它们仍可能更改最终发送的内容。

```typescript
pi.on('before_agent_start', (event, ctx) => {
  const prompt = ctx.getSystemPrompt();
  console.log(`System prompt length: ${prompt.length}`);
});
```

## ExtensionCommandContext

命令处理器接收 `ExtensionCommandContext`，它扩展了 `ExtensionContext` 并添加了会话控制方法。这些方法仅在命令中可用，因为从事件处理器调用它们可能导致死锁。

### ctx.getSystemPromptOptions()

返回 Pi 当前用于构建系统提示词的基础输入。

```typescript
const options = ctx.getSystemPromptOptions();
const contextPaths = options.contextFiles?.map((file) => file.path) ?? [];
```

它与 `before_agent_start` 的 `event.systemPromptOptions` 具有相同的形状和可变性：自定义提示词、活动工具、工具片段、提示词指南、追加的系统提示词文本、cwd、已加载的上下文文件和已加载的技能。它可能包含完整的上下文文件内容，因此将其视为敏感的扩展本地数据，避免通过命令列表、日志或自动补全元数据暴露它。

它报告当前的基础提示词输入。它不包括每轮的 `before_agent_start` 链式系统提示词更改、后续的 `context` 事件消息修改，或 `before_provider_request` 载荷重写。

### ctx.waitForIdle()

等待智能体完全稳定下来，包括自动重试、自动压缩重试和排队的继续：

```typescript
pi.registerCommand('my-cmd', {
  handler: async (args, ctx) => {
    await ctx.waitForIdle();
    // 智能体现在空闲，可以安全修改会话
  }
});
```

### ctx.newSession(options?)

创建新会话：

```typescript
const parentSession = ctx.sessionManager.getSessionFile();
const kickoff = 'Continue in the replacement session';

const result = await ctx.newSession({
  parentSession,
  setup: async (sm) => {
    sm.appendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'Context from previous session...' }],
      timestamp: Date.now()
    });
  },
  withSession: async (ctx) => {
    // 此处仅使用替换会话的 ctx。
    await ctx.sendUserMessage(kickoff);
  }
});

if (result.cancelled) {
  // 某个扩展取消了新会话
}
```

选项：

- `parentSession`：要记录在新会话头中的父会话文件
- `setup`：在 `withSession` 运行之前修改新会话的 `SessionManager`
- `withSession`：针对全新的替换会话上下文运行切换后的工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话替换生命周期与坑](#会话替换生命周期与坑)。

### ctx.fork(entryId, options?)

从特定条目派生，创建新的会话文件：

```typescript
const result = await ctx.fork('entry-id-123', {
  withSession: async (ctx) => {
    // 此处仅使用替换会话的 ctx。
    ctx.ui.notify('Now in the forked session', 'info');
  }
});
if (result.cancelled) {
  // 某个扩展取消了派生
}

const cloneResult = await ctx.fork('entry-id-456', { position: 'at' });
if (cloneResult.cancelled) {
  // 某个扩展取消了克隆
}
```

选项：

- `position`: `"before"`（默认）在所选用户消息之前派生，将该提示词恢复到编辑器中
- `position`: `"at"` 复制活动路径直到所选条目，而不恢复编辑器文本
- `withSession`：针对全新的替换会话上下文运行切换后的工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话替换生命周期与坑](#会话替换生命周期与坑)。

### ctx.navigateTree(targetId, options?)

导航到会话树中的不同位置。当智能体响应、手动或自动压缩、或另一个树导航处于活动状态时，即使使用 `summarize: false` 也会拒绝。这些冲突会使活动分支保持不变并拒绝 promise，而不是返回 `{ cancelled: true }`。等待活动操作完成（例如在命令处理器中使用 `await ctx.waitForIdle()`）并重试：

```typescript
const result = await ctx.navigateTree('entry-id-456', {
  summarize: true,
  customInstructions: 'Focus on error handling changes',
  replaceInstructions: false, // true = 完全替换默认提示词
  label: 'review-checkpoint'
});
```

选项：

- `summarize`：是否为被放弃的分支生成摘要
- `customInstructions`：摘要器的自定义指令
- `replaceInstructions`：若为 true，`customInstructions` 替换默认提示词而不是追加
- `label`：附加到分支摘要条目（或目标条目，如果不摘要）的标签

### ctx.switchSession(sessionPath, options?)

切换到不同的会话文件：

```typescript
const result = await ctx.switchSession('/path/to/session.jsonl', {
  withSession: async (ctx) => {
    await ctx.sendUserMessage('Resume work in the replacement session');
  }
});
if (result.cancelled) {
  // 某个扩展通过 session_before_switch 取消了切换
}
```

选项：

- `withSession`：针对全新的替换会话上下文运行切换后的工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话替换生命周期与坑](#会话替换生命周期与坑)。

要发现可用会话，使用静态的 `SessionManager.list()` 或 `SessionManager.listAll()` 方法：

```typescript
import { SessionManager } from '@earendil-works/pi-coding-agent';

pi.registerCommand('switch', {
  description: 'Switch to another session',
  handler: async (args, ctx) => {
    const sessions = await SessionManager.list(ctx.cwd);
    if (sessions.length === 0) return;
    const choice = await ctx.ui.select(
      'Pick session:',
      sessions.map((s) => s.file)
    );
    if (choice) {
      await ctx.switchSession(choice, {
        withSession: async (ctx) => {
          ctx.ui.notify('Switched session', 'info');
        }
      });
    }
  }
});
```

### 会话替换生命周期与坑

`withSession` 接收一个全新的 `ReplacedSessionContext`，它扩展了 `ExtensionCommandContext`，并带有绑定到替换会话的异步 `sendMessage()` 和 `sendUserMessage()` 助手。

生命周期与坑：

- `withSession` 仅在旧会话触发 `session_shutdown`、旧运行时被拆除、替换会话已重新绑定、且新扩展实例已收到 `session_start` 之后才运行。
- 回调仍执行在原始闭包中，而不是新扩展实例内。这意味着你的旧扩展实例可能已经在 `withSession` 开始之前运行了它的关闭清理。
- 捕获的旧 `pi` / 旧命令 `ctx` 会话绑定对象在替换后已过期，使用时会抛出错误。只使用传给 `withSession` 的 `ctx` 进行会话绑定工作。
- 之前提取的原始对象仍然是你的责任。例如，如果你在替换前捕获了 `const sm = ctx.sessionManager`，那么 `sm` 仍然是旧的 `SessionManager` 对象。替换后不要复用它。
- `withSession` 中的代码应假设被你的 `session_shutdown` 处理器失效的任何状态都已消失。只捕获能干净地跨关闭存活的数据，例如字符串、id 和序列化的配置。

安全模式：

```typescript
pi.registerCommand('handoff', {
  handler: async (_args, ctx) => {
    const kickoff = 'Continue from the replacement session';
    await ctx.newSession({
      withSession: async (ctx) => {
        await ctx.sendUserMessage(kickoff);
      }
    });
  }
});
```

不安全模式：

```typescript
pi.registerCommand('handoff', {
  handler: async (_args, ctx) => {
    const oldSessionManager = ctx.sessionManager;
    await ctx.newSession({
      withSession: async (_ctx) => {
        // 过期的旧对象：不要这样做
        oldSessionManager.getSessionFile();
        pi.sendUserMessage('wrong');
      }
    });
  }
});
```

### ctx.reload()

运行与 `/reload` 相同的重载流程。

```typescript
pi.registerCommand('reload-runtime', {
  description: 'Reload extensions, skills, prompts, themes, and context files',
  handler: async (_args, ctx) => {
    await ctx.reload();
    return;
  }
});
```

重要行为：

- `await ctx.reload()` 会为当前扩展运行时触发 `session_shutdown`
- 然后重新加载资源，并触发 `reason: "reload"` 的 `session_start` 和 reason 为 `"reload"` 的 `resources_discover`
- 当前正在运行的命令处理器仍在旧调用帧中继续
- `await ctx.reload()` 之后的代码仍从重载前的版本运行
- `await ctx.reload()` 之后的代码不得假设旧的内存扩展状态仍然有效
- 处理器返回后，未来的命令/事件/工具调用使用新的扩展版本

为了行为可预测，将重载视为该处理器的终点（`await ctx.reload(); return;`）。

工具以 `ExtensionContext` 运行，因此它们不能直接调用 `ctx.reload()`。使用命令作为重载入口点，然后暴露一个将该命令作为 follow-up 用户消息排队的工具。

LLM 可以调用以触发重载的示例工具：

```typescript
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

export default function (pi: ExtensionAPI) {
  pi.registerCommand('reload-runtime', {
    description: 'Reload extensions, skills, prompts, themes, and context files',
    handler: async (_args, ctx) => {
      await ctx.reload();
      return;
    }
  });

  pi.registerTool({
    name: 'reload_runtime',
    label: 'Reload Runtime',
    description: 'Reload extensions, skills, prompts, themes, and context files',
    parameters: Type.Object({}),
    async execute() {
      pi.sendUserMessage('/reload-runtime', { deliverAs: 'followUp' });
      return {
        content: [{ type: 'text', text: 'Queued /reload-runtime as a follow-up command.' }]
      };
    }
  });
}
```

## ExtensionAPI 方法

### pi.on(event, handler)

订阅事件。参见 [事件](#事件) 了解事件类型和返回值。

### pi.registerTool(definition)

注册可供 LLM 调用的自定义工具。参见 [自定义工具](#自定义工具) 了解完整详情。

`pi.registerTool()` 在扩展加载期间和启动之后都可以工作。你可以在 `session_start`、命令处理器或其他事件处理器内部调用它。新工具会在同一会话中立即刷新，因此它们会出现在 `pi.getAllTools()` 中，并且无需 `/reload` 即可被 LLM 调用。

使用 `pi.setActiveTools()` 在运行时启用或禁用工具（包括动态添加的工具）。

使用 `promptSnippet` 让自定义工具在 `Available tools` 中占一个单行条目，使用 `promptGuidelines` 在工具激活时将工具特定的要点追加到默认的 `Guidelines` 部分。

**重要：** `promptGuidelines` 要点会无工具名前缀地扁平追加到 `Guidelines` 部分。每条指南必须指明它所引用的工具——避免 "Use this tool when..."，因为 LLM 无法判断 "this" 指的是哪个工具。请改写成 "Use my_tool when..."。

参见 [dynamic-tools.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/dynamic-tools.ts) 获取完整示例。

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does",
  promptSnippet: "Summarize or transform text according to action",
  promptGuidelines: ["Use my_tool when the user asks to summarize previously generated text."],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    // 可选的兼容垫片。在 Schema 校验之前运行。
    // 返回当前的 Schema 形状，例如将遗留字段折叠
    // 到现代参数对象中。
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // 流式进度
    onUpdate?.({ content: [{ type: "text", text: "Working..." }] });

    return {
      content: [{ type: "text", text: "Done" }],
      details: { result: "..." },
    };
  },

  // 可选：自定义渲染
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

### pi.sendMessage(message, options?)

向会话中注入自定义消息。自定义消息参与 LLM 上下文。对于不应发送给 LLM 的持久 TUI-only 内容，使用 [`pi.appendEntry()`](#piappendentrycustomtype-data) 搭配 [`pi.registerEntryRenderer()`](#piregisterentryrenderercustomtype-renderer)。

```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Message text",
  display: true,
  details: { ... },
}, {
  triggerTurn: true,
  deliverAs: "steer",
});
```

**选项：**

- `deliverAs` - 投递模式：
  - `"steer"`（默认）- 在流式输出时将消息排队。在当前助手轮次完成其工具调用执行之后、下一次 LLM 调用之前投递。
  - `"followUp"` - 等待智能体完成。仅当智能体没有更多工具调用时才投递。
  - `"nextTurn"` - 为下一次用户提示词排队。不会打断或触发任何东西。
- `triggerTurn: true` - 如果智能体空闲，立即触发 LLM 响应。仅适用于 `"steer"` 和 `"followUp"` 模式（对 `"nextTurn"` 忽略）。

### pi.sendUserMessage(content, options?)

向智能体发送用户消息。与发送自定义消息的 `sendMessage()` 不同，它发送一条真正的用户消息，看起来像用户键入的。总是触发一轮。

```typescript
// 简单文本消息
pi.sendUserMessage('What is 2+2?');

// 带内容数组（文本 + 图像）
pi.sendUserMessage([
  { type: 'text', text: 'Describe this image:' },
  { type: 'image', source: { type: 'base64', mediaType: 'image/png', data: '...' } }
]);

// 流式输出期间 - 必须指定投递模式
pi.sendUserMessage('Focus on error handling', { deliverAs: 'steer' });
pi.sendUserMessage('And then summarize', { deliverAs: 'followUp' });

// 选择加入扩展命令分发和技能/提示词模板展开
pi.sendUserMessage('/review src/index.ts', { expandPromptTemplates: true });
```

**选项：**

- `deliverAs` - 当智能体正在流式输出时必需：
  - `"steer"` - 将消息排队，在当前助手轮次完成其工具调用执行后投递
  - `"followUp"` - 等待智能体完成所有工具
- `expandPromptTemplates` - 分发扩展命令并展开技能命令和提示词模板。默认为 `false`。

不流式输出时，消息立即发送并触发新一轮。流式输出时未指定 `deliverAs` 会抛出错误。

参见 [send-user-message.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/send-user-message.ts) 获取完整示例。

### pi.appendEntry(customType, data?)

持久化扩展数据。自定义条目**不**参与 LLM 上下文。在交互模式下，当与 `pi.registerEntryRenderer()` 搭配时，它们也可以在聊天记录中渲染。

```typescript
pi.appendEntry('my-state', { count: 42 });
pi.appendEntry('status-card', { title: 'Indexed files', count: 17 });

// 在重载时恢复
pi.on('session_start', async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === 'custom' && entry.customType === 'my-state') {
      // 从 entry.data 重建
    }
  }
});
```

### pi.setSessionName(name)

设置会话显示名称（在会话选择器中显示，而不是第一条消息）。

```typescript
pi.setSessionName('Refactor auth module');
```

### pi.getSessionName()

获取当前会话名称（若已设置）。

```typescript
const name = pi.getSessionName();
if (name) {
  console.log(`Session: ${name}`);
}
```

### pi.setLabel(entryId, label)

在条目上设置或清除标签。标签是用户定义的标记，用于书签和导航（显示在 `/tree` 选择器中）。

```typescript
// 设置标签
pi.setLabel(entryId, 'checkpoint-before-refactor');

// 清除标签
pi.setLabel(entryId, undefined);

// 通过 sessionManager 读取标签
const label = ctx.sessionManager.getLabel(entryId);
```

标签持久化在会话中并跨重启存活。用它们标记对话树中的重要位置（轮次、检查点）。

### pi.registerCommand(name, options)

注册命令。

如果多个扩展注册了相同的命令名，pi 会保留它们全部，并按加载顺序分配数字调用后缀，例如 `/review:1` 和 `/review:2`。

```typescript
pi.registerCommand('stats', {
  description: 'Show session statistics',
  handler: async (args, ctx) => {
    const count = ctx.sessionManager.getEntries().length;
    ctx.ui.notify(`${count} entries`, 'info');
  }
});
```

可选：为 `/command ...` 添加参数自动补全：

```typescript
import type { AutocompleteItem } from '@earendil-works/pi-tui';

pi.registerCommand('deploy', {
  description: 'Deploy to an environment',
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ['dev', 'staging', 'prod'];
    const items = envs.map((e) => ({ value: e, label: e }));
    const filtered = items.filter((i) => i.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Deploying: ${args}`, 'info');
  }
});
```

### pi.getCommands()

获取当前会话中可通过 `prompt` 调用的斜杠命令。包括扩展命令、提示词模板和技能命令。列表与 RPC `get_commands` 的排序一致：先是扩展，然后是模板，再是技能。

```typescript
const commands = pi.getCommands();
const bySource = commands.filter((command) => command.source === 'extension');
const userScoped = commands.filter((command) => command.sourceInfo.scope === 'user');
```

每个条目具有以下形状：

```typescript
{
  name: string; // 不带前导斜杠的可调用命令名。可能带后缀，如 "review:1"
  description?: string;
  source: "extension" | "prompt" | "skill";
  sourceInfo: {
    path: string;
    source: string;
    scope: "user" | "project" | "temporary";
    origin: "package" | "top-level";
    baseDir?: string;
  };
}
```

使用 `sourceInfo` 作为规范的来源字段。不要从命令名或临时的路径解析推断所有权。

内置交互命令（如 `/model` 和 `/settings`）不包含在这里。它们只在交互模式下处理，如果通过 `prompt` 发送则不会执行。

### pi.registerMessageRenderer(customType, renderer)

为你的 `customType` 自定义消息注册自定义 TUI 渲染器。自定义消息用 `pi.sendMessage()` 创建并参与 LLM 上下文。参见 [自定义 UI](#自定义-UI)。

### pi.registerMarkdownTransformer(transformer)

为普通用户文本、助手文本和思考块中的 Markdown 注册一个转换器。转换器按扩展加载顺序运行，每个转换器接收前一个转换器返回的 Markdown。链完成后，Pi 用其内置渲染器渲染转换后的内容。

转换器接收 Markdown 字符串和一个包含以下内容的上下文：

- `messageType` — `"user"`、`"assistant"` 或 `"assistant-thinking"`
- `isStreaming` — 对部分助手更新为 `true`；对用户、已定稿助手和恢复的消息为 `false`
- `availableWidth` — 可供转换后的 Markdown 内容使用的精确终端列数

返回转换后的 Markdown：

```typescript
pi.registerMarkdownTransformer((markdown, { messageType, isStreaming }) => {
  if (isStreaming || messageType === 'assistant-thinking') return markdown;
  return markdown.replaceAll('-->', '→');
});
```

如果转换器抛出错误，Pi 保留到目前为止产生的 Markdown 并继续下一个转换器。该钩子仅用于显示：原始消息在会话和模型上下文中保持不变。它针对新用户消息、助手流式更新、恢复的会话消息和终端宽度变化运行，因此转换器应保持同步且开销低。

### pi.registerEntryRenderer(customType, renderer)

为你的 `customType` 自定义条目注册自定义 TUI 渲染器。自定义条目用 `pi.appendEntry()` 创建，不参与 LLM 上下文。

```typescript
import { Box, Text } from '@earendil-works/pi-tui';

pi.registerEntryRenderer('status-card', (entry, { expanded }, theme) => {
  const data = entry.data as { title: string; count: number };
  const box = new Box(1, 1, (text) => theme.bg('customMessageBg', text));
  box.addChild(new Text(`${theme.bold(data.title)}: ${data.count}`));
  if (expanded) {
    box.addChild(new Text(theme.fg('dim', JSON.stringify(data, null, 2))));
  }
  return box;
});

pi.appendEntry('status-card', { title: 'Indexed files', count: 17 });
```

### pi.registerShortcut(shortcut, options)

注册键盘快捷键。参见 [keybindings.md](keybindings.md) 了解快捷键格式和内置按键绑定。

```typescript
pi.registerShortcut('ctrl+shift+p', {
  description: 'Toggle plan mode',
  handler: async (ctx) => {
    ctx.ui.notify('Toggled!');
  }
});
```

### pi.registerFlag(name, options)

注册 CLI 标志。

```typescript
pi.registerFlag('plan', {
  description: 'Start in plan mode',
  type: 'boolean',
  default: false
});

// 检查值
if (pi.getFlag('plan')) {
  // 计划模式已启用
}
```

### pi.exec(command, args, options?)

执行 shell 命令。

```typescript
const result = await pi.exec('git', ['status'], { signal, timeout: 5000 });
// result.stdout、result.stderr、result.code、result.killed
```

### pi.getActiveTools() / pi.getAllTools() / pi.setActiveTools(names)

管理活动工具。这对内置工具和动态注册的工具都适用。`pi.getActiveTools()` 返回活动工具名，类型为 `string[]`；`pi.getAllTools()` 返回所有已配置工具的元数据。

```typescript
const active = pi.getActiveTools(); // ["read", "bash", ...]
const all = pi.getAllTools();
// all = [{
//   name: "read",
//   description: "Read file contents...",
//   parameters: ...,
//   promptGuidelines: ["Use read to examine files instead of cat or sed."],
//   sourceInfo: { path: "<builtin:read>", source: "builtin", scope: "temporary", origin: "top-level" }
// }, ...]
const builtinTools = all.filter((t) => t.sourceInfo.source === 'builtin');
const extensionTools = all.filter(
  (t) => t.sourceInfo.source !== 'builtin' && t.sourceInfo.source !== 'sdk'
);
pi.setActiveTools([...new Set([...active, 'my_custom_tool'])]); // 保留当前工具并启用 my_custom_tool
pi.setActiveTools(['read', 'bash']); // 切换到只读
```

`pi.getAllTools()` 返回 `name`、`description`、`parameters`、`promptGuidelines` 和 `sourceInfo`。

典型的 `sourceInfo.source` 值：

- 内置工具为 `builtin`
- 通过 `createAgentSession({ customTools })` 传入的工具为 `sdk`
- 由扩展注册的工具为扩展来源元数据

### pi.setModel(model)

为当前会话设置模型。该更改记录在会话历史中，并在该会话恢复时还原，但它不会更改新会话使用的已配置 `defaultProvider` 或 `defaultModel`。如果模型的提供商未配置身份验证，则返回 `false`。参见 [models.md](models.md) 了解如何配置自定义模型。

```typescript
const model = ctx.modelRegistry.find('anthropic', 'claude-sonnet-4-5');
if (model) {
  const success = await pi.setModel(model);
  if (!success) {
    ctx.ui.notify('No API key for this model', 'error');
  }
}
```

### pi.getThinkingLevel() / pi.setThinkingLevel(level)

获取当前思考等级。等级会被钳制到模型能力（非推理模型始终使用 "off"）。更改会触发 `thinking_level_select`。

`pi.setThinkingLevel()` 更改当前会话的思考等级。该更改记录在会话历史中，并在该会话恢复时还原，但它不会更改新会话使用的已配置默认值。

```typescript
const current = pi.getThinkingLevel(); // "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
pi.setThinkingLevel('high');
```

### pi.events

用于扩展之间通信的共享事件总线：

```typescript
pi.events.on("my:event", (data) => { ... });
pi.events.emit("my:event", { ... });
```

### pi.registerProvider(name, config)

动态注册或覆盖模型服务提供商。对代理、自定义端点或团队范围的模型配置很有用。

在扩展工厂函数期间进行的调用会被排队，并在运行器初始化后应用。在那之后进行的调用——例如来自用户设置流程之后的命令处理器——会立即生效，无需 `/reload`。

动态服务提供商可以实现 `refreshModels`。Pi 在模型刷新期间调用它，通过服务提供商同步发布返回的列表，并传入规范的凭据/存储目录/网络/信号上下文。扩展决定是否通过经过代次校验的 `context.publish({ persist: entry })` 持久化目录元数据；像 llama.cpp 这样的实时服务器可以返回模型而不持久化它们。

`context.signal` 始终是一个具体的信号，服务提供商回调必须将它传给阻塞 I/O。公共的 `ModelRuntime.refresh()` 和 `ModelRegistry.refresh()` 调用接受可选信号，省略时无界；扩展和应用程序自行选择截止时间。取消会停止调用方的等待，即使服务提供商忽略信号，但仍需要协作来停止底层工作。

需要原生提供商身份验证、过滤、刷新或流行为的扩展，可以从 `@earendil-works/pi-ai` 注册一个完整的 `Provider`。该提供商成为组合基础，`models.json` 覆盖仍在其上应用。

```typescript
import { createProvider, openAICompletionsApi } from "@earendil-works/pi-ai";

const provider = createProvider({
  id: "local-server",
  name: "Local Server",
  baseUrl: "http://localhost:8080/v1",
  auth: {
    apiKey: {
      name: "Local server setup",
      async login(interaction) {
        return {
          type: "api_key",
          key: await interaction.prompt({ type: "secret", message: "API key" }),
        };
      },
      async resolve({ credential }) {
        return credential?.key
          ? { auth: { apiKey: credential.key }, source: "stored API key" }
          : undefined;
      },
    },
  },
  models: [],
  api: openAICompletionsApi(),
});

pi.registerProvider(provider);

// 用自定义模型注册新提供商
pi.registerProvider("my-proxy", {
  name: "My Proxy",
  baseUrl: "https://proxy.example.com",
  apiKey: "$PROXY_API_KEY",  // 环境变量引用
  api: "anthropic-messages",
  models: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet (proxy)",
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384
    }
  ]
});

// 注册实时 llama.cpp 目录，而不持久化发现的模型
pi.registerProvider("llama.cpp", {
  baseUrl: "http://localhost:8080/v1",
  apiKey: "local",
  api: "openai-completions",
  async refreshModels({ signal }) {
    const response = await fetch("http://localhost:8080/v1/models", { signal });
    const { data } = await response.json();
    return data.map(({ id }) => ({
      id,
      name: id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 16384
    }));
  }
});

// 覆盖现有提供商的 baseUrl（保留所有模型）
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com"
});

// 注册带 OAuth 支持的提供商以支持 /login
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      // 自定义 OAuth 流程
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Enter code:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials, signal) {
      signal.throwIfAborted();
      // 刷新逻辑
      return credentials;
    },
    getApiKey(credentials) {
      return credentials.access;
    }
  }
});
```

对象形式接受完整的 pi-ai `Provider`，包括原生 `auth`、`getModels`、`refreshModels`、`filterModels`、`stream` 和 `streamSimple` 行为。

**遗留配置选项：**

- `name` - 提供商在 UI（如 `/login`）中的显示名称。
- `baseUrl` - API 端点 URL。定义模型时必需。
- `apiKey` - API 密钥字面量、环境变量插值（`$ENV_VAR` 或 `${ENV_VAR}`）或前导 `!command`。定义模型时必需（除非提供了 `oauth`）。`$$` 转义 `$`，`$!` 转义字面量 `!` 而不触发命令执行。
- `api` - API 类型：`"anthropic-messages"`、`"openai-completions"`、`"openai-responses"` 等。
- `headers` - 包含在请求中的自定义请求头。
- `authHeader` - 若为 true，自动添加 `Authorization: Bearer` 请求头。
- `models` - 模型定义数组。若提供，替换此提供商的所有现有模型。模型定义可以设置 `baseUrl` 来覆盖该模型的服务提供商端点。
- `refreshModels` - 异步动态发现回调。它返回的模型替换扩展提供的模型。`context.stored` 包含持久化的提供商快照；仅当更新后的目录数据应持久化时，才使用经过代次校验的 `context.publish({ persist: entry })`。使用 `persist: null` 删除该快照。
- `oauth` - 用于 `/login` 支持的 OAuth 提供商配置。提供后，该提供商出现在登录菜单中。
- `streamSimple` - 用于非标准 API 的自定义流式实现。

参见 [custom-provider.md](custom-provider.md) 了解高级主题：自定义流式 API、OAuth 详情、模型定义参考。

### pi.unregisterProvider(name)

移除先前注册的提供商及其模型。被该提供商覆盖的内置模型会被恢复。如果该提供商未注册，则无效果。

与 `registerProvider` 一样，在初始加载阶段之后调用时立即生效，因此无需 `/reload`。

```typescript
pi.registerCommand('my-setup-teardown', {
  description: 'Remove the custom proxy provider',
  handler: async (_args, _ctx) => {
    pi.unregisterProvider('my-proxy');
  }
});
```

## 状态管理

带状态的扩展应将其状态存储在工具结果的 `details` 中，以获得正确的分支支持：

```typescript
export default function (pi: ExtensionAPI) {
  let items: string[] = [];

  // 从会话重建状态
  pi.on('session_start', async (_event, ctx) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === 'message' && entry.message.role === 'toolResult') {
        if (entry.message.toolName === 'my_tool') {
          items = entry.message.details?.items ?? [];
        }
      }
    }
  });

  pi.registerTool({
    name: 'my_tool',
    // ...
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      items.push('new item');
      return {
        content: [{ type: 'text', text: 'Added' }],
        details: { items: [...items] } // 存储用于重建
      };
    }
  });
}
```

## 自定义工具

通过 `pi.registerTool()` 注册可供 LLM 调用的工具。工具出现在系统提示词中，并可以具有自定义渲染。

使用 `promptSnippet` 在默认系统提示词的 `Available tools` 部分中提供一个简短的单行条目。若省略，自定义工具会被排除在该部分之外。

使用 `promptGuidelines` 向默认系统提示词的 `Guidelines` 部分添加工具特定的要点。这些要点仅在工具激活时包含（例如，在 `pi.setActiveTools([...])` 之后）。

**重要：** `promptGuidelines` 要点会无工具名前缀或分组地扁平追加到 `Guidelines` 部分。每条指南必须指明它所引用的工具——避免 "Use this tool when..."，因为 LLM 无法判断 "this" 指的是哪个工具。请改写成 "Use my_tool when..."。

注意：某些模型很蠢，会在工具路径参数中包含 @ 前缀。内置工具在解析路径前会剥离前导 @。如果你的自定义工具接受路径，也请规范化前导 @。

如果你的自定义工具修改文件，使用 `withFileMutationQueue()` 让它参与与内置 `edit` 和 `write` 相同的按文件队列。这很重要，因为工具调用默认并行运行。没有队列时，两个工具可能读取相同的旧文件内容、计算不同的更新，然后最后落盘的写入会覆盖另一个。

示例失败案例：你的自定义工具编辑 `foo.ts`，而内置 `edit` 也在同一助手轮次中更改 `foo.ts`。如果你的工具不参与队列，两者都可能读取原始的 `foo.ts`、应用各自的更改，其中之一的更改会丢失。

将真实的目标文件路径传给 `withFileMutationQueue()`，而不是原始的用户参数。先将其解析为绝对路径，相对于 `ctx.cwd` 或你的工具的工作目录。对于已存在的文件，该助手通过 `realpath()` 规范化，因此同一文件的符号链接别名共享一个队列。对于新文件，因为没有东西可以 `realpath()` 了，它会回退到解析后的绝对路径。

在该目标路径上排队整个修改窗口。这包括读-改-写逻辑，而不仅仅是最终的写入。

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8");
    const next = current.replace(params.oldText, params.newText);
    await writeFile(absolutePath, next, "utf8");

    return {
      content: [{ type: "text", text: `Updated ${params.path}` }],
      details: {},
    };
  });
}
```

### 工具定义

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does (shown to LLM)",
  promptSnippet: "List or add items in the project todo list",
  promptGuidelines: [
    "Use my_tool for todo planning instead of direct file edits when the user asks for a task list."
  ],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),  // 使用 StringEnum 以获得 Google 兼容性
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;
    const input = args as { action?: string; oldAction?: string };
    if (typeof input.oldAction === "string" && input.action === undefined) {
      return { ...input, action: input.oldAction };
    }
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // 检查取消
    if (signal?.aborted) {
      return { content: [{ type: "text", text: "Cancelled" }] };
    }

    // 流式进度更新
    onUpdate?.({
      content: [{ type: "text", text: "Working..." }],
      details: { progress: 50 },
    });

    // 通过 pi.exec 运行命令（从扩展闭包捕获）
    const result = await pi.exec("some-command", [], { signal });

    // 返回结果
    return {
      content: [{ type: "text", text: "Done" }],  // 发送给 LLM
      details: { data: result },                   // 用于渲染和状态
      // usage: nestedModelResponse.usage,          // 可选的嵌套 LLM 用量
      // 可选：当批次中每个最终工具结果也都返回 terminate: true 时，
      // 在此工具批次后停止。
      terminate: true,
    };
  },

  // 可选：自定义渲染
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

**用量核算：** 如果工具进行嵌套 LLM 调用，将其合并的 `Usage` 作为 `usage` 返回。Pi 将其持久化在工具结果上，并包含在页脚、`/session` 和 RPC 会话总计中。`tool_result` 处理器可以检查或替换此值。

**标记错误：** 要将工具执行标记为失败（在结果上设置 `isError: true` 并将其报告给 LLM），从 `execute` 抛出错误。返回值无论你在返回对象中包含什么属性，都不会设置错误标志。

**提前终止：** 从 `execute()` 返回 `terminate: true`，以提示在当前工具批次后应跳过自动的后续 LLM 调用。这仅当该批次中每个最终工具结果都是终止的时才生效。参见 [examples/extensions/structured-output.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/structured-output.ts) 获取一个最小示例，其中智能体在最后的结构化输出工具调用时结束。

```typescript
// 正确：抛出以标记错误
async execute(toolCallId, params) {
  if (!isValid(params.input)) {
    throw new Error(`Invalid input: ${params.input}`);
  }
  return { content: [{ type: "text", text: "OK" }], details: {} };
}
```

**重要：** 对字符串枚举使用 `@earendil-works/pi-ai` 中的 `StringEnum`。`Type.Union`/`Type.Literal` 不适用于 Google 的 API。

**参数准备：** `prepareArguments(args)` 是可选的。若定义，它在 Schema 校验之前、`execute()` 之前运行。当 pi 恢复一个旧会话、其存储的工具调用参数不再匹配当前 Schema 时，用它模仿较旧的已接受输入形状。返回你希望对 `parameters` 进行校验的对象。保持公共 Schema 严格。不要仅仅为了让旧的恢复会话继续工作而向 `parameters` 添加已弃用的兼容字段。

示例：旧会话可能包含一个带顶层 `oldText` 和 `newText` 的 `edit` 工具调用，而当前 Schema 只接受 `edits: [{ oldText, newText }]`。

```typescript
pi.registerTool({
  name: 'edit',
  label: 'Edit',
  description: 'Edit a single file using exact text replacement',
  parameters: Type.Object({
    path: Type.String(),
    edits: Type.Array(
      Type.Object({
        oldText: Type.String(),
        newText: Type.String()
      })
    )
  }),
  prepareArguments(args) {
    if (!args || typeof args !== 'object') return args;

    const input = args as {
      path?: string;
      edits?: Array<{ oldText: string; newText: string }>;
      oldText?: unknown;
      newText?: unknown;
    };

    if (typeof input.oldText !== 'string' || typeof input.newText !== 'string') {
      return args;
    }

    return {
      ...input,
      edits: [...(input.edits ?? []), { oldText: input.oldText, newText: input.newText }]
    };
  },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // params 现在匹配当前 Schema
    return {
      content: [{ type: 'text', text: `Applying ${params.edits.length} edit block(s)` }],
      details: {}
    };
  }
});
```

### 覆盖内置工具

扩展可以通过注册同名工具来覆盖内置工具（`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`）。交互模式在发生此情况时会显示警告。

```bash
# 扩展的 read 工具替换内置 read
pi -e ./tool-override.ts
```

或者，使用 `--no-builtin-tools` 在没有任何内置工具的情况下启动，同时保持扩展工具启用：

```bash
# 无内置工具，仅扩展工具
pi --no-builtin-tools -e ./my-extension.ts
```

参见 [examples/extensions/tool-override.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/tool-override.ts) 获取一个完整示例，用日志记录和访问控制覆盖 `read`。

**渲染：** 内置渲染器的继承是按槽位解析的。执行覆盖和渲染覆盖是独立的。如果你的覆盖省略了 `renderCall`，则使用内置的 `renderCall`。如果你的覆盖省略了 `renderResult`，则使用内置的 `renderResult`。如果你的覆盖两者都省略，则自动使用内置渲染器（语法高亮、差异等）。这让你可以包装内置工具以进行日志记录或访问控制，而无需重新实现 UI。

**提示词元数据：** `promptSnippet` 和 `promptGuidelines` 不会从内置工具继承。如果你的覆盖应保留那些提示词指令，请在覆盖上显式定义它们。

**你的实现必须匹配确切的结果形状**，包括 `details` 类型。UI 和会话逻辑依赖这些形状进行渲染和状态跟踪。

内置工具实现：

- [read.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/read.ts) - `ReadToolDetails`
- [bash.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/bash.ts) - `BashToolDetails`
- [powershell.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/powershell.ts) - `PowerShellToolDetails`
- [edit.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/edit.ts)
- [write.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/write.ts)
- [grep.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/grep.ts) - `GrepToolDetails`
- [find.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/find.ts) - `FindToolDetails`
- [ls.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/ls.ts) - `LsToolDetails`

### 远程执行

内置工具支持可插拔操作，用于委托给远程系统（SSH、容器等）：

```typescript
import {
  createReadTool,
  createBashTool,
  type ReadOperations
} from '@earendil-works/pi-coding-agent';

// 用自定义操作创建工具
const remoteRead = createReadTool(cwd, {
  operations: {
    readFile: (path) => sshExec(remote, `cat ${path}`),
    access: (path) => sshExec(remote, `test -r ${path}`).then(() => {})
  }
});

// 注册，在执行时检查标志
pi.registerTool({
  ...remoteRead,
  async execute(id, params, signal, onUpdate, _ctx) {
    const ssh = getSshConfig();
    if (ssh) {
      const tool = createReadTool(cwd, { operations: createRemoteOps(ssh) });
      return tool.execute(id, params, signal, onUpdate);
    }
    return localRead.execute(id, params, signal, onUpdate);
  }
});
```

**操作接口：** `ReadOperations`、`WriteOperations`、`EditOperations`、`BashOperations`、`PowerShellOperations`、`LsOperations`、`GrepOperations`、`FindOperations`

对于 `user_bash`，扩展可以通过 `createLocalBashOperations()` 复用 pi 的本地 shell 后端，而不是重新实现本地进程生成、shell 解析和进程树终止。

`bash` 和 `powershell` 工具还支持一个 spawn 钩子，在执行前调整命令、cwd 或 env：

```typescript
import { createBashTool } from '@earendil-works/pi-coding-agent';

const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd: `/mnt/sandbox${cwd}`,
    env: { ...env, CI: '1' }
  })
});
```

`createBashTool()` 和 `createPowerShellTool()` 通过 `PI_SESSION_ID`、`PI_SESSION_FILE`、`PI_PROVIDER`、`PI_MODEL` 和 `PI_REASONING_LEVEL` 将当前会话暴露给命令。注入发生在 `spawnHook` 之前，因此钩子会在 `env` 中收到这些值，并在像上面那样展开现有环境时保留它们。设置 `exposeSessionEnvironment: false` 来禁用它们：

```typescript
const bashTool = createBashTool(cwd, {
  exposeSessionEnvironment: false
});
```

参见 [Shell 工具会话环境](environment-variables.md#shell-tool-session-environment) 了解变量语义。参见 [examples/extensions/ssh.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/ssh.ts) 获取带 `--ssh` 标志的完整 SSH 示例。

### 输出截断

**工具必须截断它们的输出**，以避免压垮 LLM 上下文。大量输出可能导致：

- 上下文溢出错误（提示词过长）
- 压缩失败
- 模型性能下降

内置限制是 **50KB**（约 1 万 token）和 **2000 行**，以先达到者为准。使用导出的截断工具：

```typescript
import {
  truncateHead,      // 保留前 N 行/字节（适合文件读取、搜索结果）
  truncateTail,      // 保留后 N 行/字节（适合日志、命令输出）
  truncateLine,      // 将单行截断到 maxBytes 并加省略号
  formatSize,        // 人类可读的大小（例如 "50KB"、"1.5MB"）
  DEFAULT_MAX_BYTES, // 50KB
  DEFAULT_MAX_LINES, // 2000
} from "@earendil-works/pi-coding-agent";

async execute(toolCallId, params, signal, onUpdate, ctx) {
  const output = await runCommand();

  // 应用截断
  const truncation = truncateHead(output, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let result = truncation.content;

  if (truncation.truncated) {
    // 将完整输出写入临时文件
    const tempFile = writeTempFile(output);

    // 告知 LLM 在哪里可以找到完整输出
    result += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
    result += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
    result += ` Full output saved to: ${tempFile}]`;
  }

  return { content: [{ type: "text", text: result }] };
}
```

**要点：**

- 对开头重要的内容（搜索结果、文件读取）使用 `truncateHead`
- 对结尾重要的内容（日志、命令输出）使用 `truncateTail`
- 当输出被截断时，始终告知 LLM 以及在哪里找到完整版本
- 在你的工具描述中记录截断限制

参见 [examples/extensions/truncated-tool.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/truncated-tool.ts) 获取一个用正确截断包装 `rg`（ripgrep）的完整示例。

### 多个工具

一个扩展可以注册共享状态的多个工具：

```typescript
export default function (pi: ExtensionAPI) {
  let connection = null;

  pi.registerTool({ name: "db_connect", ... });
  pi.registerTool({ name: "db_query", ... });
  pi.registerTool({ name: "db_close", ... });

  pi.on("session_shutdown", async () => {
    connection?.close();
  });
}
```

### 自定义渲染

工具可以提供 `renderCall` 和 `renderResult` 用于自定义 TUI 显示。参见 [tui.md](tui.md) 了解完整的组件 API，参见 [tool-execution.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/interactive/components/tool-execution.ts) 了解工具行是如何组成的。

默认情况下，工具输出被包裹在一个处理内边距和背景的 `Box` 中。已定义的 `renderCall` 或 `renderResult` 必须返回一个 `Component`。如果某个槽位渲染器未定义，`tool-execution.ts` 会为该槽位使用回退渲染。

当工具应渲染自己的外壳而不是使用默认的 `Box` 时，设置 `renderShell: "self"`。这对需要完全控制边框或背景行为的工具有用，例如在工具稳定后必须保持视觉稳定的大型预览。

```typescript
pi.registerTool({
  name: 'my_tool',
  label: 'My Tool',
  description: 'Custom shell example',
  parameters: Type.Object({}),
  renderShell: 'self',
  async execute() {
    return { content: [{ type: 'text', text: 'ok' }], details: undefined };
  },
  renderCall(args, theme, context) {
    return new Text(theme.fg('accent', 'my custom shell'), 0, 0);
  }
});
```

`renderCall` 和 `renderResult` 各自接收一个 `context` 对象，包含：

- `args` - 当前工具调用参数
- `state` - 跨 `renderCall` 和 `renderResult` 共享的行本地状态
- `lastComponent` - 该槽位之前返回的组件（如有）
- `invalidate()` - 请求重新渲染此工具行
- `toolCallId`、`cwd`、`executionStarted`、`argsComplete`、`isPartial`、`expanded`、`showImages`、`isError`

使用 `context.state` 进行跨槽位共享状态。当你想在多次渲染之间复用和修改同一组件时，将槽位本地缓存保存在返回的组件实例上。

#### renderCall

渲染工具调用或头部：

```typescript
import { Text } from "@earendil-works/pi-tui";

renderCall(args, theme, context) {
  const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
  let content = theme.fg("toolTitle", theme.bold("my_tool "));
  content += theme.fg("muted", args.action);
  if (args.text) {
    content += " " + theme.fg("dim", `"${args.text}"`);
  }
  text.setText(content);
  return text;
}
```

#### renderResult

渲染工具结果或输出：

```typescript
renderResult(result, { expanded, isPartial }, theme, context) {
  if (isPartial) {
    return new Text(theme.fg("warning", "Processing..."), 0, 0);
  }

  if (result.details?.error) {
    return new Text(theme.fg("error", `Error: ${result.details.error}`), 0, 0);
  }

  let text = theme.fg("success", "✓ Done");
  if (expanded && result.details?.items) {
    for (const item of result.details.items) {
      text += "\n  " + theme.fg("dim", item);
    }
  }
  return new Text(text, 0, 0);
}
```

如果槽位有意没有可见内容，返回一个空的 `Component`，例如空的 `Container`。

#### 按键提示

使用 `keyHint()` 显示尊重活动按键绑定配置的按键提示：

```typescript
import { keyHint } from "@earendil-works/pi-coding-agent";

renderResult(result, { expanded }, theme, context) {
  let text = theme.fg("success", "✓ Done");
  if (!expanded) {
    text += ` (${keyHint("app.tools.expand", "to expand")})`;
  }
  return new Text(text, 0, 0);
}
```

可用函数：

- `keyHint(keybinding, description)` - 格式化已配置的按键绑定 id，例如 `"app.tools.expand"` 或 `"tui.select.confirm"`
- `keyText(keybinding)` - 返回某个按键绑定 id 的原始配置按键文本
- `rawKeyHint(key, description)` - 格式化原始按键字符串

使用带命名空间的按键绑定 id：

- 编码智能体 id 使用 `app.*` 命名空间，例如 `app.tools.expand`、`app.editor.external`、`app.session.rename`
- 共享 TUI id 使用 `tui.*` 命名空间，例如 `tui.select.confirm`、`tui.select.cancel`、`tui.input.tab`

按键绑定 id 和默认值的完整列表，参见 [keybindings.md](keybindings.md)。`keybindings.json` 使用相同的命名空间 id。

自定义编辑器和 `ctx.ui.custom()` 组件接收 `keybindings: KeybindingsManager` 作为注入参数。它们应直接使用注入的管理器，而不是调用 `getKeybindings()` 或 `setKeybindings()`。

#### 最佳实践

- 使用带内边距 `(0, 0)` 的 `Text`。默认的 Box 处理内边距。
- 多行内容使用 `\n`。
- 对流式进度处理 `isPartial`。
- 支持 `expanded` 以按需显示详情。
- 保持默认视图紧凑。
- 在 `renderResult` 中读取 `context.args`，而不是把 args 复制到 `context.state`。
- 仅对必须跨调用槽和结果槽共享的数据使用 `context.state`。
- 当同一组件实例可以就地更新时，复用 `context.lastComponent`。
- 仅当默认的盒状外壳碍事时才使用 `renderShell: "self"`。在 self-shell 模式下，工具负责自己的边框、内边距和背景。

#### 回退

如果槽位渲染器未定义或抛出：

- `renderCall`：显示工具名
- `renderResult`：显示来自 `content` 的原始文本

### 动态工具加载

扩展可以注册许多工具，同时只保持一个小的初始集合处于活动状态。然后一个工具可以在执行期间用 `pi.setActiveTools()` 添加更多工具。Pi 检测纯粹的增量更改，在该工具结果上记录新可用的工具名，并在下一次模型请求之前应用更新后的活动集合。

这适用于每个模型。具有原生延迟加载支持的模型保留稳定的提示词前缀，并在工具结果位置加载新定义。其他模型使用下述回退。

生命周期是：

1. 用 `pi.registerTool()` 注册每个工具，使其出现在 `pi.getAllTools()` 中。
2. 保持加载器工具（如 `search_tools`）活动，让可搜索工具保持不活动。
3. 在加载器执行期间，调用 `pi.setActiveTools([...currentTools, ...matchingTools])`。更改必须是增量的：不要在同一调用中移除当前活动的工具。
4. Pi 在加载器的工具结果上记录添加了哪些工具。
5. 在下一次模型响应之前，Pi 在支持时使用原生延迟加载暴露添加的定义，否则使用正常的活动工具列表。

你不需要返回提供商特定的工具引用，也不需要将加载器标记为特殊的搜索工具。活动工具更改就是信号。传给 `pi.setActiveTools()` 的名称必须已注册；未知名称会被忽略。

#### 具有原生延迟加载的模型

- **Anthropic**
  - **模型：** Sonnet、Opus、Fable 4.5 或更新版本（不含 Haiku）
  - **原生表示：** 延迟定义使用 `defer_loading`；加载点使用 `tool_reference` 内容。
- **OpenAI**
  - **模型：** `gpt-5.4` 及更新家族
  - **原生表示：** Pi 在加载点添加完成的客户端 `tool_search_call` 和 `tool_search_output` 项。

对于经过验证的自定义模型或代理，可以通过 `compat.supportsToolReferences: true`（对 `anthropic-messages`）或 `compat.supportsToolSearch: true`（对 `openai-responses` 和 `openai-codex-responses`）启用原生处理。除非端点和模型接受相应的原生协议，否则保持这些禁用。

#### 回退行为

对于所有其他模型和提供商，动态激活仍然有效：Pi 在下一次请求时正常发送完整的当前活动工具列表。模型可以调用新激活的工具，但添加它们的定义可能会使提供商的缓存提示词前缀失效。

当活动集合不是纯粹增量时，例如用一组工具替换另一组，Pi 也使用这种安全的回退。因此工具移除是有效的，但它们不使用延迟加载。

为了获得最佳的缓存行为，让加载器工具在整个会话中保持活动，并添加工具而不是替换活动集合。还要注意，激活带 `promptSnippet` 或 `promptGuidelines` 的工具会重建系统提示词；即使提供商支持延迟 Schema，该系统提示词更改也可能使前缀失效。延迟加载的工具通常应依赖其工具 `description`，并省略仅活动的提示词元数据。

#### 搜索工具示例

以下扩展注册两个可搜索工具，将它们从初始活动集合中移除，只保留 `search_tools` 作为它们的加载器。该示例使用简单的关键词匹配，但搜索实现可以使用 BM25、嵌入、远程目录或项目特定的路由。

```typescript
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

const SEARCHABLE_TOOL_NAMES = new Set(['lookup_weather', 'search_issues']);

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'lookup_weather',
    label: 'Lookup Weather',
    description: 'Look up the current weather for a city',
    parameters: Type.Object({ city: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: 'text', text: `Weather for ${params.city}: sunny` }],
        details: {}
      };
    }
  });

  pi.registerTool({
    name: 'search_issues',
    label: 'Search Issues',
    description: 'Search project issues by keyword',
    parameters: Type.Object({ query: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: 'text', text: `No open issues matching ${params.query}` }],
        details: {}
      };
    }
  });

  pi.registerTool({
    name: 'search_tools',
    label: 'Search Tools',
    description: 'Search for and enable tools relevant to a task',
    promptSnippet: 'Search for additional tools when the active tools cannot perform the task',
    promptGuidelines: [
      'Use search_tools when a task requires a capability that is not currently available.'
    ],
    parameters: Type.Object({
      query: Type.String({ description: 'Capability or task to search for' }),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 }))
    }),
    async execute(_toolCallId, params) {
      const terms = params.query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const matches = pi
        .getAllTools()
        .filter((tool) => SEARCHABLE_TOOL_NAMES.has(tool.name))
        .map((tool) => ({
          tool,
          score: terms.reduce(
            (score, term) =>
              score + (`${tool.name} ${tool.description}`.toLowerCase().includes(term) ? 1 : 0),
            0
          )
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit ?? 3)
        .map((match) => match.tool.name);

      if (matches.length === 0) {
        return {
          content: [{ type: 'text', text: `No tools found for: ${params.query}` }],
          details: { matches: [] }
        };
      }

      const active = pi.getActiveTools();
      const added = matches.filter((name) => !active.includes(name));
      pi.setActiveTools([...new Set([...active, ...added])]);

      return {
        content: [
          {
            type: 'text',
            text:
              added.length > 0
                ? `Loaded tools: ${added.join(', ')}`
                : `Matching tools already active: ${matches.join(', ')}`
          }
        ],
        details: { matches, added }
      };
    }
  });

  pi.on('session_start', () => {
    // 保持可搜索工具已注册但初始不活动。保留内置工具
    // 和其他扩展拥有的工具，并保持加载器本身活动。
    const initialTools = pi.getActiveTools().filter((name) => !SEARCHABLE_TOOL_NAMES.has(name));
    pi.setActiveTools([...new Set([...initialTools, 'search_tools'])]);
  });
}
```

当 `search_tools` 添加一个匹配时，模型会在紧随其后的请求上收到该定义。在原生支持的模型上，该定义锚定在搜索结果之后，而不改变初始工具 Schema 前缀。在其他模型上，它出现在同一个后续请求的正常工具列表中。

## 自定义 UI

扩展可以通过 `ctx.ui` 方法与用户交互，并自定义消息/工具的渲染方式。

**对于自定义组件，参见 [tui.md](tui.md)**，其中包含以下内容的可复制模式：

- 选择对话框（SelectList）
- 可取消的异步操作（BorderedLoader）
- 设置开关（SettingsList）
- 状态指示器（setStatus）
- 流式输出期间的工作消息、可见性和指示器（`setWorkingMessage`、`setWorkingVisible`、`setWorkingIndicator`）
- 编辑器上方/下方的组件（setWidget）
- 叠加在内置斜杠/路径补全之上的自动补全提供器（addAutocompleteProvider）
- 自定义页脚（setFooter）

### 对话框

```typescript
// 从选项中选择
const choice = await ctx.ui.select('Pick one:', ['A', 'B', 'C']);

// 确认对话框
const ok = await ctx.ui.confirm('Delete?', 'This cannot be undone');

// 文本输入
const name = await ctx.ui.input('Name:', 'placeholder');

// 多行编辑器
const text = await ctx.ui.editor('Edit:', 'prefilled text');

// 通知（非阻塞）
ctx.ui.notify('Done!', 'info'); // "info" | "warning" | "error"
```

#### 带倒计时的定时对话框

对话框支持一个 `timeout` 选项，它会以实时倒计时显示自动关闭：

```typescript
// 对话框显示 "Title (5s)" → "Title (4s)" → ... → 在 0 时自动关闭
const confirmed = await ctx.ui.confirm(
  'Timed Confirmation',
  'This dialog will auto-cancel in 5 seconds. Confirm?',
  { timeout: 5000 }
);

if (confirmed) {
  // 用户已确认
} else {
  // 用户已取消或超时
}
```

**超时时的返回值：**

- `select()` 返回 `undefined`
- `confirm()` 返回 `false`
- `input()` 返回 `undefined`

#### 使用 AbortSignal 手动关闭

为了更多控制（例如区分超时和用户取消），使用 `AbortSignal`：

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const confirmed = await ctx.ui.confirm(
  'Timed Confirmation',
  'This dialog will auto-cancel in 5 seconds. Confirm?',
  { signal: controller.signal }
);

clearTimeout(timeoutId);

if (confirmed) {
  // 用户已确认
} else if (controller.signal.aborted) {
  // 对话框超时
} else {
  // 用户已取消（按下 Escape 或选择 "No"）
}
```

参见 [examples/extensions/timed-confirm.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/timed-confirm.ts) 获取完整示例。

### 组件、状态和页脚

```typescript
// 页脚中的状态（持久直到清除）
ctx.ui.setStatus('my-ext', 'Processing...');
ctx.ui.setStatus('my-ext', undefined); // 清除

// 工作加载器（在流式输出期间显示）
ctx.ui.setWorkingMessage('Thinking deeply...');
ctx.ui.setWorkingMessage(); // 恢复默认
ctx.ui.setWorkingVisible(false); // 完全隐藏内置工作加载器行
ctx.ui.setWorkingVisible(true); // 显示内置工作加载器行

// 工作指示器（在流式输出期间显示）
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg('accent', '●')] }); // 静态圆点
ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg('dim', '·'),
    ctx.ui.theme.fg('muted', '•'),
    ctx.ui.theme.fg('accent', '●'),
    ctx.ui.theme.fg('muted', '•')
  ],
  intervalMs: 120
});
ctx.ui.setWorkingIndicator({ frames: [] }); // 隐藏指示器
ctx.ui.setWorkingIndicator(); // 恢复默认加载动画

// 编辑器上方的组件（默认）
ctx.ui.setWidget('my-widget', ['Line 1', 'Line 2']);
// 编辑器下方的组件
ctx.ui.setWidget('my-widget', ['Line 1', 'Line 2'], { placement: 'belowEditor' });
ctx.ui.setWidget('my-widget', (tui, theme) => new Text(theme.fg('accent', 'Custom'), 0, 0));
ctx.ui.setWidget('my-widget', undefined); // 清除

// 自定义页脚（完全替换内置页脚）
ctx.ui.setFooter((tui, theme) => ({
  render(width) {
    return [theme.fg('dim', 'Custom footer')];
  },
  invalidate() {}
}));
ctx.ui.setFooter(undefined); // 恢复内置页脚

// 终端标题
ctx.ui.setTitle('pi - my-project');

// 编辑器文本
ctx.ui.setEditorText('Prefill text');
const current = ctx.ui.getEditorText();

// 粘贴到编辑器（触发粘贴处理，包括对大量内容的折叠）
ctx.ui.pasteToEditor('pasted content');

// 在内置提供器之上叠加自定义自动补全行为
ctx.ui.addAutocompleteProvider((current) => ({
  triggerCharacters: ['#'],
  async getSuggestions(lines, line, col, options) {
    const beforeCursor = (lines[line] ?? '').slice(0, col);
    const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
    if (!match) {
      return current.getSuggestions(lines, line, col, options);
    }

    return {
      prefix: `#${match[1] ?? ''}`,
      items: [{ value: '#2983', label: '#2983', description: 'Extension API for autocomplete' }]
    };
  },
  applyCompletion(lines, line, col, item, prefix) {
    return current.applyCompletion(lines, line, col, item, prefix);
  },
  shouldTriggerFileCompletion(lines, line, col) {
    return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
  }
}));

// 工具输出展开
const wasExpanded = ctx.ui.getToolsExpanded();
ctx.ui.setToolsExpanded(true);
ctx.ui.setToolsExpanded(wasExpanded);

// 自定义编辑器（vim 模式、emacs 模式等）
ctx.ui.setEditorComponent((tui, theme, keybindings) => new VimEditor(tui, theme, keybindings));
const currentEditor = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent(
  (tui, theme, keybindings) =>
    new WrappedEditor(tui, theme, keybindings, currentEditor?.(tui, theme, keybindings))
);
ctx.ui.setEditorComponent(undefined); // 恢复默认编辑器

// 主题管理（参见 themes.md 了解如何创建主题）
const themes = ctx.ui.getAllThemes(); // [{ name: "dark", path: "/..." | undefined }, ...]
const lightTheme = ctx.ui.getTheme('light'); // 加载但不切换
const result = ctx.ui.setTheme('light'); // 按名称切换
if (!result.success) {
  ctx.ui.notify(`Failed: ${result.error}`, 'error');
}
ctx.ui.setTheme(lightTheme!); // 或按 Theme 对象切换
ctx.ui.theme.fg('accent', 'styled text'); // 访问当前主题
```

自定义工作指示器帧会按原样渲染。如果你想要颜色，自己将它们添加到帧字符串中，例如用 `ctx.ui.theme.fg(...)`。

### 自动补全提供器

使用 `ctx.ui.addAutocompleteProvider()` 在内置斜杠命令和路径提供器之上叠加自定义自动补全逻辑。为自定义自然触发器（如 `$`）设置 `triggerCharacters`。

典型模式：

- 检查光标前的文本
- 当你的扩展特定语法匹配时，返回你自己的建议
- 否则委托给 `current.getSuggestions(...)`
- 委托 `applyCompletion(...)`，除非你需要自定义插入行为

```typescript
pi.on('session_start', (_event, ctx) => {
  ctx.ui.addAutocompleteProvider((current) => ({
    triggerCharacters: ['#'],
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const line = lines[cursorLine] ?? '';
      const beforeCursor = line.slice(0, cursorCol);
      const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
      if (!match) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return {
        prefix: `#${match[1] ?? ''}`,
        items: [
          {
            value: '#2983',
            label: '#2983',
            description: 'Extension API for registering custom @ autocomplete providers'
          },
          { value: '#2753', label: '#2753', description: 'Reload stale resource settings' }
        ]
      };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    }
  }));
});
```

参见 [github-issue-autocomplete.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts) 获取一个完整示例，它用 `gh issue list` 预加载最新的开放 GitHub issues，并在本地过滤它们以实现快速的 `#...` 补全。它需要 GitHub CLI（`gh`）和一个 GitHub 仓库检出。

### 自定义组件

对于复杂 UI，使用 `ctx.ui.custom()`。这会在调用 `done()` 之前用你的组件临时替换编辑器：

```typescript
import { Text, Component } from '@earendil-works/pi-tui';

const result = await ctx.ui.custom<boolean>((tui, theme, keybindings, done) => {
  const text = new Text('Press Enter to confirm, Escape to cancel', 1, 1);

  text.onKey = (key) => {
    if (key === 'return') done(true);
    if (key === 'escape') done(false);
    return true;
  };

  return text;
});

if (result) {
  // 用户按下了 Enter
}
```

回调接收：

- `tui` - TUI 实例（用于屏幕尺寸、焦点管理）
- `theme` - 用于样式设置的当前主题
- `keybindings` - 应用按键绑定管理器（用于检查快捷键）
- `done(value)` - 调用以关闭组件并返回值

参见 [tui.md](tui.md) 了解完整的组件 API。

#### 覆盖模式（实验性）

传入 `{ overlay: true }` 将组件渲染为现有内容之上的浮动模态框，而不清除屏幕：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  { overlay: true }
);
```

对于高级定位（锚点、边距、百分比、响应式可见性），传入 `overlayOptions`。使用 `onHandle` 以编程方式控制焦点或可见性：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  {
    overlay: true,
    overlayOptions: { anchor: 'top-right', width: '50%', margin: 2 },
    onHandle: (handle) => {
      handle.focus(); // 聚焦此覆盖层并将其置于视觉最前方
      // handle.unfocus({ target: editorComponent }); // 将输入释放给特定组件
      // handle.setHidden(true/false); // 切换可见性
      // handle.hide(); // 永久移除
    }
  }
);
```

聚焦的可见覆盖层可以在临时的非覆盖层自定义 UI 关闭后重新获得输入。如果你有意想让另一个组件在覆盖层保持可见时继续持有输入，调用 `handle.unfocus({ target })`。传入 `{ target: null }` 会在不聚焦另一个组件的情况下释放覆盖层。

参见 [tui.md](tui.md) 了解完整的 `OverlayOptions` 和 `OverlayHandle` API，参见 [overlay-qa-tests.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/overlay-qa-tests.ts) 获取示例。

### 自定义编辑器

用自定义实现替换主输入编辑器（vim 模式、emacs 模式等）：

```typescript
import { CustomEditor, type ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { matchesKey } from '@earendil-works/pi-tui';

class VimEditor extends CustomEditor {
  private mode: 'normal' | 'insert' = 'insert';

  handleInput(data: string): void {
    if (matchesKey(data, 'escape') && this.mode === 'insert') {
      this.mode = 'normal';
      return;
    }
    if (this.mode === 'normal' && data === 'i') {
      this.mode = 'insert';
      return;
    }
    super.handleInput(data); // 应用按键绑定 + 文本编辑
  }
}

export default function (pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) => new VimEditor(tui, theme, keybindings));
  });
}
```

**要点：**

- 扩展 `CustomEditor`（而非基础 `Editor`）以获得应用按键绑定（escape 中止、ctrl+d、模型切换）
- 对你未处理的按键调用 `super.handleInput(data)`
- 自定义编辑器默认保留独立的工作行。传入 `{ embedWorkingStatus: true }` 作为 `CustomEditor` 的第四个构造参数，改用内置编辑器边框加载动画。
- 工厂从应用接收 `tui`、`theme` 和 `keybindings`
- 在 `setEditorComponent()` 之前使用 `ctx.ui.getEditorComponent()` 来包装先前配置的自定义编辑器
- 传入 `undefined` 恢复默认：`ctx.ui.setEditorComponent(undefined)`

要与另一个已替换编辑器的扩展组合，在设置你的之前捕获前一个工厂：

```typescript
const previous = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent(
  (tui, theme, keybindings) =>
    new MyEditor(tui, theme, keybindings, { base: previous?.(tui, theme, keybindings) })
);
```

参见 [tui.md](tui.md) 模式 7 获取带模式指示器的完整示例。

### 消息和条目渲染

为你的 `customType` 消息注册自定义渲染器。对应参与 LLM 上下文的内容使用消息渲染器：

```typescript
import { Text } from '@earendil-works/pi-tui';

pi.registerMessageRenderer('my-extension', (message, options, theme) => {
  const { expanded, outputPad } = options;
  let text = theme.fg('accent', `[${message.customType}] `);
  text += message.content;

  if (expanded && message.details) {
    text += '\n' + theme.fg('dim', JSON.stringify(message.details, null, 2));
  }

  return new Text(text, outputPad, 0);
});
```

消息通过 `pi.sendMessage()` 发送：

```typescript
pi.sendMessage({
  customType: "my-extension",  // 匹配 registerMessageRenderer
  content: "Status update",
  display: true,               // 在 TUI 中显示
  details: { ... },            // 在渲染器中可用
});
```

对于不应发送给 LLM 的 TUI-only 内容，改为渲染自定义条目：

```typescript
pi.registerEntryRenderer('my-card', (entry, options, theme) => {
  return new Text(theme.fg('accent', JSON.stringify(entry.data)));
});

pi.appendEntry('my-card', { status: 'done' });
```

### 主题颜色

所有渲染函数都接收一个 `theme` 对象。参见 [themes.md](themes.md) 了解如何创建自定义主题和完整的调色板。

```typescript
// 前景色
theme.fg('toolTitle', text); // 工具名
theme.fg('accent', text); // 高亮
theme.fg('success', text); // 成功（绿色）
theme.fg('error', text); // 错误（红色）
theme.fg('warning', text); // 警告（黄色）
theme.fg('muted', text); // 次要文本
theme.fg('dim', text); // 三级文本

// 文本样式
theme.bold(text);
theme.italic(text);
theme.strikethrough(text);
```

在自定义工具渲染器中进行语法高亮：

```typescript
import { highlightCode, getLanguageFromPath } from '@earendil-works/pi-coding-agent';

// 用显式语言高亮代码
const highlighted = highlightCode('const x = 1;', 'typescript', theme);

// 从文件路径自动检测语言
const lang = getLanguageFromPath('/path/to/file.rs'); // "rust"
const highlighted = highlightCode(code, lang, theme);
```

## 错误处理

- 扩展错误会被记录，智能体继续
- `tool_call` 错误会阻止工具（故障安全）
- 工具 `execute` 错误必须通过抛出标记；抛出的错误被捕获，以 `isError: true` 报告给 LLM，并且执行继续

## 模式行为

| 模式 | `ctx.mode` | `ctx.hasUI` | 说明 |
| --- | --- | --- | --- |
| 交互式 | `"tui"` | `true` | 带终端渲染的完整 TUI |
| RPC（`--mode rpc`） | `"rpc"` | `true` | 通过 JSON 协议进行对话框和通知；`custom()` 返回 `undefined`。参见 [rpc.md](rpc.md) |
| JSON（`--mode json`） | `"json"` | `false` | 事件流输出到 stdout；UI 方法为空操作 |
| 打印（`-p`） | `"print"` | `false` | 扩展运行但无法提示 |

在 TUI 特定功能（`custom()`、组件工厂、终端输入）之前使用 `ctx.mode === "tui"`。在 TUI 和 RPC 模式下都可用的对话框和通知方法之前使用 `ctx.hasUI`。

## 示例索引

所有示例都在 [examples/extensions/](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/) 中。

| 示例 | 描述 | 关键 API |
| --- | --- | --- |
| **工具** |  |  |
| `hello.ts` | 最小工具注册 | `registerTool` |
| `question.ts` | 带用户交互的工具 | `registerTool`、`ui.select` |
| `questionnaire.ts` | 多步骤向导工具 | `registerTool`、`ui.custom` |
| `todo.ts` | 带持久化的有状态工具 | `registerTool`、`appendEntry`、`renderResult`、会话事件 |
| `dynamic-tools.ts` | 在启动后和命令期间注册工具 | `registerTool`、`session_start`、`registerCommand` |
| `structured-output.ts` | 带 `terminate: true` 的最终结构化输出工具 | `registerTool`、终止工具结果 |
| `truncated-tool.ts` | 输出截断示例 | `registerTool`、`truncateHead` |
| `tool-override.ts` | 覆盖内置 read 工具 | `registerTool`（与内置同名） |
| **命令** |  |  |
| `pirate.ts` | 每轮修改系统提示词 | `registerCommand`、`before_agent_start` |
| `summarize.ts` | 对话摘要命令 | `registerCommand`、`ui.custom` |
| `handoff.ts` | 跨提供商模型交接 | `registerCommand`、`ui.editor`、`ui.custom` |
| `qna.ts` | 带自定义 UI 的问答 | `registerCommand`、`ui.custom`、`setEditorText` |
| `send-user-message.ts` | 注入用户消息 | `registerCommand`、`sendUserMessage` |
| `reload-runtime.ts` | 重载命令和 LLM 工具交接 | `registerCommand`、`ctx.reload()`、`sendUserMessage` |
| `shutdown-command.ts` | 优雅关闭命令 | `registerCommand`、`shutdown()` |
| **事件与门控** |  |  |
| `permission-gate.ts` | 阻止危险命令 | `on("tool_call")`、`ui.confirm` |
| `project-trust.ts` | 从用户/全局或 CLI 扩展决定或推迟项目信任 | `on("project_trust")`、信任 UI、必需的信任结果 |
| `protected-paths.ts` | 阻止写入特定路径 | `on("tool_call")` |
| `confirm-destructive.ts` | 确认会话更改 | `on("session_before_switch")`、`on("session_before_fork")` |
| `dirty-repo-guard.ts` | 在脏 git 仓库时警告 | `on("session_before_*")`、`exec` |
| `input-transform.ts` | 转换用户输入 | `on("input")` |
| `input-transform-streaming.ts` | 流式感知的输入转换 | `on("input")`、`streamingBehavior` |
| `model-status.ts` | 响应模型变化 | `on("model_select")`、`setStatus` |
| `provider-payload.ts` | 检查载荷和服务提供商响应头 | `on("before_provider_request")`、`on("after_provider_response")` |
| `system-prompt-header.ts` | 显示系统提示词信息 | `on("agent_start")`、`getSystemPrompt` |
| `claude-rules.ts` | 从文件加载规则 | `on("session_start")`、`on("before_agent_start")` |
| `prompt-customizer.ts` | 使用 `systemPromptOptions` 添加上下文感知的工具指导 | `on("before_agent_start")`、`BuildSystemPromptOptions` |
| `file-trigger.ts` | 文件监听器触发消息 | `sendMessage` |
| **压缩与会话** |  |  |
| `custom-compaction.ts` | 自定义压缩摘要 | `on("session_before_compact")` |
| `trigger-compact.ts` | 手动触发压缩 | `compact()` |
| `git-checkpoint.ts` | 每轮 Git stash | `on("turn_start")`、`on("session_before_fork")`、`exec` |
| `git-merge-and-resolve.ts` | 拉取、合并并解决冲突 | `on("agent_end")`、`exec`、`sendUserMessage` |
| `auto-commit-on-exit.ts` | 关闭时提交 | `on("session_shutdown")`、`exec` |
| **UI 组件** |  |  |
| `status-line.ts` | 页脚状态指示器 | `setStatus`、会话事件 |
| `working-indicator.ts` | 自定义流式工作指示器 | `setWorkingIndicator`、`registerCommand` |
| `github-issue-autocomplete.ts` | 通过预加载 `gh issue list` 中的最近开放 issue，在内置自动补全之上添加 `#1234` issue 补全 | `addAutocompleteProvider`、`on("session_start")`、`exec` |
| `custom-footer.ts` | 完全替换页脚 | `registerCommand`、`setFooter` |
| `custom-header.ts` | 替换启动头部 | `on("session_start")`、`setHeader` |
| `modal-editor.ts` | 类 Vim 模态编辑器 | `setEditorComponent`、`CustomEditor` |
| `rainbow-editor.ts` | 自定义编辑器样式 | `setEditorComponent` |
| `widget-placement.ts` | 编辑器上方/下方的组件 | `setWidget` |
| `overlay-test.ts` | 覆盖层组件 | 带覆盖层选项的 `ui.custom` |
| `overlay-qa-tests.ts` | 全面的覆盖层测试 | `ui.custom`、所有覆盖层选项 |
| `notify.ts` | 简单通知 | `ui.notify` |
| `timed-confirm.ts` | 带超时的对话框 | 带 timeout/signal 的 `ui.confirm` |
| `mac-system-theme.ts` | 自动切换主题 | `setTheme`、`exec` |
| **复杂扩展** |  |  |
| `plan-mode/` | 完整计划模式实现 | 所有事件类型、`registerCommand`、`registerShortcut`、`registerFlag`、`setStatus`、`setWidget`、`sendMessage`、`setActiveTools` |
| `preset.ts` | 可保存的预设（模型、工具、思考） | `registerCommand`、`registerShortcut`、`registerFlag`、`setModel`、`setActiveTools`、`setThinkingLevel`、`appendEntry` |
| `tools.ts` | 切换工具开/关 UI | `registerCommand`、`setActiveTools`、`SettingsList`、会话事件 |
| **远程与沙箱** |  |  |
| `ssh.ts` | SSH 远程执行 | `registerFlag`、`on("user_bash")`、`on("before_agent_start")`、工具操作 |
| `interactive-shell.ts` | 持久 shell 会话 | `on("user_bash")` |
| `sandbox/` | 沙箱化工具执行 | 工具操作 |
| `gondolin/` | 将内置工具和 `!` 命令路由到 Gondolin 微型虚拟机 | 工具操作、内置工具覆盖、`on("user_bash")` |
| `subagent/` | 生成子智能体 | `registerTool`、`exec` |
| **游戏** |  |  |
| `snake.ts` | 贪吃蛇游戏 | `registerCommand`、`ui.custom`、键盘处理 |
| `space-invaders.ts` | 太空入侵者游戏 | `registerCommand`、`ui.custom` |
| `doom-overlay/` | 覆盖层中的 Doom | 带覆盖层的 `ui.custom` |
| **提供商** |  |  |
| `custom-provider-anthropic/` | 自定义 Anthropic 代理 | `registerProvider` |
| `custom-provider-gitlab-duo/` | GitLab Duo 集成 | 带 OAuth 的 `registerProvider` |
| **消息与通信** |  |  |
| `message-renderer.ts` | 自定义消息渲染 | `registerMessageRenderer`、`sendMessage` |
| `entry-renderer.ts` | TUI-only 自定义条目渲染 | `registerEntryRenderer`、`appendEntry` |
| `event-bus.ts` | 扩展间事件 | `pi.events` |
| **会话元数据** |  |  |
| `session-name.ts` | 为选择器命名会话 | `setSessionName`、`getSessionName` |
| `bookmark.ts` | 为 /tree 添加书签条目 | `setLabel` |
| **杂项** |  |  |
| `inline-bash.ts` | 工具调用中的内联 bash | `on("tool_call")` |
| `bash-spawn-hook.ts` | 在执行前调整 bash 命令、cwd 和 env | `createBashTool`、`spawnHook` |
| `with-deps/` | 带 npm 依赖的扩展 | 带 `package.json` 的包结构 |
