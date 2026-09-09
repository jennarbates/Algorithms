import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The production build is a single self-contained HTML file.
 *
 * That is a hard requirement, not a preference: the page is published as an
 * artifact where external hosts are blocked, so every byte of CSS, JS and
 * imagery has to be inlined. `viteSingleFile` handles the inlining, and
 * `assetsInlineLimit: Infinity` keeps small assets from being emitted as
 * separate files.
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
  },
});
