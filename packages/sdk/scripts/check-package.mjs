/**
 * A built package must not point at files it does not ship.
 *
 * `new Worker(new URL('./transform.worker.ts', import.meta.url))` survives `tsc`
 * untouched — the path lives inside a string, so nothing rewrites the extension.
 * A bundler resolves it during development, which is why the demo never noticed;
 * a consumer of `dist` gets a 404 and silently loses its worker.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const URL_REF = /new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(path);
    else if (entry.name.endsWith('.js')) yield path;
  }
}

if (!existsSync(dist)) {
  console.error('check-package: dist/ is missing — run the build first');
  process.exit(1);
}

const broken = [];
for (const file of jsFiles(dist)) {
  const source = readFileSync(file, 'utf8');
  for (const [, ref] of source.matchAll(URL_REF)) {
    const target = resolve(dirname(file), ref);
    if (!existsSync(target)) broken.push({ file: file.slice(dist.length + 1), ref });
  }
}

if (broken.length > 0) {
  console.error('check-package: the package references files it does not ship:');
  for (const { file, ref } of broken) console.error(`  dist/${file} → ${ref}`);
  process.exit(1);
}
console.log('check-package: every referenced file ships');
