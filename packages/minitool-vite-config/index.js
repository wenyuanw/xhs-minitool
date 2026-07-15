import { defineConfig, mergeConfig } from 'vite';

/**
 * 小红书小工具默认 Vite 配置：
 * 相对路径、单包内静态资源、IIFE 单入口、无 PWA / Service Worker。
 *
 * @param {import('vite').UserConfig} [overrides]
 * @returns {import('vite').UserConfig}
 */
export function defineMinitoolConfig(overrides = {}) {
  const base = defineConfig({
    base: './',
    build: {
      outDir: 'xhs-tool',
      emptyOutDir: true,
      assetsInlineLimit: 0,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: 'app.js',
          chunkFileNames: 'chunk-[name].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            if (name.endsWith('.css')) return 'app.css';
            if (name.endsWith('.woff2') || name.endsWith('.woff')) {
              return 'fonts/[name][extname]';
            }
            if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
              return 'icons/[name][extname]';
            }
            return 'assets/[name][extname]';
          },
        },
      },
    },
  });

  return mergeConfig(base, overrides);
}

export default defineMinitoolConfig;
