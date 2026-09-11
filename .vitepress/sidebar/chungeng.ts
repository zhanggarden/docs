// 春耕 · 亲手劳作、造物：编程实践、工具、项目、技术文档、AI 工程落地
// 全站四季规划见根目录 README.md
import { DefaultTheme } from 'vitepress';

const chungeng: Record<string, DefaultTheme.SidebarItem[]> = {
  '/chungeng/pi': [
    {
      text: 'Pi 中文文档',
      base: '/chungeng/pi',
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

export default chungeng;
