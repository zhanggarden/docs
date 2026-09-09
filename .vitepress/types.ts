import { type DefaultTheme } from 'vitepress';

export interface ZGFooterItem {
  text: string;
  icon?: string;
  link?: string;
}

export interface ZGFooter extends DefaultTheme.Footer {
  /**
   * 建站日期
   */
  launchDate?: string;
  items?: ZGFooterItem[];
}

export interface ZGThemeConfig extends Omit<DefaultTheme.Config, 'footer'> {
  footer?: ZGFooter;
}
