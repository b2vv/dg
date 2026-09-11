/**
 * Три ціни однієї дії на `Staff · 1M`, щоб розділити T111 і просто коміт:
 *   1) дроп у **вільну** клітину — коміт без колізії;
 *   2) дроп у **зайняту** без обробника — відмова (`InteractionError`);
 *   3) для порівняння — те саме на `Variant B`.
 * Міряємо і `await`, і найдовший кадр після виклику.
 */
import { chromium } from '/Users/strelia/projects/dg/.claude/worktrees/t109/node_modules/playwright/index.mjs';

const browser = await chromium.launch();

async function open(tab) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/?e2e=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  return page;
}

async function timed(page, id, col, row) {
  return page.evaluate(
    async ([pid, c, r]) => {
      const frames = [];
      let last = performance.now();
      let raf;
      const tick = (now) => {
        frames.push(now - last);
        last = now;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      await new Promise((res) => setTimeout(res, 350));
      const base = Math.max(...frames);
      frames.length = 0;
      const before = window.__demoE2e.getLayoutPatchLog().length;
      const t0 = performance.now();
      const err = await window.__demoE2e.moveSeat(pid, c, r);
      const call = performance.now() - t0;
      await new Promise((res) => setTimeout(res, 900));
      cancelAnimationFrame(raf);
      return {
        err,
        call,
        base,
        patches: window.__demoE2e.getLayoutPatchLog().length - before,
        spike: Math.max(...frames),
      };
    },
    [id, col, row],
  );
}

const page = await open('Staff · 1M');
const seats = await page.evaluate(() => window.__demoE2e.getSceneCounts().positions);
// Порожня клітина далеко за стіною — туди ніхто не авторив місць.
const free = await timed(page, 'pos-349955', 60, 60);
console.log(
  `Staff · 1M (${seats} місць) вільна клітина (60,60): ${free.err ?? 'ok'} · патчів ${free.patches} · ` +
    `await ${free.call.toFixed(1)} мс · пік кадру ${free.spike.toFixed(1)} мс (фон ${free.base.toFixed(1)})`,
);
const busy = await timed(page, 'pos-349956', 0, 1);
console.log(
  `Staff · 1M зайнята клітина (0,1): ${busy.err ? 'ВІДМОВА' : 'ok'} · патчів ${busy.patches} · ` +
    `await ${busy.call.toFixed(1)} мс · пік кадру ${busy.spike.toFixed(1)} мс`,
);
if (busy.err) console.log(`   ${busy.err}`);
await page.close();

const vb = await open('Variant B');
const vbFree = await timed(vb, 'P1', 6, 6);
console.log(
  `Variant B (6 місць) вільна клітина (6,6): ${vbFree.err ?? 'ok'} · патчів ${vbFree.patches} · ` +
    `await ${vbFree.call.toFixed(1)} мс · пік кадру ${vbFree.spike.toFixed(1)} мс (фон ${vbFree.base.toFixed(1)})`,
);
await vb.close();
await browser.close();
