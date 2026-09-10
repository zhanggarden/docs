---
layout: doc
title: 容器化
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/containerization"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 默认以全部权限运行，但在某些情况下，你希望对 Pi 可以写入哪些目录以及拥有哪些访问权限有更多控制。

总体上有两种选择。你可以

1. 在隔离环境中运行整个 `pi` 进程，或者
2. 在宿主机上运行 `pi`，并将工具执行路由到隔离环境。

## 选择一种模式

| 模式 | 隔离的对象 | 最适合 | 说明 |
| --- | --- | --- | --- |
| Gondolin 扩展 | 内置工具和 `!` 命令 | 在宿主机上保留身份验证的同时进行本地微型虚拟机隔离 | 参见 [`examples/extensions/gondolin/`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/gondolin/)。 |
| 普通 Docker | 本地容器中的整个 `pi` 进程 | 简单的本地隔离 | 提供商 API 密钥会进入容器。 |
| OpenShell | 策略控制沙箱中的整个 `pi` 进程 | 本地或远程托管沙箱 | 需要一个 OpenShell 网关 |
| Docker Sandboxes | 托管沙箱中的整个 `pi` 进程 | 在宿主机上保留提供商密钥的本地隔离 | 需要 Docker Sandboxes（`sbx`）。 |

扩展在 `pi` 进程运行的地方运行。如果你在宿主机上运行 pi 并使用工具路由扩展，其他自定义扩展工具仍会在宿主机上运行，除非它们也委托了自己的操作。

## Gondolin

[Gondolin](https://github.com/earendil-works/gondolin) 是一个本地 Linux 微型虚拟机。当你希望 pi 在宿主机上运行、但所有内置工具都路由到 VM 中时，使用[示例扩展](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/gondolin)。

设置：

```bash
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

从你想要挂载的项目运行：

```bash
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

该扩展将宿主机 cwd 挂载到 VM 中的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。用户的 `!` 命令也会被路由到 VM 中。`/workspace` 下的文件更改会写回到宿主机。

要求：`@earendil-works/gondolin` 需要 Node.js >= 23.6.0，以及 QEMU（需通过你的包管理器安装）。

## 普通 Docker

当你想要最简单的本地容器边界时，在 Docker 中运行整个 `pi` 进程。

`Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

构建并运行：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

`-v "$PWD:/workspace"` 将当前目录挂载到容器中的 /workspace，这样 Docker 内部 `/workspace` 中的读写会直接影响你的宿主机文件，与 Gondolin 示例类似。

如果你想要容器本地的设置和会话，请为 `/root/.pi/agent` 使用具名卷。挂载宿主机 `~/.pi/agent` 会把宿主机身份验证和会话文件暴露给容器。

## OpenShell

当你想要一个具备文件系统、进程、网络、凭据和推理控制的策略控制沙箱时，使用 [NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview)。OpenShell 可以通过由 Docker、Podman 或 VM 运行时支持的本地网关，或通过远程 Kubernetes 网关来运行沙箱。

每个沙箱都需要一个处于活动状态的网关。请在创建沙箱前注册并选择一个网关：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

在 OpenShell 沙箱内启动 `pi`：

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

在这种模式下，整个 `pi` 进程都在沙箱内运行。内置工具、`!` 命令和扩展工具都在 OpenShell 边界内执行。

如果网关是远程的，项目文件不会从宿主机绑定挂载，这意味着沙箱内的写入不会反映到你的机器上。请在沙箱内克隆仓库，或使用 OpenShell 文件传输命令：

```bash
openshell sandbox upload pi-sandbox ./repo /workspace
openshell sandbox download pi-sandbox /workspace/repo ./repo-out
```

OpenShell 提供商可以将原始模型 API 密钥保留在沙箱之外。当配置了推理路由时，沙箱内的代码可以调用 `https://inference.local`，网关会在上游注入已配置的提供商凭据。如果你希望模型流量走这条路由，请将 Pi 配置为使用相应的 OpenAI 兼容或 Anthropic 兼容端点。

## Docker Sandboxes

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) 是 Docker 提供的托管沙箱运行时，它在沙箱内运行整个 `pi` 进程。它是[无内置沙箱](security.md#no-built-in-sandbox)所指的容器边界之一。

与上面的普通 Docker 模式不同，提供商凭据不会传入容器。沙箱会收到一个哨兵值，`sbx` 代理在出口到 `api.anthropic.com` 时将其替换为真实凭据。凭据在创建时接线，因此请在创建沙箱之前将其存储在宿主机上。

对于 Claude Pro/Max 订阅，请在装有 Claude Code 的机器上运行 `claude setup-token`，然后将结果存储在宿主机上。如果已经绑定了 `anthropic` 密钥，请先移除它：否则代理会在 Bearer token 旁再添加一个 `x-api-key` 头，Anthropic 会拒绝该请求。`sbx secret set-custom` 从 stdin 读取 token，因此它不会出现在 shell 历史记录中。

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

沙箱收到的是一个 OAuth 形状的占位符，而不是真实 token，代理在出口到该主机时将其替换；`ANTHROPIC_OAUTH_TOKEN` 是 pi 已读取、且优先于 API 密钥的变量，因此无需额外的 pi 配置。

对于 API 密钥，请改用 `sbx secret set anthropic` 存储。该套件以同样的方式接线——作为代理在出口时替换的哨兵值。

存储凭据后，从你想要挂载的项目启动 `pi`：

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

该套件已将 `pi` 预先打包到其镜像中，因此沙箱启动时无需安装任何东西，且当前目录就是沙箱工作区。

不要在沙箱内进行身份验证：在那里运行 `/login` 会把真实 token 写入容器，从而破坏代理模型。

脚本化使用方式相同：

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

有关完整的凭据矩阵、故障排查和版本固定，请参见[套件文档](https://github.com/docker/sbx-kits-contrib/tree/main/pi)。
