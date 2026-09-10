---
layout: doc
title: 开发
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/development"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

有关其他准则，请参见 [AGENTS.md](https://github.com/earendil-works/pi/blob/main/AGENTS.md)。

## 设置

```bash
git clone https://github.com/earendil-works/pi
cd pi
npm install
npm run build
```

从源码运行：

```bash
/path/to/pi/pi-test.sh
```

该脚本可以从任意目录运行。Pi 会保留调用者的当前工作目录。

### 实验性远程测试框架

远程测试框架的服务器/客户端集成仅用于开发。请在仓库中运行：

```bash
PI_EXPERIMENTAL=1 ./pi-test.sh server
PI_EXPERIMENTAL=1 ./pi-test.sh client
```

`PI_SERVER_DIR` 覆盖服务器配置文件和套接字目录（默认：`~/.pi/server`）。`PI_SERVER_ID` 在省略 `--server-id` 时选择逻辑服务器 ID。

`client` 和 `experimental/plugin` 包的子路径仅在 checkout 中的 `source` 条件下解析。它们的实现以及服务器/客户端命令会被排除在 npm 包和独立二进制文件之外。`pi-client`、`pi-protocol` 和 `pi-server` 是 coding-agent 的开发依赖，而非运行时依赖。本地 SDK 和 stdio RPC API 保持不变。

## 派生 / 重新命名

通过 `package.json` 配置：

```json
{
  "piConfig": {
    "name": "pi",
    "configDir": ".pi"
  }
}
```

为你的派生版本更改 `name`、`configDir` 和 `bin` 字段。这会影响 CLI 横幅、配置路径和环境变量名称。

## 路径解析

有三种执行模式：npm 安装、独立二进制文件、从源码运行 tsx。

**对于包资源，始终使用 `src/config.ts`**：

```typescript
import { getPackageDir, getThemeDir } from './config.js';
```

对于包资源，切勿直接使用 `__dirname`。

## 调试命令

`/debug`（隐藏命令）写入 `~/.pi/agent/pi-debug.log`：

- 带有 ANSI 代码的已渲染 TUI 行
- 发送给 LLM 的最后消息

## 测试

```bash
./test.sh                         # 运行非 LLM 测试（无需 API 密钥）
npm test                          # 运行所有测试
npm test -- test/specific.test.ts # 运行特定测试
```

### 已发布包的冒烟测试

构建完成后，运行 `npm run check:package-install`。它会打包公共包，并在仓库外的一个临时目录中仅将 coding-agent 作为直接依赖进行安装。本地 tarball 会覆盖选定的已声明传递依赖，而不会安装仅用于开发的包。该检查会在不提供凭据或模型请求的情况下验证 SDK 导入和 CLI 启动。

`npm run check` 还会检查运行时依赖声明，并拒绝通过导入被引入包构建的已排除开发源码。

## 项目结构

```text
packages/
  ai/           # LLM 提供商抽象
  agent/        # 智能体循环和消息类型
  tui/          # 终端 UI 组件
  coding-agent/ # CLI 和交互模式
```
