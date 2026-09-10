---
layout: doc
title: 压缩与分支摘要
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/compaction"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

LLM 的上下文窗口有限。当对话变得过长时，Pi 使用压缩来摘要较旧的内容，同时保留近期的工作。本页面涵盖自动压缩和分支摘要两方面。

**源文件**（[pi](https://github.com/earendil-works/pi)）：

- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) - 自动压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) - 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) - 共享工具（文件跟踪、序列化）
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - 条目类型（`CompactionEntry`、`BranchSummaryEntry`）
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) - 扩展事件类型

对于项目中的 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概览

Pi 有两种摘要机制：

| 机制     | 触发条件                      | 目的                   |
| -------- | ----------------------------- | ---------------------- |
| 压缩     | 上下文超过阈值，或 `/compact` | 摘要旧消息以释放上下文 |
| 分支摘要 | `/tree` 导航                  | 在切换分支时保留上下文 |

两者使用相同的结构化摘要格式，并累积跟踪文件操作。压缩和分支摘要请求使用全新的路由会话 ID，并且在提供商支持的情况下禁用提示词缓存写入，因为这些一次性提示词不太可能被复用。

## 压缩

### 何时触发

自动压缩在满足以下条件时触发：

```text
contextTokens > contextWindow - reserveTokens
```

默认情况下，`reserveTokens` 为 16384 个 token（可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）。这为 LLM 的响应留出空间。

在多轮智能体运行期间，Pi 会在工具完成且其结果被追加之后、开始下一个助手响应之前检查此阈值。如果越过阈值，Pi 会在同一次智能体运行内进行压缩，并使用摘要和保留的消息继续。当完成的工具批次终止了运行、且没有排队消息需要再次响应时，它会跳过这一轮次之间的检查。Pi 还会在新的用户提示词之前以及一次低级智能体运行结束之后检查阈值。

你也可以用 `/compact [instructions]` 手动触发，其中可选的指令用于聚焦摘要。

### 工作原理

1. **找到切分点**：从最新的消息向前回溯，累积 token 估算值，直到达到 `keepRecentTokens`（默认 20k，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）
2. **提取消息**：收集从上一个保留边界（或会话开始）到切分点的消息
3. **生成摘要**：调用 LLM 以结构化格式进行摘要，并在存在上一个摘要时将其作为迭代上下文传入
4. **追加条目**：保存带有摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重建上下文**：会话为下一次请求重建上下文，使用摘要 + 从 `firstKeptEntryId` 开始的消息

```text
Before compaction:

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            kept messages
                                   ↑
                          firstKeptEntryId (entry 4)

After compaction (new entry appended):

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 not sent to LLM                    sent to LLM
                                                         ↑
                                              starts from firstKeptEntryId

What the LLM sees:

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    prompt   from cmp          messages from firstKeptEntryId
```

在重复压缩时，被摘要的范围从上一个压缩的保留边界（`firstKeptEntryId`）开始，而不是从压缩条目本身开始；如果该保留条目无法在路径中找到，则回退到上一个压缩之后的条目。这样可以通过将那些在更早压缩中幸存的消息也纳入下一次摘要过程，从而保留它们。Pi 还会在写入新的 `CompactionEntry` 之前，从重建的会话上下文重新计算 `tokensBefore`，以便 token 计数反映被替换的实际压缩前上下文。

### 拆分轮次

一个“轮次”以用户消息开始，包含其后的所有助手响应和工具调用，直到下一条用户消息。通常，压缩会在轮次边界处切分。

当单个轮次超过 `keepRecentTokens` 时，切分点会落在轮次中间的某条助手消息上。这就是“拆分轮次”：

```text
Split turn (one huge turn exceeds budget):

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── kept (7-8)

  isSplitTurn = true
  messagesToSummarize = []  (no complete turns before)
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对于拆分轮次，Pi 会生成两个摘要并合并它们：

1. **历史摘要**：此前的上下文（如果有）
2. **轮次前缀摘要**：拆分轮次中较早的部分

### 切分点规则

有效的切分点包括：

- 用户消息
- 助手消息
- BashExecution 消息
- 自定义消息（custom_message、branch_summary）

切勿在工具结果处切分（它们必须与自己的工具调用保持在一起）。

### CompactionEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface CompactionEntry<T = unknown> {
  type: 'compaction';
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage; // 生成该摘要的 LLM 用量
  fromHook?: boolean; // 若由扩展提供则为 true（历史字段名）
  details?: T; // 实现特定的数据
}

// 默认压缩使用以下结构作为 details（来自 compaction.ts）：
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中存储任意可 JSON 序列化的数据。默认压缩跟踪文件操作，但自定义扩展实现可以使用自己的结构。生成的摘要和扩展提供的摘要会在可用时存储其 LLM `usage`，以便会话总量包含摘要工作。

实现参见 [`prepareCompaction()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) 和 [`compact()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)。对于直接的程序化摘要，`generateSummary()` 返回摘要文本，`generateSummaryWithUsage()` 返回 `{ text, usage }`。

## 分支摘要

### 何时触发

当你使用 `/tree` 导航到不同分支时，Pi 会提议摘要你正在离开的工作。这会将左侧分支的上下文注入到新分支中。

### 工作原理

1. **找到共同祖先**：新旧位置共享的最深节点
2. **收集条目**：从旧叶子节点回溯到共同祖先
3. **按预算准备**：纳入不超过 token 预算的消息（最新的优先）
4. **生成摘要**：调用 LLM 以结构化格式进行摘要
5. **追加条目**：在导航点保存 `BranchSummaryEntry`

```text
Tree before navigation:

         ┌─ B ─ C ─ D (old leaf, being abandoned)
    A ───┤
         └─ E ─ F (target)

Common ancestor: A
Entries to summarize: B, C, D

After navigation with summary:

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [summary of B,C,D] (new leaf)
```

### 累积文件跟踪

压缩和分支摘要都会累积跟踪文件。在生成摘要时，pi 从以下来源提取文件操作：

- 被摘要消息中的工具调用
- 此前的压缩或分支摘要 `details`（如果有）

这意味着文件跟踪会跨多次压缩或嵌套分支摘要累积，从而保留读取和修改文件的完整历史。

### BranchSummaryEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: 'branch_summary';
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  fromId: string; // 我们所导航离开的条目
  usage?: Usage; // 生成该摘要的 LLM 用量
  fromHook?: boolean; // 若由扩展提供则为 true（历史字段名）
  details?: T; // 实现特定的数据
}

// 默认分支摘要使用以下结构作为 details（来自 branch-summarization.ts）：
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与压缩相同，扩展可以在 `details` 中存储自定义数据。

实现参见 [`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) 和 [`generateBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)。

## 摘要格式

压缩和分支摘要使用相同的结构化格式：

```markdown
## Goal

[What the user is trying to accomplish]

## Constraints & Preferences

- [Requirements mentioned by user]

## Progress

### Done

- [x] [Completed tasks]

### In Progress

- [ ] [Current work]

### Blocked

- [Issues, if any]

## Key Decisions

- **[Decision]**: [Rationale]

## Next Steps

1. [What should happen next]

## Critical Context

- [Data needed to continue]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息序列化

在摘要之前，消息会通过 [`serializeConversation()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) 序列化为文本：

```text
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

这可以防止模型将其视为一段需要继续的对话。

序列化期间，工具结果会被截断到 2000 个字符。超出该限制的内容会被替换为一个标记，指示被截断了多少字符。这使摘要请求保持在合理的 token 预算内，因为工具结果（尤其是来自 `read` 和 `bash` 的结果）通常是上下文大小最大的贡献者。

## 通过扩展自定义摘要

扩展可以拦截并自定义压缩和分支摘要。事件类型定义参见 [`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)。

### session_before_compact

在自动压缩或 `/compact` 之前触发。可以取消或提供自定义摘要。参见类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on('session_before_compact', async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - 待摘要的消息
  // preparation.turnPrefixMessages - 拆分轮次前缀（若 isSplitTurn）
  // preparation.previousSummary - 上一个压缩摘要
  // preparation.fileOps - 提取出的文件操作
  // preparation.tokensBefore - 压缩前的上下文 token
  // preparation.firstKeptEntryId - 保留消息开始的位置
  // preparation.settings - 压缩设置

  // branchEntries - 当前分支上的所有条目（用于自定义状态）
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // willRetry - 压缩后是否重试被中止的轮次（溢出恢复）
  // signal - AbortSignal（传给 LLM 调用）

  // 取消：
  return { cancel: true };

  // 自定义摘要：
  return {
    compaction: {
      summary: 'Your summary...',
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // 可选；纳入会话总量
      details: {/* custom data */}
    }
  };
});
```

#### 将消息转换为文本

要使用你自己的模型生成摘要，请使用 `serializeConversation` 将消息转换为文本：

```typescript
import { convertToLlm, serializeConversation } from '@earendil-works/pi-coding-agent';

pi.on('session_before_compact', async (event, ctx) => {
  const { preparation } = event;

  // 将 AgentMessage[] 转换为 Message[]，再序列化为文本
  const conversationText = serializeConversation(convertToLlm(preparation.messagesToSummarize));
  // 返回：
  // [User]: message text
  // [Assistant thinking]: thinking content
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // 现在发送给你的模型进行摘要
  const { summary, usage } = await myModel.summarize(conversationText);

  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage
    }
  };
});
```

使用不同模型的完整示例参见 [custom-compaction.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/custom-compaction.ts)。

### session_compact_failed

在手动或自动压缩失败或被中止时触发。这对于需要将 `session_before_compact` 尝试与最终结果配对的遥测扩展很有用。

```typescript
pi.on('session_compact_failed', async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // errorMessage - 非中止失败时存在
  // aborted - 已取消/中止的压缩为 true
  // willRetry - 被中止的轮次压缩后是否会重试
  // fromExtension - 是否正在使用扩展提供的压缩内容
});
```

### session_before_tree

在 `/tree` 导航之前触发。无论用户是否选择摘要，都会触发。可以取消导航或提供自定义摘要。

```typescript
pi.on('session_before_tree', async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - 我们要导航到的位置
  // preparation.oldLeafId - 当前位置（正在被放弃）
  // preparation.commonAncestorId - 共享祖先
  // preparation.entriesToSummarize - 将被摘要的条目
  // preparation.userWantsSummary - 用户是否选择摘要

  // 完全取消导航：
  return { cancel: true };

  // 提供自定义摘要（仅在 userWantsSummary 为 true 时使用）：
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: 'Your summary...',
        // usage: summaryResponse.usage, // 可选；纳入会话总量
        details: {/* custom data */}
      }
    };
  }
});
```

参见类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置

在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置压缩：

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置               | 默认值  | 描述                       |
| ------------------ | ------- | -------------------------- |
| `enabled`          | `true`  | 启用自动压缩               |
| `reserveTokens`    | `16384` | 为 LLM 响应保留的 token    |
| `keepRecentTokens` | `20000` | 保留（不摘要）的近期 token |

使用 `"enabled": false` 禁用自动压缩。你仍然可以用 `/compact` 手动压缩。
