# Зріз 4 (оркестратор) — seam-аналіз: де живе dept-grouping

**Status:** 🔴 рішення власника чекає критики Cass 1 + Cass rev. Автор: Cass 2 (dg owner+reviewer).
Контекст: `design-v3.md` 🟢 GATE PASS (варіант C). Зрізи 1-3 (validateRouteInput, staffEdgeGeometry
frame-skip, staffDeptGrouping) — зелені, НЕзалежні від цього рішення. Зріз 4 заблоковано до вердикту.

## Проблема (одним абзацом)
`design-v3 §Шов` поклав dept-**grouping** усередину render-side `resolveStaffRouting`, який мав би
ПОВЕРНУТИ `positionNodes`, а caller — присвоїти `canvas.positionNodes = result`. Але grouping (зріз 3,
`groupStaffByDepartment`) ре-розкладає позиції одного орг-блоку в ЛОКАЛЬНИХ координатах (per-dept
`layoutConnectedTree` + place-blocks від `margin`), тоді як `layoutStaffCanvas` офсетить КІЛЬКА орг-блоків
по ЯРУСАХ. Render-side заміна `positionNodes` або згубить ярусні офсети/orgCards/external-pins, або
муситиме дублювати всю multi-tier логіку layout.

## Верифіковані факти (на коді, не grep-здогад)
1. **`layoutStaffCanvas` (`layout/staff/canvasLayout.ts:43-249`) будує сцену ЯРУСАМИ, кожен — окремий
   `layoutStaffOrgBlock` з ВЛАСНИМ офсетом:**
   - Tier 1 (:71): leadership managing-org (head + прямі admin-reports), `n.y += cursorY + zoneLabelBand`.
   - **Tier 2 (:102): поточна орг ПОВНИЙ штат — головний ШПС-блок**, `n.y += cursorY + zoneLabelBand`.
   - Tier 3 (:155): картки підлеглих орг + опц. розгорнутий child-блок (`n.x += originX, n.y += originY`).
   - + `orgCards` (:191), `tiers`-bands (:84/:118/:194), cross-tier edges (:214-221), external-pins
     (`pinExternalManagers` усередині `layoutStaffOrgBlock:275`).
2. **`groupStaffByDepartment` (зріз 3) дає ЛОКАЛЬНІ координати** (place-blocks від `geom.margin`, без
   знання про ярус/офсет/інші орг-блоки). Це чиста per-org-block arrangement-функція.
3. **ОБИДВА споживачі ROUTING йдуть через `layoutStaffCanvas`:**
   - render: `DiagramRenderer.renderStaffCanvas:631` → `canvas` → routing-site `paintStaffFrameAndEdges:789`
     (`buildStaffEdgeSegments(canvas.edges, mapStaffEdgeBoxesForLod(mapPositionNodesToStaffEdgeBoxes(
     canvas.positionNodes, positionById, theme.person), orgCards, lod))`).
   - export: `export/svgExport.ts:194` → `canvas` → routing-site `:270` (той самий map-ланцюг +
     `buildStaffEdgeSegments` над `canvas.positionNodes`).
   - Обидва також рахують `memberBoxesByDept` через `contourSceneInputs(canvas.positionNodes, …)`
     (render `paintStaffDepartments:721`, export `:244`).
4. **Дубльований ROUTING-site (:789 render / :270 export) — це те, що GATE r4/r5 вимагав уніфікувати**
   у спільну `resolveStaffRouting` (інваріант «one builder for canvas, matrix and export»). Це про
   ROUTING, не про grouping.

## Корінь розбіжності
GATE-раунди (r2/r3/r4/r5) обговорювали **розміщення ROUTING** відносно layout/paint/export фаз і дійшли
правильного висновку: routing — спільна render-side standalone (svgExport parity). Але **GROUPING за
природою — LAYOUT-arrangement** (міняє координати вузлів), і його потрапляння в `resolveStaffRouting`
(render) — побічний наслідок формулювання §Шов, а не висновок самого GATE про grouping. На multi-tier
реальності layout це дає конфлікт.

## Варіант A (рекомендований Cass 2): grouping → `layoutStaffOrgBlock` (layout)
**Механізм.** Dept-arrangement стає гілкою усередині `layoutStaffOrgBlock` (tree-режим, за прапором —
`staffEdgeRouter:'v2'` або окремий `staffArrangement:'dept-grouped'`). Коли ввімкнено й режим tree з
реальними департаментами → замість `layoutTreeBlock` (або після валідації) кличе `groupStaffByDepartment`
(зріз 3) і повертає розкладку з роз'єднаними dept-регіонами в ЛОКАЛЬНИХ координатах блоку. `layoutStaffCanvas`
далі офсетить цей блок по ярусу, як і будь-який інший — **для ВСІХ ярусів (1/2/3) даром**, orgCards/tiers/
external-pins/cross-tier edges лишаються незмінними.
**`resolveStaffRouting` (render) — ROUTING-only:** над УЖЕ-згрупованими `canvas.positionNodes` будує
`deptFrames` (з `memberBoxesByDept` + `unionBoxes`), маршрутизує `buildStaffEdgeSegments` з frames (зріз 2),
§12 K-loop + marking, повертає `{routedSegments, markedCrossings}`. Спільна для render(:789)+export(:270) —
GATE r4/r5 інваріант ЗБЕРЕЖЕНО (навіть чистіше: спільний код менший, лише routing).
**Export parity даром:** `svgExport` теж кличе `layoutStaffCanvas` (:194) → згруповані позиції отримує без
жодного спільного grouping-коду.
**Плюси:** (1) grouping у природному домі (layout міняє координати); (2) multi-tier/orgCards/external-pins
працюють без дублювання; (3) спільний render-код менший і точно за GATE-інваріантом (лише routing);
(4) зріз 3 переюзується як є.
**Мінуси / відкрите:** (1) відхилення від design-v3 §Шов на рівні розміщення grouping — треба дописати
корекцію; (2) K-loop re-invoke grouping (якщо потрібен — див. нижче) означає re-run `layoutStaffOrgBlock`/
`layoutStaffCanvas` з reorder-hint (важче за iteration). Але layout і так async і вже викликається.

## Варіант B: лишити як у design-v3 (grouping у render-side `resolveStaffRouting`)
**Механізм.** `resolveStaffRouting` сам робить grouping і re-застосовує ярусні офсети: тобто для tier-2
(і/або кожного ярусу) викликає `groupStaffByDepartment`, тоді накладає ті самі офсети, що й
`layoutStaffCanvas` (cursorY, zoneLabelBand, originX/Y tier-3), оновлює orgCards-залежності.
**Плюси:** точно за GATE-approved §Шов; увесь v2-pipeline (grouping+routing+marking) в одній функції.
**Мінуси:** (1) репліка multi-tier offset/orgCards/tiers/external-pin логіки `layoutStaffCanvas` у render —
високий ризик тихого розходження (дві копії ярусної математики); (2) якщо обмежитись лише tier-2 —
tier-1/tier-3 (leadership, розгорнутий child) лишаються негрупованими (неконсистентно); (3) більше
коду в render-шарі, що концептуально належить layout.

## Підпитання (обидва варіанти): чи K-loop МУСИТЬ re-invoke grouping?
`design-v3 §Рішення §12-seam` каже: K-loop = `reorder → await groupStaffByDepartment rebuild → re-score`.
Але відкрите: чи залишкові КРОС-dept перетини (після того як grouping уже дав роз'єднані регіони)
знімаються:
- (i) РЕ-розкладкою (reorder членів → інша розкладка) — тоді K-loop мусить re-invoke grouping (layout); або
- (ii) суто вибором ROUTING-lane (around-frame + коридор) над ФІКСОВАНОЮ grouping-розкладкою — тоді K-loop
  лише routing, grouping одноразове, і варіант A ще чистіший (grouping у layout раз, render лише маршрутизує
  в циклі).
Інверсія §10.1.4 (ploeg_layout.rs:48, уже задокументовано) релевантна лише якщо (i).

## Рекомендація Cass 2
**Варіант A + K-loop за сценарієм (ii), якщо routing-lane мінімізації достатньо на §10.1 схемах.**
Підстава: grouping змінює координати = layout-концерн; A усуває дублювання multi-tier логіки; спільний
render-код лишається точно тим, що вимагав GATE (routing), і навіть меншим. (ii) робить grouping
одноразовим і знімає потребу в layout-re-run усередині K-loop. Якщо ручний гейт покаже, що routing-lane
сам не досягає §10.1.4=0 → падаємо на (i) (reorder-hint у layoutStaffOrgBlock).

## Питання до критиків
- **Cass 1 (host integrator):** host-мапер `position-tree-to-dg-diagram.ts` зараз віддає tree-mode
  (без gridCell) для ОДНІЄЇ поточної орг. Чи реальний ШПС-кейс колись multi-tier (tier-1 managing +
  tier-3 children expanded), чи практично завжди tier-2 single-org? Це впливає на вагу multi-tier
  аргументу. Чи змінює варіант A щось у контракті host→dg (positionNodes/orgCards/StaffCanvasResult)?
- **Cass rev (reviewer):** чи A не порушує GATE r4/r5 інваріант «one builder canvas+export»? (моя теза:
  навпаки зміцнює — routing лишається спільним, grouping тече обом через layoutStaffCanvas). Чи
  підпитання (i)/(ii) про K-loop — блокер рішення A, чи його можна закрити окремим RED-гейтом пізніше?

## Вердикти критиків

### Cass rev — 🟢 APPROVE варіанту A (звірив код-якорі сам)
- **Q1 (one-builder інваріант):** A НЕ порушує — ЗМІЦНЮЄ. Routing+marking лишається єдиною спільною
  функцією над тими самими збагаченими edge-boxes; назовні виноситься лише КООРДИНАТНЕ розміщення
  (grouping), що стоїть ВИЩЕ edge-box і тече обом через спільний `layoutStaffCanvas`. «matrix»
  (matrixLayout:125) поза scope — перелік двох staff-споживачів повний.
- **Несуча теза ПІДТВЕРДЖЕНА (Cass rev + Cass 2 незалежно, `contourInputs.ts:29-61`):** `contourSceneInputs`
  виводить `memberBoxesByDept` СУТО з node-боксів + positionById → routing-only відбудовує deptFrames з
  самих `canvas.positionNodes`, БЕЗ grouping-internal стану. Докблок :26-27: це спільне джерело matrix+export.
- **Q2 (K-loop (i)/(ii)):** НЕ блокер A-vs-B (A домінує B під обома сценаріями) → окремий RED-гейт пізніше.
- 🔴 **CAVEAT (у постановку A зараз, інакше стає блокером):** seam A не має закривати шлях (i). Конкретно —
  `layoutStaffOrgBlock` (grouping-гілка) мусить приймати **reorder-hint** і бути **re-callable з K-loop** із
  самого початку, навіть якщо під (ii) не використовується. Import render→layout OK (design-v3:101).
  Нота під (i): кожна K-ітерація перебудовує edge-boxes над НОВИМИ positionNodes перед re-score (не stale).
- **Мінор:** власний `memberBoxesByDept` з `groupStaffByDepartment` (staffDeptGrouping.ts:15,104) дублює
  canonical `contourSceneInputs`-rebuild — прибрати (під ii) або лишити (під i).

### Cass 1 (host) — 🟢 CONCUR з варіантом A (прочитав контракт + host-мапер)
- **(1) Multi-tier РЕАЛЬНИЙ, виміряно (вага аргументу висока):** host-мапер `position-tree-to-dg-diagram.ts`
  емітить 3 яруси (`leadingBlocks`→role:leading tier-1, `organizationId`→role:current tier-2,
  `subordinateBlocks`→tier-3+expanded через doubleChildren); tier-1/3 з ORG-CONNECTIONS. Виміри команди
  (docblock-и `position-tree-to-diagram.ts:149-166`): tier-1 «subordinates have TWO apiece» (ФС ВНГ),
  tier-3 «connections name THREE organizations» (Ц А). Отже tier-2 завжди, tier-1/3 присутні коли є
  зв'язки (а в реальних орг вони є) → варіант B (grouping лише tier-2) лишив би tier-1/3 негрупованими =
  візуально неконсистентно. A групує всі яруси даром.
- **(2) A НЕ міняє host→dg контракт** (host-авторитет, його домен): вхід — ідентичний `DiagramData`
  tree-mode, departments card-режим +parentPositionId+order, БЕЗ gridCell (де живе grouping — суто
  dg-внутрішнє, host не бачить). Read-back — host читає ЛИШЕ per-position `world`-бокс по id усіх ярусів
  (promote-overlay + ОР CriticalStatusIndicator + ctx-menu анкоряться по world для tier-1 head, tier-3
  heads+expanded). orgCards/`StaffCanvasResult`-форма host-невидима. A дає консистентні world-координати
  всіх ярусів BY CONSTRUCTION (grouping у layoutStaffOrgBlock→layoutStaffCanvas офсетить як завжди);
  B (tier-2-only) дав би технічно валідні, але візуально неконсистентні позиції на tier-1/3.
- K-loop (i)/(ii) — суто dg-внутрішнє, host-контракту не торкається.

## Підсумок вердиктів
**Обидва критики CONCUR з варіантом A.** Dg-side несучі факти (contourSceneInputs purely from node-boxes;
canvasLayout офсетить per-tier) Cass 2 звірив незалежно на коді. Host-факти (multi-tier real, контракт
інваріантний) — авторитет Cass 1 (його домен). Відкрито лише: явна умова Cass rev — **reorder-hint у
layout-entry зашити зараз**, щоб шлях (i) не закрився. Рішення власника — фінальний крок перед кодом A.
