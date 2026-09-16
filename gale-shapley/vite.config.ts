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

    /**
     * `tests/layout.test.ts` reads the stylesheet and checks the rules the
     * one-screen lock is built from, so the stylesheet has to actually arrive.
     *
     * Vitest stubs CSS out of the module graph by default, which is right for a
     * suite that never looks at it: importing a component would otherwise drag
     * the whole sheet through a processor for nothing. The stub is by extension
     * though, so it catches `?raw` too, and the import comes back as an empty
     * string rather than as an error. A suite that parses an empty string finds
     * no rules and breaks no rules, so it passes everything and guards nothing.
     */
    css: true,
  },
});
