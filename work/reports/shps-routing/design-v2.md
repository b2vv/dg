> 🛑 **ЦЕЙ ДИЗАЙН НАД-SCOPE-НУТИЙ — НЕ БУДУВАТИ layout заново.** (2026-10-21, після перевірки демо
> https://b2vv.github.io/dg/). Department-aware розкладка **ВЖЕ Є** в dg: вкладки **Staff · Figma**
> (dashed-зони департаментів з картками всередині), **Staff · Magnetic** (magnetic dept-контури),
> **Staff · Brigade** (департаменти-юніти). Я помилково висновував «layout ігнорує департаменти» з
> вузького grep лише по `orgBlockLayout`/`canvasLayout`/`rowTreeLayout` (варіант «Staff tree»), а
> dept-групування живе в magnetic/matrix/zones-шляху (`matrixLayout.ts`, `matrixGrid.ts`,
> `staffZoneBounds.ts`, demo `mockupStaff.ts`/`mockupLayouts.ts`, `paintMagneticGroups`/
> `DepartmentBlob`). Власник: приклади НЕДОРОБЛЕНІ, частину можна забрати/прибрати. **Правильний
> напрям: route-only над наявною figma/magnetic dept-розкладкою** (ціль spec = якість ЛІНІЙ на
> складних багато-деп. схемах), а НЕ переписування layout. Розділи нижче (§2 «розкладка dept-band»)
> — лишаються як довідка, але реалізовувати як окремий layout НЕ треба. Переробити на route-only.

# Детальний дизайн ШПС-роутера v2 (layout+routing, кандидат A)

**Контекст:** plan-GATE PASS (рушій A). Дослідження наявної розкладки показало: `layoutStaffOrgBlock`
НЕ приймає й НЕ використовує `departments`/`parentPositionId` — placement лише за report-деревом,
департаменти лише для контурів. Отже v2 мусить **володіти розкладкою** (dept-band модель req §6), а
не лише маршрутизувати над фіксованими картками. Це збігається зі spec «layout+routing разом»; шов у
plan/brief/spec був занижений до edge-paint — цей документ його виправляє.

## 1. Виправлення шва (seam) — було/стало
- **Було (plan §Рішення крок 6, spec «Шов монтування»):** роутер за прапором ТІЛЬКИ в
  `paintStaffFrameAndEdges` (`DiagramRenderer.ts:769`) над уже розкладеними картками. ❌ не дає
  контролю розкладки → «0 by construction» недосяжне.
- **Стало:** прапор `staffEdgeRouter:'v2'` перемикає **tier-2 staff-розкладку** в `canvasLayout.ts`
  (`layoutStaffOrgBlock` виклик `:102`) на новий `staffDeptBandLayout`, що дає node-позиції у
  dept-band моделі + межі департаментів + ребра. Далі ЗВИЧАЙНИЙ конвеєр рендеру (zones/contours/
  cards/edges) споживає ці позиції. `paintStaffFrameAndEdges` для v2 бере ГОТОВІ сегменти ребер
  (precomputed) замість legacy `buildStaffEdgeSegments`. Legacy-шлях (default) — без змін.
- **Наслідок для host (Cass 1):** координати карток ШПС у v2 — з нової розкладки. Host-overlay per
  card-split читає dg-координати (`listPromoteCandidates().node`), тож відстежує автоматично; але
  **попередити Cass 1**, бо візуальне розташування ШПС під прапором зміниться.

## 2. Розкладка dept-band (req §6) — алгоритм
Вхід: positions (DiagramPosition з `departmentId`), reportLines (admin), departments
(`parentPositionId`+`order`). Чистий TS, 0 WASM (на відміну від legacy row-tree — простіше, headless).

1. **Admin-дерево:** з reportLines (`fromId`=керівник, `toId`=підлеглий, лише `kind==='admin'`).
2. **Валідація (B4):** цикл `parentId`, dangling (parent не існує), self-parent → structured-error
   (не hang); невідомий `deptId` → поза-dept + діагностика; прихований/згорнутий dept → сховати.
3. **Групування по департаментах:** позиції → бакети за `departmentId`; поза-dept (null) — окремо.
4. **Розміщення департаментів (req §6.1–6.3):** кожен dept має «якір» = його `parentPositionId`
   (керівна посада, якій підпорядкований). Dept ставиться НИЖЧЕ якоря (рівень якоря +1). Депи
   одного рівня — зліва направо за `order` (req §6.2, §12.1), без накладання (пакування по ширині).
   Корінь (head, поза-dept) — верхній рядок.
5. **Усередині департаменту:** tidy-дерево за IN-dept report-структурою (Reingold–Tilford знизу-
   вгору; підлеглий нижче, сусіди за `order`) → **in-dept ребра 0-перетинів BY CONSTRUCTION**.
6. **🔴 Крос-dept члени (ключ §10.1.4):** позиція, чий report-parent в ІНШОМУ департаменті (C-1 у
   dept C, report-parent A-lead у dept A), живе у СВОЄМУ dept-бенді (C), але її вхідне ребро —
   inter-dept. Порядок таких членів у бенді C **успадковує порядок їхніх джерел-керівників**
   (члени від лівішого керівника — лівіше), щоб inter-dept ребра не перетиналися. Це й дає §10.1.4=0
   (ELK довів досяжність; ми досягаємо впорядкуванням, не пошуком).
7. **Межі департаментів:** AABB членів + padding (контур-вхід бере ці позиції).

## 3. Маршрутизація (req §5)
1. **In-dept ребра:** spine/bus усередині бенду (патерн `spineBusEdges.ts`): вертикаль від
   керівника → горизонтальна шина → ризери до підлеглих. 0-перетинів (спільний стовбур).
2. **Inter-dept ребра (§3.2, §5):** орто-маршрут `deptBottom(джерело)` → коридор між рамками →
   `deptTop(ціль)`, з **обходом чужих карток (8px) і рамок (не крізь третю)** через перевикористання
   `polylineHitsBoxInterior`/`segmentHitsBoxInterior` (`staffEdgeGeometry.ts:199,221`).
3. **Доріжки коридору (§5.4):** N ліній у коридорі → паралельні доріжки крок 8px, порядок за
   цільовим x (ліва лінія — ліва доріжка).
4. **Обмежена резолюція (spec §5 п.5):** якщо після конструктиву inter-dept перетинаються —
   перестановки §6.5 ≤K проходів, монотонна міра, стоп.
5. **§12 драбина:** acceptance на §10.1 схемах = **0** (NB2 — досяжність доведена). Маркер
   `marked:true` — ЛИШЕ для фікстури реально-інфізибельного входу (щоб гілка exercised), не на §10.1.
6. **epoch-guard:** `setData`/ресайз під час маршрутизації скасовує прогін (патерн `ingestIsCurrent`).

## 4. Шов рендеру + kill-switch
- `canvasLayout.ts`: за `opts.staffEdgeRouter==='v2'` tier-2 = `staffDeptBandLayout(...)`; інакше
  legacy `layoutStaffOrgBlock`. v2 повертає сумісний `StaffOrgBlockResult` (nodes/edges/width/height/
  diagnostics) + додатково готові edge-сегменти.
- `StaffEdgesView.fromLayout` отримує precomputed-сегменти (additive handoff; фарбування НЕ
  міняється; колір з `EdgeStyle.color` `types.ts:174`).
- Будь-який збій v2 (validation-error/K-перевищення/throw) → fallback на legacy для цього прогону
  (try/catch навколо v2, лог діагностики). Прапор default `legacy` (spec B5).

## 5. highlightPath (публічний контракт)
`OrgHierarchyDiagram.highlightPath(ids)` → шлях root→вибране + прямі зв'язки акцент, решта opacity
40%. Re-entrancy — epoch-guard. (Окремий additive-контракт; дати Cass 1 поіменну відмашку, коли
приземлиться.)

## 6. Файли (codex напише; я проганяю гейти)
`packages/sdk/src/layout/staff/routing/`:
- `validateRouteInput.ts` (+test) — B4 валідація (codex уже почав RED-тест тут).
- `deptBandLayout.ts` (+test) — §2 розкладка; тест: in-dept 0-перетинів, §10.1.4 крос-dept порядок.
- `obstacleRouter.ts` (+test) — §3.2 обхід карток/рамок 8px на наявних примітивах.
- `corridorAllocator.ts` (+test) — §3.3 доріжки.
- `staffRouterV2.ts` (+test) — оркестрація: валідація→розкладка→роутинг→§12; acceptance §10.1 схеми=0.
- інтеграція в `canvasLayout.ts` + `StaffEdgesView.ts` + config-тип + `OrgHierarchyDiagram.highlightPath`.
Детектор перетинів для ТЕСТІВ — з `_shps-routing-probe/crossingDetector.ts` (перевірений) або
продуктовий; контрольна проба RED обов'язкова.

## 7. Acceptance (гейти перед «готово»)
- §10.1 схеми s1/s2/s4/s5: **0 перетинів**, ≥8px до чужих карток, не під карткою/заголовком, не крізь
  третю рамку. §10.1.4 = **0** (NB2).
- 0-посад / 1-посада (N6) — без краху.
- Реально-інфізибельний вхід → §12-маркер з'являється (гілка exercised).
- Детермінізм (2 прогони deep-equal); перф ≤50мс/500.
- Валідація: цикл/dangling/self-parent → structured-error.
- Rollback: `staffEdgeRouter:'legacy'` → поточна поведінка без змін.
- Повний SDK rstest 0 fail + typecheck 0 + lint 0 + check:docs 0.

## 8. Ризики / відкрите
- **Card-coord shift → host overlay:** у межах card-split (overlay читає dg-координати), але Cass 1
  попередити; можлива звірка на екрані після приземлення.
- **Контури:** `contourSceneInputs` бере `gridCell`/координати — v2 має давати сумісні координати
  (членам проставити layout-координати, щоб контур-пакування працювало). Перевірити інтеграцію.
- **Перф:** pure-TS dept-band має бути швидким (probe A 31мс/500); реальна розкладка складніша —
  зміряти.
- **Spec-шов:** виправити рядок «Шов монтування» у spec.md (був edge-paint) — міні-нота, не re-GATE
  (механізм спеки «layout+routing разом» не змінюється, лише уточнюється точка монтування).
