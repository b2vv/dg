# impl-бриф: ШПС-роутер v2 (кандидат A, конструктив) — для codex

Рушій обрано: **A (конструктив)**, plan-GATE PASS. Контекст: `plan.md` §Задачі, `spec.md`,
`probe-results.md`, вимоги host `…/4311-shps-line-routing-requirements.md`. Прототип-референс:
`packages/sdk/src/layout/staff/_shps-routing-probe/probeA.constructive.ts` (layered-layout працює;
слабке місце — наївний `routeOrtho` без обходу перешкод — його ТРЕБА замінити obstacle-avoidance).

## Мета
Production-роутер ліній підпорядкування ШПС у dg SDK, за прапором `staffEdgeRouter:'legacy'|'v2'`
(default `legacy`). v2: деревні ребра 0-перетинів by construction + міждепарт. з обходом карток/
рамок (8px, не крізь третю рамку) + коридор-доріжки + **acceptance §10.1.4 = 0 перетинів**.

## Файли (нові, production — НЕ в _shps-routing-probe/)
Запропонуй розміщення в `packages/sdk/src/layout/staff/routing/` (новий підмодуль):
- `staffRouterV2.ts` — ядро: вхід (staff layout nodes+frames+reportLines) → орто-полілінії.
- `obstacleRouter.ts` — обхід перешкод на `polylineHitsBoxInterior`/`segmentHitsBoxInterior`
  (`../../staffEdgeGeometry.ts`): дай орто-шлях parent→child, що обходить чужі картки (8px-інфляція)
  і чужі рамки департаментів (не входить у третю рамку, §3.2).
- `corridorAllocator.ts` — доріжки 8px у спільному коридорі (патерн `../../spineBusEdges.ts`
  `DEFAULT_BUS_GAP`); порядок доріжок детермінований за цільовим x (req §5.4).
- `validateRouteInput.ts` — цикл `parentId` (A→B→A), **dangling parentId** (на неіснуючу посаду),
  **self-parent** (id===parentId) → structured-error (не hang, не маршрут); невідомий `deptId` →
  поза-dept + діагностика; прихований/згорнутий dept → ребро сховано.
- тести `*.test.ts` поруч (rstest).

## Контракт і реюз
- Вхід бери з наявного staff-layout: `canvasLayout.ts layoutStaffCanvas()` /
  `orgBlockLayout.ts` дають `positionNodes: StaffNodeBox[]` (AABB), `edges`, зони. Департамент —
  через `position.departmentId`; `department.parentPositionId`+`order` (вже в типах, `data/types.ts`).
- Геометрія: ПЕРЕВИКОРИСТАЙ `staffEdgeGeometry.ts` (`StaffEdgeBox`, `polylineHitsBoxInterior:221`,
  `segmentHitsBoxInterior:199`, `classifyStaffEdgeRoute`). НЕ дублюй детектор.
- Детермінізм: сортуй усе за `(parentId, order, id)`; два прогони → ідентичні полілінії.

## Шов монтування (ЄДИНИЙ)
- `render/DiagramRenderer.ts` `paintStaffFrameAndEdges` (~:769): за `config.staffEdgeRouter==='v2'`
  → новий роутер; інакше поточний `buildStaffEdgeSegments`→`staffEdgePolyline` (legacy, default).
- Вихід годуй у `StaffEdgesView.fromLayout` (`render/StaffEdgesView.ts:72`, `redraw:82`) — НЕ міняй
  його фарбування; колір уже з `EdgeStyle.color` (`render/types.ts:174`) над нейтр. базою.
- Прапор додай у рендер-config поруч із наявними (знайди тип config DiagramRenderer).
- Будь-який збій v2 (validation-error / перевищення K) → fallback на legacy для ЦЬОГО прогону
  (ніколи не зависання) — kill-switch (spec B5).

## Acceptance (🔴 умови GATE)
- **§10.1.4 = 0 перетинів** (NB2: B довів досяжність; маркувати залишок НЕ дозволено для цих схем).
- Деревні (in-dept) ребра 0-перетинів by construction (як probe A).
- 8px до будь-якої чужої картки; не крізь третю рамку; коридор-доріжки без перехрещення.
- §12-маркер (`marked`) — ЛИШЕ для фікстури реально-інфізибельного входу (додай таку окремо; на
  §10.1 схемах маркер НЕ має з'являтись).
- Детермінізм; перф ≤50мс/500 (req §8.4).
- epoch-guard: `setData`/ресайз під час маршрутизації скасовує прогін (патерн `ingestIsCurrent`).

## Форма перевірки (TDD, RED-first — КОЖЕН шов)
- crossing-detector уже є й перевірений (`_shps-routing-probe/crossingDetector.ts`) — можеш
  імпортувати для тестів АБО продуктовий детектор, але тест МУСИТЬ мати контрольну пробу (вхід, що
  завідомо дав би перетин/<8px/крізь-рамку — RED першим).
- Фікстури: схеми §10.1 (s1 один департамент; s2 три під одним; s4 §10.1.4; s5 крізь рівень) +
  **0 посад / 1 посада** (N6) + **реально-інфізибельний вхід** для §12.
- Компонентні: асерти §10.4 (0 перетинів, ≥8px, не під карткою/заголовком), детермінізм (2 прогони).
- Rollback: `staffEdgeRouter:'legacy'` → поточна поведінка без змін.

## Гейти перед «готово»
`npm run test -w @org-hierarchy/sdk` (повний, 0 fail) · `npm run typecheck` (0) · `npm run lint`
(0, oxlint max-warnings 0 — уникай unicorn prefer-single-call / no-array-callback-reference) ·
`npm run check:docs` (0, briefing lag ≤25). rstest, НЕ vitest.

## Межі
- НЕ чіпай legacy-роутер (лишається дефолтом). НЕ видаляй probe-скаффолд (owner зніме після рев'ю).
- НЕ коміть — рев'ю і коміт лишаю owner-у (Cass 2).
- Орг-діаграма (GoJS) поза межами. Pixel-картки — host overlay (роутер працює з AABB).
