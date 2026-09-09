import { fileURLToPath, URL } from 'node:url';

/**
 * 用本地组件覆盖默认主题的内部组件（VitePress 官方推荐的 alias 覆盖方式）
 * 约定：替换组件统一放在 ./theme/components 下，均为 .vue 文件
 * @param defaultComponent 默认主题内部组件名，如 'VPFooter'
 * @param localComponent ./theme/components 下的本地替换组件名，如 'ZGFooter'
 */
export const overrideComponent = (defaultComponent: string, localComponent: string) => ({
  // ^.* 必须保留：Vite alias 对 RegExp 用 importee.replace(find, replacement)，
  // 只替换匹配到的片段，需匹配整条 import 路径才能整体替换为目标绝对路径
  find: new RegExp(`^.*/${defaultComponent}\\.vue$`),
  replacement: fileURLToPath(new URL(`./theme/components/${localComponent}.vue`, import.meta.url))
});
