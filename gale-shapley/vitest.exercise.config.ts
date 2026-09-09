import { defineConfig } from 'vitest/config';

/**
 * Runs the property suite against `exercises/engine/engine.ts` instead of the
 * reference implementation in `src/core/`.
 *
 * The exercise is to reimplement the engine from scratch and get this suite to
 * pass without reading `src/core/engine.ts`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['exercises/engine/*.test.ts'],
  },
});
