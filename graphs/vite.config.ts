import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The production build is a single self-contained HTML file, for the same
 * reason as `../gale-shapley`: `site/build.sh` publishes `dist/index.html` and
 * nothing else, so every byte of CSS and JS has to be inlined into it.
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    css: true,
  },
});
