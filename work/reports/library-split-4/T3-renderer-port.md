# T3 — Pixi-рендер за `RendererPort` + lift камери + інверсія інтеракцій (спліт dg #3)

**Status:** РАУНД 1 ГЕЙТА пройдено (2 сліпі gate-reviewer, Opus) — RED, знахідки звірені писарем по коду й УВІБРАНІ в контракт нижче. Стейджено **T3a→T3b→T3c**. Scope — owner-go «повна §9-інверсія зараз» (не тонкий розріз). Правки раунду-1 позначені `[gate-1]`. **Owner-шлях (2026-10-25):** T3a — у роботу ЗАРАЗ (мало торкнутий reshape'ом, clean relocation + контрольна проба); T3b/T3c — re-gate переозначеного контракту ПЕРЕД тими під-кроками.
**Репо:** `~/projects/dg`, `bulk-mutations`, база HEAD `17b237e` (T2b). Recon: `_wip-T3-renderer-camera-recon.md` (камера/фасад/рендер) + `_wip-T3b-interaction-inversion-recon.md` (interaction-шар).
**Канон:** постановка §9 (контракт), §11-A1/A2/A3/A4/B1/C (Cass rev), §12-F1/F3/F5 (Cass 1), §20-T3.

Фасад `OrgHierarchyDiagram` тримає `private host: PixiHost` (:243) і кличе конкретику: `host.renderer.render` (:794), камеру через `host` (fitView :1038/:1129, setViewport :1765 …), 13 node-колбеків пушаться ВНИЗ у `render()` через `buildRenderOptions` (:857, окремі wiring :876-943). T3 виводить фасад на **`RendererPort`** (малюй готове), піднімає камеру-політику в #4 (Viewport-математика reuse), і **перевертає напрям інтеракцій**: 13 push-вниз колбеків → єдиний driving-port `handleNodePointer(e: NodePointerEvent)` вгору (емісія, §11-A2), поведінка (пороги/selection-мутація/drop-рішення) → #4. Стан світу: рендер ОДИН (Pixi), тож «однакові позиції між режимами» (B2) поки механічно тривіальне й **поза T3** — ціль T3 суто структурна (шов + напрям), поведінковий результат 0-дельта. **Виняток:** `measureRenderedBounds` ЛИШАЄТЬСЯ у порту (§11-A1) — намальований екстент (зони/dept-frames/badges) ≠ `layout.width/height`, тож fitView не можна перевести на layout-екстент у T3 (це уточнення — T4, коли зʼявиться віконний #2).

## Чому
Доки фасад тримає `host: PixiHost`/`host.renderer: DiagramRenderer` конкретно, другий адаптер (#2 DOM, T4) нема куди під'єднати — немає шва. Доки node-події пушаться ВНИЗ callback'ами, замкненими на фасадний `this` (`buildRenderOptions` :876-943), кожен новий адаптер успадкував би цей напрям: рендер мусив би знати семантику #4 (що означає click/dbl/ctx/drag) — порушення Dependency Rule, яке T4 розмножить. Вада наявного шляху (recon): поведінка живе НЕ там, де належить — пороги розпізнавання зашиті в рендер (`render/personInteractions.ts:230` 4px move, `:192` lod-gate; `doubleTap` 300ms споживається рендером через `deps.doubleTap`), а drop-math рендер рахує сам (`DiagramRenderer.ts:54,237 resolveSeatDrop` у previewDrag-deps). Виміряна корекція власної посилки (recon-2 проти recon-1): це НЕ 3 природи render→interaction, а по суті ДВІ рантаймові (поведінка + smell) плюс велика type-only маса, що зникає від «словник→core»; і `ContourPainter.ts:15` — `import type {SeatDrop}` (0 рантайму, §11-A4), а не поведінковий smell, як я спершу записав. Тому інверсія інвертує МЕНШІСТЬ, а передумова — винести словник.

## Рішення
**Фасад кличе рендер ЛИШЕ через `RendererPort` (driven) і отримує node-події через `InteractionInput` (driving, емісія вгору); камера-політика й усі пороги — у #4; поведінковий результат — 0-дельта.** Стейджимо у три коміти, кожен тестований окремо.

**Контракт (у `core`, §9) — `[gate-1]` переозначено під знахідки раунду-1:**
```
// DRIVEN (фасад #4 драйвить адаптер):
RendererPort:
  mount(container) · render(scene): Promise<void> · applySelection(sel)
  applyCamera({x,y,scale})                 // адаптер пише у СВІЙ world + сам кличе requestPaint [gate-1 NB2]
  applyDragPreview(cell | null)            // [gate-1 B2] down-канал живої drag-preview (нині previewDrag :245 на КОЖЕН move)
  measureVisibleBounds(): WorldRect | null // лишається у порту (§11-A1); у T3 = getContentBounds() :413
  onMeasurable(cb) | render() resolve-після-measurable  // [gate-1 B4/NB3] #4 чекає ПЕРЕД камера-оп; destroy/stale МУСЯТЬ settle
  destroy()
// DRIVING (адаптер кличе, #4 реалізує — §11-A2 driving-port, НЕ «Observer»-назва):
InteractionInput:
  handleNodePointer(e: NodePointerEvent)   // [gate-1 B1] e несе mods! НЕ позиційні (ref,kind,screenPoint)
  handleViewportGesture(e: ViewportGesture)
// NodePointerEvent = {
//   ref: NodeRef | null,                   // [gate-1 N2] null = фон (canvasClick)
//   kind: 'click'|'doubleClick'|'contextMenu'|'dragStart'|'dragMove'|'dragEnd'|'expandToggle',  // [gate-1 B2] drag = down/move/up
//   screen: { global, client },            // e.global (canvas) + e.client (DOM)
//   mods: { ctrlKey, metaKey, shiftKey, button }  // [gate-1 B1] SelectionStore.ts:64 isSelectionToggleModifier(mods)
// }
// Scene = { positioned: OrgLayoutResult|StaffCanvasResult, theme, resolvedTheme, lod } (БЕЗ selection)
```
**`[gate-1 B2]` drag-lifecycle (обидва критики / Cass-1):** `onPersonDragEnd(positionId,col,row)` :103 несе РОЗВ'ЯЗАНІ col/row, які рендер рахує стейтово (grabOffset :211, snapWorldToCell :314, `dropTargetAt` :302 на КОЖЕН move) — одна screen-точка їх не відтворює. Тому порт отримує `dragStart/dragMove/dragEnd` вгору (drag-local world-point) + `applyDragPreview(cell)` вниз; cell-резолв (`resolveSeatDrop`/`snapWorldToCell`) робить #4 через `core/logic`, НЕ адаптер (інакше point→cell = de-facto hitTest у порт, owner сказав НІ). Розміщення `dropTargetAt`/`DropTargetIndex` (point→logical-cell) — відкритий design-пункт T3c: pure-резолв → `core/logic` (кличе #4), адаптер лише шле сирий world-point.

### T3a — #5 shared `core` base (ПЕРЕДУМОВА; recon-2 §8: T2 її НЕ створив)
`packages/sdk/src/` не має `core/`/`shared/`/`domain/` — словник розкиданий (`interaction/types.ts` NodeKind/NodeRef/MenuItem, `interaction/nodeKey.ts` nodeEntityKey, `interaction/nodeRefs.ts`, `render/promoteTypes.ts`). §20 позначив «#5 — передумова T2+» — не виконано.
- Створити **один** модуль `core/` (NB6/NB7-обрізка: БЕЗ розколу на domain/ports/logic — §17/§20 канон перекрив §11-A3).
- Перенести: словник (`NodeKind/NodeRef/nodeEntityKey/nodeRefs/MenuItem/InteractionError`) + **drop-pipeline ЦІЛИМ** (`SeatDrop`-type + `resolveSeatDrop` :83 + `projectedOccupantMove` + `applySeatDrop` :140 — усе чисте, §11-A4).
- **`[gate-1 B3]` promote-типи НЕ рухати в T3a.** Звірено: `promoteTypes.ts:3 import WorldBox from ./promoteMath`, `promoteMath.ts:1-2` тягне render-side `LodLevel`(./lod)/`ViewportTransform`(./Viewport). Перенос promote у `core` створив би **core→render upward-ребро** (гірше за render→interaction, що T3 нищить). Promote лишається в `render/`; після #5 воно імпортує `NodeKind/NodeRef/nodeEntityKey` з `core` (render→core, напрям ОК).
- `ContourPainter.ts:15` і `DiagramRenderer.ts:54` імпортують `SeatDrop`/`resolveSeatDrop` з `core` → smell (C) зникає.
- **`[gate-1 NB6]` інв#4 «render→interaction=0» — ТІЛЬКИ після репойнту ВСІХ vocab-сайтів + зняття shim.** Ціль репойнту (recon-2 §9-A, ~10 type-only): `promoteMath.ts:3-4`, `SceneRegistry.ts:2`, `promoteTypes.ts:1-2`, `DiagramRenderer.ts:6,33-36`, `personInteractions.ts:11`, `orgCardInteractions.ts:8`, `cardContextMenu.ts:2` (+ 2 drop-сайти C). Reexport-shim дозволений ЛИШЕ як перехід у межах T3a; **знімається до кінця T3a** (а не «колись у T3c») — доки shim живий, фізичне ребро лишається й інв#4 хибний.
- **0 зміни поведінки** — суто relocation; контрольна проба: тимчасово зламати `core`-reexport `SeatDrop` → `ContourPainter`/`DiagramRenderer` tsc-червоні; повернути.

### T3b — `RendererPort` + lift камери
- Визначити `RendererPort` у `core`; **`PixiHost` реалізує його** (він уже host-обгортка: володіє mount + камерою + делегує render у `DiagramRenderer`). Фасадний `host: PixiHost` → `renderer: RendererPort`; маршрутизувати 4 конкретні call-sites: `render` :794, `canReparent=` :833, `get renderer()` :508, `refreshMediaUrls` :476.
- **Камера:** `render/Viewport.ts` розділити — математика (`zoomAt` :418, `panBy` :363, fit `computeFitTransform` :120/`fitBounds` :156, `animateTo`) → **#4** (reuse, НЕ переписувати). DOM-capture (`attachWheel` :256, `attachPinch` :285 на `app.canvas`, §11-B1 PixiHost :327-329) **лишається в адаптері** як тонкий емітер → `handleViewportGesture` вгору; #4 рахує нову {x,y,scale} й кличе `applyCamera` вниз.
- **`[gate-1 NB2]` камера — БЕЗ подвійного володіння `world` + перепідключити paint.** Звірено: `Viewport` сидить над `renderer.layers.root` (PixiHost:318); onChange→requestPaint живе в `PixiHost.setOnViewportChange:226-232`+`onNeedsPaint:325`. Винос `Viewport` as-is дав би #4 ПРЯМЕ посилання в Pixi-контейнер (leak) і відʼєднав би paint-тригер. Тому: #4 тримає камеру-СТАН+математику (без Pixi-ref); `applyCamera({x,y,scale})` в адаптері пише у СВІЙ `world` ({position.set,scale.set} :58-62) **і САМ кличе `requestPaint`**. `apply()` :429 параметризується як adapter-side implementation `applyCamera`, не як спільний інстанс.
- **`[gate-1 B4/NB3] render-resolve — явний `onMeasurable`-сигнал, НЕ звуження `render()`-резолву.** Cass-1(B4)+Cass-rev(NB3) зійшлись: `render()` у `DiagramRenderer`, paint у `PixiHost` (`afterRender:963` кличе `requestPaint` поза `await render()`); прив'язка резолву до paint (а) перетинає клас-межу, (б) при `destroy()` :380 (скасовує paintHandle) лишає `await render()` у #4 (awaiter — renderNow IIFE :794-803) ВИСЯЧИМ назавжди. Тому: лишити `render()`-резолв як є (:470), додати окремий `onMeasurable`-сигнал (після першого paint-measurable), якого #4 чекає ПЕРЕД камера-оп. **`destroy()` і stale-epoch МУСЯТЬ settle/скасувати будь-який pending measurable-awaiter** (інакше hang). Coalesced-paint↔pending мапінг — визначити явно.

### T3c — `InteractionInput` driving-port (інверсія напряму)
- 13 node-колбеків RenderOptions (`render/DiagramRenderer.ts:71-119`) → **єдиний** `handleNodePointer(e: NodePointerEvent)` вгору (контракт вище). `ref` будується наявними `orgNodeRef`/`seatNodeRef` (`interaction/nodeRefs.ts`), `ref=null` для фону (`[gate-1 N2]` canvasClick :106); `screen` з `FederatedPointerEvent` (`e.global`+`e.client`) — **готовий патерн** rightclick `render/cardContextMenu.ts:16-21`.
- **`[gate-1 B1]` `e.mods` ОБОВ'ЯЗКОВО несе `{ctrlKey,metaKey,shiftKey,button}`** — `onOrgClick`(:76)/`onPersonClick`(:85-88) нині несуть `SelectionPointerMods`, а `SelectionStore.ts:64` робить `isSelectionToggleModifier(mods)` (ctrl/shift-мультивибір). Позиційний `(ref,kind,screenPoint)` згубив би канал → регресія мультивибору (порушення інв «0-дельта»). Третій арг = ТОЧКА, mods = окреме поле події (канон §9 мав `handleNodePointer(e: NodePointerEvent)` — об'єкт).
- **Арбітраж hit vs gesture — В АДАПТЕРІ** (§11-B1 pushback, обидва критики): адаптер емітить УЖЕ розрізнене (`onNodePointer` АБО `handleViewportGesture`); нода робить stopPropagation, pan на pointerdown без порогу (PixiHost:357). #4 слухачі НЕ вішає.
- **Усі пороги → #4/shared** (§9-інваріант): 300ms dbl (`interaction/doubleTap.ts NODE_DOUBLE_TAP_MS`), 4px move (`personInteractions.ts:230`), primary/right (`selection.isPrimaryPointerTap:90`), modifier-toggle (:161). Адаптер віддає СИРИЙ pointer, #4 інтерпретує.
- **selection:** стан (`state/SelectionStore.ts`) + мутація (`applySelection:599`/`handleNodeSelect:611`) **вже на #4-боці** — лишається; малювання (`drawSelection:601`/`repaintSelection:493`, власний overlay) лишається адаптеру через `applySelection(sel)` (дешево, окремо від `render` — §11-C).
- **context menu** (`interaction/contextMenuPayload/contextMenu/ContextMenuController`) — чиста #4-логіка (читає DiagramData+selection, не Pixi); адаптер лише ловить rightclick → `handleNodePointer({ref, kind:'contextMenu', screen, mods})`.
- **`[gate-1 B2]` drag** — адаптер шле `dragStart/dragMove/dragEnd` вгору (drag-local world-point) + малює `applyDragPreview(cell)` на команду вниз; #4 рахує cell через `core/logic` (`snapWorldToCell`/`resolveSeatDrop`). ContourPainter приймає готову preview-cell, не рахує drop сам. Розміщення `dropTargetAt`/`DropTargetIndex` — design-пункт на коді T3c (принцип: pure-резолв у `core/logic`, кличе #4; адаптер шле сирий world-point).
- **binders** `render/personInteractions.ts`/`orgCardInteractions.ts`/`cardContextMenu.ts` — тоншають до «сирий pointer→емісія».

**Відкинута альтернатива (та її ціна):** зробити все одним комітом (one-shot). Ціна: ×3 ризик за раз (relocation словника + port-шов + інверсія 13 колбеків разом), рев'ю двох незалежних gate-reviewer практично неможливе на такому дифі, регресія в будь-якому шарі сховала б перемоги інших. Ціна staging: проміжні стани (після T3b фасад уже на порту, але колбеки ще вниз; `render()` приймає обидва шляхи) — але це коректні, тестовані переходи, а не борг; T3c знімає подвійний шлях повністю.

**🔒 Інваріанти (зберегти; §9/§11/§12):**
1. **Камера-при-свопі (§12-F1):** #4 тримає x/y/scale; НІЯКОГО авто-fit на зміні адаптера. «explicit-only» = user gesture + перелічені lifecycle-fit (`expandOrg` :1038, `collapseAllOrgs` :1129) з defer навколо свопу. (У T3 своп ще не настає — інваріант закладається в контракт, перевіряється в T5.)
2. **measureVisibleBounds per-substrate (§11-A1 + §17):** `measureRenderedBounds`=`getContentBounds()` :413 (unionBoxes запамʼятованих боксів, свідомо НЕ Pixi getBounds :1150) ЛИШАЄТЬСЯ у порту. У T3 (один Pixi) = ≈ повне дерево+хрома. Розмежування `measureVisibleBounds` (рендер) vs `layoutExtent` (#1, fit-all) закладається в іменуванні, матеріалізується в T4.
3. **Hit-only арбітраж (§11-B1):** адаптер розрізняє ТІЛЬКИ по hit; будь-який поріг руху/часу = #4. Інакше DOM і Pixi розійдуться у відчутті.
4. **render→interaction = 0 після T3** (recon-2 §9: 23 import-сайти; 0 зворотних — інверсія циклу НЕ робить). `[gate-1 NB6]` інв дійсний ЛИШЕ коли ВСІ ~10 vocab-сайтів репойнтнуто в `core` І reexport-shim знято (до кінця T3a); доки shim живий — фізичне ребро лишається.
5. **0-дельта видимого результату** — ті самі позиції/бокси/виділення/меню/drag; змінюється лише ХТО кличе й у ЯКОМУ напрямі.

## Поза межами
- **B2 (однакові позиції між режимами)** — owner-gated, вертається в T4 (#2 DOM + measure→layout). У T3 один рендер → механічно тривіально.
- **#2 DOM адаптер, віконність, LOD-switch, камера-своп фактично** — T4/T5.
- **`fitView` на `layoutExtent` замість виміряних bounds** — T4 (віконний #2); у T3 fitView лишається на `measureVisibleBounds` (один повний Pixi-paint).
- **Розкол `core` на domain/ports/logic** (§11-A3) — обрізано (NB6/NB7, §17); один `core`.
- **hitTest як публічний метод** — його НЕМА (recon-1 §3); point→node вже приватний (Pixi per-node + stopPropagation, DropTargetIndex :266) → у порт НЕ виноситься, окремої роботи нема (owner-підтверджено).
- **Нові жести/поведінка** (cell-drag UX, тощо) — ні; лише перенос наявного.

## Форма перевірки
- **Чисті шви (interaction/ тести — мають лишитись зеленими, логіка не змінюється, лише місце):** `selection.test`, `doubleTap.test`, `positionMove.test`, `positionReparent.test`, `contextMenuPayload.test`, `ContextMenuController.test`, `bulkContextMenu.test`, `nodeRefs.test`, `interaction.test`.
- **Компонентні з замоканим швом (pointer→behavior — НАЙЧУТЛИВІШІ, форма колбека змінюється):** `personInteractions.test`, `orgCardInteractions.test`, `nodeInteractions.contract.test`, `nodeDoubleClick.interactions.test`, `personDrag.contract.test`, `personReparent.contract.test`, `backgroundClick.contract.test`, `OrgHierarchyDiagram.interactions.test`.
- **Нові контракт-тести (§12-F3: boundary-gate ловить ЛИШЕ структуру; поведінкові інваріанти = 0 імпортів → невидимі):**
  - `handleNodePointer(e)` емітить `{ref, kind, screen, mods}` для кожного kind; адаптер НЕ вирішує семантику.
  - **`[gate-1 B1]` mods доходять до #4:** click із `ctrlKey:true` → #4 бачить `e.mods.ctrlKey` і `SelectionStore` робить toggle (НЕ replace). Саботаж: занулити `e.mods` → мультивибір-тест червоніє.
  - **`[gate-1 NB4]` адаптер БЕЗ порогу (не «гейт, що не може впасти»):** НЕ «3px → не dragEnd» (нинішній 4px-поріг дає not-dragEnd і так → тест зелений завжди, нічого не тримає). А: pointerdown+move 3px → адаптер ЕМІТНУВ `dragMove` вгору (сирий, без порогу); поріг-рішення «це ще не drag» ухвалює #4. Саботаж: лишити поріг в адаптері → `dragMove` не емітнеться на 3px → червоно.
  - **`[gate-1 B2]` drag-канали:** dragStart→dragMove(×N)→dragEnd емітяться вгору; `applyDragPreview(cell)` кличеться на кожен move; фінальний cell == нинішній `onPersonDragEnd(col,row)` для тих самих координат (0-дельта).
  - **`[gate-1 B4]` render-resolve/liveness:** (1) камера-оп чекає `onMeasurable`, не голий `render()`; (2) **саботаж: `destroy()` під час in-flight render → measurable-awaiter у #4 settle'иться (reject/skip), НЕ висить**; (3) повторний render до measurable першого → coalesce не губить awaiter.
- **Контрольна проба інверсії (МУСИТЬ почервоніти):** `personInteractions.test:99`/`nodeInteractions.contract.test:230/251` зараз фіксують `options.onPersonClick('per1','pos1',mods)`. Після T3c правильна зміна форми ОБОВ'ЯЗКОВО ламає їх (стає `handleNodePointer({ref,kind:'click',...})`) — якщо ЗЕЛЕНІ без правки тесту, інверсія не відбулась (fallback маскує). Для T3a: тимчасово зламати reexport `SeatDrop` з `core` → `ContourPainter`/`DiagramRenderer` tsc-червоні; повернути.
- **Writer-gate перед передачею:** `cd packages/sdk && npx rstest run` (увесь suite, baseline ~1128/0); `npx tsc -p tsconfig.check.json` 0; `npx oxlint --max-warnings 0 <files>` 0; `cd packages/core && cargo test` 25/0.
- **Boundary-gate:** import-правило має ловити нове render→interaction ребро (structural, §12-F3). Якщо gate-механізму ще нема — завести мінімальний (T6 добудує).
- **Діф по комітах:** T3a = `core/*` + relocation-сайти; T3b = `OrgHierarchyDiagram`/`PixiHost`/`Viewport` + port-тип; T3c = `DiagramRenderer`(RenderOptions)/binders/#4-interpretація. НЕ замітати не-split хвости дерева.

## Критика (seam/direction/altitude; писар-раунд + gate-раунд-1: 2 сліпі gate-reviewer Opus, усі file:line звірені писарем по коду)
- **#5 як окремий крок (T3a), не «заодно»:** без shared-бази type-only ребра не зникнуть, а інверсія T3c тоді тягла б і relocation — ×2 ризик. ВЕРДИКТ: T3a окремим комітом, передумова.
- **`RendererPort` реалізує `PixiHost`, не `DiagramRenderer`:** host уже володіє mount+камерою+делегує render; port на host — природний шов, DiagramRenderer лишається приватним за ним. ВЕРДИКТ: port=host-рівень.
- **Камера reuse, не переписування:** Viewport уже duck-typed на `world` — lift = перенос власності інстансу в #4 + параметризація `apply()`, математика без змін. ВЕРДИКТ: reuse (не рефактор).
- **ContourPainter — type-only, не smell (§11-A4):** `import type {SeatDrop}` стирається; «smell» зникає сам від relocation типу в `core`, painter далі знає SeatDrop (з core). ВЕРДИКТ: не чіпати логіку painter, лише джерело імпорту.
- **render-resolve — ~~Promise-звуження~~ → ПЕРЕВЕРНУТО gate-1 на явний `onMeasurable`.** Писар спершу нахилявся до «Promise render() резолвиться після paint-measurable». Обидва критики (Cass-1 B4 blocking + Cass-rev NB3) спростували по коду: render() у `DiagramRenderer`, paint у `PixiHost`; прив'язка перетинає клас-межу й вішає `await render()` при `destroy()`. ВЕРДИКТ (переглянуто): явний `onMeasurable`-сигнал, render()-резолв не чіпати; destroy/stale settle. (приклад: власну посилку спростував вимір — лишаю слід.)

### `[gate-1]` Раунд-1 — дизпозиції (усі знахідки звірені по коду; увібрані вище)
- **B1 (обидва критики) ПРИЙНЯТО:** `handleNodePointer(e)` несе `e.mods` — інакше ctrl/shift-мультивибір (`SelectionStore.ts:64`) ламається. Контракт переозначено з позиційного на event-об'єкт (канон §9).
- **B2 (Cass-1) ПРИЙНЯТО:** drag — стейтовий down/move/up (grabOffset :211, previewDrag :245, dropTargetAt :302); додано `dragStart/dragMove/dragEnd` + `applyDragPreview(cell)` у контракт; cell-резолв у #4/core.
- **B3 (Cass-1) ПРИЙНЯТО:** promote-типи НЕ рухати в T3a (тягнуть WorldBox/LodLevel/ViewportTransform з render → core→render ребро). #5 звужено до interaction-словника + drop-pipeline.
- **NB2 ПРИЙНЯТО:** камера-lift — #4 без Pixi-ref; adapter `applyCamera` пише свій world + requestPaint.
- **NB4 ПРИЙНЯТО:** «3px» контракт-тест переписано на «адаптер емітнув сирий move» (був гейт, що не міг впасти).
- **NB5 ПРИЙНЯТО:** назва `handleNodePointer` (driving-port, §11-A2), не `onNodePointer`/«Observer».
- **NB6 ПРИЙНЯТО:** інв#4 дійсний лише після репойнту ВСІХ ~10 vocab-сайтів + зняття shim (до кінця T3a).
- **N1/N2 ПРИЙНЯТО:** buildRenderOptions :857; `ref=null` для canvasClick-фону.

## Закрито в grilling
- **Раунд-1 гейта пройдено:** 7 знахідок (2×B1 збіг, B2, B3, + NB2/4/5/6) увібрані в контракт; render-resolve-посилку перевернуто чесно. Відкрите: re-gate на переозначений контракт перед кодом; design-пункт `dropTargetAt`/`DropTargetIndex` placement (на коді T3c).
- Межа «що лишається в адаптері» при інверсії: малювання selection/overlay + hit-арбітраж — ТАК, лишаються (§11-B1/C); усе інше (стан, пороги, семантика, drop-рішення) → #4.
