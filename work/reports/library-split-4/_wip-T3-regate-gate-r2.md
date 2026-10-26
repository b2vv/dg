claude-opus-4-8

# T3 re-gate (round 2) — прожар ДЕЛЬТИ контракту порта рендерера

ДАЛІ: читаю deltas + контракт + код. Акцент: взаємна консистентність D1↔D5, D2↔owner-no-hitTest, 0-дельта(71) vs D2/D4, відкриті пункти.

## Звірено по коду (факти)
- ФАКТ SelectionStore.ts:63-64 `handlePointerSelect(node, mods?)` → `isSelectionToggleModifier(mods)`. D1-посилка вірна.
- ФАКТ selection.ts:66-70 `SelectionPointerMods = {ctrlKey,metaKey,shiftKey}` — **БЕЗ `button`**. Контракт(33) mods має `button`. Тобто `button` — НОВЕ поле, його носій нині не mods, а подія (isPrimaryPointerTap(e):90, selection.ts:90-92, `e.button!==2`).
- ФАКТ selection.ts лишилась в interaction/ (git status: M, не R у core). NodePointerEvent.mods у контракті — inline (33), не тип із interaction → core→interaction ребра D1 НЕ створює. D1↔D5 консистентні тут.
- ФАКТ personInteractions.ts: grabOffset :211, 4px moved :230, previewDrag :245, trackTarget/dropTargetAt :300-308, snapWorldToCell :314, onPersonDragEnd(col,row) :287. Drag-стан (DragState) весь render-side. D2-посилка вірна.
- ФАКТ positionMove.ts: `resolveSeatDrop` :83, `applySeatDrop` :140, `snapWorldToCell` :21 — ЧИСТІ (DiagramPosition/grid/point, 0 Pixi). Move-резолв #4 здатен робити арифметикою. 
- ФАКТ dropTargetIndex.ts: `DropTargetIndex` будується з `NodeWorldBox[]` (рендер-геометрія); `nearest(x,y,radius)` — spatial-query. DiagramRenderer:245-256 `dropTargetAt` → `ensureDropTargets()` :576-589 будує з SceneRegistry boxes (під час paint). Геометрія reparent-таргета ЖИВЕ рендер-боці.
- ФАКТ RendererPort-поверхня (контракт 18-24): mount/render/applySelection/applyCamera/applyDragPreview/measureVisibleBounds/onMeasurable/destroy. `measureVisibleBounds` вертає union-WorldRect, НЕ per-card boxes. Каналу «віддати #4 індекс боксів» НЕМА. `listNodeBoxes()` є на DiagramRenderer:291 але НЕ в порту.
- ФАКТ Viewport.ts: вся математика (zoomAt :418, goTo :404, setTransform :79, panTo :95, computeFitTransform) — чисті числа; ЄДИНИЙ Pixi-дотик `apply()` :429-432 (world.position/scale.set + onChange). clamp у zoomAt/setTransform/goTo. Шов «math→#4, apply→adapter» чистий; прихованих Pixi-деп у math НЕМА. D4-критика (byte-identical) ВИТРИМУЄ.
- ФАКТ PixiHost.setOnViewportChange :226-232 → Viewport.setOnChange → на КОЖЕН apply(). Споживач — OrgHierarchyDiagram:445-449: (1) `onViewportTransform(t.scale)` = LOD-резолв від зуму, (2) `notifyPromoteSync()`, (3) `notifyViewportChange(t,'camera')` публічний host-колбек (debounce settled/reason :520-537). Тобто onChange фанаутить ТРИ #4-поведінки.
- ФАКТ PixiHost.requestPaint :254-262 (rAF coalesce), destroy скасовує paintHandle. render у DiagramRenderer, paint у PixiHost — клас-межа підтверджена. D3-посилка вірна.
- ФАКТ core/index.ts — БЕЗ shim (коментар: 0 import з interaction/render). interaction/index.ts — БЕЗ reexport-from-core. T3a-1 зроблено прямим репойнтом, shim нема. D5-посилка вірна.
- ФАКТ boundary-gate НЕ існує: .oxlintrc.json має import-plugin, але 0 no-restricted-imports; scripts/ — лише docs-гейти. Контракт(92) це визнає («завести мінімальний»). → інв#4 машинно НЕ перевіряється.
- ФАКТ **render→interaction RUNTIME-ребра живі зараз**: DiagramRenderer.ts:1 `reportPath` (val, вжиток :512 path-highlight), :32 `DoubleTapTracker` (val), :52 `resolveSeatDrop` (val); personInteractions.ts:3 `snapToGrid/snapWorldToCell` (val), :5-9 `isPrimaryPointerTap/isSelectionToggleModifier/readSelectionPointerMods` (val); orgCardInteractions.ts:2-6 ті самі selection-val. 
- ФАКТ Репойнт-список контракту(45) = ~10 type-only + 2 drop-сайти. НЕ містить: reportPath, DoubleTapTracker, snapToGrid/snapWorldToCell, selection-val. Threshold-ребра (doubleTap/selection/snap) зникнуть у T3c зняттям КАЛЛЕРІВ (пороги→#4). `reportPath` — НЕ поріг, НЕ vocab, НЕ drop; жоден під-крок T3 його не чіпає (критика 105: #5 звужено до vocab+drop).

---

## ВЕРДИКТИ по дельтах

### D1 — handleNodePointer(e) з mods — **ядро ВИТРИМУЄ; оболонка BLOCKING (T3c)**
- Ядро (mods у події замість позиційного) — обґрунтоване: SelectionStore:64 потребує mods; inline-mods у core не створює ребра. ВИТРИМУЄ.
- BLOCKING-діра (консистентність): `NodePointerEvent.kind` (31) містить `'doubleClick'`, а рядок 58 віддає 300ms-double-tap ІНТЕРПРЕТАЦІЮ у #4 («адаптер віддає СИРИЙ pointer, #4 інтерпретує»). Адаптер не може водночас емітити вже-злеплений `'doubleClick'` і лишити 300ms на #4. Так само: `button` у mods + рядок 58 (primary/right→#4) означають, що адаптер шле `kind:'click'` і для button=2, тоді як той самий правий клік дає ще й `kind:'contextMenu'` (rightclick, cardContextMenu.ts:13). Нинішній дедуп цього дубля — `isPrimaryPointerTap`(:151) НА боці адаптера; контракт переносить його в #4 (58), але НЕ каже як дедупити, і контракт-тести (85-86) перевіряють ЛИШЕ ctrl-toggle — правий-клік-теж-виділяє і хто-власник-double лишаються без гейта. Це рівно пастка NB4 (поріг не там + тест, що не може впасти), яку контракт закрив для drag, але відтворив тут. Межа «що адаптер ЕМІТИТЬ (сире) vs що #4 ВИВОДИТЬ» мусить бути визначена до коду T3c.

### D2 — drag-канали вгору + applyDragPreview вниз — **move ВИТРИМУЄ; reparent BLOCKING (T3c)**
- Move-гілка: snapWorldToCell/resolveSeatDrop чисті (positionMove.ts), #4 резолвить cell арифметикою з сирого world-point + grid-параметрів (layout, не Pixi). Реально уникає hitTest. Латентність: up→#4→applyCamera/applyDragPreview — синхронні виклики, requestPaint уже coalesce'иться → 0-дельта. reentrancy нема (down-канал не ре-входить up). ВИТРИМУЄ.
- BLOCKING-діра (reparent ↔ owner-no-hitTest): `dropTargetAt` — це `DropTargetIndex.nearest()` над **рендер-геометрією** (SceneRegistry boxes, dropTargetIndex.ts, DiagramRenderer:245/589). Принцип контракту(37,61) «адаптер шле сирий world-point, резолв у core/logic» для reparent НЕ здійсненний наявною поверхнею порту: RendererPort(18-24) не має каналу віддати #4 індекс боксів (measureVisibleBounds = лише union-rect). Лишаються дві незакриті гілки: (a) виростити порту канал геометрії — НЕ в контракті; (b) #4 перебудовує індекс із layout — ризик розходження з рендер-боксами (контракт сам визнає rendered≠layout, інв2/рядок7) → порушення 0-дельти для reparent-таргета. Третій результат — адаптер лишає `nearest()` собі = de-facto hitTest у порт, що owner заборонив. «Відкритий design-пункт T3c» НЕ достатньо закритий: принцип недовизначений, і одна з його реалізацій бʼє по жорсткому owner-інваріанту. Треба назвати канал геометрії й довести 0-дельту reparent ДО коду T3c.

### D3 — onMeasurable замість звуження render() — **ВИТРИМУЄ (non-blocking)**
- Посилка вірна по коду (render у DiagramRenderer, paint/requestPaint/destroy у PixiHost; привʼязка резолву до paint висла б при destroy). Окремий onMeasurable + «destroy/stale МУСЯТЬ settle» — правильний і повний (3 сценарії, 89).
- Відкрите «coalesced-paint↔pending мапінг — визначити явно» (52): non-blocking — закрите саботаж-тестом 89.3 («повтор render до measurable → coalesce не губить awaiter») + 89.2 (destroy→settle). УМОВА: ці тести мусять бути реально-падучі (дисципліна NB4), інакше liveness-гейт фіктивний. Рекомендація, не блокер.

### D4 — камера-lift — **математика ВИТРИМУЄ; non-blocking пропуск у переліку applyCamera**
- Шов math→#4 / apply→adapter чистий, math без Pixi-деп, clamp їде з math у #4 (zoomAt/setTransform). applyCamera до mount — безпечно (set на detached container). scale=NaN/0 — guard (finite/clamp) у сеттерах, що їдуть у #4; доки «math reuse, не rewrite» (98/51) тримається, applyCamera лишається тупим писарем. ВИТРИМУЄ.
- Non-blocking пропуск (0-дельта-ризик): контракт перелічує обовʼязки applyCamera як {world-write + requestPaint} (20,50-51), але Viewport.onChange, який він заміняє, фанаутить ЩЕ ТРИ #4-споживачі (OrgHierarchyDiagram:445-449): **LOD-від-зуму** (`onViewportTransform`), `notifyPromoteSync`, публічний `onViewportChange(settled/reason)`. Усі живуть на #4 і #4 стає джерелом трансформу, тож відновлювані — АЛЕ контракт їх не називає; буквальне прочитання «applyCamera пише world+paint» загубить LOD-switch/promote/host-колбек. Додати в контракт явно: #4 при обчисленні трансформу кличе ці три. (LOD-від-зуму — поведінково важливий; пропуск небезпечний, але адитивний → non-blocking.)

### D5 — інв «render→interaction=0» дійсний лише після зняття shim — **BLOCKING (інв недосяжний як заявлено)**
- shim-частина консистентна: shim нема, T3a-1 прямий репойнт (core/index.ts, interaction/index.ts звірені). «Якщо shim лишиться — ловить лише grep»: boundary-gate НЕ існує (.oxlintrc.json), контракт це визнає (92) → non-blocking за його ж планом.
- BLOCKING-діра: інв#4 заявлено як вимірюване «=0 після T3» (70, інв4: «23 сайти; 0 зворотних»), але **reportPath** (DiagramRenderer.ts:1 import, :512 вжиток, runtime render→interaction) не адресований ЖОДНИМ під-кроком T3 — не vocab(42), не поріг(58), не drop; критика(105) явно звузила #5 до vocab+drop. Після всієї enumerated-роботи reportPath лишиться render→interaction ребром → інв=0 недосяжний. Threshold-ребра (DoubleTapTracker/selection/snap) зникають у T3c зняттям каллерів — вони ОК; reportPath — ні. Інв або хибний-як-написаний, або інвентар реверс-ребер неповний. Виправлення мале (додати reportPath у перенос АБО чесно переписати інв з винятками), але доки не зроблено — заявлений «=0» гейт брехливий, а машинного гейта, що це спіймав би, нема.

## Взаємна консистентність (підсумок акценту)
- D1↔D5: КОНСИСТЕНТНІ (inline-mods, SelectionPointerMods лишається в interaction, 0 нового core→interaction ребра).
- D2(move)↔D5: КОНСИСТЕНТНІ (зняття snap/resolveSeatDrop-каллерів у T3c прибирає ті runtime-ребра — працює на інв#4).
- D2(reparent): «адаптер шле сирий world-point» НЕ уникає hitTest без неназваного каналу геометрії — приховане ребро під іншою назвою (BLOCKING).
- 0-дельта(71) vs D2 down-канал preview: тримається (синхронно, coalesce). vs D4 новий власник камери: тримається для math, АЛЕ контракт не переніс LOD/promote/host-колбек з onChange → ризик (non-blocking пропуск).
- Відкриті пункти: D3 coalesce-мапінг — достатньо закритий тестом (non-blocking); D2 dropTarget placement — НЕ достатньо (blocking); D5 інвентар реверс-ребер — неповний (blocking).

## ЗВЕДЕННЯ
Blocking: **3** — D1 (kind-enum/`doubleClick` vs 300ms→#4 + primary-right дедуп, untested, NB4-пастка), D2-reparent (DropTargetIndex-геометрія рендер-боці; порт без каналу → або виростити порт, або ризик 0-дельти, або owner-forbidden hitTest), D5 (інв#4 «=0» недосяжний — reportPath не адресований, boundary-gate відсутній).
Non-blocking: D3 (coalesce-мапінг — закрити падучим тестом), D4 (додати в контракт фанаут LOD/promote/host-колбек з колишнього onChange).
Всі 3 блокери скоуплені на T3c/інв-хвіст; **T3b (порт+камера-math) блокерів НЕ має** → T3b може йти, T3c RED доки D1/D2/D5 не закриті.
Гейт RED, доки блокери відкриті.
