---
layout: doc
title: 按键绑定
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/keybindings"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

所有键盘快捷键都可以通过 `~/.pi/agent/keybindings.json` 自定义。每个动作可以绑定到一个或多个按键。

配置文件使用的命名空间化按键绑定 id，与 pi 内部以及扩展作者在 `keyHint()` 和注入的 `keybindings` 管理器中所使用的相同。

使用未命名空间化 id（如 `cursorUp` 或 `expandTools`）的旧配置会在启动时自动迁移为命名空间化 id。

编辑 `keybindings.json` 后，在 pi 中运行 `/reload` 即可在不重启会话的情况下应用更改。

## 按键格式

`modifier+key`，其中修饰键为 `ctrl`、`shift`、`alt`、`super`（可组合），按键为：

- **字母：** `a-z`
- **数字：** `0-9`
- **特殊：** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **功能键：** `f1`-`f12`
- **符号：** `` ` ``、`-`、`=`、`[`、`]`、`\`、`;`、`'`、`,`、`.`、`/`、`!`、`@`、`#`、`$`、`%`、`^`、`&`、`*`、`(`、`)`、`_`、`+`、`|`、`~`、`{`、`}`、`:`、`<`、`>`、`?`

修饰键组合：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k`、`ctrl+1` 等。

`super` 绑定需要终端单独上报该修饰键，通常通过 Kitty 键盘协议实现。在不支持该协议的终端中可能无法工作。

## 所有动作

### TUI 编辑器光标移动

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `tui.editor.cursorUp` | `up` | 光标上移，在顶部浏览更早的历史记录 |
| `tui.editor.cursorDown` | `down` | 光标下移，在底部浏览更新的历史记录 |
| `tui.editor.historyPrevious` | _（无）_ | 选择上一条提示词历史条目 |
| `tui.editor.historyNext` | _（无）_ | 选择下一条提示词历史条目 |
| `tui.editor.cursorLeft` | `left`、`ctrl+b` | 光标左移 |
| `tui.editor.cursorRight` | `right`、`ctrl+f` | 光标右移 |
| `tui.editor.cursorWordLeft` | `alt+left`、`ctrl+left`、`alt+b` | 光标向左移动一个单词 |
| `tui.editor.cursorWordRight` | `alt+right`、`ctrl+right`、`alt+f` | 光标向右移动一个单词 |
| `tui.editor.cursorLineStart` | `home`、`ctrl+home`、`ctrl+a` | 移动到行首 |
| `tui.editor.cursorLineEnd` | `end`、`ctrl+end`、`ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳到某字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳到某字符 |
| `tui.editor.pageUp` | `pageUp`、`ctrl+pageUp` | 向上翻页 |
| `tui.editor.pageDown` | `pageDown`、`ctrl+pageDown` | 向下翻页 |

专用历史动作总是切换历史条目，无论多行提示词中的光标位置如何。当主编辑器获得焦点时，显式的历史绑定优先于应用程序动作，因此将 `tui.editor.historyPrevious` 绑定到 `ctrl+p` 会在该上下文中覆盖模型循环，而不会改变选择器中的 `Ctrl+P`。

### TUI 编辑器删除

| 按键绑定 id                     | 默认值                    | 描述         |
| ------------------------------- | ------------------------- | ------------ |
| `tui.editor.deleteCharBackward` | `backspace`               | 向后删除字符 |
| `tui.editor.deleteCharForward`  | `delete`、`ctrl+d`        | 向前删除字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`、`alt+backspace` | 向后删除单词 |
| `tui.editor.deleteWordForward`  | `alt+d`、`alt+delete`     | 向前删除单词 |
| `tui.editor.deleteToLineStart`  | `ctrl+u`                  | 删除到行首   |
| `tui.editor.deleteToLineEnd`    | `ctrl+k`                  | 删除到行尾   |

### TUI 输入

| 按键绑定 id         | 默认值                  | 描述           |
| ------------------- | ----------------------- | -------------- |
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 插入新行       |
| `tui.input.submit`  | `enter`                 | 提交输入       |
| `tui.input.tab`     | `tab`                   | Tab / 自动补全 |

### TUI 删除环

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | yank 之后循环切换已删除的文本 |
| `tui.editor.undo` | `ctrl+-`（Windows 上为 `ctrl+z`；WSL 上为 `alt+z`） | 撤销上一次编辑 |

### TUI 剪贴板和选择

| 按键绑定 id           | 默认值             | 描述         |
| --------------------- | ------------------ | ------------ |
| `tui.input.copy`      | `ctrl+c`           | 复制选择     |
| `tui.select.up`       | `up`               | 选择上移     |
| `tui.select.down`     | `down`             | 选择下移     |
| `tui.select.pageUp`   | `pageUp`           | 列表中上翻页 |
| `tui.select.pageDown` | `pageDown`         | 列表中下翻页 |
| `tui.select.confirm`  | `enter`            | 确认选择     |
| `tui.select.cancel`   | `escape`、`ctrl+c` | 取消选择     |

### TUI 全屏视口

这些动作在交互模式使用 `--tui-mode fullscreen` 时生效，作用于主记录滚动区域。双指触控板和鼠标滚轮输入滚动指针下方的区域，若指针不在记录上则回退到固定的编辑器/状态/页脚停靠区之上的记录。点击 OSC 8 超链接会在默认处理器中打开它。用主鼠标键拖动可选择文本并将其复制到剪贴板；在记录的顶部或底部边缘按住会自动滚动到屏幕外内容。当记录向上滚动时，其底行会出现一个可点击的“跳转到最新消息”标签，显示 `tui.altScreen.bottom` 快捷键。终端特定的鼠标和触控板行为参见[终端设置](terminal-setup.md)。

全屏记录绑定优先于编辑器绑定。因此，默认的未修饰导航键在全屏模式下控制记录，而它们的 `ctrl` 变体继续控制编辑器。在全屏模式之外，两种变体都控制编辑器。

记录搜索面板显示已配置的上一项/下一项快捷键和可点击的箭头控件。再次按下 `tui.altScreen.search`，或使用 `tui.altScreen.searchClose`，即可关闭它。

| 按键                           | 默认模式 | 全屏模式 |
| ------------------------------ | -------- | -------- |
| `home`、`end`                  | 编辑器   | 记录     |
| `ctrl+home`、`ctrl+end`        | 编辑器   | 编辑器   |
| `pageUp`、`pageDown`           | 编辑器   | 记录     |
| `ctrl+pageUp`、`ctrl+pageDown` | 编辑器   | 编辑器   |

这种路由仍可通过普通的动作绑定进行配置。例如，`"tui.altScreen.pageUp": "ctrl+pageUp"` 使 `pageUp` 在全屏模式下控制编辑器，而 `ctrl+pageUp` 控制记录。绑定 `tui.altScreen.halfPageUp` 和 `tui.altScreen.halfPageDown` 可实现半页步进，或绑定 `tui.altScreen.lineUp` 和 `tui.altScreen.lineDown` 实现单行步进。设置 `"tui.altScreen.pageUp": []` 会完全禁用该记录快捷键。用户绑定会替换该动作的默认值。

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `tui.altScreen.pageUp` | `pageUp` | 记录上翻一页 |
| `tui.altScreen.pageDown` | `pageDown` | 记录下翻一页 |
| `tui.altScreen.halfPageUp` | _（无）_ | 记录上翻半页 |
| `tui.altScreen.halfPageDown` | _（无）_ | 记录下翻半页 |
| `tui.altScreen.lineUp` | _（无）_ | 记录上翻一行 |
| `tui.altScreen.lineDown` | _（无）_ | 记录下翻一行 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`、`ctrl+up`（`ctrl+up` 仅在 Windows 和 WSL 上） | 跳转到上一条标记的消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`、`ctrl+down`（`ctrl+down` 仅在 Windows 和 WSL 上） | 跳转到下一条标记的消息 |
| `tui.altScreen.search` | `ctrl+shift+f`（Windows 和 WSL 上为 `ctrl+f`） | 搜索已渲染的记录 |
| `tui.altScreen.searchNext` | `enter`、`ctrl+g` | 搜索时选择下一个匹配项 |
| `tui.altScreen.searchPrevious` | `shift+enter`、`ctrl+shift+g` | 搜索时选择上一个匹配项 |
| `tui.altScreen.searchClose` | `escape` | 关闭记录搜索 |
| `tui.altScreen.top` | `home` | 滚动到记录开头 |
| `tui.altScreen.bottom` | `end` | 滚动到记录末尾并跟随新输出 |

### 应用程序

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `app.interrupt` | `escape` | 取消 / 中止 |
| `app.clear` | `ctrl+c` | 清空编辑器（第一次）/ 退出（第二次） |
| `app.exit` | `ctrl+d` | 退出（当编辑器为空时） |
| `app.suspend` | `ctrl+z`（Windows 上无） | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开（`externalEditor`、`$VISUAL`、`$EDITOR`、Windows 上的 Notepad，或其他平台的 `nano`） |
| `app.clipboard.pasteImage` | `ctrl+v`（Windows 和 WSL 上为 `alt+v`） | 从剪贴板粘贴图片或文本 |

### 会话

| 按键绑定 id                     | 默认值           | 描述                            |
| ------------------------------- | ---------------- | ------------------------------- |
| `app.session.new`               | _（无）_         | 开始一个新会话（`/new`）        |
| `app.session.tree`              | _（无）_         | 打开会话树导航器（`/tree`）     |
| `app.session.fork`              | _（无）_         | 派生当前会话（`/fork`）         |
| `app.session.resume`            | _（无）_         | 打开会话恢复选择器（`/resume`） |
| `app.session.togglePath`        | `ctrl+p`         | 切换路径显示                    |
| `app.session.toggleSort`        | `ctrl+s`         | 切换排序模式                    |
| `app.session.toggleNamedFilter` | `ctrl+n`         | 切换仅命名过滤                  |
| `app.session.rename`            | `ctrl+r`         | 重命名会话                      |
| `app.session.delete`            | `ctrl+d`         | 删除会话                        |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 当查询为空时删除会话            |

### 模型和思考

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 循环到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p`（Windows 和 WSL 上为 `alt+p`） | 循环到上一个模型 |
| `app.models.save` | `ctrl+s` | 将选定的默认模型或作用域模型配置保存到设置 |
| `app.thinking.cycle` | `shift+tab` | 循环切换思考等级 |
| `app.thinking.save` | `ctrl+s` | 将当前思考等级保存到设置 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考块 |

### 显示和消息队列

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 在 `/tree` 中复制所选消息；否则复制最后一条助手消息，或当 `fullscreenCopyOnSelect` 被禁用时复制活动全屏文本选择 |
| `app.message.followUp` | `alt+enter`（Windows 和 WSL 上为 `ctrl+q`） | 排队后续消息 |
| `app.message.dequeue` | `alt+up`（Windows 和 WSL 上为 `alt+q`） | 将排队的消息恢复到编辑器 |

### 树导航

| 按键绑定 id | 默认值 | 描述 |
| --- | --- | --- |
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 折叠当前分支片段，或跳转到上一个片段起点 |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 展开当前分支片段，或跳转到下一个片段起点或分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑所选树节点上的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中标签时间戳 |
| `app.tree.filter.default` | `ctrl+d` | 将树过滤设为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树过滤 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换只显示用户消息的树过滤 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换只显示已标记条目的树过滤 |
| `app.tree.filter.all` | `ctrl+a` | 切换显示所有条目的树过滤 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环树过滤 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环树过滤 |

### 作用域模型选择器

在作用域模型选择器内部使用（通过 `/scoped-models` 打开）。

| 按键绑定 id                 | 默认值     | 描述                                     |
| --------------------------- | ---------- | ---------------------------------------- |
| `app.models.enableAll`      | `ctrl+a`   | 启用所有模型（或所有匹配当前搜索的模型） |
| `app.models.clearAll`       | `ctrl+x`   | 清除所有模型（或所有匹配当前搜索的模型） |
| `app.models.toggleProvider` | `ctrl+p`   | 切换当前提供商的所有模型                 |
| `app.models.reorderUp`      | `alt+up`   | 在循环顺序中将所选模型上移               |
| `app.models.reorderDown`    | `alt+down` | 在循环顺序中将所选模型下移               |

## 自定义配置

创建 `~/.pi/agent/keybindings.json`：

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"]
}
```

每个动作可以有一个按键或一个按键数组。用户配置覆盖默认值。

在原生 Windows 上，`app.suspend` 没有默认绑定，因为 Windows 终端不支持 Unix 作业控制。如果你手动绑定它，pi 会显示状态消息而不是挂起。在 WSL 中，正常的 Linux `ctrl+z`/`fg` 行为仍然适用。

### Emacs 示例

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"],
  "tui.editor.deleteCharForward": ["delete", "ctrl+d"],
  "tui.editor.deleteCharBackward": ["backspace", "ctrl+h"],
  "tui.input.newLine": ["shift+enter", "ctrl+j"]
}
```

### Vim 示例

```json
{
  "tui.editor.cursorUp": ["up", "alt+k"],
  "tui.editor.cursorDown": ["down", "alt+j"],
  "tui.editor.cursorLeft": ["left", "alt+h"],
  "tui.editor.cursorRight": ["right", "alt+l"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+w"]
}
```
