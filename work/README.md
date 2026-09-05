# Work — робоча документація Org Hierarchy SDK

Ця папка доповнює `docs/REQUIREMENTS.md` і `docs/TECH_STACK.md`: фіксує **поточний стан**, **алгоритми**, **технічний борг** і **детальні задачі** для імплементації.

## Структура

```
work/
  README.md              ← цей файл (навігація)
  CTO-RESEARCH.md        ← брифінг перед імплементацією (продукт, код, інфра, ризики)
  SPEC.md                ← специфікація + алгоритми + §13 стандарти TS
  TDD.md                 ← політика: тести ПЕРЕД кодом (success + failure)
  CODING_STANDARDS.md    ← Clean Code / Architecture / SOLID / DRY / KISS / GoF (TS)
  tech-debt/             ← зафіксований технічний борг
  tasks/                 ← детальні задачі для розробки
```

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
кодом. Завершене переїхало у [`archive/tasks-2026-09-02.md`](./archive/tasks-2026-09-02.md)
вказівниками — 97 задач, повний текст кожної в історії git.

| Задача | Про що | Статус |
|---|---|---|
| [T26-promote-overlay](./tasks/T26-promote-overlay.md) | Pixi + React promote overlay (TD07) | done (first slice) |
| [T56-gojs-feature-inventory](./tasks/T56-gojs-feature-inventory.md) | GoJS reverse-engineering: інвентаризація функціоналу | draft — ⛔ для product selection (позначайте `[x]` що беремо; чек-бокси ставить продукт, не агент) |
| [T61-group-recursion-tier3](./tasks/T61-group-recursion-tier3.md) | Рекурсія груп організацій у ярусі 3 (B8c) | planned · ⛔ заблоковано продуктом — перший пункт acceptance («макет затверджено») |
| [T67-multi-select](./tasks/T67-multi-select.md) | Мультивибір вузлів (D2) | Phase 1 done · bulk-меню + host bulk bar (2026-08-25) |
| [T70-position-card-chrome](./tasks/T70-position-card-chrome.md) | Chrome карток + геометрія знака організації (E* / 4231) | Phase 0 + Phase 1 + Phase 2 done (agreed in T73) |
| [T71-gojs-to-dg-migration-plan](./tasks/T71-gojs-to-dg-migration-plan.md) | План міграції GoJS → Org Hierarchy SDK (`dg`) | ✅ cutover queue complete (2026-08-23) — залишок: T61 (макет), T67 Phase 2 (marquee, optional) |
| [T79-g2-m2-paint-notch](./tasks/T79-g2-m2-paint-notch.md) | G2 / M2 на paint-шляху (foreign ніколи не під заливкою) | ✅ done (2026-08-25) — **лишається тут**: SPEC і REQUIREMENTS цитують його як пояснення геометрії |
| [T80-contour-engines-ba-demo](./tasks/T80-contour-engines-ba-demo.md) | Два рушії контурів для порівняння BA | ✅ demo ready (2026-08-25) |
| [T90-drag-smoothness](./tasks/T90-drag-smoothness.md) | Перетягування «не плавне»: гіпотеза виміряна й **спростована** | ✅ закрито виміром (2026-08-29) — роботи не лишилось; тримається як запис, щоб ніхто не почав спочатку |
| [T92-software-render-pan-cost](./tasks/T92-software-render-pan-cost.md) | Панорамування на програмному рендері: ≈9 fps, і це не про промоут | ✅ закрито (2026-09-04) — **не числом**: критерій «число з цільового заліза» знято, бо існував заради порогу, якого в дизайні немає (T98) |
| [T98-auto-renderer-does-not-fall-back](./tasks/T98-auto-renderer-does-not-fall-back.md) | `renderer: 'auto'` не переходить на Canvas2D там, де WebGL програмний | ✅ зроблено (2026-09-04, PR #78) — впізнавання за іменем рушія; ⚠️ критерій «0 кадрів > 33 мс» не зелений, див. звіт |
| [T101-e2e-flakes-only-local](./tasks/T101-e2e-flakes-only-local.md) | Флаки, які CI не може побачити | 🔵 не почато · ⚠️ **гіпотезу «винна паралельність» спростовано 2026-09-04** — падає й на `--workers=1`; перший пункт робіт міряє не ту вісь |
| [T102-row-tree-depth-block-b](./tasks/T102-row-tree-depth-block-b.md) | row-tree: підняти підтриману глибину (блок Б) | не почато. Спека готова, приймальна таблиця написана. |
| [T103-setdata-request-epoch](./tasks/T103-setdata-request-epoch.md) | `setData` не «виграє останній запит» | ✅ зроблено (2026-09-05) — виграє останній, дані й індекс комітяться **разом** |
| [T104-mutations-are-not-one-transaction](./tasks/T104-mutations-are-not-one-transaction.md) | мутація, рендер і колбек хоста — не одна транзакція | ✅ зроблено (2026-09-05) — усі **шість** місць повідомляють після кадру; коренева причина була в `renderCoalesce`, не в мутаторах |
| [T105-root-barrel-exposes-test-hooks](./tasks/T105-root-barrel-exposes-test-hooks.md) | кореневий барель віддає внутрішнє й тест-хуки | не почато. |
| [T106-deepen-facades-drop-shallow-wrappers](./tasks/T106-deepen-facades-drop-shallow-wrappers.md) | великі фасади поруч із порожніми обгортками | не почато. Серйозність: Medium. |
| [T107-magnetic-contour-cost](./tasks/T107-magnetic-contour-cost.md) | Магнітний контур: 66% кадру йшло на копіювання масивів | ✅ виконано (2026-09-03) — 14,0 → 5,1 мс у TS; WASM-порт відхилено виміром |
| [T108-search-answer-lost-on-canvas](./tasks/T108-search-answer-lost-on-canvas.md) | Відповідь пошуку губиться на Canvas2D: фікс T99 не тримається на іншому рушії | 🔵 не почато — знайдено як наслідок T98 |
| [T109-toggle-staff-org-has-no-transaction](./tasks/T109-toggle-staff-org-has-no-transaction.md) | `toggleStaffOrg` міняє стан і малює, без відкоту | 🔵 не почато · P3 — знайдено як наслідок T104; контракту не порушує, бо колбека не шле |
| [NODE-interactions-contract](./tasks/NODE-interactions-contract.md) | NODE interactions contract (mandatory) | active · Enforced by: `nodeInteractions.contract.test.ts`, `e2e/node-interactions.spec.ts` |
| [PARITY-gojs-to-dg](./tasks/PARITY-gojs-to-dg.md) | Parity `gojs-diagram` → `dg`: вимога → можливість | 🟢 живий довідник, не задача — тримається синхронним із кодом, не закривається. |

⚠️ Два файли лишаються тут попри `✅`. `T80` — за `AGENDA.md` це **відкрите продуктове рішення**
(який рушій контурів лишаємо), а не закрита задача. `T79` — закритий, але `work/SPEC.md` і
`docs/REQUIREMENTS.md` цитують його як пояснення геометрії G1/G2/M2; закрита задача, на яку
спирається жива специфікація, лишається поруч із нею.

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
