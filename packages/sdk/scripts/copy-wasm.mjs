import { cp, access, rm } from 'node:fs/promises';
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

/**
 * wasm-pack writes a `.gitignore` containing `*` into its `pkg/` output. Copied
 * into `dist/wasm/pkg`, that nested ignore makes `npm pack`/`publish` drop the
 * entire `pkg/` (the `.wasm` binary + ESM shim) from the tarball while the rest
 * of `dist` ships — consumers then hit WasmLoadError at runtime. Strip it so the
 * built WASM actually travels in the package (TD05: consumers install this wasm).
 */
await rm(join(to, '.gitignore'), { force: true });

console.log('copy-wasm: src/wasm/pkg → dist/wasm/pkg');
