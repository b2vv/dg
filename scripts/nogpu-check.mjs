/**
 * T83 — the acceptance rows that only exist where there is no GPU.
 *
 * The repo's Playwright runner cannot do this: its node_modules are built for the
 * host platform, and the environment we care about is a GPU-less Linux session.
 * So this is a standalone script run inside the official Playwright image against
 * an already-built `packages/demo/dist`:
 *
 *   npm run build:demo
 *   docker run --rm --platform linux/amd64 \
 *     -v "$PWD":/repo:ro -w /w -v /tmp/nogpu:/w \
 *     mcr.microsoft.com/playwright:v1.62.1-noble \
 *     sh -c "npm i -s playwright@1.62.1 >/dev/null 2>&1 && node /repo/scripts/nogpu-check.mjs"
 *
 * Exit code 0 = every row held.
 */
import { firefox } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = '/repo/packages/demo/dist';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? '/index.html' : path);
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => {
  server.listen(4173, r);
});

const results = [];
const check = (row, ok, detail) => {
  results.push({ row, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${row}  ${detail}`);
};

async function page(prefs, query = '') {
  const browser = await firefox.launch({ firefoxUserPrefs: prefs });
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:4173/?e2e=1${query}`, { waitUntil: 'domcontentloaded' });
  return { browser, p, errors };
}

const kind = (p) =>
  p.evaluate(() => window.__demoE2e?.getRendererKind?.() ?? null);

// Row 3 — a terminal with no GPU can work: heaviest scene, real frame rate.
{
  const { browser, p } = await page({});
  await p.locator('[data-testid="diagram-ready"]').waitFor({ timeout: 180_000 });
  await p.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
  await p.locator('[data-testid="diagram-ready"]').waitFor({ timeout: 300_000 });
  const fps = await p.evaluate(
    () =>
      new Promise((res) => {
        let f = 0;
        const t0 = performance.now();
        const tick = () => {
          f += 1;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else res(Math.round(f / 2));
        };
        requestAnimationFrame(tick);
      }),
  );
  const engine = await kind(p);
  check('row 3', engine === 'canvas' && fps >= 30, `engine=${engine} fps=${fps} (need canvas, >=30)`);
  await browser.close();
}

// Row 10 — WebGL switched off entirely is still a drawn diagram, not a blank page.
{
  const { browser, p } = await page({ 'webgl.disabled': true });
  await p.locator('[data-testid="diagram-ready"]').waitFor({ timeout: 180_000 });
  const engine = await kind(p);
  const painted = await p.evaluate(() => !!document.querySelector('canvas'));
  check('row 10', engine === 'canvas' && painted, `engine=${engine} canvas=${painted}`);
  await browser.close();
}

// Row 11 — an engine pinned to WebGL where WebGL is gone must fail loudly.
{
  const { browser, p } = await page({ 'webgl.disabled': true }, '&renderer=webgl');
  const failed = await p
    .locator('[data-testid="diagram-ready"]')
    .waitFor({ timeout: 20_000 })
    .then(() => false)
    .catch(() => true);
  const text = await p.evaluate(() => document.body.innerText.slice(0, 400));
  check(
    'row 11',
    failed && /renderer 'webgl'/.test(text),
    failed ? `error surfaced: ${/renderer 'webgl'/.test(text)}` : 'diagram came up anyway',
  );
  await browser.close();
}

server.close();
const bad = results.filter((r) => !r.ok);
console.log(bad.length > 0 ? `\n${bad.length} row(s) failed` : '\nall rows held');
process.exit(bad.length > 0 ? 1 : 0);
