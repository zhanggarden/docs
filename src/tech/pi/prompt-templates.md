---
layout: doc
title: 提示词模板
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/prompt-templates"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

> pi 可以创建提示词模板。让它为你的工作流构建一个吧。

提示词模板是展开为完整提示词的 Markdown 片段。在编辑器中输入 `/name` 即可调用模板，其中 `name` 是不带 `.md` 的文件名。

## 位置

Pi 从以下位置加载提示词模板：

- 全局：`~/.pi/agent/prompts/*.md`
- 项目：`.pi/prompts/*.md`（仅在项目被信任后）
- 包：`prompts/` 目录或 `package.json` 中的 `pi.prompts` 条目
- 设置：包含文件或目录的 `prompts` 数组
- CLI：`--prompt-template <path>`（可重复）

使用 `--no-prompt-templates` 禁用发现。

## 格式

```markdown
---
description: Review staged git changes
---

Review the staged changes (`git diff --cached`). Focus on:

- Bugs and logic errors
- Security issues
- Error handling gaps
```

- 文件名即命令名。`review.md` 变成 `/review`。
- `description` 可选。若缺失，则使用第一行非空内容。
- `argument-hint` 可选。设置后，该提示会显示在自动补全下拉框中描述之前。

### 参数提示

在 frontmatter 中使用 `argument-hint`，在自动补全中显示预期的参数。使用 `<尖括号>` 表示必填参数，`[方括号]` 表示可选参数：

```markdown
---
description: Review PRs from URLs with structured issue and code analysis
argument-hint: '<PR-URL>'
---
```

这会在自动补全下拉框中渲染为：

```text
→ pr   <PR-URL>       — Review PRs from URLs with structured issue and code analysis
  is   <issue>        — Analyze GitHub issues (bugs or feature requests)
  wr   [instructions] — Finish the current task end-to-end
  cl   — Audit changelog entries before release
```

## 用法

在编辑器中输入 `/` 后跟模板名称。自动补全显示可用模板及其描述。

```text
/review                           # 展开 review.md
/component Button                 # 带参数展开
/component Button "click handler" # 多个参数
```

## 参数

模板支持位置参数、默认值和简单切片：

- `$1`、`$2` 等位置参数
- `$@` 或 `$ARGUMENTS` 表示所有参数合并
- `${1:-default}` 在参数 1 存在且非空时使用它，否则使用 `default`
- `${@:-default}` 或 `${ARGUMENTS:-default}` 在所有参数存在且非空时使用它们，否则使用 `default`
- `${@:N}` 表示从第 N 个位置（从 1 开始计数）起的参数
- `${@:N:L}` 表示从 N 开始的 `L` 个参数

示例：

```markdown
---
description: Create a component
---

Create a React component named $1 with features: $@
```

默认值对可选参数很有用：

```markdown
Summarize the current state in ${1:-7} bullet points.
```

用法：`/component Button "onClick handler" "disabled support"`

## 加载规则

- `prompts/` 中的模板发现是非递归的。
- 如果你希望子目录中的模板，请通过 `prompts` 设置或包清单显式添加它们。
