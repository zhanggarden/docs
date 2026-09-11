---
layout: doc
title: 会话
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/sessions"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 将对话保存为会话，这样你可以继续工作、从较早的轮次派生分支，以及重新访问之前的路径。

## 会话存储

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。每个会话都是一个具有树结构的 JSONL 文件。

```bash
pi -c                  # 继续最近的会话
pi -r                  # 浏览并选择历史会话
pi --no-session        # 临时模式；不保存
pi --name "my task"    # 在启动时设置会话显示名称
pi --session <path|id> # 使用特定的会话文件或部分会话 ID
pi --fork <path|id>    # 将会话文件或部分会话 ID 派生为新的会话
```

在交互模式下使用 `/session` 查看当前会话文件、会话 ID、消息数、token 数和成本。

有关 JSONL 文件格式和 SessionManager API，请参见[会话格式](session-format.md)。

## 会话命令

| 命令                | 描述                                             |
| ------------------- | ------------------------------------------------ |
| `/resume`           | 浏览并选择历史会话                               |
| `/new`              | 开始一个新会话                                   |
| `/name <name>`      | 设置当前会话显示名称                             |
| `/session`          | 显示会话信息                                     |
| `/tree`             | 导航当前会话树                                   |
| `/fork`             | 从之前的用户消息创建一个新会话                   |
| `/clone`            | 将当前活动分支复制到一个新会话                   |
| `/compact [prompt]` | 摘要较旧的上下文；参见[压缩](compaction.md)      |
| `/export [file]`    | 将会话导出为 HTML                                |
| `/share`            | 上传为私有 GitHub gist，并附带可分享的 HTML 链接 |

## 恢复和删除会话

`/resume` 为当前项目打开一个交互式会话选择器。`pi -r` 在启动时打开同一个选择器。

在选择器中你可以：

- 通过输入进行搜索
- 用 Ctrl+P 切换路径显示
- 用 Ctrl+S 切换排序模式
- 用 Ctrl+N 过滤到已命名的会话
- 用 Ctrl+R 重命名
- 用 Ctrl+D 删除，然后确认

在可用时，pi 使用 `trash` CLI 进行删除，而不是永久移除文件。

## 命名会话

使用 `/name <name>` 设置一个可读的会话名称：

```text
/name Refactor auth module
```

在启动时用 `--name` 或 `-n` 设置名称：

```bash
pi --name "Refactor auth module"
pi --name "CI audit" -p "Review this build failure"
```

已命名的会话在 `/resume` 和 `pi -r` 中更容易找到。

## 使用 `/tree` 派生分支

会话以树的形式存储。每个条目都有一个 `id` 和 `parentId`，当前位置是活动叶子节点。`/tree` 让你跳转到任意之前的点并从那里继续，而无需创建新文件。

<p align="center"><img src="./images/tree-view.png" alt="Tree View" width="600"></p>

示例形状：

```text
├─ user: "Hello, can you help..."
│  └─ assistant: "Of course! I can..."
│     ├─ user: "Let's try approach A..."
│     │  └─ assistant: "For approach A..."
│     │     └─ user: "That worked..."  ← active
│     └─ user: "Actually, approach B..."
│        └─ assistant: "For approach B..."
```

### 树控件

| 按键                         | 操作                          |
| ---------------------------- | ----------------------------- |
| ↑/↓                          | 导航可见条目                  |
| ←/→                          | 上下翻页                      |
| Ctrl+←/Ctrl+→ 或 Alt+←/Alt+→ | 折叠/展开或在分支片段之间跳转 |
| Shift+L                      | 在所选条目上设置或清除标签    |
| Shift+T                      | 切换标签时间戳                |
| Enter                        | 选择条目                      |
| Escape/Ctrl+C                | 取消                          |
| Ctrl+O                       | 循环切换过滤模式              |

过滤模式包括：default、no-tools、user-only、labeled-only 和 all。在[设置](settings.md)中用 `treeFilterMode` 配置默认值。

### 选择行为

选择用户消息或自定义消息：

1. 将叶子节点移动到所选消息的父节点。
2. 将所选消息文本放入编辑器。
3. 让你编辑并重新提交，从而创建一个新分支。

选择助手、工具、压缩或其他非用户条目：

1. 将叶子节点移动到该条目。
2. 将编辑器留空。
3. 让你从该点继续。

选择根用户消息会将叶子节点重置为一个空对话，并将原始提示词放入编辑器。

## `/tree`、`/fork` 和 `/clone`

| 特性     | `/tree`          | `/fork`                  | `/clone`             |
| -------- | ---------------- | ------------------------ | -------------------- |
| 输出     | 同一个会话文件   | 新的会话文件             | 新的会话文件         |
| 视图     | 完整树           | 用户消息选择器           | 当前活动分支         |
| 典型用途 | 原地探索备选方案 | 从较早的提示词启动新会话 | 在继续前复制当前工作 |
| 摘要     | 可选分支摘要     | 无                       | 无                   |

当你希望将备选方案放在一起时，使用 `/tree`。当你希望一个单独的会话文件时，使用 `/fork` 或 `/clone`。

## 分支摘要

当 `/tree` 从一个分支切换到另一个分支时，pi 可以摘要被放弃的分支，并将该摘要附加到新位置。这样可以在不重放整个分支的情况下，保留你所离开路径的重要上下文。

当被提示时，选择以下之一：

1. 不摘要
2. 使用默认提示词进行摘要
3. 使用自定义焦点指令进行摘要

有关分支摘要的内部机制和扩展钩子，请参见[压缩](compaction.md)。

## 会话格式

会话文件是 JSONL 格式，包含消息条目、模型更改、思考等级更改、标签、压缩、分支摘要和扩展条目。

有关解析器、扩展、SDK 用法以及完整的 SessionManager API，请参见[会话格式](session-format.md)。
