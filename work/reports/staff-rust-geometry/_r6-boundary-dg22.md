# R6 — межа/research: Rust-маршрути (T126, Dg22)

**Вхід:** R5 закрито (28b2c0f). Критерій R6 (tasks.md): повні ортогональні маршрути per-LOD,
edgePort вхід, перешкоди = Rust-геометрія для всіх LOD (§7b), паритет live/SVG; 0 перетинів або
§12-маркер, ≥8px, детермінізм (H6). Закриває H4/H6/B5. Файли: packages/core/src/,
layout/staffEdgeGeometry.ts, render/visualEdgeBox.ts.

**Основа (plan §3/§55):** алгоритм v3 (`work/reports/shps-routing/design-v3.md`) — конструктивний
layered + K-проходи. Контракт Rust уже є (R1): StaffEdgeRoute/StaffRouteSet/StaffRoutePoint у types.rs.

---

## МАПА (дослідник Explore, Dg22; факти з path:line, снапшот поточний)

### 1. Поточний потік маршрутів у TS — ДВІ формули (прапор `config.staffEdgeRouter` 'legacy'|'v2')
- **Legacy (default):** `buildStaffEdgeSegments` (`layout/staffEdgeGeometry.ts:433`) → `staffEdgePolyline`
  → `classifyStaffEdgeRoute` (`:314`). Кандидати: verticalPolyline(`:123`)/horizontalPolyline(`:175`)/
  aroundTop(`:110`)/aroundLeft(`:96`). Вибір: preferHorizontal для matrix/dotted/sameBand(`:324`);
  cross-tier прямий drop(`:367-376`); ladder(`:391-395`)→around→**forced(`:402-403`) БЕЗ перевірки
  чистоти** (відома діра, v3 §12 цитує design-v3.md:73-80). Перешкоди: `blocked()`(`:338-361`) —
  AABB+`polylineHitsBoxInterior`(`:228`)+`edgeIntrudesForeignFrame`(`:244`); індекс на WeakMap(`:277-312`).
  `via:'direct'|'around'|'forced'`(`:257-262`).
- **v2 (за прапором):** `resolveStaffRouting` (`render/staffRouterV2.ts:33`, 59 рядків). deptFrames з
  `unionBoxes(...,8)`(`:35-41`), той самий `buildStaffEdgeSegments`(`:48`), markedCrossings(`:50-57`).
  **УРІЗАНИЙ:** без K-loop, grouping-виклику, epoch-guard, edge-edge детектора. plan.md:62 підтверджує.
- **Per-LOD:** лише через `mapStaffEdgeBoxesForLod`(`render/visualEdgeBox.ts:134`) — мапить едж-боксі;
  сам алгоритм однаковий на всіх LOD. near: gojs-row shrink(`:27-35`)/figma-row dock 40px але рядок
  лишається obstacle(`:36-47`); far: org symbol-chip ≤36px(`:121-132`).
- **edgePort (center|avatar):** єдине місце `staffEdgeBoxForPosition`(`visualEdgeBox.ts:69`):
  `if edgePort==='center' return box` інакше avatar-tile dock(`:70-80`).
- `validateRouteInput.ts` — автономний валідатор (сорт `(parentId,order,id)`, цикл/dangling,
  collapsed→hide, unknown→loose+діагностика), **НЕ підключений роутером** наразі.

### 2. Паритет live/SVG
- Спільна точка — `mapStaffEdgeBoxesForLod`(`visualEdgeBox.ts:134`) + `mapPositionNodesToStaffEdgeBoxes`(`:96`).
- Live: `staffLiveGeometry.ts:121-139` (v2 або legacy), LOD реальний.
- SVG: `export/svgExport.ts:282-303`, **LOD хардкод 'near'** (`:288,:299`) — нюанс паритету.
- Інваріант: «one builder for canvas, matrix and export». v3: роутинг = ОДНА ділянка над ОДНІЄЮ
  геометрією, інакше markedCrossings≠фактичні (design-v3.md:112-128).

### 3. Перешкоди
- Картки: весь масив `obstacles`=боксі сцени → `blocked()`. `routerObstacle`(`:47`)=`box.obstacle??box`.
- Рамки відділів: `edgeIntrudesForeignFrame`(`:244`) блокує лише ребра з ні-from-ні-to∈members.
  Будуються у v2; legacy-гілки `staffLiveGeometry`/`svgExport` їх НЕ передають (frames=[]).
- **Смуга `.dn`: у коді роутингу НЕ видно окремою перешкодою** — лише countBarH. §7b-вимога НЕ реалізована.
- near vs far: однакове джерело — TS едж-боксі (не DOM). §7b частково дотримано (не DOM), але джерело
  TS-геометрія, не Rust-вихід.

### 4. Алгоритм v3 (обрано Варіант C, design-v3.md:1,37-41; default=legacy)
(0) валідація→structured-error; (1) `staffDeptGrouping` arrangement-пас у tree-режимі, перевикорист.
`layoutConnectedTree`, пакує dept-блоки в роз'єднані регіони, ключ §10.1.4 — порядок cross-dept за x
керівників(`:58-63`); (2) рамки як per-edge перешкоди (рідну пропускаємо); (3) §12-драбина (edge-edge
+ frame-intrusion): around-frame lane → релаксація ≤K (монотонна міра) → видимий маркер залишку;
(4) epoch-guard; (5) fallback legacy при збої.
**Інваріанти:** ≥8px (`MIN_CLEARANCE_PX=8`), детермінізм сорт `(parentId,order,id)` byte-identical 2
прогони (H6), 0 перетинів/видимий §12-маркер (H4), не крізь третю рамку (§3.2), tree/in-dept 0 by construction.
**Реалізовано:** каркас `resolveStaffRouting` (БЕЗ K-loop/grouping/epoch); `staffDeptGrouping.ts` prod
(кличе лише orgBlockLayout.ts:19, не роутер); `validateRouteInput.ts` (не підключений); детектори hit-interior.
**НЕ реалізовано:** K-loop релаксація, edge-edge у проді, коридор-доріжки, deptTop/deptBottom ендпоінти,
around-frame lane, §12-маркер frame-intrusion. `implementation-status.md`: «Production implementation has not started».

### 5. Probe-модулі (`layout/staff/_shps-routing-probe/`) — THROWAWAY, не прод
- `clearance.ts` — точна відстань сегмент↔rect, MIN_CLEARANCE_PX=8.
- `crossingDetector.ts` — edge↔edge (strict transversal; спільний стовбур не перетин §5.3.2; колінеар §5.3.3).
- `probeA.constructive.ts` — кандидат A (pure TS 0 deps): layered bottom-up+dept-grouping, tree 0 by
  construction; V_GAP28/H_GAP20/TRACK8/DEPT_PAD16; слабке — наївний routeOrtho без avoidance.
- `probeB.elk.ts` — ELK (async,+deps). **probe-results:** обрано A (31мс); B чистий (0 перетинів s4) але
  167мс/500 = 3.3× бюджету §8.4.
- **Оракул для Rust:** ТАК — crossingDetector+clearance = точні вимірювачі (diff-оракул R6: 0 перетинів/
  ≥8px/не-крізь-третю-рамку/детермінізм); probeA = референс-алгоритм конструктиву.

### 6. Розрив R6
- **У Rust (`core`):** весь v3-алгоритм (конструктив layered + K-loop + обхід рамок/карток + §12-маркінг)
  → `StaffRouteSet`/`StaffEdgeRoute`/`StaffRoutePoint` per-LOD. Контракт є: types.rs:518/533/545/561/583.
  Перешкоди (картки/рамки/`.dn`) з Rust-геометрії на всіх LOD (§7b plan:107-108).
- **Лишається TS:** `StaffEdgesView` фарба (`render/StaffEdgesView.ts:94-142`, §12-колір 0xdc2626:19),
  svgExport серіалізація, `mapStaffEdgeBoxesForLod` (поки едж-боксі TS).
- **Ризики паритету:** (a) mapStaffEdgeBoxesForLod зсуває AABB по-різному near/far — якщо Rust рахує
  маршрути а TS-мапінг лишається, легко розійтись; (b) SVG хардкод near — Rust має віддати near-набір;
  (c) forced-гілка без перевірки — Rust не відтворювати тихо; (d) детермінізм tie-break мусить збігтись
  з Rust row-tree push-порядком (hierarchy.rs).
- **v2-роутер проміжний:** ТАК (plan:71, O-41) — R6 замінює Rust-виходом, R7 видаляє прапор/legacy.

### ЧЕРНЕТКА РОЗРІЗІВ R6 (TDD red-first; оракул = probe crossingDetector/clearance + golden R0)
- **R6-1** Rust повні маршрути для дерева (in-dept) by construction; оракул adminTreeCrossings=0.
- **R6-2** per-LOD геометрія (near/mid/far); оракул паритет з TS mapStaffEdgeBoxesForLod ±1px.
- **R6-3** обхід перешкод (картки+чужі рамки+`.dn`) з Rust-геометрії; оракул clearance≥8px, foreign-frame=0,
  не крізь третю рамку. `.dn` — НОВИЙ інваріант (джерело bounds під питанням).
- **R6-4** §12 K-loop + видимий маркер залишку; оракул edge-edge+frame-intrusion, монотонність, стоп ≤K.
- **R6-5** детермінізм H6; оракул deep-equal 2 прогонів, tie-break (parentId,order,id).
- **R6-6** паритет live/SVG через адаптер; оракул R0-golden ±1px; SVG(near)=live(near).

### ВІДКРИТІ ФАКТИ / ПИТАННЯ (для плану R6)
1. `design-v3.md §6.5` (точна формула K / монотонної міри) переглянуто лише через grep — для R6-4
   прочитати §6.5 цілком.
2. **`.dn`-смуга як перешкода (§7b):** декларована, але геометричного джерела в коді НЕМА. Потрібне
   рішення власника: звідки Rust бере `.dn`-bounds (ярус-label-band? вихід R5 enrich_namespaces?).

## R6-1 ДИЗАЙН (Dg22) — перед критиком
**Ключове:** probeA робить розкладку+маршрути разом; у T126 розкладку дають R3/R4/R5 → R6 бере
ПОЗИЦІОНОВАНІ вузли й рахує ЛИШЕ маршрути (ядро `routeOrtho`), не перерозкладає.

**R6-1 scope:** Rust `staff_routes(nodes, edges, lod) -> StaffRouteSet` для деревних ребер:
- порти: bottom-center джерела → top-center цілі (edgePort/avatar — R6-2, поки center).
- corridorY = середина проміжку: `(from.y+from.h + to.y)/2`; x збіглись → пряма [a,b], інакше
  елбоу [a,(a.x,corr),(b.x,corr),b]. Усі сегменти осьові.
- детермінізм: сорт ребер (from order? немає order у StaffEdge) — tie-break за (from_id,to_id).
- вихід: StaffRouteSet{lod, segments:[StaffEdgeRoute{from_id,to_id,kind,points}]}.
**Оракул:** порт `crossingDetector.edgeEdgeCrossings` у Rust test-helper; на tidy-фікстурі
(батько + 2 дітей поряд) properCrossings==0 (sharedSource=sameParent); ендпоінти на портах; осьовість.

**Пастки (сам бачу, критик додасть):**
- P1: «0 by construction» тримається лише якщо ВХІДНА розкладка tidy (R3/R4). Фікстура має бути
  реальна R3/R4-подібна, не підігнана.
- P2: center-порти зараз vs edgePort/LOD-порти R6-2 — чи не перероблю? Сигнатуру тримати розширюваною.
- P3: StaffEdge не має order → детермінований tie-break лише (from_id,to_id); чи збігається з row-tree push?
- P4: хто продукує edges-список (StaffGeometryResult.edges)? Для R6-1 тесту конструюю прямо; прод-джерело — пізніше.

## КРИТИК R6-1 (_r6-1-critic-dg22.md) — ЧЕРВОНИЙ, закрито в дизайні
- B1: scope R6-1 = **intra-block admin** (вісь R4 staff_compose.rs:76-82 зсуває лише tier-1 →
  by-construction лише в межах ярусу; cross-tier kind staffEdgeGeometry.ts:55 → ПОЗА R6-1).
- B2: фікстура **мульти-батьківська/глибша**; асерти — осьовість + ендпоінти-на-портах + midpoint,
  не лише crossings==0 (tidy-дерево тривіально 0 — неінформативно).
- MAJOR: поріг прямої **0.5** (легасі :136), не 1e-6.
- MAJOR: нема вертикального зазору → поза scope R6-1 (легасі null+fallback :133,153 — не відтворювати).
- MINOR: порт окремою fn port(node,side); зберегти вхідний порядок edges; guard self-loop.
- Паритет: midpoint corridorY == легасі verticalPolyline midY=(y1+y2)/2 (:142) — ціль R6-6.
- probeA `to.y-V_GAP/2` — probe-специфіка, НЕ брати.

## РІШЕННЯ ВЛАСНИКА (отримано)
- R6 послідовно зрізами; `.dn` = R5 namespace label-band. Критик перед зрізом + ревʼю-агент після кроку.
- A. R6 = порт УСЬОГО v3-роутера в Rust (prod-реалізація якого ще не починалась) — підтвердити масштаб
  і нарізку (6 зрізів), братися послідовно з гейтами.
- B. Джерело `.dn`-перешкоди (питання 2).
- C. Чи читати design-v3 §6.5 перед R6-4 (K-loop).
