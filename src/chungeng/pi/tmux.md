---
layout: doc
title: tmux 设置
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/tmux"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 可以在 tmux 内运行，但 tmux 默认会剥离某些按键的修饰键信息。在没有配置的情况下，`Shift+Enter` 和 `Ctrl+Enter` 通常与普通 `Enter` 无法区分。

## 推荐配置

在 `~/.tmux.conf` 中添加：

```bash
set -g extended-keys on
set -g extended-keys-format csi-u
```

然后完整重启 tmux：

```bash
tmux kill-server
tmux
```

当 Kitty 键盘协议不可用时，Pi 会自动请求扩展按键上报。使用 `extended-keys-format csi-u` 时，tmux 会以 CSI-u 格式转发带修饰键的按键，这是最可靠的配置。`extended-keys-format` 选项需要 tmux 3.5 或更高版本。

## 为什么推荐 `csi-u`

仅配置：

```bash
set -g extended-keys on
```

tmux 默认使用 `extended-keys-format xterm`。当应用程序请求扩展按键上报时，带修饰键的按键会以 xterm `modifyOtherKeys` 格式转发，例如：

- `Ctrl+C` → `\x1b[27;5;99~`
- `Ctrl+D` → `\x1b[27;5;100~`
- `Ctrl+Enter` → `\x1b[27;5;13~`

使用 `extended-keys-format csi-u` 时，相同的按键会转发为：

- `Ctrl+C` → `\x1b[99;5u`
- `Ctrl+D` → `\x1b[100;5u`
- `Ctrl+Enter` → `\x1b[13;5u`

Pi 同时支持两种格式，但推荐使用 `csi-u` 作为 tmux 配置。

## 这一配置修复了什么

如果没有 tmux 扩展按键，带修饰键的 Enter 会退化为旧式序列：

| 按键             | 未启用扩展按键 | 启用 `csi-u` 后 |
| ---------------- | -------------- | --------------- |
| Enter            | `\r`           | `\r`            |
| Shift+Enter      | `\r`           | `\x1b[13;2u`    |
| Ctrl+Enter       | `\r`           | `\x1b[13;5u`    |
| Alt/Option+Enter | `\x1b\r`       | `\x1b[13;3u`    |

这会影响到默认按键绑定（`Enter` 提交、`Shift+Enter` 换行）以及任何使用带修饰键 Enter 的自定义按键绑定。

## 要求

- 使用 `extended-keys-format csi-u` 需要 tmux 3.5 或更高版本（运行 `tmux -V` 检查）
- 一个支持扩展按键的终端模拟器（Ghostty、Kitty、iTerm2、WezTerm、Windows Terminal）

使用 tmux 3.2 至 3.4 时，省略 `extended-keys-format csi-u`；Pi 仍支持 tmux 默认的 xterm `modifyOtherKeys` 格式。
