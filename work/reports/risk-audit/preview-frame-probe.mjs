/**
 * Ризик 19, фінальна редакція: превʼю окремо від дропу.
 *
 * Редакція 4 уперше провела жест шляхом T111 на `Staff · 1M` — і показала
 * max 283 мс проти 10 мс на `Variant B`. Але той max стоїть **після** відпуску
 * кнопки, тобто це кадр коміту (перекладка + перемалювання сцени), а не кадр
 * превʼю. Ризик питає саме про превʼю, тож фази розділені за часом:
 * `down → up` = превʼю, `up → +600 мс` = дроп.
 *
 * Три прогони на вкладку: одне число на цій машині нічого не варте, три дають
 * розкид.
 */
import { chromium } from '/Users/strelia/projects/dg/.claude/worktrees/t109/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:4173/?e2e=1';
const ZOOM = 1.6;
const RUNS = 3;
const browser = await chromium.launch();

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * p)] ?? 0;
};

async function runOnce(tab) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  const seats = await page.evaluate(() => window.__demoE2e.getSceneCounts().positions);
  await page.evaluate((z) => window.__demoE2e.setZoom(z), ZOOM);
  await page.waitForTimeout(1200);
  await page.addStyleTag({
    content:
      '[data-org-hierarchy-test-anchors], [data-org-hierarchy-test-anchors] * { pointer-events: none !important; }',
  });

  const pick = await page.evaluate(() => {
    const reachable = [...document.querySelectorAll('[data-node-kind="position"], [data-node-kind="person"]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.getAttribute('data-testid'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
      })
      .filter((s) => {
        if (!(s.x > 0 && s.y > 0 && s.x < innerWidth && s.y < innerHeight)) return false;
        return document.elementFromPoint(s.x, s.y) instanceof HTMLCanvasElement;
      });
    let best = null;
    for (let i = 0; i < reachable.length; i += 1)
      for (let j = i + 1; j < reachable.length; j += 1) {
        const d = Math.hypot(reachable[i].x - reachable[j].x, reachable[i].y - reachable[j].y);
        if (d >= 20 && (!best || d < best.d)) best = { d, from: reachable[i], to: reachable[j] };
      }
    return { best, reachable: reachable.length };
  });
  if (!pick.best) {
    await page.close();
    return { tab, error: `досяжних мишею місць: ${pick.reachable}` };
  }

  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__frames.push([now, now - last]);
      last = now;
      window.__rafId = requestAnimationFrame(tick);
    };
    window.__rafId = requestAnimationFrame(tick);
  });

  const { from, to } = pick.best;
  await page.mouse.move(from.x, from.y);
  const tDown = await page.evaluate(() => performance.now());
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 80 });
  const tUp = await page.evaluate(() => performance.now());
  await page.mouse.up();
  await page.waitForTimeout(700);

  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__rafId);
    return window.__frames;
  });
  const patches = await page.evaluate(() =>
    window.__demoE2e.getLayoutPatchLog().map((r) => JSON.stringify(r.patch)),
  );
  await page.close();

  const preview = frames.filter(([t]) => t > tDown + 40 && t <= tUp).map(([, d]) => d);
  const drop = frames.filter(([t]) => t > tUp).map(([, d]) => d);
  return {
    tab,
    seats,
    reachable: pick.reachable,
    gap: Math.round(pick.best.d),
    displaced: patches.some((p) => p.includes('displacedPositionId')),
    preview: {
      n: preview.length,
      p50: pct(preview, 0.5),
      p95: pct(preview, 0.95),
      max: Math.max(0, ...preview),
    },
    drop: { n: drop.length, max: Math.max(0, ...drop) },
  };
}

for (const tab of ['Variant B', 'Staff · 1M']) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) runs.push(await runOnce(tab));
  const ok = runs.filter((r) => !r.error);
  if (ok.length === 0) {
    console.log(`${tab}: ${runs[0].error}`);
    continue;
  }
  console.log(`\n${tab} — місць у сцені ${ok[0].seats}, досяжних мишею ${ok[0].reachable}, крок ${ok[0].gap}px`);
  for (const r of ok) {
    console.log(
      `  превʼю: ${String(r.preview.n).padStart(3)} кадрів  p50=${r.preview.p50.toFixed(1)}  p95=${r.preview.p95.toFixed(1)}  max=${r.preview.max.toFixed(1)}   ` +
        `дроп: max=${r.drop.max.toFixed(1)} мс   посунуто=${r.displaced ? 'ТАК' : 'ні'}`,
    );
  }
  const p50s = ok.map((r) => r.preview.p50);
  const drops = ok.map((r) => r.drop.max);
  console.log(
    `  медіана p50 превʼю: ${pct(p50s, 0.5).toFixed(1)} мс · медіана піку дропу: ${pct(drops, 0.5).toFixed(1)} мс`,
  );
}
await browser.close();
