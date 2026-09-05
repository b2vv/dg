
## Лінза «Логічні діри» — старт
ДАЛІ: план перевірки —
1) прочитати spec.md + plan.md (барель-задача, К1..К4, §7 rollback);
2) `packages/sdk/src/index.ts` — що саме експортується, які два експорти прибираються;
3) grep по тестах: звідки беруть хуки — `contour/bridge.js` чи барель (заява спеки «9 з 9»);
4) `rowTreeDepthGuard.test.ts` — по чому зараз ассерт (err.name vs instanceof), і чи є одна
   інстанція класу помилки через межу src/dist;
5) `package.json` exports — чи підшляхи `/worker`, `/mappers`, `/react` не тягнуть прибрані
   символи; чи build не ламається;
6) звірити §7 rollback з К4 (оголошена межа) — чи достатньо двох рядків.

ФАКТ: заява спеки «9 з 9» — правда. Файлів рівно 9 (variantBTonguePad / NotchPaint / RectRow /
ContourStrokeDiag / PaddingPaint / ContourAlign, wasmLoad, contourEngineFlood, export), усі
імпортують з `../contour/bridge.js`. Поза ними згадка лише в `index.ts:53-54`. A2 тримається.
ФАКТ: гвардія зараз по `err.name` — `rowTreeDepthGuard.test.ts:37,48,77`. Але є ЧЕТВЕРТА така
перевірка: `render/OrgHierarchyDiagram.test.ts:158` (шлях `setData` — той, яким ходить хост).
План §1 називає лише один файл.
ФАКТ: `OrgHierarchyError` — одне визначення (`layout/orgTree.ts:3`), його ж кидає
`rowTreeLayout.ts:79`. `setData` (`OrgHierarchyDiagram.ts:1033+`) помилку НЕ перезагортає →
`instanceof` через фасад працює; межа src/dist не створює другої копії.
ФАКТ: `computeOrgRowTreeLayoutInWorker` (`rowTreeLayout.ts:198`) — публічний експорт без жодного
внутрішнього виклику. `worker/bridge.ts:175` шле лише `err.message`, `:49` реджектить
`new Error(...)` → через воркер губиться і прототип, і `name`.
ФАКТ: `package.json exports` — `./react|./worker|./mappers` дивляться у власні `dist/*/index.js`;
хуки живуть лише в `contour/bridge.ts` і крізь підшляхи не течуть. `scripts/check-package.mjs`
перевіряє тільки `new URL(...)`-посилання в dist. К1 їх не чіпає.
ФАКТ: жоден тест сьогодні не робить `import * as` барелю; барель тягне `PixiHost` (`index.ts:85`),
env — jsdom.
РІШЕННЯ: п'ять знахідок, дві блокуючі (§6 vs §8 порядок; rollback), три середні.

## Знахідки (лінза «Логічні діри»)
1. §6 «К1→К2→К3→К4» проти §8 «К3 до К1» — прямий конфлікт порядку. вага: блокує.
2. §7 rollback: повернення двох рядків валить контрактний тест К3; §5.2 сам каже, що межа К4
   назад не знімається — §7 «незворотного немає» хибне. вага: блокує.
3. К2 лишає `OrgHierarchyDiagram.test.ts:158` на `err.name` — А3 не доведено на шляху хоста.
4. С4 не обмежене: через `computeOrgRowTreeLayoutInWorker` `instanceof` (і `name`) не працює.
5. К3 не каже, ЯК читає експорти; `import * as` бачить лише рантайм-значення, тип-експорти стерті.
