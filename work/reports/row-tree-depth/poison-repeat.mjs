/**
 * T120 — гіпотеза: пастку вмикає НЕ глибина, а **кількість зривів** на одному
 * інстансі. Кожен зрив у WASM лишає тіньовий стек не відмотаним, і з якогось
 * разу наступний виклик іде вже не в JS-стек, а за межу лінійної пам'яті.
 *
 * Метод: одна сторінка, той самий розмір, повтор до першої пастки; після
 * кожного зриву — контрольний валідний виклик.
 *
 * ## Як запустити (потрібні ДВІ тимчасові правки — вони навмисно не в дереві)
 *
 * 1. `packages/sdk/src/layout/rowTreeLayout.ts` — `MAX_ROW_TREE_DEPTH = 1_000_000`,
 *    інакше зонд упреться в гвардію, а не в стек.
 * 2. `packages/demo/src/app/e2eBridge.ts` — додати в `DemoE2eBridge` і в `bridge`:
 *    `probeDepthMain(n)`, `probeDepthWorker(n)`, `probeDepthDiagram(n)`; кожен будує
 *    ланцюг `org-0 → org-1 → …` довжини `n` і кличе відповідно
 *    `computeOrgRowTreeLayout`, `mapInWorker(worker, 'computeOrgRowTreeLayout', …)`
 *    і `OrgHierarchyDiagram.create`, повертаючи `{ ok, error }`.
 *
 * Далі: `npm run build:demo`, `npm run preview -w @org-hierarchy/demo -- --port 4173`,
 * і `node work/reports/row-tree-depth/<цей файл>`. Обидві правки після виміру відкотити.
 *
 * ⚠️ Обидва скрипти лежать тут як **слід методу**, а не як робочий інструмент: без правок
 * вище вони впадуть на `window.__demoE2e.probeDepthMain is not a function`, і це правильно —
 * зонд, який можна запустити випадково, рано чи пізно запустять випадково.
 */
import { chromium, firefox } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173/?e2e=1';
const ENGINE = process.env.ENGINE ?? 'chromium';
const DEPTH = Number(process.env.DEPTH ?? 12_750);
const TRIES = Number(process.env.TRIES ?? 15);

const browser = await (ENGINE === 'firefox' ? firefox : chromium).launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__demoE2e), null, { timeout: 60_000 });

console.log(`рушій ${ENGINE}, глибина ${DEPTH}, до ${TRIES} спроб\n`);
console.log('# | режим зриву | контрольний виклик 1 000');
console.log('--|-------------|-------------------------');

for (let i = 1; i <= TRIES; i += 1) {
  const fail = await page.evaluate((d) => window.__demoE2e.probeDepthMain(d), DEPTH);
  const ok = await page.evaluate(() => window.__demoE2e.probeDepthMain(1_000));
  const mode = fail.ok
    ? 'не впав'
    : /out of bounds/.test(fail.error ?? '')
      ? '🔴 WASM-пастка'
      : 'RangeError';
  console.log(`${String(i).padStart(2)}| ${mode.padEnd(20)} | ${ok.ok ? 'живий' : '🔴 МЕРТВИЙ'}`);
  if (!ok.ok) {
    console.log(`\nМодуль помер на спробі ${i}. Помилка зриву: ${fail.error}`);
    console.log(`Помилка контрольного виклику: ${ok.error}`);
    for (let j = 1; j <= 3; j += 1) {
      const again = await page.evaluate(() => window.__demoE2e.probeDepthMain(500));
      console.log(`  повтор ${j} (глибина 500): ${again.ok ? 'ok — ожив' : `мертвий: ${again.error?.slice(0, 60)}`}`);
    }
    const w = await page.evaluate(() => window.__demoE2e.probeDepthWorker(1_000));
    console.log(`  воркер після смерті головного: ${w.ok ? 'живий' : 'мертвий'}`);
    break;
  }
}

await browser.close();
