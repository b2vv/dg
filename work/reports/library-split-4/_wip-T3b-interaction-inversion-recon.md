# T3b recon — інверсія напряму інтеракцій (емісія ВГОРУ через onNodePointer)

Репо: ~/projects/dg · гілка `bulk-mutations` · HEAD 17b237e · ТІЛЬКИ читання.
Вхідні з recon-1 (НЕ перевіряю): фасад OrgHierarchyDiagram.ts render:794, buildRenderOptions:857-955;
RenderOptions-колбеки у render/types.ts ~:71-108; node-tap vs pan — PixiHost.ts bindPan:356.

ДАЛІ: крок 1 — повний інвентар node-callbacks у render/types.ts (імена+сигнатури) та хто їх кличе знизу.

## КРОК 1 — Інвентар node-callbacks (RenderOptions)

ФАКТ: recon-1 помилився з файлом — колбеки НЕ в render/types.ts, а в **render/DiagramRenderer.ts** у `interface RenderOptions` :71-119.
Повний перелік (ім'я · сигнатура · хто КЛИЧЕ знизу · що фасад робить):

- onOrgClick(orgId, mods?) — DiagramRenderer.ts:76. Кличе: orgCardInteractions.ts:59,67. Фасад buildRenderOptions:882-888 → orgNodeRef+handleNodeSelect+callbacks.onNodeClick+repaintSelection.
- onOrgDoubleClick(orgId) — :78. Кличе: orgCardInteractions (dblTap). Фасад:889-891 → callbacks.onNodeDoubleClick(orgNodeRef).
- onStaffOrgExpandToggle(orgId) — :80. Фасад:892-894 → toggleStaffOrgExpand.
- onStaffOrgDrill(orgId) — :82. Фасад:895-897 → focusStaffOrg.
- onPositionExpandToggle(positionId) — :84. Фасад:898-900 → togglePositionExpand.
- onPersonClick(personId?, positionId, mods?) — :85-89. Кличе: personInteractions.ts:163,171. Фасад:901-907 → seatNodeRef+handleNodeSelect+onNodeClick+repaintSelection.
- onPersonDoubleClick(personId, positionId) — :91. Фасад:908-910 → callbacks.onNodeDoubleClick(personNodeRef).
- onPersonContextMenu(personId, positionId, pointer:Required<ContextMenuPointer>) — :92-96. Кличе: personInteractions.ts:175; DiagramRenderer.ts:899-901,1032-1034. Фасад:912-915 → seatNodeRef + this.contextMenu.open(ref,pointer).
- onOrgContextMenu(orgId, pointer:Required<ContextMenuPointer>) — :97-100. Фасад:916-918 → contextMenu.open(orgNodeRef,pointer).
- onOrgExpand(orgId) / onOrgCollapse(orgId) — :101-102. Фасад:919-928 (лише коли orgTreeChrome) → expandOrg/collapseOrg.
- onPersonDragEnd(positionId, col, row) — :103. Кличе: personInteractions.ts:287. Фасад:929-942 → movePersonToCell(.catch InteractionError).
- onPersonReparent(positionId, managerId) — :105. Кличе: personInteractions.ts:267. Фасад:943-954 → reparentPosition(.catch).
- onCanvasClick() — :106. Кличе: DiagramRenderer.ts:455 (options.onCanvasClick?.()). Фасад:876-881 → onBackgroundClick + applySelection(null) + repaintSelection.

ВИСНОВОК для onNodePointer: 13 колбеків, що зводяться до kinds {click, doubleClick, contextMenu, dragEnd(→move|reparent), expandToggle, canvasClick}. selected:NodeRef[] (:108) — вхід, не колбек.

ДАЛІ: крок 2+7 — personInteractions.ts / orgCardInteractions.ts: де ловиться pointer, що доступно (NodeRef/kind/screenPoint), як розрізняє click/dbl/ctx/drag.

## КРОК 2+7 — де ловиться pointer, що доступно, як розрізняє gesture-и

ФАКТ (behavior-у-render smell): обидва binder'и лежать у **render/**, не в interaction/:
- render/personInteractions.ts — class PersonInteractions, bind():145. Володіє DragState :97-113 (повна drag-поведінка). Імпортує з interaction/: positionMove(snapToGrid/snapWorldToCell):3, doubleTap:4, selection(isPrimaryPointerTap/isSelectionToggleModifier/readSelectionPointerMods):5-10, contextMenuPayload(ContextMenuPointer):11.
- render/orgCardInteractions.ts — function bindOrgCardInteractions():44. Ті самі interaction/-імпорти :1-8.
- render/cardContextMenu.ts — bindCardContextMenu():9, слухає 'rightclick' :13, будує ContextMenuPointer з e.clientX/Y + e.global.x/y :16-21.

ФАКТ (що доступно в точці pointer-хендлера): node-view сам НЕ несе NodeRef — id-и приходять як замикання з bind-args (personId/positionId/orgId). screenPoint доступний: e.clientX/Y + e.global (canvas) — зараз збирається лише в rightclick→ContextMenuPointer. Для click/tap screenPoint НЕ збирається (лише mods). Отже для onNodePointer(ref,kind,screenPoint): ref треба будувати з bind-замикань (вже є orgNodeRef/seatNodeRef у фасаді), screenPoint — витягати з FederatedPointerEvent (e.global + e.client), kind — з арбітражу нижче.

ФАКТ (розрізнення gesture):
- primary vs context: selection.isPrimaryPointerTap (button!==2) :90-92; rightclick окрема подія (cardContextMenu:13).
- click vs dblclick: DoubleTapTracker.tap(key) :166 (person), :62 (org) → 'single'|'double'. Поріг — ЛИШЕ час NODE_DOUBLE_TAP_MS=300 (doubleTap.ts:2), БЕЗ відстані. Ключ: `person:${personId}:${positionId}` / `org:${orgId}`.
- modifier-toggle: isSelectionToggleModifier(ctrl|meta|shift) :161 / :57 — обходить double-tap.
- tap vs drag: pointerdown→globalpointermove(hypot>4 px :230 = moved)→pointerup/endDrag. tapAfterDrag ковтає tap після drag (personInteractions:133,253).
- drag gate: currentLod()!=='near' → return (pan) :192; dragMode==='none' → return :194.

ФАКТ (поріг руху 4px :230) — теж поріг-розпізнавання, за каноном → #4/shared (зараз зашитий у render/personInteractions).

## КРОК 4 — doubleTap
ФАКТ: interaction/doubleTap.ts — class DoubleTapTracker, поріг NODE_DOUBLE_TAP_MS=300 (час-ОНЛІ, нема distance) :2,:15. tap(key,now=performance.now()) :14. Інстанс створюється деінде (deps.doubleTap), кличеться з render/*Interactions. Вже в interaction/ (правильний бік), але СПОЖИВАЄТЬСЯ render-шаром.

## КРОК 3 (частина) — selection primitives
ФАКТ: interaction/selection.ts — ЧИСТІ функції (no state): sameNodeRef:3, selectNode:9, selectMany:23, sameSelectionSet:31, replaceSelection:40, toggleInSelection:54, + pointer-mod readers isPrimaryPointerTap/isSelectionToggleModifier/readSelectionPointerMods:73-92. Стан виділення тут НЕ живе — лише трансформації. (SelectionStore — окремо, шукаю далі у фасаді/render.)

## КРОК 6 — positionMove
ФАКТ: interaction/positionMove.ts — snapToGrid:9, snapWorldToCell:21, isValidGridCell:45, resolveSeatDrop:83 (pure, SeatDrop union:56-60), applySeatDrop:140, movePositionToCell:209, shiftPositionBlock:250. snap* кличе render/personInteractions.ts:3,314,316. resolveSeatDrop/applySeatDrop — drop-math (хто кличе — перевіряю далі DropTargetIndex/фасад).

ДАЛІ: contextMenuPayload, nodeKey, nodeRefs; ContourPainter import positionMove (smell); DropTargetIndex:266; selection state (SelectionStore).

## КРОК 3 (повно) — selection state
ФАКТ: стан виділення — state/SelectionStore.ts (class SelectionStore :15, private selections:NodeRef[] :16; replace/replaceMany/toggle/clear/handlePointerSelect). Чисті set-ops делеговані в interaction/selection.ts (коментар :11-14). Store імпортує з interaction/selection + interaction/types.
ФАКТ: мутує стан — фасад OrgHierarchyDiagram: applySelection:599, applySelections:607, handleNodeSelect:611; this.selectionStore. repaintSelection (фасад):1625-1627 → this.renderer.repaintSelection(this.selectionStore.list).
ФАКТ: малювання — render/DiagramRenderer.ts: drawSelection:601 (читає переданий `selected`), repaintSelection:493 (чистить overlay layer + drawSelection), перший малюнок у render :468. Selection chrome має власний layer (LayerManager:21).
РІШЕННЯ(межа): у #4 → стан+мутація (SelectionStore вже в state/, handleNodeSelect/applySelection у фасаді). В адаптері лишається drawSelection/repaintSelection (малювання overlay). onNodePointer(click,mods) → #4 робить handlePointerSelect, тоді просить адаптер перемалювати.

## КРОК 5 — context menu payload / items / controller
ФАКТ: interaction/contextMenuPayload.ts — типи ContextMenuNodeData:11, ContextMenuPointer:19 (clientX/Y + optional canvasX/Y), ContextMenuRequest:26; resolveContextMenuNodeData(data,ref):32 — дочитує org/person/position/department з DiagramData.
ФАКТ: interaction/contextMenu.ts — defaultContextMenuItems(node,{selection}):12, bulkContextMenuItems:38 (чисті, залежать від selection+kind).
ФАКТ: interaction/ContextMenuController.ts — class ContextMenuController:39, open(node,pointer):49 (будує request: resolveContextMenuNodeData + defaultContextMenuItems + hooks().onContextMenu фільтр), run(itemId):66, dispatch:76 (expand/collapse/focus/copy-id/bulk-*). Deps: data()/selection()/hooks()/commands :26-33.
ФАКТ: фасад тримає contextMenu = new ContextMenuController(...) :320; open кличеться з onPersonContextMenu:914, onOrgContextMenu:917, + focusNode-шлях:1737. run:620.
ФАКТ: render/cardContextMenu.ts bindCardContextMenu слухає 'rightclick', будує Required<ContextMenuPointer> з e.clientX/Y+e.global і репортить ВГОРУ через колбек — тобто rightclick УЖЕ емітиться вгору (готовий патерн для onNodePointer).
РІШЕННЯ: ContextMenuController + payload + items — чиста #4 логіка (вже в interaction/, читають DiagramData/selection, НЕ Pixi). Адаптер лише ловить rightclick і дає ref+screenPoint вгору.

## КРОК 8 — shared-словник (#5) та модульна структура
ФАКТ (КРИТИЧНО): packages/sdk/src/ НЕ має core/ shared/ domain/ — find -maxdepth2 порожній. Теки: contour(у render), data, export, interaction, layout, mappers, media, react, render, state, wasm, worker.
ФАКТ: shared-словник ЗАРАЗ розкиданий:
  - NodeKind, NodeRef, MenuItem, InteractionError → interaction/types.ts.
  - nodeEntityKey/parseNodeEntityKey → interaction/nodeKey.ts.
  - orgNodeRef/personNodeRef/positionNodeRef/seatNodeRef/resolveNodeRefInData/normalizeSelected/testIdForRef → interaction/nodeRefs.ts.
  - promote-типи → render/promoteTypes.ts (import ContextMenuNodeData з interaction) + render/promoteMath.ts (import NodeKind/NodeRef+nodeEntityKey з interaction).
ВИСНОВОК: T2 НЕ створив окрему shared/core/domain-базу. §20 «#5 — передумова T2+» НЕ виконана — словник лишається в interaction/, а render/ тягне його звідти (nodeKey, types, nodeRefs). Це робить #5 (винести словник у core/shared) справжньою передумовою перед інверсією, інакше render→interaction type-only залежності нікуди не подінуться.

## КРОК 9 — render→interaction залежності
ФАКТ: 23 import-сайти render→interaction (non-test), 26 з тестами (prompt казав ×27 — у тій же околиці). Зворотних interaction→render = 0 (чисто).
Три природи:
  A) TYPE-ONLY СЛОВНИК (→ #5, зникне коли словник у core/shared):
     - promoteMath.ts:3-4 (NodeKind/NodeRef, nodeEntityKey/parseNodeEntityKey)
     - SceneRegistry.ts:2 (nodeEntityKey/parseNodeEntityKey)
     - promoteTypes.ts:1-2 (ContextMenuNodeData, NodeKind)
     - DiagramRenderer.ts:6 (nodeKey), :33 (SelectionPointerMods), :34 (ContextMenuPointer), :35 (normalizeSelected), :36 (NodeRef)
     - personInteractions.ts:11 (ContextMenuPointer type), orgCardInteractions.ts:8 (ContextMenuPointer type)
     - cardContextMenu.ts:2 (ContextMenuPointer type)
  B) ПОВЕДІНКА (→ має переїхати в #4 або емітитись вгору; це справжня інверсія):
     - personInteractions.ts:3 (snapToGrid/snapWorldToCell — drag-math), :4 (DoubleTapTracker), :10 (selection pointer-mod readers)
     - orgCardInteractions.ts:1 (DoubleTapTracker), :7 (selection readers)
     - DiagramRenderer.ts:32 (DoubleTapTracker runtime), :1 (reportPath)
  C) SMELL ContourPainter (drop-math у painter):
     - render/contour/ContourPainter.ts:15 import type { SeatDrop } from '../../interaction/positionMove.js' (+ resolveSeatDrop у коментарях :293-377). T3 має прибрати drop-math з painter → #4.
     - DiagramRenderer.ts:54 import { resolveSeatDrop, type SeatDrop } — runtime drop-math у рендері (теж B/C — має піти у #4).

## КРОК 6 (повно) — drop-math wiring у рендері (behavior, що інвертується)
ФАКТ: render/DiagramRenderer.ts будує PersonInteractionDeps із drop-поведінкою:
  - resolveSeatDrop({positions,positionId,target,from:mover.gridCell}) :237 — всередині previewDrag-deps (рендер САМ рахує drop).
  - dropTargetAt(x,y,skipId) :247 → ensureDropTargets():578 → new DropTargetIndex(boxes,cellW,cellH):591.
  - canDropOn(positionId,managerId) :259 → this.canReparent?.(...).
  - import resolveSeatDrop,SeatDrop :54; DropTargetIndex :5.
ФАКТ: render/contour/ContourPainter.ts:15 import type {SeatDrop} — painter знає про drop-результат (smell: drop-math семантика протекла в paint-шар). resolveSeatDrop згадується в його docblock :293-377.
ФАКТ: другий викликач resolveSeatDrop — фасад OrgHierarchyDiagram.ts (коментар DiagramRenderer:229-231: «(OrgHierarchyDiagram.ts) is the other caller of resolveSeatDrop»). → movePersonToCell шлях.
РІШЕННЯ T3: drop-math (resolveSeatDrop/applySeatDrop/snap*) — у #4-оркестратор; адаптер лише емітить onNodePointer('dragMove'/'dragEnd', screenPoint); DropTargetIndex (spatial index) — гранична зона (просторовий індекс по world-box; може лишитись в адаптері як геометрія, але РІШЕННЯ про drop — у #4). ContourPainter має приймати вже порахований preview-cell, а не тип SeatDrop.

## КРОК 10 — тести (форма перевірки / контрольна проба)
interaction/ (чисті, #4-кандидати — лишаться при інверсії):
  - interaction/selection.test.ts, interaction/doubleTap.test.ts, interaction/positionMove.test.ts,
    interaction/positionReparent.test.ts, interaction/contextMenuPayload.test.ts,
    interaction/ContextMenuController.test.ts, interaction/bulkContextMenu.test.ts,
    interaction/nodeRefs.test.ts, interaction/nodeTestId.test.ts, interaction/interaction.test.ts
render/ (pointer→behavior через Pixi-view — найчутливіші до інверсії):
  - render/personInteractions.test.ts, render/orgCardInteractions.test.ts,
    render/nodeDoubleClick.interactions.test.ts, render/nodeInteractions.contract.test.ts,
    render/personDrag.contract.test.ts, render/personReparent.contract.test.ts,
    render/positionExpand.interactions.test.ts, render/staffOrgExpand.interactions.test.ts,
    render/toggleOrgExpand.interactions.test.ts, render/OrgHierarchyDiagram.interactions.test.ts,
    render/dropTargetIndex.test.ts, render/promoteMath.test.ts
Корінь: packages/sdk/src/backgroundClick.contract.test.ts, orgExpandChange.contract.test.ts (контракти колбеків фасаду).
КОНТРОЛЬНА ПРОБА (що МУСИТЬ упасти при правильній інверсії): тест, що зараз перевіряє, що render/personInteractions кличе options.onPersonClick(personId,positionId,mods) — після інверсії має кликатись єдиний onNodePointer(ref,'click',screenPoint). personInteractions.test.ts / nodeInteractions.contract.test.ts — саме вони зафіксують зміну форми колбека.

## РЕЗЮМЕ onNodePointer-дизайну (з фактів)
- Єдиний Observer onNodePointer(ref:NodeRef, kind, screenPoint) замінює 13 push-вниз колбеків (DiagramRenderer.ts:76-106).
- ref будується вже наявними orgNodeRef/seatNodeRef (interaction/nodeRefs) — у точці bind id-и є як замикання.
- screenPoint: FederatedPointerEvent має e.global(canvas)+e.clientX/Y — rightclick ВЖЕ так емітить (cardContextMenu.ts:16-21) = готовий патерн.
- kinds: click | doubleClick | contextMenu | dragStart/dragMove/dragEnd | expandToggle | canvasClick. Арбітраж (doubleTap 300ms, 4px move-threshold, primary vs rightclick, modifier-toggle) — пороги → #4/shared, НЕ адаптер.
- Передумова #5: винести словник (NodeKind/NodeRef/nodeEntityKey/nodeRefs/promote-типи) з interaction/ у core|shared — T2 цього НЕ зробив; поки не зроблено, 23 render→interaction залишаться.
- Зворотний граф чистий (interaction→render = 0) — інверсія не створює циклу.

ДАЛІ: нічого — recon завершено, передаю звіт.
