claude-opus-4-8

# T3 gate-review (незалежний) — робочий файл

ДАЛІ: читаю спеку T3-renderer-port.md, recon-файли (camera + interaction-inversion), канон §9/§11/§12/§17/§20-T3, і код sdk/src для звірки заявлених file:line.

## ФАКТ — звірка file:line спеки по коду (усе CONFIRMED)
- DiagramRenderer.render() async, резолв після `highlightReady=true` :470, НЕ чекає paint. CONFIRMED (:427-471).
- RenderOptions 13 колбеків :71-119. CONFIRMED.
- Viewport.apply() :429 пише world.position/scale + `onChange?.(getTransform())` :432. CONFIRMED.
- PixiHost.fitView повертає false на null bounds :218. CONFIRMED точно.
- personInteractions 4px move :230; lod-gate `currentLod()!=='near'` :192; dragMode==='none' :194. CONFIRMED.
- PixiHost: Viewport над `renderer.layers.root` :318; attachWheel/attachPinch на app.canvas :327-328; bindPan beginPan БЕЗ порогу :356-359, коментар stopPropagation :357; `renderer.onNeedsPaint=()=>requestPaint()` :325; setOnViewportChange onChange→requestPaint :226-232. CONFIRMED.
- ContourPainter.ts:15 `import type {SeatDrop}` — type-only. CONFIRMED (§11-A4 вірний).
- onCanvasClick DiagramRenderer :455. CONFIRMED.
- Facade: host.renderer.render :794; canReparent= :833; afterRender :963 кличе requestPaint БЕЗ await render(); renderNow await в IIFE :794-803. CONFIRMED.
- Контрольна проба реальна: personInteractions.test.ts:99 `onPersonClick).toHaveBeenCalledWith('per1','pos1',expect.anything())`; nodeInteractions.contract.test :230/:251 onMenu {clientX,clientY}. Після T3c ламаються → CAN fail. CONFIRMED.
- Модифікатори: handleNodeSelect(node,mods) :611/:885/:904; SelectionStore:64 `isSelectionToggleModifier(mods)`; readSelectionPointerMods(e) selection.ts:77. CONFIRMED — #4 ПОТРЕБУЄ mods.

## РІШЕННЯ — знахідки

### BLOCKING-1 (completeness/contract): onNodePointer(ref,kind,screenPoint) ГУБИТЬ канал модифікаторів
spec:21,38,40. Спека віддає #4 «modifier-toggle (:161)», але сигнатура onNodePointer несе лише ref/kind/screenPoint; screenPoint = «e.global+e.client» (координати). ctrl/shift/meta НЕ передаються. Код: SelectionStore.ts:64 `if (mods && isSelectionToggleModifier(mods))`, facade handleNodeSelect(node,mods) :885/:904. Канон §9 мав `handleNodePointer(e: NodePointerEvent)` — об'єкт, що ніс би mods; спека регресувала до позиційних арг і втратила канал. Фікс: onNodePointer приймає СИРИЙ pointer-об'єкт (NodePointerEvent з {ref,kind,screenPoint,mods/raw modifiers}) або 4-й параметр mods; #4 робить readSelectionPointerMods.

### NON-BLOCKING-2 (seam): camera-lift лишає подвійне володіння world + не перепідключає paint-тригер
spec:34. «apply() параметризувати над duck-typed world» + «#4 рахує й кличе applyCamera вниз» — дві різні моделі. Viewport конструюється над `renderer.layers.root` (PixiHost:318); якщо інстанс переходить у #4 as-is, #4 тримає пряме посилання в Pixi-контейнер адаптера (leak). apply() :429 ще й фає onChange, а onChange→requestPaint живе в PixiHost.setOnViewportChange:226-232 + onNeedsPaint:325 — при виносі Viewport цей paint-канал не перепідключений. Фікс: зафіксувати, що applyCamera (down) у адаптері САМ кличе requestPaint (заміняє setOnViewportChange-coupling), а #4-Viewport пише у shim-world, що форвардить у applyCamera, НЕ в layers.root напряму.

### NON-BLOCKING-3 (render-resolve): Promise-звуження перетинає межу DiagramRenderer/PixiHost; сигнал чистіший
spec:35,68. render() у DiagramRenderer, а paint (rAF-coalesce) у PixiHost; afterRender:963 кличе requestPaint БЕЗ await render(). Щоб render()-Promise резолвився «після paint-measurable», DiagramRenderer мусив би чекати paint, якого він не володіє → шов НЕ мінімальний. Наявний awaiter — renderNow IIFE :794-803 (епоха/tracker). Зміна таймінгу резолву впливає на всіх awaiter'ів. Фікс: віддати перевагу явному onMeasurable-сигналу (з PixiHost, який володіє paint), НЕ міняти резолв-семантику render(); перелічити awaiter'ів перед зміною.

### NON-BLOCKING-4 (гейт, що може не впасти): контракт-тест «3px → НЕ dragEnd»
spec:67. Поточний поріг 4px (personInteractions:230) вже дає not-dragEnd на 3px → тест зелений ДО і ПІСЛЯ інверсії; він міряє 0-дельту, а не структурний перенос порогу. Щоб проба ловила інверсію — мусить асертити, що адаптер ЕМІТНУВ сирий move/pointer угору на 3px (поріг відсутній в адаптері), а не лише «dragEnd не викликався». Справжній детектор інверсії — контрольна проба (personInteractions.test:99) — валідний.

### NON-BLOCKING-5 (wording/seam): InteractionInput змішує Observer і driving-port
spec:21. `onNodePointer` (on* = адаптер експонує, #4 підписується / Observer) поряд із `handleViewportGesture` (handle* = #4 реалізує, адаптер кличе / driving-port). Канон §11-A2 обрав driving-port (`handleNodePointer(e)`, #4 implements, адаптер кличе). Фікс: вирівняти іменування й модель wiring з каноном (одна модель).

### NON-BLOCKING-6 (completeness): T3a — inv #4 «render→interaction=0» vs reexport-shim
spec:30,51. Спека явно репойнтить лише 2 drop-сайти (ContourPainter:15, DiagramRenderer:54) до core, але recon-2 §9-A перелічує ~10 type-only vocab-сайтів (promoteMath:3-4, SceneRegistry:2, DiagramRenderer:6/:33-36, personInteractions:11, orgCardInteractions:8, cardContextMenu:2). Опція «тонкий reexport-shim на перехід» лишає фізичні ребра → inv #4 (0 ребер) хибний, поки shim живий. Фікс: план має (а) перелічити ВСІ vocab-сайти як ціль репойнту, (б) заявити, що shim знімається до кінця T3c, тож inv #4 верифіковний на завершенні.

### OBSERVATION (не блокує): T3a = відкладена робота T2
Канон §20 призначив #5 core-базу як «передумову T2+»; recon-2 §8 довів, що T2 її НЕ створив. T3a коректно це ловить і абсорбує, але це розширює T3. Межі комітів (spec:72) чисті; revert-порядок T3c→T3b→T3a.

### Стадизація — вердикт
T3a→T3b→T3c коректна. T3a незалежна (можна першою). T3a насправді передумова T3c (інверсія), НЕ T3b (порт) — spec:75 формулює «передумова» точно. Проміжні стани тестовані (tsc-проба T3a, поведінкові тести T3c), не борг, за умови зняття shim (NB-6).
