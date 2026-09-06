# Work — робоча документація Org Hierarchy SDK

Ця папка доповнює `docs/REQUIREMENTS.md` і `docs/TECH_STACK.md`: фіксує **поточний стан**, **алгоритми**, **технічний борг** і **детальні задачі** для імплементації.

## Структура

```
work/
  README.md              ← цей файл (навігація)
  AGENDA.md              ← ранжована черга: що брати наступним і чому не інше
  CTO-RESEARCH.md        ← брифінг перед імплементацією (продукт, код, інфра, ризики)
  SPEC.md                ← специфікація + алгоритми + §13 стандарти TS
  TDD.md                 ← політика: тести ПЕРЕД кодом (success + failure)
  CODING_STANDARDS.md    ← Clean Code / Architecture / SOLID / DRY / KISS / GoF (TS)
  tech-debt/             ← зафіксований технічний борг
  tasks/                 ← детальні задачі для розробки
  reports/<topic>/       ← spec / plan / звіт по темі (див. `.claude/standards.md` §Артефакти)
  archive/               ← завершені задачі вказівниками, повний текст — в історії git
```

**Питання до хост-проєкту**, на які не можна відповісти зсередини цього репо, живуть у
[`reports/host-integration/questions.md`](./reports/host-integration/questions.md).

**Перед кодом:** [CTO-RESEARCH.md](./CTO-RESEARCH.md). Живого P0 немає — T78 закрито; черга ходів у [AGENDA.md](./AGENDA.md).

## Процес розробки (TDD)

**Обов’язково:** перед production-кодом — тести на **success** і **failure** кейси.  
Цикл: **Red → Green → Refactor**. Деталі: [TDD.md](./TDD.md).

**Стандарти TS-коду:** [CODING_STANDARDS.md](./CODING_STANDARDS.md) — Clean Code / Architecture / SOLID / DRY / KISS / GoF + **Matt Pocock (Total TypeScript)**; також SPEC §13.

## Статус проєкту (знімок 2026-08-20 — застарілий, звіряйся з AGENDA.md)

| Область | Статус |
|---------|--------|
| Rust WASM contour (magnetism) | ✅ реалізовано |
| SDK data + mappers + worker helpers | ✅ |
| SDK contour bridge | ✅ |
| Pixi renderer | ✅ T01 (+ pan/zoom + LOD) |
| Org matrix / row-tree | ✅ T03 |
| Staff 3-tier layout + edges | ✅ T08–T09 |
| Demo app (Rsbuild) | ✅ `packages/demo` — `npm run dev` |
| Export SVG/PNG/PDF | ✅ T05 |
| Interactions (D&D, search) | ✅ T04 v1 core |

## Запуск demo

```bash
npm install
npm run build:wasm   # якщо wasm pkg не зібраний
npm run dev          # http://localhost:3000
```

## Задачі

**Що робити далі** — [`AGENDA.md`](./AGENDA.md): ранжована черга з обґрунтуванням, чому саме цей хід.

У `tasks/` лишається тільки живе: не почате, часткове й довідники, які тримаються синхронними з
кодом. Завершене переїхало вказівниками у два свіпи —
[`archive/tasks-2026-09-02.md`](./archive/tasks-2026-09-02.md) (97 задач) і
[`archive/tasks-2026-09-06.md`](./archive/tasks-2026-09-06.md) (T90, T92, T98, T107, T108);
повний текст кожної — в історії git. Критерій переїзду не «закрито», а **«закрито і на це ніхто
не спирається»**: тому `T79`, `T80`, `T103`, `T104`, `T26` лишаються тут попри закритий статус —
їх цитує жива дока.

| Задача | Про що | Статус |
|---|---|---|
| [T26-promote-overlay](./tasks/T26-promote-overlay.md) | Pixi + React promote overlay (TD07) | done (first slice) |
| [T56-gojs-feature-inventory](./tasks/T56-gojs-feature-inventory.md) | GoJS reverse-engineering: інвентаризація функціоналу | draft — ⛔ для product selection (позначайте `[x]` що беремо; чек-бокси ставить продукт, не агент) |
| [T61-group-recursion-tier3](./tasks/T61-group-recursion-tier3.md) | Рекурсія груп організацій у ярусі 3 (B8c) | planned · ⛔ заблоковано продуктом — перший пункт acceptance («макет затверджено») |
| [T67-multi-select](./tasks/T67-multi-select.md) | Мультивибір вузлів (D2) | Phase 1 done · bulk-меню + host bulk bar (2026-08-25) |
| [T70-position-card-chrome](./tasks/T70-position-card-chrome.md) | Chrome карток + геометрія знака організації (E* / 4231) | Phase 0 + Phase 1 + Phase 2 done (agreed in T73) |
| [T71-gojs-to-dg-migration-plan](./tasks/T71-gojs-to-dg-migration-plan.md) | План міграції GoJS → Org Hierarchy SDK (`dg`) | ✅ cutover queue complete (2026-08-23) — залишок: T61 (макет), T67 Phase 2 (marquee, optional) |
| [T79-g2-m2-paint-notch](./tasks/T79-g2-m2-paint-notch.md) | G2 / M2 на paint-шляху (foreign ніколи не під заливкою) | ✅ done (2026-08-25) — **лишається тут**: SPEC і REQUIREMENTS цитують його як пояснення геометрії |
| [T80-contour-engines-ba-demo](./tasks/T80-contour-engines-ba-demo.md) | Два рушії контурів для порівняння BA | 🟢 розвилку закрито 2026-09-06 рішенням продукту — лишається `button-group`; **прибирання `cell-flood` окремою задачею не заведено** |
| [T101-e2e-flakes-only-local](./tasks/T101-e2e-flakes-only-local.md) | Флаки, які CI не може побачити | 🔵 не почато · ⚠️ **гіпотезу «винна паралельність» спростовано 2026-09-04** — падає й на `--workers=1`; перший пункт робіт міряє не ту вісь |
| [T102-row-tree-depth-block-b](./tasks/T102-row-tree-depth-block-b.md) | row-tree: підняти підтриману глибину (блок Б) | не почато. Спека готова, приймальна таблиця написана. |
| [T103-setdata-request-epoch](./tasks/T103-setdata-request-epoch.md) | `setData` не «виграє останній запит» | ✅ зроблено (2026-09-05) — виграє останній, дані й індекс комітяться **разом** |
| [T104-mutations-are-not-one-transaction](./tasks/T104-mutations-are-not-one-transaction.md) | мутація, рендер і колбек хоста — не одна транзакція | ✅ зроблено (2026-09-05) — усі **шість** місць повідомляють після кадру; коренева причина була в `renderCoalesce`, не в мутаторах |
| [T105-root-barrel-exposes-test-hooks](./tasks/T105-root-barrel-exposes-test-hooks.md) | кореневий барель віддає внутрішнє й тест-хуки | не почато. |
| [T106-deepen-facades-drop-shallow-wrappers](./tasks/T106-deepen-facades-drop-shallow-wrappers.md) | великі фасади поруч із порожніми обгортками | не почато. Серйозність: Medium. |
| [T109-toggle-staff-org-has-no-transaction](./tasks/T109-toggle-staff-org-has-no-transaction.md) | `toggleStaffOrg` міняє стан і малює, без відкоту | 🔵 не почато · P3 — знайдено як наслідок T104; контракту не порушує, бо колбека не шле |
| [T110-changelog-died-at-0.2.0](./tasks/T110-changelog-died-at-0.2.0.md) | CHANGELOG мовчить про десять комітів публічного API | 🔵 не почато · Medium — застарілий документ гірший за порожній |
| [T111-move-onto-occupied-cell](./tasks/T111-move-onto-occupied-cell.md) | drop у зайняту клітину приймається — дві картки в одній точці | 🔵 не почато · **P1** — спека й план готові: [reports/seat-collision](./reports/seat-collision/) |
| [T112-demo-tab-consolidation](./tasks/T112-demo-tab-consolidation.md) | звести демо з 14 вкладок до шести | 🔵 не почато · P2 — ⛔ заблоковано продуктом: 12 e2e-спеків і об'єднання `Orgs` потребують рішення |
| [T113-collapsed-children-should-be-a-matrix](./tasks/T113-collapsed-children-should-be-a-matrix.md) | згорнуті діти лягають стрічкою, а не матрицею | 🔵 не почато · **P1** — специфікацію виправлено 2026-09-06, лишився код |
| [T114-flat-orgs-null-on-first-paint](./tasks/T114-flat-orgs-null-on-first-paint.md) | чотири помилки сторінки на старті вкладки `Flat orgs` | 🔵 не почато · P3 — знайдено прогоном T113, окрема причина |
| [NODE-interactions-contract](./tasks/NODE-interactions-contract.md) | NODE interactions contract (mandatory) | active · Enforced by: `nodeInteractions.contract.test.ts`, `e2e/node-interactions.spec.ts` |
| [PARITY-gojs-to-dg](./tasks/PARITY-gojs-to-dg.md) | Parity `gojs-diagram` → `dg`: вимога → можливість | 🟢 живий довідник, не задача — тримається синхронним із кодом, не закривається. |

⚠️ Два файли лишаються тут попри закритий статус. `T80` — розвилку закрито 2026-09-06 («C-подібного
контуру немає — є магнітний у департаментах»), але **робота, яку це рішення відкриває**, ще не
заведена: прибирання `cell-flood` зачіпає 23 TS-файли й `contour.rs`, тож задача тримається тут як
вхід у цю роботу, а не як архів. `T79` — закритий, але `work/SPEC.md` і `docs/REQUIREMENTS.md`
цитують його як пояснення геометрії G1/G2/M2; закрита задача, на яку спирається жива специфікація,
лишається поруч із нею.

## Технічний борг

- [CRITIQUE-dg_9352d52.md](./tech-debt/CRITIQUE-dg_9352d52.md) — повторний огляд після T77 → [T78](./archive/tasks-2026-09-02.md)
- [CRITIQUE-dg_907f.md](./tech-debt/CRITIQUE-dg_907f.md) — зведення 4 оглядів → [T77](./archive/tasks-2026-09-02.md) ✅
- [REVIEW-dg-805efee-architecture.md](./tech-debt/REVIEW-dg-805efee-architecture.md) — ✅ D1–D7 closed
- [D5-orphan-position-layout.md](./tech-debt/D5-orphan-position-layout.md) — ✅ documented (not a bug)
- [TD01-git-remote-and-ci.md](./tech-debt/TD01-git-remote-and-ci.md) — ✅ closed (`b2vv/dg`)
- [TD02-legacy-web-rspack.md](./tech-debt/TD02-legacy-web-rspack.md) — ✅
- [TD03-contour-config-drift.md](./tech-debt/TD03-contour-config-drift.md) — ✅ closed (T07)
- [TD04-sdk-skeleton-no-render.md](./tech-debt/TD04-sdk-skeleton-no-render.md) — ✅ closed (T01)
- [TD05-wasm-pkg-in-repo.md](./tech-debt/TD05-wasm-pkg-in-repo.md)
- [TD06-vitest-not-configured.md](./tech-debt/TD06-vitest-not-configured.md) — ✅
- [TD07-pixi-react-promote-overlay.md](./tech-debt/TD07-pixi-react-promote-overlay.md) — ✅ first slice (T26)

## CI

```bash
npm run test:rust
npm run build:wasm
npm run typecheck
npm test
npm run test:e2e   # Playwright (needs build:demo via webServer)
```

GitHub Actions: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

## Джерела правди

| Документ | Призначення |
|----------|-------------|
| `work/CTO-RESEARCH.md` | CTO-брифінг перед імплементацією |
| `docs/REQUIREMENTS.md` | Бізнес-вимоги, UI, magnetism rules |
| `docs/TECH_STACK.md` | Архітектура та стек |
| `work/SPEC.md` | Алгоритми, API, стан імплементації |
| `work/TDD.md` | TDD: тести перед кодом, success + failure |
| `packages/core/src/contour.rs` | Референс contour algorithm (WASM; canvas paint = TS rings) |
