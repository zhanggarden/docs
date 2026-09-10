import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme } from 'vitepress';
import { ZGThemeConfig } from './types.ts';
import { overrideComponent } from './utils.ts';

// @ 指向 .vitepress 目录（供主题组件使用；config.ts 自身受 native loader 限制仍用相对路径）
const vitepressDir = dirname(fileURLToPath(import.meta.url));

const nav: DefaultTheme.NavItem[] = [
  { text: '园序', link: '/' },
  { text: '春耕', items: [{ text: 'Pi 中文文档', link: '/tech/pi/' }] },
  { text: '夏读', items: [] },
  { text: '秋收', items: [] },
  { text: '冬望', items: [] }
];

const sidebar: Record<string, DefaultTheme.SidebarItem[]> = {
  '/tech/pi': [
    {
      text: 'Pi 中文文档',
      base: '/tech/pi',
      items: [
        {
          text: '从这里开始',
          items: [
            { text: '总览', link: '/' },
            { text: '快速入门', link: '/quickstart' },
            { text: '使用 Pi', link: '/usage' },
            { text: '服务提供商', link: '/providers' },
            { text: '安全', link: '/security' },
            { text: '容器化', link: '/containerization' },
            { text: '设置', link: '/settings' },
            { text: '按键绑定', link: '/keybindings' },
            { text: '会话', link: '/sessions' },
            { text: '压缩与分支摘要', link: '/compaction' }
          ]
        },
        {
          text: '自定义',
          items: [
            { text: '扩展', link: '/extensions' },
            { text: '技能', link: '/skills' },
            { text: '提示词模板', link: '/prompt-templates' },
            { text: '主题', link: '/themes' },
            { text: 'Pi 包', link: '/packages' },
            { text: '自定义模型', link: '/models' },
            { text: '自定义提供商', link: '/custom-provider' }
          ]
        },

        {
          text: '参考',
          items: [
            { text: '环境变量', link: '/environment-variables' },
            { text: '会话文件格式', link: '/session-format' }
          ]
        },
        {
          text: '编程式使用',
          items: [
            { text: 'SDK', link: '/sdk' },
            { text: 'RPC 模式', link: '/rpc' },
            { text: 'JSON 事件流模式', link: '/json' },
            { text: 'TUI 组件', link: '/tui' }
          ]
        },
        {
          text: '平台设置',
          items: [
            { text: 'Windows 设置', link: '/windows' },
            { text: 'Termux（Android）设置', link: '/termux' },
            { text: 'tmux 设置', link: '/tmux' },
            { text: '终端设置', link: '/terminal-setup' },
            { text: 'Shell 别名', link: '/shell-aliases' }
          ]
        },
        {
          text: '开发',
          items: [{ text: '开发', link: '/development' }]
        }
      ]
    }
  ]
};

// https://vitepress.dev/reference/site-config
export default defineConfig<ZGThemeConfig>({
  title: '張圃',
  description: '張先生的园子',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }]
  ],
  lang: 'zh-CN',
  base: '/',
  srcDir: 'src',
  cleanUrls: true,
  srcExclude: ['**/README.md', '**/TODO.md'],
  lastUpdated: true,
  markdown: { math: true },
  vite: {
    server: { port: 7135, strictPort: true },
    resolve: {
      alias: [{ find: '@', replacement: vitepressDir }, overrideComponent('VPFooter', 'ZGFooter')]
    }
  },
  sitemap: { hostname: 'https://zhanggarden.cn' },
  themeConfig: {
    logo: '/logo.png',
    nav: nav,
    sidebar: sidebar,
    outline: { label: '本页目录', level: [2, 3] },
    socialLinks: [{ icon: 'github', link: 'https://github.com/zhanggarden/docs' }],
    editLink: {
      pattern: ({ filePath }) =>
        `https://github.com/zhanggarden/docs/issues/new?title=${encodeURIComponent('[文档反馈] ' + filePath)}`,
      text: '发现问题？反馈此页'
    },
    footer: {
      // 建站时刻，带 +08:00 表示北京时间，保证任意时区访客算出的运行时长一致
      launchDate: '2026-09-03T00:00:00+08:00',
      items: [{ text: 'Copyright © 2026-present zhanggarden' }]
    },
    lastUpdated: { text: '最后更新于' },
    docFooter: { prev: '上一页', next: '下一页' },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换至浅色主题',
    darkModeSwitchTitle: '切换至深色主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '返回顶部',
    notFound: {
      code: '404',
      title: '页面未找到',
      quote: '您访问的页面不存在，请检查链接或返回首页。',
      linkLabel: '返回首页',
      linkText: '点击这里返回首页'
    }
  }
});
