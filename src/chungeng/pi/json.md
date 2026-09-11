---
layout: doc
title: JSON 事件流模式
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/json"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

```bash
pi --mode json "Your prompt"
```

将所有会话事件以 JSON 行（JSON lines）输出到 stdout。适合将 pi 集成到其他工具或自定义 UI 中。

## 事件类型

线上事件使用 `JsonAgentSessionEvent`。它与 [`AgentSessionEvent`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts) 相匹配，只是流式消息更新会省略累积快照：

```typescript
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, 'partial'> : T;

type JsonAssistantMessageEvent<T> = T extends { type: 'toolcall_start'; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: 'message_update' }>
  | {
      type: 'message_update';
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

`queue_update` 在挂起的 steering 队列和 follow-up 队列发生变化时发出完整内容。`compaction_start` 和 `compaction_end` 覆盖手动和自动压缩两种情况。

其他基础事件来自 [`AgentEvent`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts)：

```typescript
type AgentEvent =
  // 智能体生命周期
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages: AgentMessage[] }
  // 轮次生命周期
  | { type: 'turn_start' }
  | { type: 'turn_end'; message: AgentMessage; toolResults: ToolResultMessage[] }
  // 消息生命周期
  | { type: 'message_start'; message: AgentMessage }
  | { type: 'message_update'; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: 'message_end'; message: AgentMessage }
  // 工具执行
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: any }
  | {
      type: 'tool_execution_update';
      toolCallId: string;
      toolName: string;
      args: any;
      partialResult: any;
    }
  | {
      type: 'tool_execution_end';
      toolCallId: string;
      toolName: string;
      result: any;
      isError: boolean;
    };
```

## 消息类型

来自 [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts#L134) 的基础消息：

- `UserMessage`（第 134 行）
- `AssistantMessage`（第 140 行）
- `ToolResultMessage`（第 152 行）

来自 [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts#L29) 的扩展消息：

- `BashExecutionMessage`（第 29 行）
- `CustomMessage`（第 46 行）
- `BranchSummaryMessage`（第 55 行）
- `CompactionSummaryMessage`（第 62 行）

## 输出格式

每一行都是一个 JSON 对象。第一行是会话头：

```json
{ "type": "session", "version": 3, "id": "uuid", "timestamp": "...", "cwd": "/path" }
```

随后是按发生顺序输出的事件：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"assistant","content":[],...}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{...}}
{"type":"turn_end","message":{...},"toolResults":[]}
{"type":"agent_end","messages":[...]}
```

`message_update` 记录仅包含增量。它们同时省略累积的 `message` 字段和 `assistantMessageEvent.partial`，以使流大小保持线性增长。顶层的 `usage` 字段包含最新的累积提供商上报用量；当提供商仅在完成时上报用量时，它可能保持为零。若需组装实时文本、思考或工具调用参数，可使用 `contentIndex` 和 `delta`。`toolcall_start` 事件还包含恒定大小的 `id` 和 `toolName` 字段。`message_end` 包含最终权威消息。

## 示例

```bash
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```
