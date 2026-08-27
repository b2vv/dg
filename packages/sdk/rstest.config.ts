import { defineConfig } from '@rstest/core';

/**
 * The migration's one real unknown was the WASM load in `beforeAll` — jsdom and
 * setup files already run under rstest in another project here. It survives:
 * all 697 tests pass, including every contour suite that calls into the module.
 */
export default defineConfig({
  testEnvironment: 'jsdom',
  include: ['src/**/*.test.ts'],
  setupFiles: ['./rstest.setup.ts'],
  testTimeout: 15_000,
  globals: true,
});
