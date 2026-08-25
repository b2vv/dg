import { cp, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * `tsc` emits TypeScript only. The wasm-pack output (`org_hierarchy_core.js`
 * + the `.wasm` binary) is a hand-written ESM shim plus a binary, so it has to
 * be copied into `dist` or every contour call in a published build resolves to
 * nothing.
 */
const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', 'src', 'wasm', 'pkg');
const to = join(here, '..', 'dist', 'wasm', 'pkg');

try {
  await access(join(from, 'org_hierarchy_core_bg.wasm'));
} catch {
  console.error(
    'copy-wasm: packages/sdk/src/wasm/pkg is missing — run `npm run build:wasm` first.',
  );
  process.exit(1);
}

await cp(from, to, { recursive: true });
console.log('copy-wasm: src/wasm/pkg → dist/wasm/pkg');
