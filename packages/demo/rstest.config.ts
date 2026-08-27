import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rstest/core';

const demoDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testEnvironment: 'jsdom',
  include: ['src/**/*.test.ts'],
  // Same setup as the SDK: jsdom lacks a canvas, and Pixi needs one to paint.
  setupFiles: [path.join(demoDir, '../sdk/rstest.setup.ts')],
  testTimeout: 20_000,
  globals: true,
  resolve: {
    alias: {
      '@org-hierarchy/sdk/react': path.join(demoDir, '../sdk/src/react/index.ts'),
      '@org-hierarchy/sdk': path.join(demoDir, '../sdk/src/index.ts'),
    },
  },
});
