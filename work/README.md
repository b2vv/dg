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
кодом. Завершене переїхало вказівниками у **три** свіпи —
[`archive/tasks-2026-09-02.md`](./archive/tasks-2026-09-02.md) (97 задач),
[`archive/tasks-2026-09-06.md`](./archive/tasks-2026-09-06.md) (T90, T92, T98, T107, T108) і
[`archive/tasks-2026-09-11.md`](./archive/tasks-2026-09-11.md) (T80, T101–T105, T109–T111,
T113, T114, T118, T122, T123); повний текст кожної — в історії git. Критерій переїзду не
«закрито», а **«закрито і на це ніхто не спирається»**: тому `T79`, `T71`, `T56` і `T26`
лишаються тут попри закритий чи частковий статус, а `T116`, `T117`, `T120` — бо в кожної
лишилась половина, що чекає рішення.

| Задача | Про що | Статус |
|---|---|---|
| [T26-promote-overlay](./tasks/T26-promote-overlay.md) | Pixi + React promote overlay (TD07) | done (first slice) |
| [T56-gojs-feature-inventory](./tasks/T56-gojs-feature-inventory.md) | GoJS reverse-engineering: інвентаризація функціоналу | draft — ⛔ для product selection (позначайте `[x]` що беремо; чек-бокси ставить продукт, не агент) |
| [T61-group-recursion-tier3](./tasks/T61-group-recursion-tier3.md) | Рекурсія груп організацій у ярусі 3 (B8c) | planned · ⛔ заблоковано продуктом — перший пункт acceptance («макет затверджено») |
| [T67-multi-select](./tasks/T67-multi-select.md) | Мультивибір вузлів (D2) | Phase 1 done · bulk-меню + host bulk bar (2026-08-25) |
| [T70-position-card-chrome](./tasks/T70-position-card-chrome.md) | Chrome карток + геометрія знака організації (E* / 4231) | Phase 0 + Phase 1 + Phase 2 done (agreed in T73) |
| [T71-gojs-to-dg-migration-plan](./tasks/T71-gojs-to-dg-migration-plan.md) | План міграції GoJS → Org Hierarchy SDK (`dg`) | ✅ cutover queue complete (2026-08-23) — залишок: T61 (макет), T67 Phase 2 (marquee, optional) |
| [T79-g2-m2-paint-notch](./tasks/T79-g2-m2-paint-notch.md) | G2 / M2 на paint-шляху (foreign ніколи не під заливкою) | ✅ done (2026-08-25) — **лишається тут**: SPEC і REQUIREMENTS цитують його як пояснення геометрії |
| [T106-deepen-facades-drop-shallow-wrappers](./tasks/T106-deepen-facades-drop-shallow-wrappers.md) | великі фасади поруч із порожніми обгортками | не почато. Серйозність: Medium. |
| [T112-demo-tab-consolidation](./tasks/T112-demo-tab-consolidation.md) | звести демо з 14 вкладок до шести | 🔵 не почато · P2 — ⛔ заблоковано продуктом: 12 e2e-спеків і об'єднання `Orgs` потребують рішення |
| [T115-test-seam-parity-with-host](./tasks/T115-test-seam-parity-with-host.md) | тест-шов нарівні з хостом: чим хост міряє діаграму | 🟢 кроки 1–3 зроблено, крок 2 закритий релізом `0.5.0`; **крок 4** (гейт середовища) — рішення людини |
| [T116-org-level-reparent-missing](./tasks/T116-org-level-reparent-missing.md) | переприв'язка на рівні організацій | 🟡 spec + plan написані, коду немає — **сім продуктових розвилок** чекають людини |
| [T117-position-reparent-root-guard-and-cross-org-actions](./tasks/T117-position-reparent-root-guard-and-cross-org-actions.md) | гвардія кореня й крос-орг дії при переприв'язці | 🟡 Гап 1 закрито 2026-09-07; **Гап 2** — питання, чи це взагалі відповідальність SDK |
| [T119-split-the-facade-into-sub-apis](./tasks/T119-split-the-facade-into-sub-apis.md) | рознести фасад на рольові інтерфейси | 🟡 крок 0 (віднімання) зроблено — останнім `computeOrgRowTreeLayoutInWorker` (`0.5.1`); рознесення ламає публічний API й не почато |
| [T120-raise-the-row-tree-depth-ceiling](./tasks/T120-raise-the-row-tree-depth-ceiling.md) | підняти `MAX_ROW_TREE_DEPTH` | 🟡 гілка А закрита 2026-09-11 (переміряно в браузері; гвардія лишається 2 500); **гілка Б** — рішення людини |
| [T121-staff-focus-outruns-the-frame](./tasks/T121-staff-focus-outruns-the-frame.md) | `focusStaffOrg` міняє два стани й малює | 🔵 не почато · **потребує рішення**: `setStaffFocus` — намір чи стан |
| [T124-staff-scene-does-not-validate-org-hierarchy](./tasks/T124-staff-scene-does-not-validate-org-hierarchy.md) | штатна сцена не валідує org-ієрархію взагалі | 🔵 не почато · чотири варіанти, **два ламальні** |
| [NODE-interactions-contract](./tasks/NODE-interactions-contract.md) | NODE interactions contract (mandatory) | active · Enforced by: `nodeInteractions.contract.test.ts`, `e2e/node-interactions.spec.ts` |
| [PARITY-gojs-to-dg](./tasks/PARITY-gojs-to-dg.md) | Parity `gojs-diagram` → `dg`: вимога → можливість | 🟢 живий довідник, не задача — тримається синхронним із кодом, не закривається. |

⚠️ `T79` лишається тут попри закритий статус: `work/SPEC.md` і `docs/REQUIREMENTS.md` цитують
його як пояснення геометрії G1/G2/M2, а закрита задача, на яку спирається жива специфікація,
лишається поруч із нею. Це та сама помилка, з якої правило й виросло — одного разу `T79`
заархівували, і посилання повело з живої спеки в архівний рядок.

⚠️ `T80` більше тут **немає**: розвилку закрито 2026-09-06, роботу зроблено 2026-09-08 (реліз
`0.4.0`), і задача переїхала третім свіпом. Абзац, що стояв тут і пояснював, чому вона
лишається, описував стан, якого немає вже три дні.

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
