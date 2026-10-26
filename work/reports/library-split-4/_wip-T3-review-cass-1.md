# T3 renderer-port — незалежне gate-рев'ю (Cass-1, свіжі очі)

Model ID: claude-opus-4-8

ДАЛІ: читаю спеку T3-renderer-port.md + обидва recon-файли + канон §9/§11/§12/§17/§20-T3, тоді звіряю заявлені file:line по реальному коду packages/sdk/src/.

## ФАКТ — звірка file:line (усе підтверджено по коду)
- RenderOptions 13 колбеків `DiagramRenderer.ts:71-119` ✓; onPersonClick :85-89 несе `mods?: SelectionPointerMods`; onOrgClick :76 несе mods; onPersonContextMenu :92-96 несе `Required<ContextMenuPointer>`; onPersonDragEnd :103 несе `(positionId, col, row)`; onPersonReparent :105 несе `(positionId, managerId)`; onCanvasClick :106 (без ref).
- Фасад :243 host, :476 refreshMediaUrls, :508 get renderer, :794 render, :833 canReparent, fitView :1038/:1129, setViewport :1765 ✓. buildRenderOptions РЕАЛЬНО :857 (spec line 7 каже «:876-943» — дрейф; recon-2 вірний).
- promoteTypes.ts: import ContextMenuNodeData (interaction) + NodeKind (interaction) + **WorldBox з ./promoteMath.js (RENDER)**. promoteMath.ts import LodLevel(./lod) + ViewportTransform(./Viewport) — render-coupled; і re-export PromoteCandidate з promoteTypes → type-only цикл promoteTypes↔promoteMath.
- render() resolve :436 guard destroyed→return(resolve), :439 renderEpoch, :466 isRenderCurrent→return; resolve на :470 highlightReady ДО paint. requestPaint :254/rAF :257 coalesce. destroy :377 cancel paintHandle.
- personInteractions endDrag: snapTo(node.x,node.y)→col/row → onPersonDragEnd(positionId,col,row) :287; reparent → trackTarget→dropTargetAt(x,y)→DropTargetIndex.nearest→targetId → onPersonReparent. previewDrag кличеться на КОЖЕН pointermove.

## BLOCKING

### B1 (T3c, contract line 21 + :38-40) — onNodePointer(ref,kind,screenPoint) ВТРАЧАЄ SelectionPointerMods
onOrgClick(orgId, mods) :76 і onPersonClick(personId, positionId, mods) :85-89 несуть `SelectionPointerMods` (ctrl/meta/shift). Контракт визначає третій арг як `screenPoint` = «e.global + e.client» (:38, recon-2 §39) — це ТОЧКА, не модифікатори. #4 робить isSelectionToggleModifier (interaction/selection:161) → toggle vs replace select. Без mods ctrl/shift-мультивибір ламається → видима дельта, що суперечить інваріанту #5 (0-дельта). Контрольна проба §69 перевіряє лише `onNodePointer(ref,'click',pt)` → ПРОЙДЕ з загубленими mods → гейт регресію НЕ ловить.
ФІКС: визначити payload третього арга як pointer-snapshot {global, client, mods:{ctrl,meta,shift,button}} (або передавати сам FederatedPointerEvent), і дописати контракт-тест, що мод-прапорці доходять до #4.

### B2 (T3c, :38/:43 + recon-2 §10) — drag col/row і reparent targetId не реконструюються зі screenPoint; нема dragMove up-каналу і нема preview down-каналу в порту
onPersonDragEnd несе РОЗВ'ЯЗАНІ col/row (render рахує snapTo від layer-local позиції картки мінус grabOffset, не від pointer; dragGrid — render-стан). onPersonReparent несе targetId з DropTargetIndex (просторовий індекс намальованих seat-боксів, DiagramRenderer:247/578). `onNodePointer(ref,'dragEnd',screenPoint)` з однією screen-точкою цього не відтворює: (a) snapTo потребує drag-local координату+grabOffset+dragGrid — render-внутрішнє, не screenPoint; (b) reparent потребує DropTargetIndex — теж render. Контракт порту (render/applySelection/applyCamera/measureVisibleBounds/destroy) НЕ має ні point→cell запиту, ні каналу «покажи preview-cell» вниз, хоча previewDrag малюється на КОЖЕН pointermove. Kind-список (:38) має лише dragEnd — dragMove/dragStart відсутні, тож жива preview-морф-анімація контуру втрачається. Переносити рішення в #4 без цих каналів = або повернути point→cell в адаптер (de-facto hitTest у порт — owner сказав НІ), або зламати 0-дельту.
ФІКС: до коду T3c визначити в контракті: (1) kind dragMove (+dragStart якщо треба), (2) що саме несе drag-payload (drag-local world-point або вже cell), (3) down-канал порту для preview-cell (напр. applyDragPreview(cell|null)), (4) як #4 дістає DropTargetIndex-резолв (query-метод порту чи індекс переїжджає в #4 з геометрією боксів). Без цього «drop-math у #4, 0-дельта» недоказовий.

### B3 (T3a, :28-30 + §10) — перенос promote-типів у core тягне render-залежність (WorldBox→promoteMath→Viewport/lod)
Spec §10 і T3a заявляють promote-типи «зникають від словник→core», «0 зміни поведінки — суто relocation». Але promoteTypes.ts:3 import `WorldBox` з render/promoteMath.ts, а promoteMath.ts:1-2 import render-side LodLevel/ViewportTransform і re-export PromoteCandidate назад з promoteTypes (type-only цикл). Якщо promote-типи їдуть у core, а WorldBox лишається — виходить **core→render upward-ребро** (гірше за render→interaction, що його T3 знищує) і розрив циклу через пакетну межу. Spec НЕ називає долю WorldBox/promoteMath у move-сеті.
ФІКС: явно вказати в T3a — або WorldBox (чиста геометрія {x,y,w,h}) теж переїжджає в core (тоді worldBoxToScreen лишається в render, import core — напрям ОК), або promote-типи НЕ рухаються в T3a. Інакше relocation вводить нове upward-ребро під виглядом «0-дельти».

### B4 (T3b, :35) — render()-resolve-after-paint без обробки destroy/stale → #4 `await render()` зависає
T3b пропонує резолвити Promise render() лише після першого paint-measurable (rAF-coalesce). Нині render() резолвиться на highlightReady :470 ДО paint і ЗАВЖДИ резолвиться (навіть на stale: isRenderCurrent→return). Якщо прив'язати resolve до rAF-paint, то destroy() :380 скасовує paintHandle і ставить destroyed — rAF-колбек не викличе app.render(), і прив'язаний Promise НЕ зарезолвиться → #4, що робить `await renderer.render()` перед камера-оп, зависає назавжди. Повторний render до resolve першого: coalesce зводить обидва в один paint — семантика «який paint резолвить який Promise» не визначена (renderEpoch відкидає stale-гілку return'ом, але новий resolve-after-paint контракт це не покриває).
ФІКС: специфікувати, що destroy() і stale-epoch МУСЯТЬ settle (resolve) будь-який pending render-after-paint Promise; визначити мапінг coalesced-paint↔pending-Promises (напр. усі pending до цього paint резолвляться разом). Додати саботаж-тест: destroy під час pending render → await НЕ висить.

## NON-BLOCKING
- N1 (spec line 7): buildRenderOptions цитовано «:876-943», реально :857. Дрейф посилання; recon-2 вірний. Поправити цитату.
- N2 (:38 canvasClick): onNodePointer(ref,...) вимагає ref, а canvasClick не має вузла (onCanvasClick :106 без арг). Треба конвенція sentinel/null-ref для фону (фасад :876-881 → applySelection(null)). Назвати в контракті.
- N3 (інваріант #2, :49): measureVisibleBounds — реальний метод `getContentBounds()` :413, єдиний consumer fitView (лифтиться в #4 у T3b). Перейменування-аліас у T3, матеріалізація в T4 — прийнятно; стежити, щоб у T3 порт-метод отримав реального caller (#4 камера-оп), інакше напів-живий. Не блокує.
- N4 (контекстне меню — ПЕРЕВІРЕНО, НЕ втрата): onPersonContextMenu несе Required<ContextMenuPointer>{client+canvas}; screenPoint={global,client} це покриває (патерн cardContextMenu:16-21). Spec тут коректний.

## ВЕРДИКТ
ГЕЙТ ЧЕРВОНИЙ. 4 blocking (B1 mods-loss, B2 drag/reparent-канали, B3 promote→core upward-dep, B4 render-resolve deadlock). Усі — семантика/канали, недоговорені ДО коду; інваріант «0-дельта» як написано недоказовий для click-mods і drag. Фікс — доозначити контракт (payload третього арга, kind dragMove, preview down-канал, доля WorldBox, destroy-settle) ПЕРЕД T3a-кодом. Scope-вибір (повна §9-інверсія) не оспорюю — owner-ухвалено.
