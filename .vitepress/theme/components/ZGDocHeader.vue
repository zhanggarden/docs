<template>
  <header v-if="show" class="docs-header">
    <h1 v-if="title" class="docs-header__title">{{ title }}</h1>

    <div class="docs-header__meta">
      <time v-if="formattedDate" class="docs-header__date" :datetime="isoDate">
        {{ formattedDate }}
      </time>
      <template v-if="tags.length">
        <span class="docs-header__sep">·</span>
        <ul class="docs-header__tags">
          <li v-for="tag in tags" :key="tag" class="docs-header__tag">{{ tag }}</li>
        </ul>
      </template>
    </div>

    <p v-if="description" class="docs-header__desc">{{ description }}</p>
  </header>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// 统一按 UTC 解析/格式化：SSR（构建机）与客户端（访客浏览器）时区不同也不会水合不一致
dayjs.extend(utc);

interface DocsFrontmatter {
  title?: string;
  date?: string | Date;
  tags?: string[];
  description?: string;
}

const { frontmatter } = useData();

const fm = computed(() => frontmatter.value as DocsFrontmatter);

/** 有 date 才认为是一篇正式文章，才渲染头部 */
const show = computed(() => Boolean(fm.value.date));

const title = computed(() => fm.value.title ?? '');

const tags = computed(() => (Array.isArray(fm.value.tags) ? fm.value.tags : []));

const description = computed(() => fm.value.description ?? '');

/** frontmatter 的 date（YAML 可能解析成 Date 或字符串）统一按 UTC 解析 */
const parsedDate = computed(() => {
  const raw = fm.value.date;
  if (!raw) return null;
  const d = dayjs.utc(raw);
  return d.isValid() ? d : null;
});

/** 格式化为「2026 年 9 月 3 日」；解析失败则原样返回 */
const formattedDate = computed(() => {
  if (parsedDate.value) return parsedDate.value.format('YYYY 年 M 月 D 日');
  const raw = fm.value.date;
  return raw ? String(raw) : '';
});

/** 供 <time> 的 datetime 属性使用的 ISO 日期 */
const isoDate = computed(() => parsedDate.value?.format('YYYY-MM-DD'));
</script>
<style lang="scss" scoped>
.docs-header {
  margin-bottom: 1.5rem;
}

.docs-header__title {
  font-family: var(--vp-font-family-serif);
  font-size: clamp(26px, 4.5vw, 38px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
}

.docs-header__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.docs-header__date {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.docs-header__sep {
  color: var(--vp-c-text-2);
  opacity: 0.5;
}

.docs-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.docs-header__tag {
  font-size: 11px;
  line-height: 1.6;
  padding: 2px 10px;
  border-radius: 20px;
  letter-spacing: 0.03em;
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  white-space: nowrap;
}

.docs-header__desc {
  margin: 0.75rem 0 0;
  font-size: 1rem;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .article-header__title {
    font-size: 24px;
  }
}
</style>
