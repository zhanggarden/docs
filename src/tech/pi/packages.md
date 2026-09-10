---
layout: doc
title: Pi 包
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/packages"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

> pi 可以帮助你创建 pi 包。让它把你的扩展、技能、提示词模板或主题打包起来吧。

Pi 包将扩展、技能、提示词模板和主题捆绑在一起，以便你通过 npm 或 git 分享。包可以在 `package.json` 的 `pi` 键下声明资源，也可以使用约定目录。

## 目录

- [安装与管理](#安装与管理)
- [包来源](#包来源)
- [创建 Pi 包](#创建-Pi-包)
- [包结构](#包结构)
- [依赖](#依赖)
- [包过滤](#包过滤)
- [启用和禁用资源](#启用和禁用资源)
- [作用域与去重](#作用域与去重)

## 安装与管理

> **安全：** Pi 包以完整的系统访问权限运行。扩展执行任意代码，技能可以指示模型执行任何操作，包括运行可执行文件。安装第三方包前请审查源代码。

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install https://github.com/user/repo  # 原始 URL 也适用
pi install /absolute/path/to/package
pi install ./relative/path/to/package

pi remove npm:@foo/bar
pi list                     # 显示设置中已安装的包
pi update                   # 仅更新 pi
pi update --all             # 更新 pi、更新包，并协调固定的 git ref
pi update --extensions      # 仅更新包并协调固定的 git ref
pi update --models          # 仅刷新模型目录
pi update --self            # 仅更新 pi
pi update --self --force    # 即使已是最新也重新安装 pi
pi update npm:@foo/bar      # 更新一个包
pi update --extension npm:@foo/bar
```

这些命令管理 pi 包，`pi update` 可以更新 pi CLI 安装。对于实验性的安装器托管安装，`pi update` 会将精确的已检查版本安装到一个分阶段、由 lockfile 支撑的发布中，并仅在验证后激活，若更新失败则保持当前发布不变。托管安装不支持 `--force`；重新运行安装器以修复一个。要卸载 pi 本身，请参见[快速入门](quickstart.md#uninstall)。

默认情况下，`install` 和 `remove` 写入用户设置（`~/.pi/agent/settings.json`）。使用 `-l` 改为写入项目设置（`.pi/settings.json`）。项目设置可以与你的团队共享，pi 会在项目被信任后于启动时自动安装任何缺失的包。

要在不安装的情况下试用一个包，使用 `--extension` 或 `-e`。这会将其安装到一个临时目录，仅供当前运行使用：

```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

## 包来源

Pi 在设置和 `pi install` 中接受三种来源类型。

### npm

```text
npm:@scope/pkg@1.2.3
npm:pkg
```

- 带版本的规范会被固定，并被包更新（`pi update --extensions`、`pi update --all`）跳过。
- 用户安装位于 `~/.pi/agent/npm/` 下。
- 项目安装位于 `.pi/npm/` 下。
- 在 `settings.json` 中设置 `npmCommand`，可将 npm 包查找和安装操作固定到特定的包装命令，如 `mise` 或 `asdf`。

示例：

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### git

```text
git:github.com/user/repo@v1
git:git@github.com:user/repo@v1
https://github.com/user/repo@v1
ssh://git@github.com/user/repo@v1
```

- 没有 `git:` 前缀时，只接受协议 URL（`https://`、`http://`、`ssh://`、`git://`）。
- 带 `git:` 前缀时，接受简写格式，包括 `github.com/user/repo` 和 `git@github.com:user/repo`。
- HTTPS 和 SSH URL 都支持。
- SSH URL 自动使用你配置的 SSH 密钥（尊重 `~/.ssh/config`）。
- 对于非交互运行（例如 CI），你可以设置 `GIT_TERMINAL_PROMPT=0` 禁用凭据提示，并设置 `GIT_SSH_COMMAND`（例如 `ssh -o BatchMode=yes -o ConnectTimeout=5`）以快速失败。
- Ref 是固定的标签或提交。`pi update --extensions` 和 `pi update --all` 不会将它们移动到更新的 ref，但会将现有克隆协调到已配置的 ref。
- 使用 `pi install git:host/user/repo@new-ref` 更新设置，并将现有包移动到新的固定 ref。
- 克隆到 `~/.pi/agent/git/<host>/<path>`（全局）或 `.pi/git/<host>/<path>`（项目）。
- 当协调更改了 checkout 时，pi 会重置并清理克隆，然后如果存在 `package.json` 则运行 `npm install`。

**SSH 示例：**

```bash
# git@host:path 简写（需要 git: 前缀）
pi install git:git@github.com:user/repo

# ssh:// 协议格式
pi install ssh://git@github.com/user/repo

# 带版本 ref
pi install git:git@github.com:user/repo@v1.0.0
```

### 本地路径

```text
/absolute/path/to/package
./relative/path/to/package
```

本地路径指向磁盘上的文件或目录，并添加到设置中而不复制。相对路径相对于其所在的设置文件解析。如果路径是文件，它作为单个扩展加载。如果路径是目录，pi 使用包规则加载资源。

## 创建 Pi 包

在 `package.json` 中添加一个 `pi` 清单，或使用约定目录。加入 `pi-package` 关键字以便被发现。

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

路径相对于包根目录。数组支持 glob 模式和 `!排除项`。正向清单 glob 按词法顺序发现可见路径。以点开头的路径请直接列出。如果 glob 需要穿过符号链接继续，请直接列出被符号链接的资源根目录。

### 画廊元数据

[包画廊](https://pi.dev/packages)显示标记了 `pi-package` 的包。添加 `video` 或 `image` 字段以显示预览：

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "video": "https://example.com/demo.mp4",
    "image": "https://example.com/screenshot.png"
  }
}
```

- **video**：仅 MP4。在桌面上悬停时自动播放。点击打开全屏播放器。
- **image**：PNG、JPEG、GIF 或 WebP。显示为静态预览。

如果两者都设置，video 优先。

## 包结构

### 约定目录

如果没有 `pi` 清单，pi 会从这些目录自动发现资源：

- `extensions/` 加载 `.ts` 和 `.js` 文件
- `skills/` 递归查找 `SKILL.md` 文件夹，并将顶层 `.md` 文件作为技能加载
- `prompts/` 加载 `.md` 文件
- `themes/` 加载 `.json` 文件

## 依赖

第三方运行时依赖属于 `package.json` 中的 `dependencies`。不注册扩展、技能、提示词模板或主题的依赖也属于 `dependencies`。当 pi 从 npm 或 git 安装一个包时，它会运行 `npm install`，因此这些依赖会被自动安装。

Pi 为扩展和技能捆绑了核心包。如果你导入了以下任何包，请在 `peerDependencies` 中以 `"*"` 范围列出它们，并且不要捆绑它们：`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui`、`typebox`。

其他 pi 包必须捆绑在你的 tarball 中。将它们添加到 `dependencies` 和 `bundledDependencies`，然后通过 `node_modules/` 路径引用它们的资源。Pi 以独立的模块根目录加载包，因此分开的安装不会冲突或共享模块。

示例：

```json
{
  "dependencies": {
    "shitty-extensions": "^1.0.1"
  },
  "bundledDependencies": ["shitty-extensions"],
  "pi": {
    "extensions": ["extensions", "node_modules/shitty-extensions/extensions"],
    "skills": ["skills", "node_modules/shitty-extensions/skills"]
  }
}
```

## 包过滤

使用设置中的对象形式过滤包加载的内容：

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

`+path` 和 `-path` 是相对于包根目录的精确路径。

- 省略某个键以加载该类型的所有资源。
- 使用 `[]` 以不加载该类型的任何资源。
- `!pattern` 排除匹配项。
- `+path` 强制包含一个精确路径。
- `-path` 强制排除一个精确路径。
- 过滤在清单之上分层。它们会收窄已经允许的内容。

## 启用和禁用资源

使用 `pi config` 从已安装的包和本地目录启用或禁用扩展、技能、提示词模板和主题。`pi config` 从全局设置（`~/.pi/agent/settings.json`）开始；按 Tab 在全局和项目本地模式之间切换。使用 `pi config -l` 从项目覆盖（`.pi/settings.json`）开始，继承的全局资源会变暗。

## 作用域与去重

包可以同时出现在全局和项目设置中。如果同一个包同时出现，项目条目优先，除非项目条目有 `autoload: false`，此时它作为全局条目的增量应用。身份由以下内容决定：

- npm：包名
- git：不带 ref 的仓库 URL
- local：解析后的绝对路径
