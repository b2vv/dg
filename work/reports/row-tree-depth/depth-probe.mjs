/**
 * T120 гілка А — зонд глибини **в браузері** і **у воркері**.
 *
 * Node-число (6 875) для гвардії не годиться: у браузері стек інший, у воркері
 * менший, і рушії різняться. Гвардію на 2 500 виведено з Node-виміру, якого
 * більше немає.
 *
 * Метод: бінарний пошук останньої глибини, що проходить. Вимір робиться на
 * зібраному демо через тимчасовий зонд у `window.__demoE2e` і **знятою**
 * гвардією (`MAX_ROW_TREE_DEPTH = 1_000_000`) — інакше зонд упреться в неї, а
 * не в стек.
 *
 * Запуск: node depth-probe.mjs [url]
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
const browser = await (ENGINE === 'firefox' ? firefox : chromium).launch();
console.log(`=== рушій: ${ENGINE}`);
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__demoE2e), null, { timeout: 60_000 });

const probe = async (kind, n) => {
  const res = await page.evaluate(
    async ([k, size]) => {
      const bridge = window.__demoE2e;
      const fn = k === 'main' ? bridge.probeDepthMain : k === 'worker' ? bridge.probeDepthWorker : bridge.probeDepthDiagram;
      return fn(size);
    },
    [kind, n],
  );
  console.log(`  ${kind} ${String(n).padStart(7)} → ${res.ok ? 'ok' : `FAIL ${res.error?.slice(0, 70)}`}`);
  return res;
};

/** Остання глибина, що проходить: подвоєння вгору, тоді бінарний пошук. */
async function ceiling(kind) {
  let lo = 1_000;
  let hi = null;
  // 1. подвоєння, доки не впаде
  let n = lo;
  for (let i = 0; i < 12 && hi === null; i += 1) {
    const r = await probe(kind, n);
    if (r.ok) {
      lo = n;
      n *= 2;
    } else {
      hi = n;
    }
  }
  if (hi === null) return { lo, hi: null };
  // 2. бінарний пошук між lo (ok) і hi (fail)
  while (hi - lo > Math.max(50, lo * 0.02)) {
    const mid = Math.floor((lo + hi) / 2);
    const r = await probe(kind, mid);
    if (r.ok) lo = mid;
    else hi = mid;
  }
  return { lo, hi };
}

console.log('=== головний потік');
const main = await ceiling('main');
console.log('=== воркер');
const worker = await ceiling('worker');
console.log('=== через публічний create()');
const viaDiagram = await ceiling('diagram');

console.log('\n=== чи труїться модуль після зриву (архітектурний факт №4)');
const afterFail = await probe('main', (main.hi ?? 100_000) + 5_000);
const recovery = await probe('main', 1_000);
const recovery2 = await probe('worker', 1_000);

console.log('\n=== ПІДСУМОК');
console.log(`головний потік: останній ok ${main.lo}, перший fail ${main.hi}`);
console.log(`воркер:         останній ok ${worker.lo}, перший fail ${worker.hi}`);
console.log(`через create(): останній ok ${viaDiagram.lo}, перший fail ${viaDiagram.hi}`);
console.log(`мінімум:        ${Math.min(main.lo, worker.lo, viaDiagram.lo)}`);
console.log(`після зриву (${afterFail.ok ? 'ok?!' : 'fail як і слід'}): main 1000 → ${recovery.ok ? 'ok' : 'FAIL'}, worker 1000 → ${recovery2.ok ? 'ok' : 'FAIL'}`);

await browser.close();
