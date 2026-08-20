import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rspack/cli';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    main: './src/main.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    clean: true,
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'builtin:swc-loader', options: { jsc: { parser: { syntax: 'typescript' } } } }],
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: ['css-loader'],
        type: 'css',
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
  devServer: {
    port: 8080,
    hot: true,
    static: { directory: path.resolve(__dirname, 'public') },
    historyApiFallback: true,
  },
  html: [
    {
      template: path.resolve(__dirname, 'index.html'),
      filename: 'index.html',
      chunks: ['main'],
    },
  ],
});
