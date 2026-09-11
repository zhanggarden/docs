---
layout: doc
title: 会话文件格式
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/session-format"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

会话以 JSONL（JSON Lines）文件存储。每一行都是一个带有 `type` 字段的 JSON 对象。会话条目通过 `id`/`parentId` 字段形成树结构，从而支持在不创建新文件的情况下原地派生分支。

## 文件位置

```text
~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl
```

默认情况下，`<session-id>` 是一个 UUID。调用方可以通过 SDK 或 `--session-id` 提供自定义 ID。对于 `<path>`，Pi 会移除开头的路径分隔符，并将 `/`、`\` 和 `:` 替换为 `-`。

## 删除会话

会话可以通过删除 `~/.pi/agent/sessions/` 下的 `.jsonl` 文件来移除。

Pi 还支持从 `/resume` 交互式删除会话（选择一个会话并按 `Ctrl+D`，然后确认）。在可用时，pi 使用 `trash` CLI 以避免永久删除。

## 会话版本

会话在头部有一个版本字段：

- **版本 1**：线性条目序列（旧版，加载时自动迁移）
- **版本 2**：带 `id`/`parentId` 链接的树结构
- **版本 3**：将 `hookMessage` 角色重命名为 `custom`（扩展统一）

现有会话在加载时会自动迁移到当前版本（v3）。

## 源文件

GitHub 上的源码（[pi](https://github.com/earendil-works/pi)）：

- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - 会话条目类型和 SessionManager
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) - 扩展消息类型（BashExecutionMessage、CustomMessage 等）
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) - 基础消息类型（UserMessage、AssistantMessage、ToolResultMessage）
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) - AgentMessage 联合类型

对于项目中的 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 消息类型

会话条目包含 `AgentMessage` 对象。理解这些类型对于解析会话和编写扩展至关重要。

### 内容块

消息包含类型化的内容块数组：

```typescript
interface TextContent {
  type: 'text';
  text: string;
  textSignature?: string;
}

interface ImageContent {
  type: 'image';
  data: string; // base64 编码
  mimeType: string; // 例如 "image/jpeg"、"image/png"
}

interface ThinkingContent {
  type: 'thinking';
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}

interface ToolCall {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  namespace?: string;
}
```

### 基础消息类型（来自 pi-ai）

```typescript
interface UserMessage {
  role: 'user';
  content: string | (TextContent | ImageContent)[];
  timestamp: number; // Unix 毫秒
}

interface AssistantMessage {
  role: 'assistant';
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  providerThinkingLevel?: string;
  diagnostics?: AssistantMessageDiagnostic[];
  usage: Usage;
  stopReason: 'pending' | 'stop' | 'length' | 'toolUse' | 'error' | 'aborted' | 'deferred';
  deferred?: DeferredHandle;
  errorMessage?: string;
  rawStopReason?: string;
  endTurn?: boolean;
  timestamp: number;
}

interface ToolResultMessage {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: any; // 工具特定的元数据
  usage?: Usage; // 工具执行的嵌套 LLM 工作
  addedToolNames?: string[];
  isError: boolean;
  timestamp: number;
}

interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  reasoning?: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

`"pending"` 保留给流式事件中的部分消息。终止事件会在 Pi 持久化助手消息之前用一个完成原因替换它，因此 `"pending"` 绝不应出现在会话 JSONL 中。`"deferred"` 是稍后才完成的提供商响应的终止原因；其 `deferred` 句柄包含检索该响应所需的提供商数据。

### 扩展消息类型（来自 pi-coding-agent）

```typescript
interface BashExecutionMessage {
  role: 'bashExecution';
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean; // 对 !! 前缀命令为 true
  timestamp: number;
}

interface CustomMessage {
  role: 'custom';
  customType: string; // 扩展标识符
  content: string | (TextContent | ImageContent)[];
  display: boolean; // 在 TUI 中显示
  details?: any; // 扩展特定的元数据
  timestamp: number;
}

interface BranchSummaryMessage {
  role: 'branchSummary';
  summary: string;
  fromId: string | null; // 其被放弃路径已被摘要的上一个叶子
  timestamp: number;
}

interface CompactionSummaryMessage {
  role: 'compactionSummary';
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

### AgentMessage 联合

```typescript
type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

## 条目基类

所有条目（除 `SessionHeader` 外）都扩展 `SessionEntryBase`：

```typescript
interface SessionEntryBase {
  type: string;
  id: string; // 通常是 8 字符十六进制 ID；可能回退到完整 UUID
  parentId: string | null; // 父条目 ID（根条目为 null）
  timestamp: string; // ISO 时间戳
}
```

## 条目类型

### SessionHeader

文件的第一行。仅元数据，不属于树的一部分（没有 `id`/`parentId`）。

```json
{
  "type": "session",
  "version": 3,
  "id": "uuid",
  "timestamp": "2024-12-03T14:00:00.000Z",
  "cwd": "/path/to/project"
}
```

对于有父会话的会话（通过 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建）：

```json
{
  "type": "session",
  "version": 3,
  "id": "uuid",
  "timestamp": "2024-12-03T14:00:00.000Z",
  "cwd": "/path/to/project",
  "parentSession": "/path/to/original/session.jsonl"
}
```

### SessionMessageEntry

对话中的一条消息。`message` 字段包含一个 `AgentMessage`。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello","timestamp":1733234401000}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"api":"anthropic-messages","provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop","timestamp":1733234402000}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false,"timestamp":1733234403000}}
```

### ModelChangeEntry

用户会话中途切换模型时发出。

```json
{
  "type": "model_change",
  "id": "d4e5f6g7",
  "parentId": "c3d4e5f6",
  "timestamp": "2024-12-03T14:05:00.000Z",
  "provider": "openai",
  "modelId": "gpt-4o"
}
```

### ThinkingLevelChangeEntry

用户更改思考/推理等级时发出。

```json
{
  "type": "thinking_level_change",
  "id": "e5f6g7h8",
  "parentId": "d4e5f6g7",
  "timestamp": "2024-12-03T14:06:00.000Z",
  "thinkingLevel": "high"
}
```

### CompactionEntry

上下文被压缩时创建。存储较早消息的摘要。

```json
{
  "type": "compaction",
  "id": "f6g7h8i9",
  "parentId": "e5f6g7h8",
  "timestamp": "2024-12-03T14:10:00.000Z",
  "summary": "User discussed X, Y, Z...",
  "firstKeptEntryId": "c3d4e5f6",
  "tokensBefore": 50000
}
```

`firstKeptEntryId` 是必需的。它标识从压缩条目之前保留的第一个条目。重建上下文时，Pi 用压缩摘要替换较早的被摘要条目，并保留从该条目开始的范围。

可选字段：

- `usage`：生成摘要的 LLM 用量；计入会话 token 和成本总量
- `details`：实现特定的数据（例如默认的 `{ readFiles: string[], modifiedFiles: string[] }`，或扩展的自定义数据）
- `fromHook`：由扩展生成则为 `true`，pi 生成则为 `false`/`undefined`（历史字段名）

### BranchSummaryEntry

通过 `/tree` 切换分支时创建，带有对左侧分支直到共同祖先的 LLM 生成摘要。捕获被放弃路径的上下文。

```json
{
  "type": "branch_summary",
  "id": "g7h8i9j0",
  "parentId": "a1b2c3d4",
  "timestamp": "2024-12-03T14:15:00.000Z",
  "fromId": "f6g7h8i9",
  "summary": "Branch explored approach A..."
}
```

`parentId` 是新分支继续的条目。`fromId` 是其被放弃路径已被摘要的上一个叶子。

可选字段：

- `usage`：生成摘要的 LLM 用量；计入会话 token 和成本总量
- `details`：默认的文件跟踪数据（`{ readFiles: string[], modifiedFiles: string[] }`），或扩展的自定义数据
- `fromHook`：由扩展生成则为 `true`，pi 生成则为 `false`/`undefined`（历史字段名）

### CustomEntry

扩展状态持久化。不参与 LLM 上下文。

```json
{
  "type": "custom",
  "id": "h8i9j0k1",
  "parentId": "g7h8i9j0",
  "timestamp": "2024-12-03T14:20:00.000Z",
  "customType": "my-extension",
  "data": { "count": 42 }
}
```

在重新加载时使用 `customType` 识别你扩展的条目。交互模式可以通过 `pi.registerEntryRenderer(customType, renderer)` 渲染自定义条目，但它们仍不参与 LLM 上下文。

### CustomMessageEntry

扩展注入的、确实参与 LLM 上下文的消息。

```json
{
  "type": "custom_message",
  "id": "i9j0k1l2",
  "parentId": "h8i9j0k1",
  "timestamp": "2024-12-03T14:25:00.000Z",
  "customType": "my-extension",
  "content": "Injected context...",
  "display": true
}
```

字段：

- `content`：字符串或 `(TextContent | ImageContent)[]`（与 UserMessage 相同）
- `display`：`true` = 在 TUI 中以不同样式显示，`false` = 隐藏
- `details`：可选的扩展特定元数据（不发送给 LLM）

### LabelEntry

用户在某条目上定义的书签/标记。

```json
{
  "type": "label",
  "id": "j0k1l2m3",
  "parentId": "i9j0k1l2",
  "timestamp": "2024-12-03T14:30:00.000Z",
  "targetId": "a1b2c3d4",
  "label": "checkpoint-1"
}
```

将 `label` 设为 `undefined` 以清除标签。

### SessionInfoEntry

会话元数据（例如用户定义的显示名称）。通过 `/name`、`--name` / `-n` 或扩展中的 `pi.setSessionName()` 设置。

```json
{
  "type": "session_info",
  "id": "k1l2m3n4",
  "parentId": "j0k1l2m3",
  "timestamp": "2024-12-03T14:35:00.000Z",
  "name": "Refactor auth module"
}
```

设置后，会话名称会在会话选择器（`/resume`）中显示，而不是第一条消息。

## 树结构

条目通常形成一棵树，但导航 API 可以创建多个根：

- 根条目的 `parentId: null`；第一个条目最初是根
- 每个非根条目通过 `parentId` 指向其父条目
- 分支从较早的条目创建新的子条目
- “叶子”是树中的当前位置
- 调用 `resetLeaf()` 或 `branchWithSummary(null, ...)` 允许后一个条目成为另一个根

```text
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

## 上下文构建

`buildContextEntries()` 从当前叶子走到根，产生活动条目列表，同时遵循压缩：

1. 收集路径上的所有条目
2. 如果路径上有一个或多个 `CompactionEntry` 值，使用最新的那个：
   - 首先包含压缩条目
   - 包含从 `firstKeptEntryId` 到（但不包括）压缩条目的条目
   - 包含压缩条目之后的条目
3. 保留所选范围内的非消息条目，以便交互模式可以渲染它们

`buildSessionContext()` 在该条目列表基础上构建，产生发给 LLM 的消息列表：

1. 从完整路径提取当前模型和思考等级设置
2. 将所选条目转换为消息：
   - `message` -> 存储的 `AgentMessage`
   - `compaction` -> `compactionSummary`
   - `branch_summary` -> `branchSummary`
   - `custom_message` -> `CustomMessage`
   - `custom` -> 无上下文消息

压缩摘要替换 `firstKeptEntryId` 之前的条目。保留的条目和压缩之后的所有条目仍可供 LLM 使用。

## 解析示例

```typescript
import { readFileSync } from 'fs';

const lines = readFileSync('session.jsonl', 'utf8').trim().split('\n');

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case 'session':
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case 'message':
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case 'compaction':
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case 'branch_summary':
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case 'custom':
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case 'custom_message':
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case 'label':
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case 'model_change':
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case 'thinking_level_change':
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```

## SessionManager API

以编程方式处理会话的关键方法。

### 静态创建方法

- `SessionManager.create(cwd, sessionDir?, options?)` - 新会话；`options` 可以设置 `id` 和 `parentSession`
- `SessionManager.open(path, sessionDir?, cwdOverride?)` - 打开现有会话文件
- `SessionManager.continueRecent(cwd, sessionDir?)` - 继续最近的会话或创建新会话
- `SessionManager.inMemory(cwd?, options?, entries?)` - 无文件持久化，可选地从条目初始化
- `SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?, options?)` - 从另一个项目派生会话

### 静态列出方法

- `SessionManager.list(cwd, sessionDir?, onProgress?)` - 列出目录的会话
- `SessionManager.listAll(onProgress?)` - 列出所有项目中的所有会话
- `SessionManager.listAll(sessionDir?, onProgress?)` - 从自定义会话根目录列出会话

### 实例方法 - 会话管理

- `newSession(options?)` - 开始新会话（options：`{ id?: string, parentSession?: string }`）
- `setSessionFile(path)` - 切换到不同的会话文件
- `createBranchedSession(leafId)` - 将分支提取到新会话文件

### 实例方法 - 追加（都返回条目 ID）

- `appendMessage(message)` - 添加消息
- `appendThinkingLevelChange(level)` - 记录思考更改
- `appendModelChange(provider, modelId)` - 记录模型更改
- `appendCompaction(summary, firstKeptEntryId, tokensBefore, details?, fromHook?, usage?)` - 添加压缩
- `appendCustomEntry(customType, data?)` - 扩展状态（不在上下文中）
- `appendSessionInfo(name)` - 设置会话显示名称
- `appendCustomMessageEntry(customType, content, display, details?)` - 扩展消息（在上下文中）
- `appendLabelChange(targetId, label)` - 设置/清除标签

### 实例方法 - 树导航

- `getLeafId()` - 当前位置
- `getLeafEntry()` - 获取当前叶子条目
- `getEntry(id)` - 按 ID 获取条目
- `getBranch(fromId?)` - 从条目走到根
- `getTree()` - 获取完整树结构
- `getChildren(parentId)` - 获取直接子条目
- `getLabel(id)` - 获取条目的标签
- `branch(entryId)` - 将叶子移动到较早的条目
- `resetLeaf()` - 将叶子重置为 null（在任何条目之前）
- `branchWithSummary(entryId, summary, details?, fromHook?, usage?)` - 带上下文摘要派生分支；`entryId` 可为 `null` 以从根派生

### 实例方法 - 上下文与信息

- `buildContextEntries()` - 获取应用了压缩的活动分支条目
- `buildSessionContext()` - 获取发给 LLM 的消息、thinkingLevel 和 model
- `getEntries()` - 所有条目（不包括头部）
- `getHeader()` - 会话头部元数据
- `getSessionName()` - 从最新的 session_info 条目获取显示名称
- `getCwd()` - 工作目录
- `getSessionDir()` - 会话存储目录
- `getSessionId()` - 会话 UUID
- `getSessionFile()` - 会话文件路径（内存会话为 undefined）
- `isPersisted()` - 会话是否已保存到磁盘
