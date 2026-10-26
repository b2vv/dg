# WIP — dg-side стан для хост-інтеграції (відповідь на 4 питання Cass 1)

**Дата:** 2026-10-21 · **Хто:** Cass 2 (dg SDK) для Cass 1 (хост-інтегратор).
**Метод:** 3 паралельні Explore по коду (routing / cards / departments) + читання планів. Grounded, file:line.
**Контекст:** власник (за переказом Cass 1) схвалив повну заміну GoJS на dg: спершу ШПС/positions
1:1, потім орг. Нова SDK-робота НЕ бралась — лише інвентаризація наявного.

---

## Q1 — стан ШПС/positions 1:1 з мокапом: здебільшого ГОТОВО
- Міграційний план **T71: cutover queue complete (2026-08-23)** — ~35 покрито, **0 міграційних ризиків**.
  Залишок: T61 (рекурсія груп, макет), T67 Phase 2 (marquee, optional).
- Card chrome **T70 Phase 0–2 ✅**.
- Візуальні baseline'и: `e2e/mockups.spec.ts` — `Staff · Figma / Magnetic / GoJS`, maxDiffPixelRatio 0.04;
  тести `dept blobs paint`, `edge inventory matches fixture`.
- Деталі паритету: `work/reports/host-integration/positions-diagram-parity.md` (positions-канва ближча
  до SDK, ніж орг; `DiagramPosition` проєктувалась із цим хостом в умі).

## Q2 — маршрутизація ліній за новою спекою: ОРТО є, решта переважно НОВА SDK-робота
Власний TS-роутер `layout/staffEdgeGeometry.ts` (`classifyStaffEdgeRoute :293`, `staffEdgePolyline :390`),
фарбує `render/StaffEdgesView.ts:82`; Rust-ядро лінії НЕ маршрутизує. Spine-bus: `layout/spineBusEdges.ts`.

| Ціль власника | Стан | Якорі |
|---|---|---|
| орто | **Є** | `staffEdgeGeometry.ts:116,168` (лише H/V) |
| 0 перетинів | **частково/немає** | жадібне card-intrusion `:316`; edge-edge не рахується; `forced` без перевірки `:380` |
| 8px кліренс | **немає** | хардкод pad 16 `:90,104`, bus gap 14 `spineBusEdges.ts:30` |
| коридори/доріжки | **частково** | around-lanes `:89,103` + spine-bus; без зарезервованих каналів |
| міждепарт. вихід через межі рамок | **немає** | cross-tier `canvasLayout.ts:204-221` з'єднує геометрично, портів рамки нема |
| штрих до керівної орг | **немає** | cross-tier суцільний (`StaffEdgesView.ts:19,26`) |
| path-highlight #e5491d + 40% dim | **немає взагалі** | `#e5491d` відсутній у репо; лінії не реагують на виділення; глобального dim нема |

Публічний контракт країв: `EdgeStyle` (`render/types.ts:172-183`) — color/width/cornerRadius/terminator,
однаково на всі види; штрих і highlight хост НЕ контролює. Selection-highlight вузла — лише синій
контур `DiagramRenderer.drawSelection :563-575`, країв не чіпає.
**→ Гарантований zero-crossing роутер + кліренс + канали + dept-порти + path-highlight = суттєва нова фіча.**

## Q3 — картка v3 + head-org: більшість полів Є; ТВО-бейдж, head-стиль і per-node — НОВЕ
Pixi-рендер, один глобальний `NodeTheme`; **per-node override НЕМАЄ**.
- seat-картка (`render/PersonNode.ts`, `personCardContent.ts`): avatar ✅ · name ✅ · who(name+title) ~
  · **ТВО-бейдж ✗** (`PositionStatus 'acting'` визначений, але не рендериться; є лише isTemporary T-pill/⏳,
  pending ⏳) · date/period ✅ · count ✅ (gojs-row) · expander ✅.
- org-картка (`OrganizationNode.ts`): avatar ✅ · name ✅ · who(group/unit meta) ~ · ТВО ✗ · date ✅ · count ✅ · expander ✅.
- Теми: хост дає `theme` + `styles: NodeThemeOverrides` + `render` (`OrgHierarchyDiagram.ts:111-177`);
  overridable глобально-per-theme (кольори/розміри/лейаут-селектори). **НЕ** overridable: per-node/per-entity
  стиль (один `theme.person`/`theme.organization` на всі), font-family, частина хардкод-hex/гліфів.
- **head-org окремий стиль ✗** — `isHead` (`data/types.ts:104`) керує лише layout/камерою, рендер картки його не читає.
**→ ТВО-бейдж + head-org стиль + conditional/per-node стиль = нова render-плюмбінг, не лише поля теми.**

## Q4 — департаменти як контури: здебільшого Є
- `DiagramData.departments` first-class; `DiagramDepartment {id,name,organizationId,layoutCells?,contour?}`
  (`data/types.ts:75-83`); членство — `DiagramPosition.departmentId :98`.
- Режими `departmentStyle: 'blob'|'card'` (`render/types.ts:213`): **blob** (дефолт) — контур зі штрихом НАД
  картками (`render/contour/*`, `DepartmentBlob.ts`); **card** — рамка з опційним штрихом (`DepartmentCardView.ts`,
  `DepartmentCardStyle.dashed`). Лише staff/matrix; орг-дерево департаменти не малює.
- Контракт: `departments[]` + `position.departmentId`; для blob кожна позиція має нести `gridCell` (`data/types.ts:119`).
- **Гапи під tier V3:** per-department колір/стиль ✗ (один спільний стиль), вкладеність департаментів ✗
  (`parentId` нема), контури лише у штатній сцені, blob вимагає авторських `gridCell`; `layoutCells`/`contour` — мертві поля.

---

## Зведення обсягу нової SDK-роботи (для scope-рішення власника)
| | Наявне | Нове в SDK | Розмір |
|---|---|---|---|
| Q1 ШПС 1:1 | cutover-complete | дрібне (optional) | ~0 |
| Q2 routing | орто | zero-cross роутер, кліренс, канали, dept-порти, dash-to-head, path-highlight+dim | **великий** |
| Q3 картка v3 | avatar/name/date/count/expander | ТВО-бейдж, head-org стиль, per-node плюмбінг | середній |
| Q4 департаменти | blob/card контури | per-dept стиль, nesting, org-scene, gridCell-автогенерація | малий-середній |

**Рішення «будувати в dg / робити на хості / відкласти» — за власником**, не з переказу. Чекаємо host↔SDK
контракт-чернетку від Cass 1, щоб пінувати точний API до будь-якого коду.

---

## Контракт host↔SDK звірено (2026-10-21)
Джерело: `cassiopeia-admin-ui:work/queue/2026-10-12-sprint-13/4311-host-sdk-contract.md`. Пін по §7:
1. Department → **card-режим** (blob вимагає gridCell на кожній позиції). Per-dept стиль/nesting — нове, лише за потреби мокапу.
2. Поля: ✅ `isHead?`, `status:'acting'`, вакансія=derive з `personId`, `departmentId?`. 🟡 нові: `DiagramOrganization.role?:'leading'|'current'`, `DiagramPosition.external?`. 🪤 звірити «подвійна» vs layout-inferred `detached`.
3. reportLines.kind ✅ `admin|matrix|dotted`; cross-tier внутрішній; 🟡 новий `'lead-org'` для штрих-лінії.
4. Edge-highlight 🟡 → примітив `highlightPath(ids)` + авто-надбудова; dim edges 40% / found 38%.
5. Theme-flip ✅ рантайм `setTheme()` (full re-render, без remount) — `OrgHierarchyDiagram.ts:1141`.
6. Routing 🟡 вхід reportLines, без host-підказок; гарантії — окрема spec+GATE.

**Дані-контракт (1-3,5) розблоковує мапер Cass 1 вже. Білд-важке (Q2 routing, Q3 per-node/ТВО/head, edge-highlight) — scope власнику.**
