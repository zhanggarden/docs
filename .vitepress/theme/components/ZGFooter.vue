<template>
  <footer
    v-if="theme.footer && frontmatter.footer !== false"
    ref="footerRef"
    class="zg-footer"
    :class="{ 'has-sidebar': hasSidebar }"
  >
    <div class="zg-footer-container">
      <p v-if="theme.footer.launchDate" class="zg-footer-launch-duration">
        {{ launchDuration }}
      </p>
      <p v-if="theme.footer.message" class="message" v-html="theme.footer.message"></p>
      <p v-if="theme.footer.copyright" class="copyright" v-html="theme.footer.copyright"></p>
      <div v-if="footerItems.length" class="zg-flex-center zg-footer-item-container">
        <template v-for="item in footerItems" :key="item.text">
          <a
            v-if="item.link"
            :href="item.link"
            target="_blank"
            rel="noopener noreferrer"
            class="zg-footer-item"
          >
            <img v-if="item.icon" :src="item.icon" alt="" />
            <span>{{ item.text }}</span>
          </a>
          <div v-else class="zg-footer-item">{{ item.text }}</div>
        </template>
      </div>
    </div>
  </footer>
</template>
<script setup lang="ts">
import { useData } from 'vitepress';
import { useLayout } from 'vitepress/theme';
import type { ZGThemeConfig } from '@/types';
import { computed, ref, watch, useTemplateRef } from 'vue';
import { useIntervalFn, useElementVisibility } from '@vueuse/core';
import dayjs, { type Dayjs } from 'dayjs';

const { theme, frontmatter } = useData<ZGThemeConfig>();
const { hasSidebar } = useLayout();

const footerItems = computed(() => theme.value.footer?.items || []);

// 运行时长：仅在页脚真正可见时逐秒刷新（now 初始为 null，避免 SSR 与首屏水合不一致）
const footerRef = useTemplateRef<HTMLElement>('footerRef');
const footerVisible = useElementVisibility(footerRef);
const now = ref<Dayjs | null>(null);

// immediate: false —— 挂载前不启动；useIntervalFn 会随组件卸载自动清理
const { pause, resume } = useIntervalFn(
  () => {
    now.value = dayjs();
  },
  1000,
  { immediate: false }
);

// 页脚可见才跳秒：切后台、文章页 display:none、滚出屏幕都会暂停
watch(footerVisible, (visible) => {
  if (visible) {
    now.value = dayjs(); // 恢复时立刻补一次，追上暂停期间流逝的时间
    resume();
  } else {
    pause();
  }
});

const launchDuration = computed(() => {
  const raw = theme.value.footer?.launchDate;
  const cur = now.value;
  if (!raw || !cur) return '';

  const start = dayjs(raw);
  if (!start.isValid() || cur.isBefore(start)) return '本站已运行 0 秒';

  // 用 diff + add 逐级取整，保证按真实日历（含闰年）计算「年/天」
  const years = cur.diff(start, 'year');
  let anchor = start.add(years, 'year');
  const days = cur.diff(anchor, 'day');
  anchor = anchor.add(days, 'day');
  const hours = cur.diff(anchor, 'hour');
  anchor = anchor.add(hours, 'hour');
  const minutes = cur.diff(anchor, 'minute');
  anchor = anchor.add(minutes, 'minute');
  const seconds = cur.diff(anchor, 'second');

  const parts: string[] = [];
  if (years >= 1) parts.push(`${years} 年`); // 满 1 年才显示「年」
  parts.push(`${days} 天`, `${hours} 小时`, `${minutes} 分`, `${seconds} 秒`);
  return `本站已运行 ${parts.join(' ')}`;
});
</script>
<style lang="scss" scoped>
.zg-footer {
  position: relative;
  z-index: var(--vp-z-index-footer);
  border-top: 1px solid var(--vp-c-gutter);
  padding: 32px 24px;
  background-color: var(--vp-c-bg);
  &.has-sidebar {
    display: none;
  }

  & :deep(a) {
    text-decoration-line: none;
    text-underline-offset: 2px;
    transition: color 0.25s;

    &:hover {
      color: var(--vp-c-text-1);
    }
  }
}

.zg-footer-container {
  margin: 0 auto;
  max-width: var(--vp-layout-max-width);
  text-align: center;
}

.zg-footer-item-container {
  flex-wrap: wrap;
  gap: 8px 20px; /* 行间距 8px，列间距 16px */
}

.zg-footer-launch-duration,
.message,
.copyright,
.zg-footer-item {
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.zg-footer-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;

  img {
    width: 14px;
    height: 14px;
    margin-right: 4px;
  }
}

@media (min-width: 768px) {
  .zg-footer {
    padding: 32px;
  }
}
</style>
