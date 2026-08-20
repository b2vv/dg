import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const sdkSrc = path.join(demoDir, '../sdk/src/index.ts');

/** GitHub project Pages: https://<user>.github.io/<repo>/ */
const assetPrefix = process.env.DEMO_BASE_PATH ?? '/';

export default defineConfig({
  html: {
    template: './src/index.html',
  },
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  resolve: {
    alias: {
      '@org-hierarchy/sdk': sdkSrc,
      '@org-hierarchy/sdk/react': path.join(demoDir, '../sdk/src/react/index.ts'),
    },
  },
  server: {
    port: 3000,
  },
  output: {
    distPath: { root: 'dist' },
    assetPrefix,
  },
  tools: {
    rspack: {
      experiments: {
        asyncWebAssembly: true,
      },
    },
  },
});
