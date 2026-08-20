import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const demoDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: [path.join(demoDir, '../sdk/vitest.setup.ts')],
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      '@org-hierarchy/sdk': path.join(demoDir, '../sdk/src/index.ts'),
    },
  },
});
