# T3 — Renderer/Camera Recon (RendererPort + InteractionInput)

Repo: ~/projects/dg | branch bulk-mutations | HEAD 17b237e
Мета: факти для виокремлення Pixi-рендера за RendererPort + підняти камеру в оркестратор.

ДАЛІ: інвентаризація packages/sdk/src/render/, state/, interaction/ — знайти Viewport, рендер-клас, фасад OrgHierarchyDiagram call-sites.

## 1. Камера / Viewport (render/Viewport.ts)
ФАКТ: Камера = окремий клас `Viewport` (render/Viewport.ts:34). Стан x/y/scale приватні поля (:35-37); minScale .15 maxScale 4 wheelIntensity .0015 (:25-27). Модель: screen = world*scale + (x,y) (:32).
ФАКТ: Конструктор приймає `world` = будь-який об'єкт з `position.set(x,y)` + `scale.set(x,y)` (:58-62) — тобто вже абстраговано від Pixi-типу, це структурний інтерфейс. apply() (:429-433) пише в world.position/scale і фає onChange.
ФАКТ: Gesture-математика вся тут: zoomAt (анкерний зум :418-427), panBy (:363-369), beginPan/movePan/endPan (drag-pan :371-393), attachWheel (:256-279, біндить DOM wheel; ctrl/⌘=zoom, scroll=pan), attachPinch (:285-354, 2-finger). Чисті хелпери isZoomWheel (:441), wheelPanDelta (:449) експортуються.
ФАКТ: fit-математика: computeFitTransform (:120-150, pure, повертає null на invalid/empty bounds), fitBounds (:156-165 застосовує), resetView (:167-170). Анімація: animateTo (:173-244, інжектований clock now/requestFrame/cancelFrame), goTo (:404-416, animate opt-in інакше instant).
ФАКТ: onChange-канал: setOnChange (:71), fires в apply() (:432) — публічний спосіб підписатись на зміни камери.
РІШЕННЯ(для T3): Viewport вже reuse-ready — `world` структурний, математика чиста. Для підняття в #4 треба лише параметризувати `apply()` (прибрати прив'язку до Pixi-world або лишити world інжектованим). attachWheel/attachPinch беруть HTMLCanvasElement (DOM) — це шов рендер vs оркестратор.

ДАЛІ: PixiHost.ts — fitView impl, hitTest, render(), applySelection/applyCamera, інтеракції (beginPan на pointerdown).

## 2+3+4+5. PixiHost (render/PixiHost.ts) — mount/camera/paint/pan
ФАКТ: PixiHost = mount-хост. Володіє app:Application (:132 private), **renderer = new DiagramRenderer()** (:133 `readonly` ПУБЛІЧНЕ поле — ось пряма зав'язка фасаду на конкретний клас), viewport:Viewport (:134 private).
ФАКТ: Камера — суцільний pass-through до viewport: getViewport/setViewport (:186-192), getZoom/setZoom/zoomBy (:194-205), panTo (:208-210), fitView (:213-220), resetView (:222-224), setOnViewportChange (:226-233 обгортає onChange → requestPaint+handler). setOnResize (:243 окремий, бо resize НЕ рухає камеру).
ФАКТ: render() методу в PixiHost НЕМА. Малювання = requestPaint() (:254-262): coalesce через rAF → app.render(); autoStart:false + app.ticker.stop() (:293,304) — paint-on-demand. НЕ Promise, не чекає paint. «Поверхня виміряна» сигнал = лише setOnResize (:243, по ResizeObserver :346), окремого «scene painted / bounds ready» сигналу немає.
ФАКТ(fitView impl): PixiHost.fitView (:213) читає this.renderer.getContentBounds() (:217), повертає false на null-bounds або null-viewport (:218) → **підтверджує канон «PixiHost.ts:218 повертає false на null-bounds»** (реальний рядок 218).
ФАКТ(камера-init): Viewport конструюється над this.renderer.layers.root (:318) — world-контейнер = шар рендера. attachWheel/attachPinch на app.canvas (:327-328), bindPan(app) (:329).
ФАКТ(pan арбітраж — канон PixiHost.ts:357): bindPan (:351-370): stage.eventMode='static', на 'pointerdown' button 0/1 → viewport.beginPan(e.pointerId, e.global.x, e.global.y) **БЕЗ порогу** (:356-359). Коментар :357 «Nodes call stopPropagation; background hits reach the stage» — арбітраж node-tap vs pan = через stopPropagation на вузлах, не через threshold. globalpointermove→movePan (:361), pointerup/upoutside/cancel→endPan (:364-369).
ФАКТ: публічні getRendererKind (:268 webgl/canvas/null), setBackground (:275), getCanvas/getApplication (:166-172). PixiHostOptions (:106-116): background/minScale/maxScale/resolution/signal/renderer.
ФАКТ: destroy() (:377-409) — повний teardown: viewport.destroy, renderer.destroy, app.destroy, canvas.remove.

## 3. hitTest (point→nodeId)
ФАКТ: Методу з іменем `hitTest` НЕМА ніде в sdk (grep порожній). Point→node вирішується ДВОМА шляхами, жоден не є публічним API:
  (a) Pixi-власна інтерактивність: кожен node-view = interactive Container з обробниками; вузол кличе stopPropagation, фон доходить до stage (PixiHost.ts:357 коментар). Виклики вгору йдуть через RenderOptions-callbacks (нижче).
  (b) drag-drop seat lookup: `resolveSeatDrop` (interaction/positionMove.ts) + `dropTargets: DropTargetIndex` (DiagramRenderer.ts:266 private) — логічний grid-cell→seat, не піксельний pick. DiagramRenderer.getContentBounds коментар :1150 свідомо уникає Pixi getBounds().
РІШЕННЯ(T3): «зробити hitTest приватним у Pixi» — наразі hit-тест вже НЕ експонований як окремий метод; він розмазаний по Pixi-event-системі + DropTargetIndex (вже private). Канонічний «hitTest» у цьому репо не матеріалізований як публічна поверхня — перевірити з автором чи мова про DropTargetIndex / Pixi eventMode.

## 2. Фасад → рендер: ВСІ прямі зав'язки на конкретний клас
ФАКТ: Фасад тримає `private host: PixiHost | null` (OrgHierarchyDiagram.ts:243), створює PixiHost.create (:432), geter `private get renderer(): DiagramRenderer | null => host?.renderer` (:508-510). Обидва конкретні класи, НЕ інтерфейси.
ФАКТ: ЄДИНИЙ виклик render(scene): `host.renderer.render(drawing, nodeTheme, resolved, config, options, orgLayoutResult, staffCanvasResult)` — OrgHierarchyDiagram.ts:794 (у renderNow). Також `host.renderer.canReparent = …` (:833), `instance.renderer?.refreshMediaUrls` (:476).
ФАКТ: applySelection-еквівалент: `repaintSelection()` (фасад :880/887/906) → DiagramRenderer.repaintSelection (public :493) → drawSelection (private :601). Highlight: repaintHighlight (фасад :966) → applyHighlight на view (:521).
ФАКТ: applyCamera-еквіваленти (всі через host, НЕ renderer): setViewport (:1765), setZoom (:1853), zoomBy (:1858), panTo (:1140/1862), fitView (:1038/1129/1870), resetView (:1879), getViewport/getZoom/getScreenSize (:1761/1769/1797). Init-підписки: host.setOnViewportChange (:444), host.setOnResize (:452), host.getZoom (:458). Інше host.*: setBackground (:818), requestPaint (:964/1621), getCanvas (:1239), getRendererKind (:1546), getApplication (:2134, export).
РІШЕННЯ(T3 RendererPort): фасад уже спілкується з камерою ЛИШЕ через host-методи (готовий шов). render(scene)/applySelection(repaintSelection)/measureRenderedBounds(getContentBounds) — на host.renderer (DiagramRenderer). Фасад-рівень: мінімум 2 прямі `host.renderer.*` у гарячому шляху (:794, :833) + getter :508.

## 4. Lifecycle-fit (звірка з каноном)
ФАКТ: fitView call-sites у фасаді — канон казав :937/:1028, РЕАЛЬНІ: :1038 у `async expandOrg()` (T53 перший matrix→row-tree expand кадрує піддерево), :1129 у `async collapseAllOrgs()`. Обидва `this.host?.fitView(48, { animate: true })`. Публічна обгортка fitView() — :1866-1872 (повертає host.fitView ?? false, потім onViewportTransform).
ФАКТ: fitView impl — PixiHost.fitView :213-220, читає renderer.getContentBounds(), **повертає false на null-bounds або null-viewport (:218)** — канон «PixiHost.ts:218» підтверджено точно.
ФАКТ: інші програмні камера-операції в lifecycle: panToNode (:1140 host.panTo center-of-box), focusNode/revealPath (render ПОТІМ focus, бо до layout у вузла нема box — :488-492), init create() reveal (:491). onViewportTransform оновлює lodLevel.

## 5. render() resolve
ФАКТ: DiagramRenderer.render = `async … Promise<void>` (:427-471). Резолвиться ПІСЛЯ: renderStaff/renderOrganizations await (:462/464) + isRenderCurrent-гейт (:466) + drawSelection + applyPromoteVisibility + highlightReady=true (:468-470). renderEpoch (:439) відкидає застарілі async-проходи.
ФАКТ: render() НЕ чекає paint. Малювання окремо: onNeedsPaint→PixiHost.requestPaint (coalesce rAF→app.render, autoStart:false/ticker.stop). Сигналу «поверхня виміряна/намальована» НЕМА; найближче — setOnResize (:243, по ResizeObserver). afterRender (:963) кличе host.requestPaint() вручну після render-await.

## 6. measureRenderedBounds / bounds
ФАКТ: DiagramRenderer.getContentBounds() (:413-418) = unionBoxes([scene.contentBounds(), chromeBounds]) у world-координатах. Це union ЗАПАМʼЯТОВАНИХ node-боксів (SceneRegistry) + намальованого chrome (rememberChrome :421), НЕ Pixi getBounds (свідомо, :1150). Відрізняється від layout.width/height тим, що це фактичний намальований екстент сцени (включно з chrome-смугою зон lastZoneLabelBand).
ФАКТ: єдиний consumer getContentBounds — PixiHost.fitView (:217). chromeBounds скидається на null на старті кожного render (:442).

## 7. Інтеракції вгору (поточна форма емісії)
ФАКТ: НЕ EventEmitter/Observer. Емісія = RenderOptions-callbacks (DiagramRenderer.ts:71-108): onOrgClick/onOrgDoubleClick/onPersonClick/onPersonDoubleClick/onPersonContextMenu/onOrgContextMenu/onOrgExpand/onOrgCollapse/onStaffOrgExpandToggle/onStaffOrgDrill/onPositionExpandToggle/onPersonDragEnd/onPersonReparent/onCanvasClick. Передаються ВНИЗ у кожен render() через options, замикаються на `this` фасаду (buildRenderOptions OrgHierarchyDiagram.ts:857-955), резолвлять late this.data.
ФАКТ: callbacks рендеряться per-view у renderStaff/renderOrganizations (напр. onPersonContextMenu прокинутий у PersonNode опції :899/:1032). canvas-click: layers.root 'pointertap' (:453) → options.onCanvasClick.
ФАКТ: node-tap vs pan арбітраж — PixiHost.bindPan :356-359: pointerdown button 0/1 → viewport.beginPan БЕЗ порогу; вузли роблять stopPropagation (коментар :357), тож tap на вузлі не доходить до stage-pan. Канон «PixiHost.ts:357 beginPan на pointerdown без порогу» підтверджено.
РІШЕННЯ(T3 InteractionInput Observer): поточний напрям — callbacks ВНИЗ (push у render options). Driving-port InteractionInput (емісія ВГОРУ / Observer) = НОВИЙ зворотний напрям; доведеться інвертувати: рендер емітить події, оркестратор підписується, замість отримувати callbacks у render().

## 8. Існуючі «порт»-типи + публічний тип рендера
ФАКТ: RendererPort / InteractionInput НЕ існують (grep порожній; `childPort` у spineBusEdges.ts:161 — локальна змінна, не тип). Обидва порти T3 — з нуля.
ФАКТ: SDK index.ts експортує КОНКРЕТНІ класи: `DiagramRenderer` (:61), `PixiHost` (:62), `Viewport` (:63); типи ViewportTransform (:147), ViewportOptions, CameraMotionOptions, RenderOptions (render/index.ts), ViewportChangeMeta/Reason (:172-173). Жодного рендер-інтерфейсу. Найближче до «структурного порту» — Viewport.constructor `world` (position.set/scale.set, :59-62) — вже duck-typed.

## Гейти (звірено, НЕ запускав повний suite)
ФАКТ: `cd packages/sdk && npx rstest run` — script `test: rstest run` (packages/sdk/package.json). `@rstest/core ^0.11.10`. bin rstest є у ~/projects/dg/node_modules/.bin. Baseline ~1128/0 (канон, не переміряно).
ФАКТ: `npx tsc -p tsconfig.check.json` — файл packages/sdk/tsconfig.check.json ПРИСУТНІЙ; script `typecheck`. bin tsc локальний.
ФАКТ: `npx oxlint --max-warnings 0 <files>` — root script `lint: oxlint --max-warnings 0`, oxlint ^1.74.0, bin у root node_modules/.bin.

## ПІДСУМОК для T3
- Камера вже ізольована в Viewport (чиста математика + apply() на duck-typed world) — reuse у #4 легкий; шов рендер/оркестратор = attachWheel/attachPinch(canvas) + apply→Pixi-container.
- RendererPort: фасад уже ходить у камеру лише через host-фасадні методи; лишаються 2 прямі host.renderer.* у гарячому шляху (:794 render, :833 canReparent) + getter :508 + :476 refreshMediaUrls — ось що завести за інтерфейс.
- measureRenderedBounds = getContentBounds (:413), єдиний consumer fitView.
- hitTest публічного нема — вже «приватний» (Pixi events + DropTargetIndex); звірити намір канону з автором.
- InteractionInput Observer = інверсія поточних RenderOptions-callbacks (зараз push вниз).
