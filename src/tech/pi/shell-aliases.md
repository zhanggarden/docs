---
layout: doc
title: Shell 别名
date: 2026-09-10
tags:
  - Pi
---

<ZGTransNotice
  project="Pi"
  source="https://pi.dev/docs/latest/shell-aliases"
  project-url="https://github.com/earendil-works/pi"
  author="Mario Zechner"
  license="MIT"
  license-url="https://github.com/earendil-works/pi/blob/main/LICENSE"
/>

Pi 以非交互模式运行 bash（`bash -c`），默认情况下不会展开别名。

要启用你的 shell 别名，请在 `~/.pi/agent/settings.json` 中添加：

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\neval \"$(grep '^alias ' ~/.zshrc)\""
}
```

请根据你的 shell 配置文件调整路径（`~/.zshrc`、`~/.bashrc` 等）。
