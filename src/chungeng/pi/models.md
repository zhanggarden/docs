---
layout: doc
title: 自定义模型
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/models"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

通过 `~/.pi/agent/models.json` 添加自定义提供商和模型（Ollama、vLLM、LM Studio、代理）。

## 目录

- [最小示例](#最小示例)
- [完整示例](#完整示例)
- [支持的 API](#支持的-API)
- [提供商配置](#提供商配置)
- [模型配置](#模型配置)
- [覆盖内置提供商](#覆盖内置提供商)
- [按模型覆盖](#按模型覆盖)
- [Anthropic Messages 兼容性](#Anthropic Messages 兼容性)
- [OpenAI 兼容性](#OpenAI-兼容性)

## 最小示例

对于本地模型（Ollama、LM Studio、vLLM），每个模型只需要 `id`：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [{ "id": "llama3.1:8b" }, { "id": "qwen2.5-coder:7b" }]
    }
  }
}
```

`apiKey` 值是一个占位符，因为 Ollama 会忽略它。pi 仍会将模型视为需要身份验证，之后它们才会出现在 `/model` 中，因此无密钥的本地服务器应保留一个虚拟值、用 `/login` 为该提供商保存密钥，或在选择模型时传入 `--api-key`。

某些 OpenAI 兼容服务器不理解用于推理能力模型的 `developer` 角色。对于这些提供商，将 `compat.supportsDeveloperRole` 设为 `false`，让 pi 将系统提示词作为 `system` 消息发送。如果服务器也不支持 `reasoning_effort`，则将 `compat.supportsReasoningEffort` 也设为 `false`。

你可以在提供商级别设置 `compat` 以应用于所有模型，或在模型级别设置以覆盖特定模型。这通常适用于 Ollama、vLLM、SGLang 和类似的 OpenAI 兼容服务器。

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "gpt-oss:20b",
          "reasoning": true
        }
      ]
    }
  }
}
```

## 完整示例

当你需要特定值时覆盖默认值：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        {
          "id": "llama3.1:8b",
          "name": "Llama 3.1 8B (Local)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 128000,
          "maxTokens": 32000,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

每次打开 `/model` 时文件都会重新加载。可以在会话期间编辑；无需重启。

## Google AI Studio 示例

使用带有 `baseUrl` 的 `google-generative-ai` 添加来自 Google AI Studio 的模型，包括自定义 Gemma 4 条目：

```json
{
  "providers": {
    "my-google": {
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "api": "google-generative-ai",
      "apiKey": "$GEMINI_API_KEY",
      "models": [
        {
          "id": "gemma-4-31b-it",
          "name": "Gemma 4 31B",
          "input": ["text", "image"],
          "contextWindow": 262144,
          "reasoning": true
        }
      ]
    }
  }
}
```

向 `google-generative-ai` API 类型添加自定义模型时，`baseUrl` 是必需的。

## 支持的 API

| API                    | 描述                                  |
| ---------------------- | ------------------------------------- |
| `openai-completions`   | OpenAI Chat Completions（兼容性最好） |
| `openai-responses`     | OpenAI Responses API                  |
| `anthropic-messages`   | Anthropic Messages API                |
| `google-generative-ai` | Google Generative AI                  |

在提供商级别（所有模型的默认值）或模型级别（按模型覆盖）设置 `api`。

## 提供商配置

| 字段 | 描述 |
| --- | --- |
| `baseUrl` | API 端点 URL |
| `api` | API 类型（见上文） |
| `apiKey` | 可选的 API 密钥配置（见下面的值解析）。当身份验证由 `/login`/`auth.json` 或 CLI `--api-key` 提供时，省略它。 |
| `oauth` | 动态 OAuth 提供商类型。目前支持 `"radius"`；需要网关 `baseUrl`。 |
| `headers` | 自定义头（见下面的值解析） |
| `authHeader` | 设为 `true` 以自动添加 `Authorization: Bearer <apiKey>` |
| `models` | 模型配置数组 |
| `modelOverrides` | 该提供商上内置或扩展注册模型的按模型覆盖 |

对于带有 `models` 的提供商，非内置提供商配置需要在提供商或模型级别有 `baseUrl` 和一个 `api` 值。`apiKey` 不是加载文件所必需的：当通过 `/login`/`auth.json`、CLI `--api-key` 或提供商 `apiKey` 配置了身份验证后，模型即可用。如果没有配置身份验证，模型会加载但在 `/model` 和 `--list-models` 中保持不可用。

### 值解析

`apiKey` 和 `headers` 字段支持命令执行、环境插值和字面量：

- **Shell 命令：** 开头的 `"!command"` 将整个值作为命令执行并使用其 stdout
  ```json
  "apiKey": "!security find-generic-password -ws 'anthropic'"
  "apiKey": "!op read 'op://vault/item/credential'"
  ```
- **环境插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用指定变量的值。插值可以在更大的字面量中使用。
  ```json
  "apiKey": "$MY_API_KEY"
  "apiKey": "${KEY_PREFIX}_${KEY_SUFFIX}"
  ```
  `$FOO_BAR` 是变量 `FOO_BAR`；当 `BAR` 是字面文本时使用 `${FOO}_BAR`。缺失的环境变量会使该值无法解析。
- **转义：** `"$$"` 输出字面 `"$"`；`"$!"` 输出字面 `"!"` 而不触发命令执行。
  ```json
  "apiKey": "$$literal-dollar-prefix"
  "apiKey": "$!literal-bang-prefix"
  ```
- **字面值：** 直接使用。纯大写字符串如 `MY_API_KEY` 是字面量；环境变量请使用 `$MY_API_KEY`。
  ```json
  "apiKey": "sk-..."
  ```

对于 `models.json`，shell 命令在请求时解析。pi 有意不对任意命令应用内置的 TTL、过期复用或恢复逻辑。不同命令需要不同的缓存和失败策略，而 pi 无法推断正确的那一个。

如果你的命令很慢、昂贵、受限速，或应在瞬时失败时继续使用之前的值，请将它包装在你自己的、实现了所需缓存或 TTL 行为的脚本或命令中。

`/model` 可用性检查使用已配置的身份验证存在与否，且不会执行 shell 命令。

### 自定义头

```json
{
  "providers": {
    "custom-proxy": {
      "baseUrl": "https://proxy.example.com/v1",
      "apiKey": "$MY_API_KEY",
      "api": "anthropic-messages",
      "headers": {
        "x-portkey-api-key": "$PORTKEY_API_KEY",
        "x-secret": "!op read 'op://vault/item/secret'"
      },
      "models": [...]
    }
  }
}
```

## 模型配置

| 字段 | 必需 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `id` | 是 | — | 模型标识符（传给 API） |
| `name` | 否 | `id` | 人类可读的模型标签。用于匹配（`--model` 模式）并显示为次要模型详情文本。 |
| `api` | 否 | 提供商的 `api` | 为此模型覆盖提供商的 API |
| `reasoning` | 否 | `false` | 支持扩展思考 |
| `thinkingLevelMap` | 否 | 省略 | 将 pi 思考等级映射到提供商值并标记不支持的等级（见下文） |
| `input` | 否 | `["text"]` | 输入类型：`["text"]` 或 `["text", "image"]` |
| `contextWindow` | 否 | `128000` | 上下文窗口大小（以 token 计） |
| `maxTokens` | 否 | `16384` | 最大输出 token |
| `samplingParams` | 否 | 省略 | 逐字合并到每个请求体中的采样参数（见下文） |
| `cost` | 否 | 全零 | 每百万 token 费率，带可选的请求范围输入定价层 |
| `compat` | 否 | 提供商 `compat` | 提供商兼容性覆盖。两者都设置时与提供商级 `compat` 合并。 |

成本层提供一整套备选费率，并在总输入用量（`input + cacheRead + cacheWrite`）超过 `inputTokensAbove` 时应用于整个请求。当多个层匹配时，最高阈值胜出。

```json
{
  "cost": {
    "input": 5,
    "output": 30,
    "cacheRead": 0.5,
    "cacheWrite": 6.25,
    "tiers": [
      {
        "inputTokensAbove": 272000,
        "input": 10,
        "output": 45,
        "cacheRead": 1,
        "cacheWrite": 12.5
      }
    ]
  }
}
```

当前行为：

- `/model`、`--list-models` 和交互式页脚按模型 `id` 显示条目。
- 配置的 `name` 用于模型匹配和次要模型详情文本。它不会替换页脚/状态栏的模型 id。

### 采样参数

`samplingParams` 是一个自由形式的对象，在 pi 自身设置的字段之后逐字合并到该模型的每个请求体中，因此其键会胜出。用它发送 pi 未建模的采样参数——包括服务器特定的参数，如 llama.cpp 的 `min_p` 或 vLLM 的 `top_k`：

```json
{
  "id": "deepseek-v4-flash",
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 0,
    "min_p": 0.0
  }
}
```

仅 OpenAI 兼容 API 应用它（`openai-completions`、`openai-responses`、`azure-openai-responses`）；其他 API 忽略它。键会覆盖 pi 的命名请求字段（例如这里的 `temperature` 键胜过请求级 temperature），因此对于某个模型，优先将其作为采样事实的单一来源。在 `modelOverrides` 中，`samplingParams` 会与基础模型的值按键合并。

恒定的思考 token 上限也可以放在这里，但它不会遵循 `thinkingBudgets`，也不会为答案留出空间。为此优先使用 `compat.thinkingTokenBudgetField`（或 `supportsThinkingTokenBudget` 别名）。

### 思考等级映射

在模型上使用 `thinkingLevelMap` 描述模型特定的思考控制。键是 pi 思考等级：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。映射可以包含空洞；例如，一个模型可以暴露 `high` 和 `max` 而不暴露 `xhigh`。

值是三态的：

| 值     | 含义                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| 省略   | 直到 `high` 的标准等级使用提供商的默认映射；扩展的 `xhigh` 和 `max` 等级不受支持 |
| string | 该等级受支持，且此值被发送给提供商                                               |
| `null` | 该等级不受支持，被隐藏/跳过/钳制掉                                               |

一个只支持 off、high 和 max 推理的模型示例：

```json
{
  "id": "deepseek-v4-pro",
  "reasoning": true,
  "thinkingLevelMap": {
    "minimal": null,
    "low": null,
    "medium": null,
    "high": "high",
    "xhigh": null,
    "max": "max"
  }
}
```

一个无法禁用思考的模型示例：

```json
{
  "id": "always-thinking-model",
  "reasoning": true,
  "thinkingLevelMap": {
    "off": null
  }
}
```

迁移：使用 `compat.reasoningEffortMap` 的旧配置应将该映射移到模型级 `thinkingLevelMap`。对不应出现在 UI 中的等级使用 `null`。

## 覆盖内置提供商

在不重新定义模型的情况下，通过代理路由内置提供商：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

所有内置 Anthropic 模型保持可用。现有的 OAuth 或 API 密钥身份验证继续有效。

要将自定义模型合并到内置提供商中，请包含 `models` 数组：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1",
      "apiKey": "$ANTHROPIC_API_KEY",
      "api": "anthropic-messages",
      "models": [...]
    }
  }
}
```

合并语义：

- 保留内置模型。
- 自定义模型在提供商内按 `id` 进行 upsert。
- 如果自定义模型 `id` 与内置模型 `id` 匹配，自定义模型会替换该内置模型。
- 如果自定义模型 `id` 是新的，则与内置模型并列添加。

## 按模型覆盖

使用 `modelOverrides` 自定义内置模型和匹配的扩展注册模型，而无需替换提供商的完整模型列表。

```json
{
  "providers": {
    "openrouter": {
      "modelOverrides": {
        "anthropic/claude-sonnet-4": {
          "name": "Claude Sonnet 4 (Bedrock Route)",
          "compat": {
            "openRouterRouting": {
              "only": ["amazon-bedrock"]
            }
          }
        }
      }
    }
  }
}
```

`modelOverrides` 对每个模型支持以下字段：`name`、`reasoning`、`thinkingLevelMap`、`input`、`cost`（部分）、`contextWindow`、`maxTokens`、`samplingParams`（按键合并）、`headers`、`compat`。

直接使用 OpenAI GPT-5.6 Sol、Terra 和 Luna 时，默认 `272000` 上下文窗口，以便请求保持在 OpenAI 的短上下文定价层内。要选择 OpenAI 的 1.05M 上下文窗口，请为你使用的每个模型增大它：

```json
{
  "providers": {
    "openai": {
      "modelOverrides": {
        "gpt-5.6-sol": {
          "contextWindow": 1050000
        }
      }
    }
  }
}
```

该覆盖保留内置的定价元数据。总输入 token 超过 272K 的请求会对整个请求使用 GPT-5.6 的长上下文费率。需要时对 `gpt-5.6-terra` 或 `gpt-5.6-luna` 应用相同的覆盖。

行为说明：

- `modelOverrides` 应用于内置提供商模型和匹配的扩展注册提供商模型。
- 未知的模型 ID 会被忽略。
- 你可以将提供商级 `baseUrl`/`headers` 与 `modelOverrides` 组合使用。
- 覆盖 `name` 仅更改模型匹配和次要详情文本；页脚和主模型列表继续显示模型 `id`。
- 如果提供商还定义了 `models`，自定义模型在内置覆盖之后合并。具有相同 `id` 的自定义模型会替换被覆盖的内置模型条目。

## Anthropic Messages 兼容性

对于使用 `api: "anthropic-messages"` 的提供商或代理，使用 `compat` 控制 Anthropic 特定的请求兼容性。

默认情况下 pi 发送每个工具的 `eager_input_streaming: true`。如果代理或 Anthropic 兼容后端拒绝该字段，请将 `supportsEagerToolInputStreaming` 设为 `false`。Pi 将省略 `tools[].eager_input_streaming`，并在启用工具的请求上改用旧的 `fine-grained-tool-streaming-2025-05-14` beta 头。

某些 Anthropic 模型需要自适应思考（`thinking.type: "adaptive"` 加 `output_config.effort`），而不是旧的基于预算的思考载荷。内置模型会自动设置。对于路由到这些模型的自定义提供商或别名，请将 `forceAdaptiveThinking` 设为 `true`。

支持逐轮 effort 的 Claude 模型使用 `supportsMidConvoEffort`。Pi 随后会持久化每个响应的提供商 effort，在后续请求上重建仅含 effort 的系统消息，并以 `prefix_mismatch_behavior: "drop_block"` 发送思考绑定控制，以避免过期的签名思考前缀导致持续的 400 响应。仅对忠实 Anthropic Messages 传输上的确切受支持 Claude 模型设置此项；不要对仅仅模仿 Messages 形状的 API 启用它。

某些 Anthropic 兼容提供商会发出带空签名的思考块，并仍期望在重放时保留它们。仅对这些提供商将 `allowEmptySignature` 设为 `true`；真正的 Anthropic 会拒绝空思考签名。

内置 Anthropic 模型在其模型元数据中启用 `supportsStrictTools`。当自定义 Anthropic 兼容模型的端点接受严格的 JSON-schema 工具定义时，必须将其设为 `true`。

```json
{
  "providers": {
    "anthropic-proxy": {
      "baseUrl": "https://proxy.example.com",
      "api": "anthropic-messages",
      "apiKey": "$ANTHROPIC_PROXY_KEY",
      "compat": {
        "supportsEagerToolInputStreaming": false,
        "supportsLongCacheRetention": true,
        "forceAdaptiveThinking": true,
        "allowEmptySignature": true
      },
      "models": [
        {
          "id": "claude-opus-4-7",
          "reasoning": true,
          "input": ["text", "image"]
        }
      ]
    }
  }
}
```

| 字段 | 描述 |
| --- | --- |
| `supportsEagerToolInputStreaming` | 提供商是否接受每个工具的 `eager_input_streaming`。默认：`true`。设为 `false` 以省略该字段，并在启用工具的请求上使用旧的细粒度工具流 beta 头。 |
| `supportsLongCacheRetention` | 当缓存保留为 `long` 时，提供商是否接受 Anthropic 长缓存保留（`cache_control.ttl: "1h"`）。默认：`true`。 |
| `sendSessionAffinityHeaders` | 启用缓存时是否从会话 id 发送 `x-session-affinity`。默认：对已知提供商自动检测。 |
| `supportsCacheControlOnTools` | 提供商是否接受工具定义上的 Anthropic 风格 `cache_control` 标记。默认：`true`。 |
| `forceAdaptiveThinking` | 是否为此模型发送自适应思考（`thinking.type: "adaptive"` 加 `output_config.effort`）。内置自适应模型会自动设置。默认：`false`。 |
| `supportsMidConvoEffort` | 确切的 Claude 模型传输是否支持逐轮 effort 系统消息和思考绑定控制。启用后 Pi 持久化原生 effort 等级并始终发送 `drop_block`。默认：`false`。 |
| `allowEmptySignature` | 是否将空思考签名重放为 `signature: ""`，而不是将思考转换为文本。默认：`false`。 |
| `supportsStrictTools` | 提供商是否接受严格的 JSON-schema 工具定义。默认：`false`；内置 Anthropic 模型在生成的元数据中启用它。 |

## OpenAI 兼容性

对于部分 OpenAI 兼容的提供商，使用 `compat` 字段。

- 提供商级 `compat` 为该提供商下所有模型应用默认值。
- 模型级 `compat` 为该模型覆盖提供商级值。

```json
{
  "providers": {
    "local-llm": {
      "baseUrl": "http://localhost:8080/v1",
      "api": "openai-completions",
      "compat": {
        "supportsUsageInStreaming": false,
        "maxTokensField": "max_tokens"
      },
      "models": [...]
    }
  }
}
```

| 字段 | 描述 |
| --- | --- |
| `supportsStore` | 提供商是否支持 `store` 字段 |
| `supportsDeveloperRole` | 使用 `developer` 还是 `system` 角色 |
| `supportsReasoningEffort` | 是否支持 `reasoning_effort` 参数 |
| `supportsUsageInStreaming` | 是否支持 `stream_options: { include_usage: true }`（默认：`true`） |
| `supportsFinishReason` | 流式响应是否包含 `finish_reason`。为 `false` 时，pi 在流结束时推断 `stop` 或 `toolUse`。默认：`true`。 |
| `maxTokensField` | 使用 `max_completion_tokens` 还是 `max_tokens` |
| `requiresToolResultName` | 是否在工具结果消息上包含 `name` |
| `requiresAssistantAfterToolResult` | 是否在工具结果之后、用户消息之前插入一条助手消息 |
| `requiresThinkingAsText` | 是否将思考块转换为纯文本 |
| `requiresReasoningContentOnAssistantMessages` | 推理启用时是否在所有重放的助手消息上包含空的 `reasoning_content` |
| `thinkingFormat` | 使用 `reasoning_effort`、`openrouter`、`deepseek`、`together`、`baseten`、`zai`、`qwen`、`chat-template` 或 `qwen-chat-template` 思考参数 |
| `chatTemplateKwargs` | 用于 `thinkingFormat: "chat-template"` 的 `chat_template_kwargs` 值；使用 `{ "$var": "thinking.enabled" }`、`{ "$var": "thinking.effort" }` 或 `{ "$var": "thinking.budget" }` 获取 pi 控制的思考值 |
| `chatTemplateArgs` | 用于 `thinkingFormat: "baseten"` 的 `chat_template_args` 值；使用 `{ "$var": "thinking.enabled" }`、`{ "$var": "thinking.effort" }` 或 `{ "$var": "thinking.budget" }` 获取 pi 控制的思考值 |
| `thinkingTokenBudgetField` | 用于从 `thinkingBudgets` 限制推理 token 的顶层请求字段，会被钳制以至少为答案保留 1024 token。`"thinking_token_budget"`（vLLM）、`"thinking_budget"`（Qwen/DashScope/SGLang）、`"thinking_budget_tokens"`（llama.cpp）。默认关闭；不在生成的目录上设置。 |
| `supportsThinkingTokenBudget` | `thinkingTokenBudgetField: "thinking_token_budget"`（vLLM）的别名。优先使用 `thinkingTokenBudgetField`。默认：`false`。 |
| `cacheControlFormat` | 在系统提示词、最后一个工具定义以及最后一条用户、助手或工具结果文本内容上使用 Anthropic 风格 `cache_control` 标记。目前仅支持 `anthropic`。 |
| `sendSessionAffinityHeaders` | 对于 `openai-completions`，启用缓存时从会话 id 发送会话亲和头。默认：`false`。 |
| `sessionAffinityFormat` | 对于 `openai-completions` 和 `openai-responses`，会话亲和头格式：`openai` 发送 `session_id`/`x-client-request-id`（completions 还发送 `x-session-affinity`），`openai-nosession` 省略含下划线的 `session_id` 头，`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key` 正文参数。默认：自动检测。 |
| `supportsStrictMode` | 提供商是否接受严格的 JSON-schema 函数工具定义。默认值取决于 API；内置 OpenAI 模型携带显式的能力元数据。 |
| `supportsOpenAIGrammarTools` | OpenAI 兼容 API 是否发出自定义 Lark/regex 语法工具。为 `false` 时，语法约束的工具回退到普通函数工具。默认：`false`；内置模型目录为 OpenAI、OpenAI Codex、Azure OpenAI、GitHub Copilot、opencode 和 Cloudflare AI Gateway 上的 GPT-5+ 模型启用它。 |
| `deferredToolsMode` | 使用提供商特定的延迟工具序列化。目前仅 `"kimi"` 受支持，用于 Kimi 的 OpenAI 兼容 Chat Completions 格式。 |
| `supportsLongCacheRetention` | 缓存保留为 `long` 时提供商是否接受长缓存保留：GPT-5.6+ Responses 模型为 `prompt_cache_options.ttl: "30m"`，更早的 OpenAI 模型为 `prompt_cache_retention: "24h"`，或当 `cacheControlFormat` 为 `anthropic` 时为 `cache_control.ttl: "1h"`。默认：`true`。 |
| `openRouterRouting` | OpenRouter 提供商路由偏好。该对象原样发送到 [OpenRouter API 请求](https://openrouter.ai/docs/guides/routing/provider-selection)的 `provider` 字段。 |
| `vercelGatewayRouting` | 用于提供商选择（`only`、`order`）的 Vercel AI Gateway 路由配置 |

`openrouter` 使用 `reasoning: { effort }`。`together` 使用 `reasoning: { enabled }`，并在启用 `supportsReasoningEffort` 时也使用 `reasoning_effort`。`qwen` 使用顶层 `enable_thinking`。对于需要 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking` 的本地 Qwen 兼容服务器，使用 `qwen-chat-template`。对于需要可配置 `chat_template_kwargs` 的 vLLM/Hugging Face 聊天模板，使用 `chat-template`，例如 DeepSeek V3.x 模板的 `chatTemplateKwargs: { "thinking": { "$var": "thinking.enabled" } }`。对于通过 `chat_template_args` 暴露切换控件并可选支持顶层 `reasoning_effort` 的提供商，使用带 `chatTemplateArgs` 的 `thinkingFormat: "baseten"`。

`thinkingTokenBudgetField` 独立于 `thinkingFormat`。不要在生成的 Qwen 目录上启用它：那些模型已经发送 `reasoning_effort`，而 DashScope 会拒绝 `thinking_budget` 与 `reasoning_effort` 一起出现。

`cacheControlFormat: "anthropic"` 用于通过文本内容和工具定义上的 `cache_control` 标记暴露 Anthropic 风格提示词缓存的 OpenAI 兼容提供商。

示例：

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "openrouter/anthropic/claude-3.5-sonnet",
          "name": "OpenRouter Claude 3.5 Sonnet",
          "compat": {
            "openRouterRouting": {
              "allow_fallbacks": true,
              "require_parameters": false,
              "data_collection": "deny",
              "zdr": true,
              "enforce_distillable_text": false,
              "order": ["anthropic", "amazon-bedrock", "google-vertex"],
              "only": ["anthropic", "amazon-bedrock"],
              "ignore": ["gmicloud", "friendli"],
              "quantizations": ["fp16", "bf16"],
              "sort": {
                "by": "price",
                "partition": "model"
              },
              "max_price": {
                "prompt": 10,
                "completion": 20
              },
              "preferred_min_throughput": {
                "p50": 100,
                "p90": 50
              },
              "preferred_max_latency": {
                "p50": 1,
                "p90": 3,
                "p99": 5
              }
            }
          }
        }
      ]
    }
  }
}
```

Vercel AI Gateway 示例：

```json
{
  "providers": {
    "vercel-ai-gateway": {
      "baseUrl": "https://ai-gateway.vercel.sh/v1",
      "apiKey": "$AI_GATEWAY_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "moonshotai/kimi-k2.5",
          "name": "Kimi K2.5 (Fireworks via Vercel)",
          "reasoning": true,
          "input": ["text", "image"],
          "cost": { "input": 0.6, "output": 3, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 262144,
          "maxTokens": 262144,
          "compat": {
            "vercelGatewayRouting": {
              "only": ["fireworks", "novita"],
              "order": ["fireworks", "novita"]
            }
          }
        }
      ]
    }
  }
}
```
