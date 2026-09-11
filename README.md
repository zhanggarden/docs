# 張圃 · 張先生的园子

基于 VitePress 的个人博客。

- 站点：<https://zhanggarden.cn>

## 技术栈

- [VitePress](https://vitepress.dev) 2.0（alpha）+ Vue 3
- 包管理：pnpm
- Node：`^20.19.0 || ^22.13.0 || >=24`

## 本地开发

```bash
pnpm install       # 安装依赖
pnpm docs:dev      # 本地预览（http://localhost:7135）
pnpm docs:build    # 构建静态站点
pnpm docs:preview  # 预览构建产物
pnpm lint          # 代码检查（lint:fix 自动修复）
```

> `deploy` / `pull` / `sync` 为服务器运维脚本，仅在本地使用。

## 目录结构

```text
.
├─ .vitepress/       # 配置与主题
│  ├─ config.ts      # 站点配置
│  ├─ sidebar/       # 各时节侧边栏（按季拆分）
│  └─ theme/         # 自定义主题与组件
├─ src/              # 内容（Markdown）
│  ├─ index.md       # 首页（园序）
│  └─ chungeng/…     # 各时节内容目录（拼音命名）
└─ README.md
```

## 园中四季

园序为引，四时为纲。顶部导航按时节划分，各处文字顺季归位。

| 时节 | 意象           | 收录什么                                    | 主要话题           |
| ---- | -------------- | ------------------------------------------- | ------------------ |
| 园序 | 园子的序       | 关于本站、自我介绍、内容导览                | —                  |
| 春耕 | 亲手劳作、造物 | 编程实践、工具、项目、技术文档、AI 工程落地 | 编程 + AI 工程     |
| 夏读 | 夏日闲读       | 读书笔记、书评、共读、书单                  | 读书               |
| 秋收 | 收获、结晶     | 把知识嚼碎讲清的长文、原理拆解、体系化总结  | 科普 + AI 原理     |
| 冬望 | 向外向内看     | 随笔、行业观察、趋势展望、年度回顾、生活    | AI 趋势思考 + 杂谈 |

目录命名采用拼音：`chungeng` / `xiadu` / `qiushou` / `dongwang`，新文章按时节放入对应目录。

## 许可

- 代码（配置、主题、脚本）：[MIT](./LICENSE)
- 文章内容：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) — 署名、非商业、相同方式共享
