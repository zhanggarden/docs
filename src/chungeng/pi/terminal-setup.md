---
layout: doc
title: 终端设置
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/terminal-setup"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 使用 [Kitty 键盘协议](https://sw.kovidgoyal.net/kitty/keyboard-protocol/)来实现可靠的修饰键检测。大多数现代终端都支持该协议，但有些需要配置。

## 能力覆盖

Pi 自动检测 OSC 8 超链接、内联图片协议和真彩色。如果在终端代理或多路复用器之后检测失败，请使用以下高级覆盖：

| 能力 | 环境变量 | JSON 设置 |
| --- | --- | --- |
| OSC 8 超链接 | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| 内联图片 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| 真彩色 | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

设置优先于环境变量；未设置或 `auto` 则保留检测。只强制使用整条终端链路都支持的能力，因为不支持的转义序列可能破坏渲染。

## Kitty

开箱即用。

## iTerm2

### 常规 TUI 模式

开箱即用。

### 全屏 TUI 模式

Pi 拥有视口，因此 iTerm2 会发送鼠标滚轮报告，而不是滚动其原生回滚。使用 iTerm2 默认的快速触控板行为时，这些报告可能丢失加速滚轮增量的大部分，导致全屏滚动比常规滚动慢得多。

如果在全屏模式下快速鼠标滚轮手势每次只移动约一行：

1. 打开 **iTerm2 → Settings → Advanced**。
2. 搜索 **Trackpad scrolls fast?** 并将其设置为 **No**。

这是 iTerm2 全局的变通方案，也可能改变原生触控板滚动。底层行为在 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619) 中跟踪。

## Apple Terminal

Pi 在可用时启用增强按键上报。如果 Terminal.app 对 `Shift+Enter` 仍发送普通 Return，pi 会使用本地 macOS 修饰键回退，将该 Return 视为 `Shift+Enter`。

该回退仅在 pi 与 Terminal.app 运行于同一台 Mac 时生效。它无法通过远程 SSH 检测本地键盘。

## Ghostty

添加到你的 Ghostty 配置（macOS 上为 `~/Library/Application Support/com.mitchellh.ghostty/config`，Linux 上为 `~/.config/ghostty/config`）：

```text
keybind = alt+backspace=text:\x1b\x7f
```

较旧版本的 Claude Code 可能添加过这个 Ghostty 映射：

```text
keybind = shift+enter=text:\n
```

该映射会发送一个原始换行字节。在 pi 内部，它与 `Ctrl+J` 无法区分，因此 tmux 和 pi 不再看到真正的 `shift+enter` 按键事件。

如果添加该映射的唯一原因是为了 Claude Code 2.x 或更高版本，你可以移除它，除非你想在 tmux 中使用 Claude Code——在那种情况下它仍然需要该 Ghostty 映射。

Pi 将 `Ctrl+J` 绑定为默认换行别名，因此通过该重映射，`Shift+Enter` 在 tmux 中仍可工作，无需额外的 pi 配置。

### 全屏 TUI 模式

在全屏模式下，链接仍可点击，但在 pi 捕获鼠标输入时，Ghostty 不会显示其悬停下划线或左下角的 URL 预览。在 macOS 上按住 `Shift+Command`，或在 Linux 上按住 `Shift+Ctrl`，以使用 Ghostty 的原生链接处理。

## WezTerm

对于 `Shift+Enter`，WezTerm 通常通过 xterm modifyOtherKeys 开箱即用。要显式使用 Kitty 键盘协议，请创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

在 macOS 上，WezTerm 默认将 `Option+Enter` 绑定为全屏。要使用 `Option+Enter` 进行 pi 的后续消息排队，请添加此按键覆盖：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

如果你已经有 `config.keys` 表，请将该条目添加到其中。

在 WSL 上，WezTerm 可能需要可见的硬件光标来进行 IME 候选窗口定位。如果 CJK IME 候选没有跟随文本光标，请在运行 pi 之前设置 `PI_HARDWARE_CURSOR=1`，或在设置中将 `showHardwareCursor` 设为 `true`。

## Alacritty

对于 `Shift+Enter`，Alacritty 通常开箱即用。在 macOS 上，`Option+Enter` 可能以普通 `Enter` 到达。要使用 `Option+Enter` 进行 pi 的后续消息排队，请添加到 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改配置后请重启 Alacritty。

## VS Code（集成终端）

VS Code 1.109.5 及更高版本默认在集成终端中启用 Kitty 键盘协议，因此 `Shift+Enter` 应开箱即用。

低于 1.109.5 的 VS Code 版本需要为 `Shift+Enter` 显式设置终端按键绑定。

`keybindings.json` 位置：

- macOS：`~/Library/Application Support/Code/User/keybindings.json`
- Linux：`~/.config/Code/User/keybindings.json`
- Windows：`%APPDATA%\Code\User\keybindings.json`

添加到 `keybindings.json`：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

## Zed（集成终端）

将这些按键绑定添加到你的 Zed `keymap.json`：

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows Terminal

在 Windows 原生或 WSL 中运行时，Pi 使用 Windows 风格的按键绑定：

- `Alt+V` 粘贴图片或剪贴板文本。
- `Ctrl+F` 在全屏模式下搜索记录，`Ctrl+Up`/`Ctrl+Down` 在标记的消息之间跳转。
- `Alt+P` 循环到上一个模型。
- `Ctrl+Z` 在原生 Windows 上撤销编辑；WSL 使用 `Alt+Z`，以便 `Ctrl+Z` 可以挂起 pi。
- `Ctrl+Q` 排队一条后续消息，`Alt+Q` 恢复排队的消息。

添加到 `settings.json`（Ctrl+Shift+, 或 Settings → Open JSON file）以转发 `Shift+Enter` 用于插入新行：

```json
{
  "actions": [
    {
      "command": { "action": "sendInput", "input": "\u001b[13;2u" },
      "keys": "shift+enter"
    }
  ]
}
```

Windows Terminal 默认将 `Alt+Enter` 绑定为全屏。要用它替代 pi 的 `Ctrl+Q` 默认值来进行后续消息排队，请配置 Windows Terminal 发送该按键，并在 pi 中将 `app.message.followUp` 绑定到 `alt+enter`。

如果你已经有 `actions` 数组，请将该对象添加到其中。更改 Windows Terminal 设置后，请完全关闭并重新打开它。

## xfce4-terminal、terminator

这些终端对转义序列的支持有限。像 `Ctrl+Enter` 和 `Shift+Enter` 这样的带修饰键 Enter 无法与普通 `Enter` 区分，这会导致诸如 `submit: ["ctrl+enter"]` 之类的自定义按键绑定无法工作。

为了获得最佳体验，请使用支持 Kitty 键盘协议的终端：

- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty)（需要编译时启用 Kitty 协议支持）

## IntelliJ IDEA（集成终端）

内置终端对转义序列的支持有限。在 IntelliJ 的终端中，Shift+Enter 无法与 Enter 区分。

如果你希望硬件光标可见，请在运行 pi 之前设置 `PI_HARDWARE_CURSOR=1`（出于兼容性考虑默认禁用）。

为了获得最佳体验，请考虑使用专用的终端模拟器。
