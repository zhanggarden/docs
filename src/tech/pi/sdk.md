---
layout: doc
title: SDK
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/sdk"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

> pi 可以帮助你使用 SDK。让它为你的用例构建一个集成吧。

SDK 提供对 pi 智能体能力的程序化访问。用它来将 pi 嵌入其他应用、构建自定义界面，或与自动化工作流集成。

**示例用例：**

- 构建自定义 UI（Web、桌面、移动端）
- 将智能体能力集成到现有应用
- 创建带智能体推理的自动化流水线
- 构建可派生子智能体的自定义工具
- 程序化地测试智能体行为

从最小到完全控制的可运行示例参见 [examples/sdk/](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/)。

## 快速开始

```typescript
import { createAgentSession, ModelRuntime, SessionManager } from '@earendil-works/pi-coding-agent';

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime
});

session.subscribe((event) => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt('What files are in the current directory?');
```

## 安装

```bash
npm install @earendil-works/pi-coding-agent
```

SDK 包含在主包中。无需单独安装。

## 核心概念

### createAgentSession()

单个 `AgentSession` 的主工厂函数。

`createAgentSession()` 使用 `ResourceLoader` 提供扩展、技能、提示词模板、主题和上下文文件。如果你不提供，它会使用带标准发现的 `DefaultResourceLoader`。

```typescript
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';

// 最小：使用 DefaultResourceLoader 的默认值
const { session } = await createAgentSession();

// 自定义：覆盖特定选项
const { session } = await createAgentSession({
  model: myModel,
  tools: ['read', 'bash'],
  sessionManager: SessionManager.inMemory()
});
```

### AgentSession

会话管理智能体生命周期、消息历史、模型状态、压缩和事件流。

```typescript
interface AgentSession {
  // 发送提示词并等待完成
  prompt(text: string, options?: PromptOptions): Promise<void>;

  // 在流式期间排队消息
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;

  // 订阅事件（返回取消订阅函数）
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;

  // 会话信息
  sessionFile: string | undefined;
  sessionId: string;

  // 模型控制
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  cycleModel(): Promise<ModelCycleResult | undefined>;
  cycleThinkingLevel(): ThinkingLevel | undefined;

  // 状态访问
  agent: Agent;
  model: Model | undefined;
  thinkingLevel: ThinkingLevel;
  messages: AgentMessage[];
  isStreaming: boolean;

  // 当前会话文件内的原地树导航
  navigateTree(
    targetId: string,
    options?: {
      summarize?: boolean;
      customInstructions?: string;
      replaceInstructions?: boolean;
      label?: string;
    }
  ): Promise<{ editorText?: string; cancelled: boolean }>;

  // 压缩
  compact(customInstructions?: string): Promise<CompactionResult>;
  abortCompaction(): void;

  // 中止当前操作
  abort(): Promise<void>;

  // 清理
  dispose(): void;
}
```

当智能体响应、手动或自动压缩、或其他树导航处于活动状态时，`session.navigateTree()` 会拒绝，即使 `summarize: false`。它不会为这些冲突排队导航，也不会返回 `{ cancelled: true }`。请等待活动操作完成（例如用 `await session.waitForIdle()`）然后重试。拒绝会保持活动分支不变。

新会话、恢复、派生和导入等会话替换 API 位于 `AgentSessionRuntime` 上，而不是 `AgentSession` 上。

### createAgentSessionRuntime() 和 AgentSessionRuntime

当你需要替换活动会话并重建与 cwd 绑定的运行时状态时，使用运行时 API。这是内置的交互、打印和 RPC 模式所使用的同一层。

`createAgentSessionRuntime()` 接受一个运行时工厂以及初始的 cwd/会话目标。工厂闭包捕获进程全局的固定输入，为生效的 cwd 重建与 cwd 绑定的服务，根据这些服务解析会话选项，并返回完整的运行时结果。

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager
} from '@earendil-works/pi-coding-agent';

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent
    })),
    services,
    diagnostics: services.diagnostics
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});
```

`AgentSessionRuntime` 拥有在以下流程中替换活动运行时：

- `newSession()`
- `switchSession()`
- `fork()`
- 通过 `fork(entryId, { position: "at" })` 的克隆流程
- `importFromJsonl()`

重要行为：

- 这些操作之后 `runtime.session` 会变化
- 事件订阅附着在特定 `AgentSession` 上，因此替换后需重新订阅
- 如果你使用扩展，请为新会话再次调用 `runtime.session.bindExtensions(...)`
- 创建在 `runtime.diagnostics` 上返回诊断信息
- 如果运行时创建或替换失败，方法会抛出，由调用方决定如何处理

```typescript
let session = runtime.session;
let unsubscribe = session.subscribe(() => {});

await runtime.newSession();

unsubscribe();
session = runtime.session;
unsubscribe = session.subscribe(() => {});
```

### 提示和消息排队

`PromptOptions` 控制提示词展开、流式期间的排队行为，以及提示词预检通知：

```typescript
interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: ImageContent[];
  streamingBehavior?: 'steer' | 'followUp';
  source?: InputSource;
  preflightResult?: (success: boolean) => void;
}
```

每次 `prompt()` 调用时 `preflightResult` 调用一次：

- 提示词被接受、排队或立即处理时为 `true`
- 提示词预检在接受前被拒绝时为 `false`

它在 `prompt()` 解决之前触发。`prompt()` 仍只在完整的已接受运行（包括重试）结束后才解决。接受后的失败通过正常的事件和消息流上报，而不是通过 `preflightResult(false)`。

`prompt()` 方法处理提示词模板、扩展命令和消息发送：

```typescript
// 基本提示词（未在流式时）
await session.prompt('What files are here?');

// 带图片
await session.prompt("What's in this image?", {
  images: [{ type: 'image', source: { type: 'base64', mediaType: 'image/png', data: '...' } }]
});

// 流式期间：必须指定如何排队消息
await session.prompt('Stop and do this instead', { streamingBehavior: 'steer' });
await session.prompt("After you're done, also check X", { streamingBehavior: 'followUp' });
```

**行为：**

- **扩展命令**（例如 `/mycommand`）：立即执行，即使在流式期间。它们通过 `pi.sendMessage()` 管理自己的 LLM 交互。
- **基于文件的提示词模板**（来自 `.md` 文件）：在发送或排队前展开为其内容。
- **流式期间未指定 `streamingBehavior`**：抛出错误。请直接使用 `steer()` 或 `followUp()`，或指定该选项。
- **`preflightResult(true)`**：表示提示词被接受、排队或立即处理。
- **`preflightResult(false)`**：表示预检在接受前被拒绝。

对于流式期间的显式排队：

```typescript
// 排队一条 steering 消息，在当前助手轮次完成其工具调用后投递
await session.steer('New instruction');

// 等待智能体完成（仅在智能体停止时投递）
await session.followUp("After you're done, also do this");
```

`steer()` 和 `followUp()` 都会展开基于文件的提示词模板，但会在扩展命令上出错（扩展命令无法排队）。

### Agent 和 AgentState

`Agent` 类（来自 `@earendil-works/pi-agent-core`）处理核心 LLM 交互。通过 `session.agent` 访问它。

```typescript
// 访问当前状态
const state = session.agent.state;

// state.messages: AgentMessage[] - 对话历史
// state.model: Model - 当前模型
// state.thinkingLevel: ThinkingLevel - 当前思考等级
// state.systemPrompt: string - 系统提示词
// state.tools: AgentTool[] - 可用工具
// state.streamingMessage?: AgentMessage - 当前部分助手消息
// state.errorMessage?: string - 最新的助手错误

// 替换消息（用于派生分支或恢复）
session.agent.state.messages = messages; // 复制顶层数组

// 替换工具
session.agent.state.tools = tools; // 复制顶层数组

// 等待智能体完成处理
await session.agent.waitForIdle();
```

### 事件

订阅事件以接收流式输出和生命周期通知。

```typescript
session.subscribe((event) => {
  switch (event.type) {
    // 来自助手的流式文本
    case 'message_update':
      if (event.assistantMessageEvent.type === 'text_delta') {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
      if (event.assistantMessageEvent.type === 'thinking_delta') {
        // 思考输出（如果启用了思考）
      }
      break;

    // 工具执行
    case 'tool_execution_start':
      console.log(`Tool: ${event.toolName}`);
      break;
    case 'tool_execution_update':
      // 流式工具输出
      break;
    case 'tool_execution_end':
      console.log(`Result: ${event.isError ? 'error' : 'success'}`);
      break;

    // 消息生命周期
    case 'message_start':
      // 新消息开始
      break;
    case 'message_end':
      // 消息完成
      break;

    // 智能体生命周期
    case 'agent_start':
      // 智能体开始处理提示词
      break;
    case 'agent_end':
      // 智能体完成（event.messages 包含新消息）
      break;

    // 轮次生命周期（一次 LLM 响应 + 工具调用）
    case 'turn_start':
      break;
    case 'turn_end':
      // event.message: 助手响应
      // event.toolResults: 本轮的工具结果
      break;

    // 会话事件（队列、压缩、重试）
    case 'queue_update':
      console.log(event.steering, event.followUp);
      break;
    case 'compaction_start':
    case 'compaction_end':
    case 'auto_retry_start':
    case 'auto_retry_end':
    case 'summarization_retry_scheduled':
    case 'summarization_retry_attempt_start':
    case 'summarization_retry_finished':
      break;
  }
});
```

## 选项参考

### 目录

```typescript
const { session } = await createAgentSession({
  // DefaultResourceLoader 发现的工作目录
  cwd: process.cwd(), // 默认

  // 全局配置目录
  agentDir: '~/.pi/agent' // 默认（展开 ~）
});
```

`cwd` 被 `DefaultResourceLoader` 用于：

- 项目扩展（`.pi/extensions/`）
- 项目技能：
  - `.pi/skills/`
  - `cwd` 和祖先目录中的 `.agents/skills/`（向上直到 git 仓库根目录，或不在仓库中时直到文件系统根目录）
- 项目提示词（`.pi/prompts/`）
- 上下文文件（`AGENTS.md` 从 cwd 逐级向上）
- 会话目录命名

`agentDir` 被 `DefaultResourceLoader` 用于：

- 全局扩展（`extensions/`）
- 全局技能：
  - `agentDir` 下的 `skills/`（例如 `~/.pi/agent/skills/`）
  - `~/.agents/skills/`
- 全局提示词（`prompts/`）
- 全局上下文文件（`AGENTS.md`）
- 设置（`settings.json`）
- 自定义模型（`models.json`）
- 凭据（`auth.json`）
- 会话（`sessions/`）

当你传入自定义 `ResourceLoader` 时，`cwd` 和 `agentDir` 不再控制资源发现。它们仍影响会话命名和工具路径解析。

### 模型

```typescript
import { getModel } from '@earendil-works/pi-ai';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';

const modelRuntime = await ModelRuntime.create();

// create() 恢复缓存目录，但默认不从 pi.dev 刷新它们。
// 选择加入创建时的网络刷新，并限制其可能花费的时间：
const refreshedRuntime = await ModelRuntime.create({
  allowModelNetwork: true,
  modelRefreshTimeoutMs: 15_000
});

// 查找特定的内置模型（不检查 API 密钥是否存在）
const opus = getModel('anthropic', 'claude-opus-4-5');
if (!opus) throw new Error('Model not found');

// 按 provider/id 查找任意模型，包括 models.json 中的自定义模型
// （不检查 API 密钥是否存在）
const customModel = modelRuntime.getModel('my-provider', 'my-model');

// 仅获取已配置有效身份验证的模型
const available = await modelRuntime.getAvailable();

const { session } = await createAgentSession({
  model: opus,
  thinkingLevel: 'medium', // off, minimal, low, medium, high, xhigh, max

  // 用于循环的模型（交互模式中的 Ctrl+P）
  scopedModels: [
    { model: opus, thinkingLevel: 'high' },
    { model: haiku, thinkingLevel: 'off' }
  ],

  modelRuntime
});
```

如果未提供模型：

1. 尝试从会话恢复（如果继续）
2. 使用设置中的默认值
3. 回退到第一个可用模型

远程目录会本地持久化，以便后续运行时无需网络请求即可恢复它们。默认文件是 `~/.pi/agent/models-store.json`；设置 `modelsStorePath` 选择其他位置，或注入 `modelsStore` 来控制持久化。网络刷新被节流为每提供商每四小时一次，除非强制。要强制立即刷新，调用 `await modelRuntime.refresh({ allowNetwork: true, force: true, signal })`。设置 `PI_OFFLINE` 禁用模型网络访问。

要匹配 CLI 模型解析，使用导出的解析器辅助函数：

```typescript
import { resolveCliModel, resolveModelScopeWithDiagnostics } from '@earendil-works/pi-coding-agent';

const cliModel = resolveCliModel({
  cliModel: 'anthropic/claude-opus-4-5:high',
  modelRuntime
});
if (cliModel.error) throw new Error(cliModel.error);
if (cliModel.warning) console.warn(cliModel.warning);

const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics(
  ['anthropic/*:high', 'gpt-5'],
  modelRuntime
);
for (const diagnostic of diagnostics) {
  console.warn(diagnostic.message);
}
```

`resolveCliModel()` 使用所有已注册的模型，因此 `--api-key` 风格的首次设置可以在存储身份验证存在之前解析模型。`resolveModelScopeWithDiagnostics()` 匹配 `--models` 和 `enabledModels` 语义，同时返回警告而不是打印它们。

> 参见 [examples/sdk/02-custom-model.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/02-custom-model.ts)

### API 密钥和 OAuth

身份验证解析优先级（由 `ModelRuntime` 处理）：

1. 运行时覆盖（通过 `setRuntimeApiKey`，不持久化）
2. `auth.json` 中存储的凭据（API 密钥或 OAuth token）
3. 环境变量（`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等）
4. 回退解析器（用于 `models.json` 中的自定义提供商密钥）

```typescript
import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { createAgentSession, ModelRuntime } from '@earendil-works/pi-coding-agent';

// 默认：使用 ~/.pi/agent/auth.json 和 ~/.pi/agent/models.json
const modelRuntime = await ModelRuntime.create();

// 提供商拥有的身份验证方法和当前状态
for (const provider of modelRuntime.getProviders()) {
  const status = await modelRuntime.checkAuth(provider.id);
  console.log(provider.name, provider.auth, status);
}

// 运行时 API 密钥覆盖（不持久化到磁盘）
await modelRuntime.setRuntimeApiKey('anthropic', 'sk-my-temp-key');

// 自定义凭据和模型位置
const customRuntime = await ModelRuntime.create({
  authPath: '/my/app/auth.json',
  modelsPath: '/my/app/models.json'
});

// 或注入任意 pi-ai CredentialStore
const credentials = new InMemoryCredentialStore();
const inMemoryRuntime = await ModelRuntime.create({ credentials });

const { session } = await createAgentSession({
  modelRuntime: customRuntime
});
```

`login()`、`logout()`、`setRuntimeApiKey()` 和 `removeRuntimeApiKey()` 在受影响提供商的缓存/内置目录、组合和可用性快照本地一致后解决。它们不等待远程目录新鲜度。如果凭据已提交但本地同步失败，它们会以导出的 `CredentialSynchronizationError` 拒绝；检查其 `providerId`、`operation`、`credential` 和 `cause` 字段，而不是盲目重试凭据变更。

公共模型/身份验证操作和 `ModelRuntime.create({ signal })` 接受可选的 abort 信号，省略时不受限制。SDK 应用拥有远程目录新鲜度的截止时间策略：

```typescript
const signal = AbortSignal.timeout(15_000);
const result = await modelRuntime.refresh({
  providers: ['anthropic'],
  signal
});
if (result.aborted) console.warn('Catalog refresh timed out; using cached models');
for (const [providerId, error] of result.errors) {
  console.warn(`Could not refresh ${providerId}:`, error);
}
```

失败或超时的网络刷新不会撤销成功的凭据操作。`refresh()` 会启动新的提供商代，因此它不会等待在较早停滞的刷新之后，过期代也不能在其后发布。

> 参见 [examples/sdk/09-api-keys-and-oauth.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/09-api-keys-and-oauth.ts)

### 系统提示词

使用 `ResourceLoader` 覆盖系统提示词：

```typescript
import { createAgentSession, DefaultResourceLoader } from '@earendil-works/pi-coding-agent';

const loader = new DefaultResourceLoader({
  systemPromptOverride: () => 'You are a helpful assistant.'
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/03-custom-prompt.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/03-custom-prompt.ts)

### 工具

指定要启用的内置工具：

- 内置工具名：`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`
- 默认内置：`read`、`bash`、`edit`、`write`
- `noTools: "all"` 禁用所有工具
- `noTools: "builtin"` 禁用默认内置工具，同时保持扩展和自定义工具启用
- `excludeTools` 在应用任何 `tools` 白名单后禁用特定的内置、扩展或自定义工具名

`edit` 工具为 Pi 的 TUI 显示返回 `details.diff`，为 SDK 使用者返回 `details.patch`（标准 unified patch）。

```typescript
import { createAgentSession } from '@earendil-works/pi-coding-agent';

// 只读模式
const { session } = await createAgentSession({
  tools: ['read', 'grep', 'find', 'ls']
});

// 选择特定工具
const { session } = await createAgentSession({
  tools: ['read', 'bash', 'grep']
});

// 在 Windows 上用 PowerShell 替代 Bash
const { session } = await createAgentSession({
  tools: ['read', 'powershell', 'edit', 'write']
});

// 禁用一个工具，同时保持其余可用
const { session } = await createAgentSession({
  excludeTools: ['ask_question']
});
```

#### 带自定义 cwd 的工具

当你传入自定义 `cwd` 时，`createAgentSession()` 会为该 cwd 构建所选的内置工具。

```typescript
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';

const cwd = '/path/to/project';

// 对自定义 cwd 使用默认工具
const { session } = await createAgentSession({
  cwd,
  sessionManager: SessionManager.inMemory(cwd)
});

// 或对自定义 cwd 选择特定工具
const { session } = await createAgentSession({
  cwd,
  tools: ['read', 'bash', 'grep'],
  sessionManager: SessionManager.inMemory(cwd)
});
```

> 参见 [examples/sdk/05-tools.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/05-tools.ts)

### 自定义工具

```typescript
import { Type } from 'typebox';
import { createAgentSession, defineTool } from '@earendil-works/pi-coding-agent';

// 内联自定义工具
const myTool = defineTool({
  name: 'my_tool',
  label: 'My Tool',
  description: 'Does something useful',
  parameters: Type.Object({
    input: Type.String({ description: 'Input value' })
  }),
  execute: async (_toolCallId, params) => ({
    content: [{ type: 'text', text: `Result: ${params.input}` }],
    details: {}
  })
});

// 直接传入自定义工具
const { session } = await createAgentSession({
  customTools: [myTool]
});
```

对独立定义和 `customTools: [myTool]` 之类的数组使用 `defineTool()`。内联的 `pi.registerTool({ ... })` 已经能正确推断参数类型。

通过 `customTools` 传入的自定义工具会与扩展注册的工具合并。ResourceLoader 加载的扩展也可以通过 `pi.registerTool()` 注册工具。

如果你传入 `tools`，请包含你想要启用的每个自定义或扩展工具名，例如 `tools: ["read", "bash", "my_tool"]`。

> 参见 [examples/sdk/05-tools.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/05-tools.ts)

### 扩展

扩展由 `ResourceLoader` 加载。`DefaultResourceLoader` 从 `~/.pi/agent/extensions/`、`.pi/extensions/` 和 settings.json 扩展来源发现扩展。

```typescript
import { createAgentSession, DefaultResourceLoader } from '@earendil-works/pi-coding-agent';

const loader = new DefaultResourceLoader({
  additionalExtensionPaths: ['/path/to/my-extension.ts'],
  extensionFactories: [
    (pi) => {
      pi.on('agent_start', () => {
        console.log('[Inline Extension] Agent starting');
      });
    }
  ]
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

扩展可以注册工具、订阅事件、添加命令等。完整 API 参见 [extensions.md](extensions.md)。

**命名的内联扩展：** 默认情况下，内联工厂在启动扩展列表中显示为 `<inline:1>`、`<inline:2>` 等。要显示描述性名称，请包装工厂：

```typescript
import type { InlineExtension } from '@earendil-works/pi-coding-agent';

const myProvider: InlineExtension = {
  name: 'my-provider',
  factory: (pi) => {
    pi.on('agent_start', () => {
      console.log('[my-provider] Agent starting');
    });
  }
};

const loader = new DefaultResourceLoader({
  extensionFactories: [myProvider]
});
```

这会显示为 `<inline:my-provider>` 而不是 `<inline:1>`。为向后兼容，仍接受裸工厂函数。

**事件总线：** 扩展可以通过 `pi.events` 通信。如果你需要从外部发出或监听事件，请将共享的 `eventBus` 传给 `DefaultResourceLoader`：

```typescript
import { createEventBus, DefaultResourceLoader } from '@earendil-works/pi-coding-agent';

const eventBus = createEventBus();
const loader = new DefaultResourceLoader({
  eventBus
});
await loader.reload();

eventBus.on('my-extension:status', (data) => console.log(data));
```

> 参见 [examples/sdk/06-extensions.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/06-extensions.ts) 和 [docs/extensions.md](extensions.md)

### 技能

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  type Skill
} from '@earendil-works/pi-coding-agent';

const customSkill: Skill = {
  name: 'my-skill',
  description: 'Custom instructions',
  filePath: '/path/to/SKILL.md',
  baseDir: '/path/to',
  source: 'custom'
};

const loader = new DefaultResourceLoader({
  skillsOverride: (current) => ({
    skills: [...current.skills, customSkill],
    diagnostics: current.diagnostics
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/04-skills.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/04-skills.ts)

### 上下文文件

```typescript
import { createAgentSession, DefaultResourceLoader } from '@earendil-works/pi-coding-agent';

const loader = new DefaultResourceLoader({
  agentsFilesOverride: (current) => ({
    agentsFiles: [
      ...current.agentsFiles,
      { path: '/virtual/AGENTS.md', content: '# Guidelines\n\n- Be concise' }
    ]
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/07-context-files.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/07-context-files.ts)

### 斜杠命令

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  type PromptTemplate
} from '@earendil-works/pi-coding-agent';

const customCommand: PromptTemplate = {
  name: 'deploy',
  description: 'Deploy the application',
  source: '(custom)',
  content: '# Deploy\n\n1. Build\n2. Test\n3. Deploy'
};

const loader = new DefaultResourceLoader({
  promptsOverride: (current) => ({
    prompts: [...current.prompts, customCommand],
    diagnostics: current.diagnostics
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/08-prompt-templates.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/08-prompt-templates.ts)

### 会话管理

会话使用带 `id`/`parentId` 链接的树结构，支持原地派生分支。

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSession,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager
} from '@earendil-works/pi-coding-agent';

// 内存（无持久化）
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory()
});

// 新的持久会话
const { session: persisted } = await createAgentSession({
  sessionManager: SessionManager.create(process.cwd())
});

// 继续最近的会话
const { session: continued, modelFallbackMessage } = await createAgentSession({
  sessionManager: SessionManager.continueRecent(process.cwd())
});
if (modelFallbackMessage) {
  console.log('Note:', modelFallbackMessage);
}

// 打开特定文件
const { session: opened } = await createAgentSession({
  sessionManager: SessionManager.open('/path/to/session.jsonl')
});

// 恢复保存在文件系统之外的会话，例如数据库中的
const { session: restored } = await createAgentSession({
  sessionManager: SessionManager.inMemory(process.cwd(), { id: sessionId }, entries)
});

// 列出会话
const currentProjectSessions = await SessionManager.list(process.cwd());
const allSessions = await SessionManager.listAll(process.cwd());

// 用于 /new、/resume、/fork、/clone 和导入流程的会话替换 API。
const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent
    })),
    services,
    diagnostics: services.diagnostics
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

// 用一个全新会话替换活动会话
await runtime.newSession();

// 用另一个已保存会话替换活动会话
await runtime.switchSession('/path/to/session.jsonl');

// 用从特定用户条目派生的分支替换活动会话
await runtime.fork('entry-id');

// 通过特定条目克隆活动路径
await runtime.fork('entry-id', { position: 'at' });
```

**SessionManager 树 API：**

```typescript
const sm = SessionManager.open('/path/to/session.jsonl');

// 会话列出
const currentProjectSessions = await SessionManager.list(process.cwd());
const allSessions = await SessionManager.listAll(process.cwd());

// 树遍历
const entries = sm.getEntries(); // 所有条目（不包括头部）
const tree = sm.getTree(); // 完整树结构
const path = sm.getPath(); // 从根到当前叶子的路径
const leaf = sm.getLeafEntry(); // 当前叶子条目
const entry = sm.getEntry(id); // 按 ID 获取条目
const children = sm.getChildren(id); // 条目的直接子条目

// 标签
const label = sm.getLabel(id); // 获取条目的标签
sm.appendLabelChange(id, 'checkpoint'); // 设置标签

// 派生分支
sm.branch(entryId); // 将叶子移动到较早的条目
sm.branchWithSummary(id, 'Summary...'); // 带上下文摘要派生分支
sm.createBranchedSession(leafId); // 将路径提取到新文件
```

> 参见 [examples/sdk/11-sessions.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/11-sessions.ts) 和[会话格式](session-format.md)

### 设置管理

```typescript
import {
  createAgentSession,
  SettingsManager,
  SessionManager
} from '@earendil-works/pi-coding-agent';

// 默认：从文件加载（全局 + 项目合并）
const { session } = await createAgentSession({
  settingsManager: SettingsManager.create()
});

// 带覆盖
const settingsManager = SettingsManager.create();
settingsManager.applyOverrides({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 5 }
});
const { session } = await createAgentSession({ settingsManager });

// 内存（无文件 I/O，用于测试）
const { session } = await createAgentSession({
  settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
  sessionManager: SessionManager.inMemory()
});

// 自定义目录
const { session } = await createAgentSession({
  settingsManager: SettingsManager.create('/custom/cwd', '/custom/agent')
});
```

**静态工厂：**

- `SettingsManager.create(cwd?, agentDir?)` - 从文件加载
- `SettingsManager.inMemory(settings?)` - 无文件 I/O

**项目特定设置：**

设置从两个位置加载并合并：

1. 全局：`~/.pi/agent/settings.json`
2. 项目：`<cwd>/.pi/settings.json`

项目覆盖全局。嵌套对象合并键。设置器默认修改全局设置。

**持久化和错误处理语义：**

- 设置 getter/setter 对内存状态是同步的。
- 设置器异步排队持久化写入。
- 当你需要持久化边界时（例如进程退出前或在测试中断言文件内容前），调用 `await settingsManager.flush()`。
- `SettingsManager` 不打印设置 I/O 错误。使用 `settingsManager.drainErrors()` 并在你的应用层上报它们。

> 参见 [examples/sdk/10-settings.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/10-settings.ts)

## ResourceLoader

使用 `DefaultResourceLoader` 发现扩展、技能、提示词、主题和上下文文件。

```typescript
import { DefaultResourceLoader, getAgentDir } from '@earendil-works/pi-coding-agent';

const loader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir()
});
await loader.reload();

const extensions = loader.getExtensions();
const skills = loader.getSkills();
const prompts = loader.getPrompts();
const themes = loader.getThemes();
const contextFiles = loader.getAgentsFiles().agentsFiles;
```

## 返回值

`createAgentSession()` 返回：

```typescript
interface CreateAgentSessionResult {
  // 会话
  session: AgentSession;

  // 扩展结果（用于运行器设置）
  extensionsResult: LoadExtensionsResult;

  // 如果会话模型无法恢复时的警告
  modelFallbackMessage?: string;
}

interface LoadExtensionsResult {
  extensions: Extension[];
  errors: Array<{ path: string; error: string }>;
  runtime: ExtensionRuntime;
}
```

## 完整示例

```typescript
import { getModel } from '@earendil-works/pi-ai';
import { Type } from 'typebox';
import {
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  ModelRuntime,
  SessionManager,
  SettingsManager
} from '@earendil-works/pi-coding-agent';

const modelRuntime = await ModelRuntime.create({
  authPath: '/custom/agent/auth.json',
  modelsPath: '/custom/agent/models.json'
});
if (process.env.MY_KEY) {
  await modelRuntime.setRuntimeApiKey('anthropic', process.env.MY_KEY);
}

// 内联工具
const statusTool = defineTool({
  name: 'status',
  label: 'Status',
  description: 'Get system status',
  parameters: Type.Object({}),
  execute: async () => ({
    content: [{ type: 'text', text: `Uptime: ${process.uptime()}s` }],
    details: {}
  })
});

const model = getModel('anthropic', 'claude-opus-4-5');
if (!model) throw new Error('Model not found');

// 带覆盖的内存设置
const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2 }
});

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: '/custom/agent',
  settingsManager,
  systemPromptOverride: () => 'You are a minimal assistant. Be concise.'
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: '/custom/agent',

  model,
  thinkingLevel: 'off',
  modelRuntime,

  tools: ['read', 'bash', 'status'],
  customTools: [statusTool],
  resourceLoader: loader,

  sessionManager: SessionManager.inMemory(),
  settingsManager
});

session.subscribe((event) => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt('Get status and list files.');
```

## 运行模式

SDK 导出了运行模式工具，用于在 `createAgentSession()` 之上构建自定义界面：

### InteractiveMode

完整的 TUI 交互模式，带编辑器、聊天历史和所有内置命令：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  InteractiveMode,
  SessionManager
} from '@earendil-works/pi-coding-agent';

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

const mode = new InteractiveMode(runtime, {
  migratedProviders: [],
  modelFallbackMessage: undefined,
  initialMessage: 'Hello',
  initialImages: [],
  initialMessages: []
});

await mode.run();
```

### runPrintMode

单次模式：发送提示词、输出结果、退出：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  runPrintMode,
  SessionManager
} from '@earendil-works/pi-coding-agent';

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

await runPrintMode(runtime, {
  mode: 'text',
  initialMessage: 'Hello',
  initialImages: [],
  messages: ['Follow up']
});
```

### runRpcMode

用于子进程集成的 JSON-RPC 模式：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  runRpcMode,
  SessionManager
} from '@earendil-works/pi-coding-agent';

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

await runRpcMode(runtime);
```

JSON 协议参见 [RPC 文档](rpc.md)。

## RPC 模式替代方案

对于不使用 SDK 构建的基于子进程的集成，直接使用 CLI：

```bash
pi --mode rpc --no-session
```

JSON 协议参见 [RPC 文档](rpc.md)。

SDK 在以下情况更合适：

- 你想要类型安全
- 你在同一个 Node.js 进程中
- 你需要直接访问智能体状态
- 你想程序化地自定义工具/扩展

RPC 模式在以下情况更合适：

- 你从另一种语言集成
- 你想要进程隔离
- 你在构建语言无关的客户端

## 导出

主入口点导出：

```typescript
// 工厂
createAgentSession
createAgentSessionRuntime
AgentSessionRuntime

// 身份验证和模型
ModelRuntime // 实现 pi-ai Models 并拥有凭据存储
ModelRegistry // 同步的扩展兼容外观
CredentialSynchronizationError
resolveCliModel
resolveModelScopeWithDiagnostics

// 资源加载
DefaultResourceLoader
type ResourceLoader
createEventBus

// 常量和辅助函数
CONFIG_DIR_NAME
defineTool
getAgentDir
getPackageDir
getReadmePath
getDocsPath
getExamplesPath

// 会话管理
SessionManager
SettingsManager

// 工具工厂
createCodingTools
createReadOnlyTools
createReadTool, createBashTool, createPowerShellTool, createEditTool, createWriteTool
createGrepTool, createFindTool, createLsTool

// 类型
type CreateAgentSessionOptions
type CreateAgentSessionResult
type ExtensionFactory
type InlineExtension
type ExtensionAPI
type ToolDefinition
type Skill
type PromptTemplate
type Tool
```

扩展类型的完整 API 参见 [extensions.md](extensions.md)。
