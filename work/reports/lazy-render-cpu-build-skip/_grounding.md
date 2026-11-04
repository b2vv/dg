# Grounding — demo-механізми вікнування (для перенесення в SDK)

Джерело: Explore-агент (read-only, не міг писати сам), 2026-11-04. Усі факти path:line.

## 1. STAFF-вікнування (tab staff-1m, T88)
- **Ядро (generic):** `packages/demo/src/app/viewportWindow.ts`
  - `resolveWindowRange(req, geom):69` — camera→{start,end,size,span,capped}; reserve в ЕКРАНАХ
    (`reserve = worldHeight * reserveScreens` :71-73); `firstRow/endRow` :78-79; `span=min(asked,maxSeats)`,
    `capped` :82-84; clamp до країв tier, `maxStart=max(firstIndex,lastSeat-span)` :93-104.
  - `WindowRequest` :21-44 (screen, viewport, reserveScreens, wallBase, maxSeats); `WindowRange` :46-61.
  - `rebaseViewport(viewport,{rowShift,pitchY}):115-124` — камера-компенсація (рядки window-relative).
  - `RebuildScheduler:150-238` — один rebuild за раз: debounce `quietMs` :171, `run()` :194, мьютекс `tail:Promise` :163,:228.
- **Константи** `App.ts`: `STAFF_RESERVE_SCREENS=1`:75, `STAFF_REBUILD_QUIET_MS=120`:78, `STAFF_WINDOW_MAX_SEATS=4000`:87.
- **Оркестрація** `App.ts`: `onViewportChange(settled)`:538-557 → `staffWindowAsk`:1088-1099 → scheduler.request(slide).
  `slideStaffWindow`:1153-1179 (rowShift+rebase), `jumpStaffWindow`:1190-1231 (focus center + focusNode),
  `materializeStaffWindow`:1113-1137 (set window ДО await, rollback :1124, RebuildRecord).
- **Дані window (віртуальний простір, без 1M об'єктів):** `scaleStaff.ts` — `buildScaleStaffWindow:485-560`,
  `STAFF_SCALE_TOTAL=1_000_000`, pinned-ancestors `currentTier:368-426`/`staffAncestorsOutside:217-245`
  (edge-completeness: обидва кінці ребра в сцені), `snapWallBase:334`, `cellOfSeat:343`.
- **Skeletons:** НЕ реалізовані — лише статус «catching up» (App.ts:551-555).
- **Виміри-брідж:** `RebuildRecord{ms,buildMs,mappedMs}` App.ts:133-155; `buildMs` scaleStaff.ts:498/527/537;
  `mappedMs` ← `onDataMapped` SDK OrgHierarchyDiagram.ts:1315-1320; брідж `getStaffRebuilds` e2eBridge.ts:46.

## 2. ORG-вікнування (tab scale-100k)
- `packages/demo/src/scenarios/scaleOrgs.ts`: `SCALE_ORG_TOTAL=100_000`:5, `SCALE_ORG_WINDOW=400`:7,
  `resolveScaleWindowStart(focus,w,total):35-46` (центровка, = брідж `getScaleWindowStart`),
  `buildScaleParentIndex:25-33` (Int32Array батьків, BRANCH=9), `buildScaleOrgsWindow:53-119`
  (слайс, parentOrgId підняти до предка в вікні, `matrixOrder=i-start`, опц. revealOrgPath).
- Оркестрація App.ts: `ensureScaleWindow:1392-1403`; рецентр на КЛІК `handleOrgNodeClick:1442-1459` та
  ПОШУК `runSearch:1486-1499` — через **повний `reload()`** (dispose+create :423-430). НЕ камера-driven.
- Брідж `getScaleWindowStart` e2eBridge.ts:18. (`open100kOrgs` — лише в e2e/demoBridge, не в app.)

## 3. Контракт із SDK
- Demo: `diagram.setData(next.data)` (staff App.ts:1122) та `create` через `reload()`.
- Патерн «setData на рух камери» — коментар SDK OrgHierarchyDiagram.ts:725-737 (`ingestIsCurrent`,
  epoch-guard; overtaken виклик тихо зупиняється).
- `setData:1290-1330` — epoch++ :1296; await mapConfig :1302 + searchService.buildForScale :1304
  (кожен із `ingestIsCurrent`); commit :1307-1312; `onDataMapped` :1315-1320; `render()` :1329.
  Коментар :1288 «Rebuilds search index and re-renders. Clears selection».
- `onViewportChange` settle SDK:559-576 (rAF coalesce + debounce `viewportSettleMs=150`). `searchBeyondWindow`
  host-колбек callbacks.ts:187 (host тримає 1M, diagram — вікно).
- 🔴 **`spliceData` НЕ ІСНУЄ** (grep порожній). Часткова матеріалізація відсутня — лише цілісний setData.
  `onLayoutChange`(T104) :128 — про локальні edit-after-draw, НЕ про вікно.

## 4. Seam'и staff vs org — ДВА різні вікнувальники
- STAFF: viewportWindow.ts + RebuildScheduler + buildScaleStaffWindow; in-place setData+rebase/focus;
  тригер = камера settled; має reserveScreens/maxSeats/rowShift/pinned/focus-carry.
- ORG: scaleOrgs.ts (проста центровка) + ensureScaleWindow; **повний reload()**; тригер = клік/пошук;
  фіксований розмір 400; без reserve/scheduler.
- Спільне: обидва — чиста index-арифметика TS, живлять ті самі setData/create, репортять startIndex.

## 5. Межа WASM↔TS
- Вибір вікна/розмір — **суто TS**. `packages/core` не має понять viewport/reserve/maxSeats. Rust лише
  розкладає вже обраний слайс. Отже перенесення вікнування НЕ рухає межу WASM↔TS (для вибору вікна).

## 6. Демо-специфічне vs механізм для перенесення
- **Суто демо (НЕ переносити):** синтетична генерація даних (scaleStaff/scaleOrgs fake-ростер), UI
  (таби, fit-to-whole, zoom FAB, статус, search-panel, export), e2e-брідж.
- **Кандидати в SDK:** `viewportWindow.ts` цілком (resolveWindowRange+rebaseViewport+RebuildScheduler);
  арифметика start/snap/cell; pinned-ancestors edge-completeness; оркестрація slide/jump/materialize
  (App.ts:1113-1231) — зараз host-код поверх SDK.

## РИЗИКИ/ПРОГАЛИНИ для spec
- SDK не має partial materialization (`spliceData`) → кожен slide = повний setData (rebuild index +
  re-render). Перенесення вимагає spliceData АБО прийняти вартість повного setData.
- Skeletons відсутні.
- Два вікнувальники → при уніфікації обрати модель (staff багатший/повніший).
