// https://vitepress.dev/guide/custom-theme
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import ZGDocHeader from './components/ZGDocHeader.vue';
import ZGTransNotice from './components/ZGTransNotice.vue';
import './styles/index.scss';

export default {
  extends: DefaultTheme,
  // 在 doc 布局正文前注入文章头部（组件内部按 frontmatter.date 决定是否渲染）
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ZGDocHeader)
    });
  },
  // 全局注册通用组件，markdown 内可直接使用
  enhanceApp({ app }) {
    app.component('ZGTransNotice', ZGTransNotice);
  }
} satisfies Theme;
