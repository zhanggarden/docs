import js from '@eslint/js';
import markdown from '@eslint/markdown';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsonc from 'eslint-plugin-jsonc';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores
  { ignores: ['node_modules/**', '.vitepress/dist/**', '.vitepress/cache/**'] },

  // Base JS rules
  { ...js.configs.recommended, files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'] },

  // TypeScript rules
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}']
  })),

  // Vue rules
  ...vue.configs['flat/recommended'].map((config) => ({
    ...config,
    files: ['**/*.vue']
  })),

  // Vue + TypeScript parser
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module'
      }
    }
  },

  // JS/TS globals and custom rules
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      // VitePress config 常用 default export object，关掉这个避免噪音
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },

  // JSON/JSONC linting
  ...jsonc.configs['flat/recommended-with-jsonc'].map((config) => ({
    ...config,
    files: ['**/*.{json,jsonc,json5}']
  })),

  // Markdown linting - 对 .md 文件做基础检查
  ...markdown.configs.recommended,

  // @eslint/markdown 不支持数学扩展，$...$ 里的 LaTeX 会被 GFM 解析器误判，关掉相关纯检查规则消除假阳性
  {
    files: ['**/*.md'],
    rules: {
      // $f^*$ 的上标星号被误判为强调标记
      'markdown/no-space-in-emphasis': 'off',
      // $\mathbb{E}[R]$ 等公式里的方括号被误判为引用式链接 [label]
      'markdown/no-missing-label-refs': 'off'
    }
  },

  // Markdown 内代码块宽松处理（VitePress 文档常含示例代码）
  {
    files: ['**/*.md/*.js', '**/*.md/*.ts', '**/*.md/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off'
    }
  },
  // 自定义主题组件
  {
    files: ['**/theme/**/*.vue'],
    rules: {
      'vue/no-v-html': ['error', { ignorePattern: '^theme.footer' }]
    }
  },

  // Prettier must be last
  eslintConfigPrettier
];
