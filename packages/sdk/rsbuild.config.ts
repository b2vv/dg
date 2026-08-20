import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
      'worker/index': './src/worker/index.ts',
      'mappers/index': './src/mappers/index.ts',
    },
  },
  output: {
    target: 'web',
    distPath: { root: 'dist' },
    filename: {
      js: '[name].js',
    },
    minify: false,
  },
  performance: {
    chunkSplit: { strategy: 'split-by-module' },
  },
});
