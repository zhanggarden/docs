import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme } from 'vitepress';
import { ZGThemeConfig } from './types.ts';
import { overrideComponent } from './utils.ts';

// @ 指向 .vitepress 目录（供主题组件使用；config.ts 自身受 native loader 限制仍用相对路径）
const vitepressDir = dirname(fileURLToPath(import.meta.url));

const nav: DefaultTheme.NavItem[] = [
  { text: '园序', link: '/' },
  { text: '春耕', items: [] },
  { text: '夏读', items: [] },
  { text: '秋收', items: [] },
  { text: '冬望', items: [] }
];

const sidebar: Record<string, DefaultTheme.SidebarItem[]> = {};

// https://vitepress.dev/reference/site-config
export default defineConfig<ZGThemeConfig>({
  title: '張圃',
  description: '張先生的园子',
  head: [['link', { rel: 'icon', href: '/logo.png', type: 'image/png' }]],
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
    // socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
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
