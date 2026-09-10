<template>
  <!-- full：完整声明，用于翻译专题的入口页 -->
  <div v-if="variant === 'full'" class="zg-trans-notice zg-trans-notice--full">
    <p class="zg-trans-notice__title">📖 关于本翻译</p>
    <p>本文是 {{ project }} 官方文档的非官方社区中文翻译，仅为方便中文读者阅读而整理。</p>
    <ul>
      <li>
        英文原文：
        <a :href="source" target="_blank" rel="noopener noreferrer">{{ source }}</a>
      </li>
      <li v-if="projectUrl">
        原项目：
        <a :href="projectUrl" target="_blank" rel="noopener noreferrer">{{ projectUrl }}</a>
        <template v-if="author">（作者 {{ author }}）</template>
      </li>
      <li v-if="licenseUrl">
        许可证：
        <a :href="licenseUrl" target="_blank" rel="noopener noreferrer">{{ license }}</a>
      </li>
      <li>
        本翻译与原作者无任何隶属或背书关系；如与英文原文存在出入或滞后，一律以官方英文文档为准。
      </li>
    </ul>
    <!-- 额外补充（如商标声明等）由使用方通过默认插槽传入 -->
    <slot />
  </div>

  <!-- inline：单行提示，用于各子页面顶部 -->
  <div v-else class="zg-trans-notice zg-trans-notice--inline">
    本页为 {{ project }} 官方文档的非官方中文翻译，请以官方英文文档为准。
    <a :href="source" target="_blank" rel="noopener noreferrer">原文</a>
    <template v-if="licenseUrl">
      · <a :href="licenseUrl" target="_blank" rel="noopener noreferrer">许可证</a>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 对应英文原文页面的 URL（必填） */
    source: string;
    /** 项目/产品显示名，如 "Pi" */
    project?: string;
    /** 原项目主页或仓库地址（full 变体展示） */
    projectUrl?: string;
    /** 原作者署名（full 变体展示） */
    author?: string;
    /** 许可证名称，默认 MIT */
    license?: string;
    /** 原始许可证链接（full 与 inline 变体均使用） */
    licenseUrl?: string;
    /** 展示形态：full=完整声明块，inline=单行提示，默认 inline */
    variant?: 'full' | 'inline';
  }>(),
  {
    project: '',
    projectUrl: '',
    author: '',
    license: 'MIT',
    licenseUrl: '',
    variant: 'inline'
  }
);
</script>

<style lang="scss" scoped>
.zg-trans-notice {
  & :deep(a) {
    color: var(--vp-c-brand-1);
    font-weight: 500;
    text-decoration: none;
    word-break: break-all;
    &:hover {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  }
}

/* 完整声明块：沿用 VitePress info 风格 */
.zg-trans-notice--full {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px 16px 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  background-color: var(--vp-c-bg-soft);

  p {
    margin: 0 0 8px;
  }

  ul {
    margin: 0 0 8px;
    padding-left: 1.25em;
  }

  li {
    margin: 4px 0;
  }

  .zg-trans-notice__title {
    font-weight: 600;
    color: var(--vp-c-text-1);
  }
}

/* 单行提示：轻量、带品牌色左边框 */
.zg-trans-notice--inline {
  margin: 0 0 24px;
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 0 4px 4px 0;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  background-color: var(--vp-c-bg-soft);
}
</style>
