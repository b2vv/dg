model: claude-opus-4-8

# T3 re-gate (dg split) — незалежний сліпий критик, раунд-1 дельти

ДАЛІ: читаю дельти + контракт + код. Прожарюю ЛИШЕ дельту D1-D5.

## Звірка коду (факти з path:line)
- `DiagramRenderer.render()` :425 → Promise, резолв :469 після drawSelection/applyPromoteVisibility; НЕ прив'язаний до paint. ✔ (D3 передумова вірна)
- `getContentBounds()` :411 читає `scene.contentBounds()` + chromeBounds (remembered boxes), СВІДОМО не Pixi getBounds (:1148-1149 коментар). Бокси ремемберяться СИНХРОННО під час render() (rememberBox у addStaffPersonCards :918, rememberChrome :725). render() awaitить contour paint (:789).
- `afterRender` :964 кличе host.requestPaint() ПІСЛЯ await render() (OrgHierarchyDiagram :808) — paint поза render-резолвом. ✔
- `renderCoalesce` (T104, renderCoalesce.ts:7-13): кожен caller отримує promise ПАСУ, що намалював ЙОГО стан. expandOrg: await render() :1035 → fitView :1039 синхронно → працює СЬОГОДНІ без paint-очікування.
- D2 drag: grabOffset у DragState personInteractions.ts:102-103,:211-212 (власник=адаптер PersonInteractions); snapWorldToCell :314; 4px :230; previewDrag КОЖЕН move :245; free-follow dragged-card node.position.set(nx,ny) :233 КОЖЕН move (несnapнутий); onPersonDragEnd :287. Guard-и stale: this.drag null-check :225/:249, pointerId :226/:250. dragStart×2 → this.drag перезапис :206.
- D1 mods: SelectionStore.ts:63-64 handlePointerSelect(node,mods) — без mods → replace замість toggle (мультивибір ламається) ✔. SelectionPointerMods selection.ts:66-70 = {ctrl,meta,shift} БЕЗ button. isPrimaryPointerTap selection.ts:90 = button!==2 (адаптер-бік). cardContextMenu.ts:16-21 report {clientX,clientY,canvasX,canvasY}=e.client+e.global ✔.
- D4 камера: Viewport math zoomAt:418/panBy:363/computeFitTransform:120/fitBounds:156/animateTo:173/goTo:404 — чіпає лише this.x/y/scale+screen; ЛИШЕ apply():429 чіпає this.world (:430-431)+onChange. animateTo clock інжектований (:21). clamp у math: setTransform:84/zoomAt:419/computeFitTransform:138/animateTo:183; Number.isFinite guards :81-85,:364. minScale/maxScale = Viewport поля :38-39 з PixiHostOptions :114-115→:319-320. onChange→requestPaint PixiHost.setOnViewportChange :226-232; renderer.onNeedsPaint :325.
- D5 shim: НЕМА reexport-shim. interaction/types.ts:1 + interaction/index.ts:60 коментарі «перенесені у ../core», прямий репойнт. core/index.ts реекспортує з ./types,./nodeKey,./nodeRefs,./nodeTestId. Жодного `export ... from '../core'` в interaction/*. Boundary-gate: .oxlintrc.json має import-plugin, АЛЕ жодного render↛interaction правила (import/max-dependencies off, лише no-self-import). dependency-cruiser.config.cjs лише в .agents/skills template + worktrees, НЕ в sdk CI. Shim скомпілювався б (tsc зелений) → автоматично не ловиться.

## ВЕРДИКТИ

### D1 — handleNodePointer(e) з mods — ВИТРИМУЄ / non-blocking
mods{ctrl,meta,shift,button}+screen{global,client} покривають УСІ наявні канали: мультивибір (SelectionStore:64), primary/right (isPrimaryPointerTap button!==2), ctx-point (cardContextMenu client+canvas). Повнота ✔.
Два non-blocking зауваги:
1. `button` у mods ЙМОВІРНО надлишковий для #4: §11-B1 (contract :57) каже адаптер емітить УЖЕ розрізнене (click vs contextMenu) — тобто адаптер сам робить isPrimaryPointerTap, #4 button не перечитує. Поле радше мертве. Mild over-spec.
2. Плоский тип NodePointerEvent (contract :29-34) структурно допускає безглузде ref=null+kind:'dragStart'. На практиці не емітиться (фон-drag = viewport gesture через stage PixiHost:356, НЕ node-pointer). Discriminated union (ref=null ⇒ kind:'click') зробив би нелегальні стани непредставними. Type-hygiene, не діра.

### D2 — drag-канали — ВИТРИМУЄ / non-blocking (з явним флагом)
- grabOffset власник: ДЕРИВУЄТЬСЯ як #4. Контракт (:37 «адаптер лише шле сирий world-point») ⇒ #4 рахує grabOffset = dragStart-point − card-origin (origin #4 знає з layout T2). Консистентно, не діра.
- гонка/повтор: dragMove-після-dragEnd + dragStart×2 + wrong-pointer вже фільтруються guard-ами :225/:226/:249/:250, і контракт (:61) каже адаптер шле lifecycle (тобто лишається stateful «чи я дрегаю») — фільтр лишається адаптер-бік як зараз. Не новий hole.
- latency/реентрантність: applyDragPreview не типований Promise у контракті (:21) ⇒ sync, як нинішній previewDrag :245 — 0 доданої latency; малювання не емітить події ⇒ 0 реентрантності. ВАРТО вписати «applyDragPreview/applyCamera/applySelection синхронні, async лише render()».
- ЄДИНА реальна мовчанка: free-follow dragged-card (:233, node.position.set КОЖЕН move, несnapнуто) контракт НЕ призначає. applyDragPreview(cell) мапиться на SNAPPED-preview (:245/:21), не на :233. Контракт :61 «адаптер шле ... + малює applyDragPreview» не згадує free-follow. §11-C (малювання лишається адаптеру, як applySelection-overlay) дає детермінований контракт-консистентний висновок: free-follow = адаптер-local drawing. Тонкість, не суперечність. РЕКОМЕНДАЦІЯ: один рядок, що free-follow dragged-sprite лишається адаптеру (інакше «адаптер лише шле» читається як round-trip на найгарячішому жесті).

### D3 — onMeasurable-сигнал — BLOCKING-діра
Дві зчеплені вади:
1. **Coalesce↔pending мапінг ЯВНО не визначено** (contract :52 «визначити явно»). Він liveness-критичний (саме заради liveness onMeasurable і введено — «destroy/stale МУСЯТЬ settle»). Кодувати liveness-коректний сигнал з невизначеного мапінгу не можна → контракт НЕ закрив власну liveness-тезу.
2. **Сигнал надлишковий для scope T3.** measurable-дані (getContentBounds :411) валідні вже на render()-резолві: читаються з remembered boxes (СИНХРОННО під час render(), не Pixi getBounds :1148), render() awaitить contour paint :789. renderCoalesce (T104) ВЖЕ резолвить кожен render()-promise для пасу, що намалював стан КАЛЕРА → `await render()` + getContentBounds дає measurable-bounds з коректною per-caller coalesce-identity. ДОКАЗ наживо: expandOrg await render() :1035 → fitView :1039 синхронно, працює сьогодні БЕЗ очікування paint. Окремий broadcast onMeasurable(cb) РЕ-ВІДКРИВАЄ coalesce↔pending мапінг, який promise render() вже закрив (promise несе identity, broadcast-callback — ні). Це і є джерело невизначеності з п.1.
Re-gate МУСИТЬ вимагати ПЕРЕД кодом T3b: або (a) назвати конкретного T3-споживача, якому треба paint-measurable (пікселі), не bounds — що виправдало б onMeasurable; або (b) викинути onMeasurable на користь `await render()`+getContentBounds. Як написано = відкритий liveness-hole + redundant abstraction (AI-slop). Три сценарії :89 повні ЛИШЕ якщо onMeasurable лишають; при варіанті (b) усе покривають наявні render()/renderCoalesce/reportIfRenderFails.

### D4 — камера-lift — ВИТРИМУЄ / non-blocking
Math BYTE-переноситься чисто: zoomAt/panBy/computeFitTransform/animateTo/goTo чіпають лише this.x/y/scale+screen; ЛИШЕ apply():429 чіпає world; clock animateTo інжектований (:21). Чистий розріз: state+math→#4, apply()→адаптерний applyCamera (world.set :430-431 + requestPaint, contract :51). Clamp ДЕТЕРМІНОВАНО #4 (живе в math :84/:419/:138/:183) → scale=0/NaN зловлені Number.isFinite+clamp, що їдуть з math (:81-85,:364). Дві non-blocking мовчанки: (a) межі minScale/maxScale (Viewport:38-39 з PixiHostOptions) треба пропхати в #4 — контракт мовчить; (b) applyCamera-до-mount + зовнішній onViewportChange/getViewport споживацький шлях (PixiHost:226-232) хто емітить post-split — контракт мовчить; наявний null-viewport no-op покриває pre-mount. Impl-деталі T3b, не діри.

### D5 — shim/boundary-gate — ВИТРИМУЄ / non-blocking
Shim НЕ існує — T3a-1 релокація прямим репойнтом (interaction/types.ts:1, interaction/index.ts:60, 0 reexport з core). Boundary-gate НЕ заведений: .oxlintrc.json import-plugin БЕЗ render↛interaction правила; dep-cruiser лише в skill-template/worktrees, не в sdk CI. Shim скомпілювався б (tsc зелений) → лише ручний grep ловить, РІВНО як контракт зізнається (:92 «завести мінімальний»). Оскільки T3a-1 вже shimless — залишковий ризик низький; контракт чесний і scoped. Non-blocking, з приміткою: enforcement інв#4 залежить від gate, якого ЩЕ НЕМА і який сам недовизначений (що перевіряє, як у CI).

## ЗВЕДЕННЯ
Blocking: 1 — **D3** (onMeasurable: невизначений coalesce↔pending мапінг + надлишковість проти render()-резолв+getContentBounds).
Non-blocking: D1, D2, D4, D5 (кожна з конкретним рекомендованим one-liner'ом; D2 free-follow та D4 clamp-bounds/pre-mount — найвартісніші примітки).
