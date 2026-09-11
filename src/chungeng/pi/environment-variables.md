---
layout: doc
title: 环境变量
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/environment-variables"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 以三种方式使用环境变量：

- 诸如 `PI_OFFLINE` 之类的变量用于配置 Pi 进程。
- Pi 设置进程标记，以便子进程能够将 Pi 识别为启动它们的智能体。
- 由 LLM 可调用的 shell 工具运行的命令会收到描述当前会话的 `PI_*` 变量。

提供商 API 密钥变量单独记录在[服务提供商](providers.md#environment-variables-or-auth-file)中。

## 进程标记

CLI 和 RPC 入口点会设置两个进程标记：

- `AI_AGENT=pi` 是一个通用标记，让工具能够将 Pi 识别为启动该进程的智能体。
- `PI_CODING_AGENT=true` 是 Pi 特有的标记，让子进程能够检测到自己运行在 Pi 内部。

子进程会继承这两个标记。它们不是会话特定的，并且在通过 SDK 嵌入 Pi 时不会自动设置。

## Shell 工具会话环境

由 `bash` 和 `powershell` 工具运行的命令会收到当前 Pi 会话状态：

| 变量 | 描述 |
| --- | --- |
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 文件的绝对路径；对于临时会话则不设置 |
| `PI_PROVIDER` | 当前选定的模型提供商 |
| `PI_MODEL` | 当前选定的模型 ID |
| `PI_REASONING_LEVEL` | 当前生效的推理等级：`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` |

这些值在每个命令启动时解析。因此，切换模型或更改推理等级会影响下一条 shell 命令，而无需重启 Pi。`PI_PROVIDER` 和 `PI_MODEL` 标识的是所选定的 Pi 模型，而不是路由器可能在内部选择的不同上游模型。

当被询问正在运行的是哪个模型或提供商时，请检查这些变量，而不是从系统提示词中推断答案：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

当会话为持久会话时，可以直接检查会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

这些变量会注入到 LLM 可调用的 `bash` 和 `powershell` 工具中。它们不会注入到用户输入的 `!` 或 `!!` 命令中。

### 自定义 Shell 工具

使用 `createBashTool()` 或 `createPowerShellTool()` 创建的工具在注册到 Pi 时，默认会暴露会话环境。注入发生在 `spawnHook` 之前，因此钩子会在 `ctx.env` 中收到这些变量：

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: '1' }
  })
});
```

可以独立于 spawn 钩子禁用会话元数据：

```typescript
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx
});
```

禁用后，Pi 会移除这些变量的继承值，以免嵌套的 Pi 进程暴露过期的父会话元数据。

## Pi 进程配置

以下变量由 Pi 自身读取：

| 变量 | 描述 |
| --- | --- |
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储；会被 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖包目录，适用于 Nix/Guix 存储路径 |
| `PI_OFFLINE` | 禁用启动时的网络操作，包括更新检查、包更新以及安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | 禁用对 `pi.dev` 的最新版本请求 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和提供商归属头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CACHE_RETENTION` | 设置为 `long` 时，在受支持的提供商上延长提示词缓存 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 使用的基础 URL |
| `PI_HARDWARE_CURSOR` | 设置为 `1` 以显示硬件光标；参见[终端设置](terminal-setup.md) |
| `PI_HYPERLINKS` | 用 `1`、`0` 或 `auto` 覆盖 OSC 8 超链接检测 |
| `PI_IMAGE_PROTOCOL` | 用 `kitty`、`iterm2`、`none` 或 `auto` 覆盖内联图片检测 |
| `PI_TRUE_COLOR` | 用 `1`、`0` 或 `auto` 覆盖真彩色检测 |
| `PI_TUI_ESC_TIMEOUT` | 在单独一个 ESC 之后等待多久才将其视为 Escape，单位为毫秒；在 SSH 下默认为 `100`，否则为 `10`。若 Alt 键输入被误读为 Escape，可增大此值 |
| `VISUAL`、`EDITOR` | 当 `externalEditor` 未设置时的外部编辑器回退 |
| `HTTP_PROXY`、`HTTPS_PROXY` | 代理出站 HTTP 请求 |

诸如 `ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 之类的提供商凭据以及云提供商配置，列在[服务提供商](providers.md#environment-variables-or-auth-file)中。

`PI_SERVER_DIR` 和 `PI_SERVER_ID` 仅适用于仅源码的[实验性远程测试框架](development.md#experimental-remote-harness)，不适用于分发包。
