# T3a relocation plan (core/ module: dictionary A + drop-pipeline C)

ДАЛІ: підтвердити гілку/HEAD, прочитати interaction/types.ts, nodeKey.ts, nodeRefs.ts, positionMove.ts, render/contour/ContourPainter.ts, data/types.ts; зібрати повну карту імпортерів кожного символу.

ФАКТ (читання вихідних файлів):
- interaction/types.ts: NodeKind, NodeRef, SearchResult, MenuItem (переносимо) + re-export ContextMenu* (B, лишається) + InteractionError class (лишається). → types.ts РОЗЩЕПИТИ, не переносити цілком.
- interaction/nodeKey.ts: nodeEntityKey/parseNodeEntityKey — залежать лише від NodeKind (type). Чисто. OK.
- interaction/nodeRefs.ts: ІМПОРТУЄ orgTestId/personTestId/positionTestId з ./nodeTestId.js + DiagramData(data) + NodeRef/parseNodeEntityKey. → nodeRefs тягне nodeTestId. ЧЕРВОНИЙ-кандидат: nodeTestId має або переїхати, або лишиться upward core→interaction.
- interaction/nodeTestId.ts: nodeDomTestId/normalizeTestIdKey/orgTestId/personTestId/positionTestId/resolveTestIdInData + TestAnchorCandidate. Залежить лише від data/types + NodeRef/NodeKind (types). Чисто щодо render. Кандидат на переїзд у core разом із nodeRefs.
- interaction/positionMove.ts: resolveSeatDrop використовує InteractionError(stays) + isValidGridCell(move) + sameCell(local). applySeatDrop КЛИЧЕ movePositionToCell(stays, рядки 148/153/154) + InteractionError(stays) + assertNever(local). → ЧЕРВОНИЙ: перенос resolveSeatDrop/applySeatDrop у core БЕЗ переносу InteractionError+movePositionToCell створює upward core→interaction.
ДАЛІ: прочитати ContourPainter (projectedOccupantMove/assertNeverSeatDrop) + data/types.ts; зібрати карту імпортерів grep-ом.

ФАКТ (решта розвідки):
- data/types.ts: 0 import-рядків. Абсолютно чистий. → §3 ВЕРДИКТ: core→data downward, циклу НЕ буде. YES.
- projectedOccupantMove+assertNeverSeatDrop (ContourPainter.ts:394-413): чисті, лише SeatDrop + inline GridCell. OK для core.
- sameCell + assertNever (positionMove.ts, private): НЕ використовуються ніде інде — їдуть у core разом із resolveSeatDrop/applySeatDrop.
- InteractionError рантайм-споживачі поза тестами/барелем: OrgHierarchyDiagram, positionReparent(stays interaction), positionMove(resolve/apply→core, shift stays). Сам клас — leaf (extends Error, 0 deps).
- movePositionToCell рантайм-споживач поза positionMove: ЖОДНОГО, окрім applySeatDrop (+interaction.test + public barrel). Сам — core-clean (isValidGridCell[core]+InteractionError[core]+DiagramPosition[data]).
- Цикл-тулінгу (madge/dependency-cruiser/no-restricted-imports) НЕМА → "no upward edge" guard РУЧНИЙ: grep по core/ + tsc.
- core/ ще не існує. dropTargetIndex.test імпортує лише з dropTargetIndex.js — T3a його НЕ торкає (лишається зеленим без репойнту).

РІШЕННЯ / ПЛАН: див. фінальний звіт нижче.

====================================================================
# ФІНАЛЬНИЙ ПЛАН T3a (core/ = словник A + drop-pipeline C, 0 behavior change)
====================================================================

## 0. Межа core (рекомендований замок, БЕЗ жодного upward-ребра)
Нова тека packages/sdk/src/core/ з файлами:
- core/types.ts      — NodeKind, NodeRef, SearchResult, MenuItem (вирізані з interaction/types.ts)
- core/errors.ts     — InteractionError (вирізаний з interaction/types.ts)  ← escalation, див. §C-RED
- core/nodeKey.ts    — nodeEntityKey, parseNodeEntityKey
- core/nodeRefs.ts   — orgNodeRef, personNodeRef, positionNodeRef, seatNodeRef, resolveNodeRefInData, normalizeSelected, testIdForRef (+ private personSeatTestId)
- core/nodeTestId.ts — nodeDomTestId, normalizeTestIdKey, orgTestId, personTestId, positionTestId, resolveTestIdInData, TestAnchorCandidate  ← escalation, див. §A-RED
- core/seatDrop.ts   — SeatDrop, resolveSeatDrop, applySeatDrop, isValidGridCell, movePositionToCell (+ private sameCell, assertNever/assertNeverSeatDrop), projectedOccupantMove  ← movePositionToCell = escalation, див. §C-RED
- core/index.ts      — барель усіх вище

core залежить ТІЛЬКИ від ../data/types.js (downward, §3 підтверджено). Жодного import з ../interaction або ../render у core/*.

## §A-RED  nodeTestId тягнеться nodeRefs → мусить переїхати
nodeRefs.ts:3 імпортує orgTestId/personTestId/positionTestId з ./nodeTestId.js. Лишити nodeTestId в interaction → core→interaction UPWARD.
nodeTestId.ts сам чистий (data/types + NodeRef/NodeKind). РІШЕННЯ: перенести ВЕСЬ nodeTestId.ts у core (addressing-vocabulary). Тоді interaction/searchIndex.ts (stays) і react/createTestAnchorOverlay імпортують з core — downward OK. Альтернатива (гірша): рознести файл — лишає upward або дублює.

## §C-RED  resolveSeatDrop/applySeatDrop тягнуть InteractionError + movePositionToCell (обидва в задачі позначені "stays/T3c")
Факти (positionMove.ts):
- resolveSeatDrop :92 кидає InteractionError.
- applySeatDrop :148/153/154 КЛИЧЕ movePositionToCell; :163/166/169 кидає InteractionError.
Якщо InteractionError і movePositionToCell лишаються в interaction, а resolve/apply їдуть у core → ДВА upward core→interaction ребра. ЧЕРВОНИЙ.

РЕКОМЕНДАЦІЯ (R1): розширити перенос C на InteractionError + movePositionToCell.
Обґрунтування:
- InteractionError — leaf (extends Error, 0 deps). Безпечний у core. Споживачі в interaction (positionReparent, shiftPositionBlock) імпортують назад з core — downward OK.
- movePositionToCell — сам core-clean (isValidGridCell[core] + InteractionError[core] + DiagramPosition[data]); його ЄДИНИЙ рантайм-споживач поза positionMove — це applySeatDrop. applySeatDrop і movePositionToCell — одна одиниця ("apply drop" = викликати grid-move під guard). Лишити movePositionToCell у interaction = або upward, або дублювання guard (drift-ризик — те, проти чого й існує pipeline).
Ціна R1: відходимо від буквального списку "stays" у задачі для 2 символів; interaction.test.ts і public index.ts репойнтяться на core (тривіально).
Відкинуті альтернативи:
- R2 (лишити movePositionToCell, НЕ рухати applySeatDrop у T3a, відкласти в T3c): ламає цілісність pipeline і барель, resolveSeatDrop все одно тягне InteractionError. Гірше.
- R3 (core-локальна копія guard у applySeatDrop): дублювання, drift. Відкинуто.

ПОЗА межами T3a (B-nature, T3c): snapToGrid, snapWorldToCell, shiftPositionBlock, GridSnap, selection/doubleTap/contextMenu*. Вони лишаються в interaction і (де треба) імпортують InteractionError з core — downward.

## §4  Розщеплення positionMove.ts (після R1)
Лишається в interaction/positionMove.ts: GridSnap, snapToGrid, snapWorldToCell, shiftPositionBlock.
Переїжджає в core/seatDrop.ts: SeatDrop, resolveSeatDrop, applySeatDrop, isValidGridCell, movePositionToCell, sameCell(priv), assertNever(priv).
Залишок компілюється без циклу: snap* — без moving-deps; shiftPositionBlock імпортує InteractionError з core (downward). ЖОДНОГО core→interaction. ✔
(assertNever у positionMove і assertNeverSeatDrop у ContourPainter — дві копії; у core можна лишити одну спільну assertNeverSeatDrop, яку юзають і applySeatDrop, і projectedOccupantMove — опційний dedup, не обов'язково для 0-behavior.)

## §3  core → data/types.ts
data/types.ts має 0 import-рядків → не залежить від interaction/render/core. core→data = downward, циклу нема. ВЕРДИКТ: YES, core може залежати від data/types.ts.

## §1  ПОВНА карта імпортерів (репойнт interaction/* → core)
Формат: file:line | було → стане. (Барель-символи, що лишаються в interaction, у рядку не чіпаються.)

### Група A — non-test
- callbacks.ts:3 | `import type { MenuItem, NodeRef } from './interaction/types.js'` → РОЗДІЛИТИ: `import type { MenuItem, NodeRef } from './core/index.js'` (обидва в core за замком §0).
- render/promoteTypes.ts:2 | `{ NodeKind } from '../interaction/types.js'` → `'../core/index.js'`
- render/promoteMath.ts:3 | `{ NodeKind, NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- render/promoteMath.ts:4 | `{ nodeEntityKey, parseNodeEntityKey } from '../interaction/nodeKey.js'` → `'../core/index.js'`
- render/DiagramRenderer.ts:36 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- render/DiagramRenderer.ts:6 | `{ nodeEntityKey, parseNodeEntityKey } from '../interaction/nodeKey.js'` → `'../core/index.js'`
- render/DiagramRenderer.ts:35 | `{ normalizeSelected } from '../interaction/nodeRefs.js'` → `'../core/index.js'`
- render/SceneRegistry.ts:2 | `{ nodeEntityKey, parseNodeEntityKey } from '../interaction/nodeKey.js'` → `'../core/index.js'`
- state/SelectionStore.ts:1 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- react/createReactContextMenuHost.ts:4 | `{ MenuItem } from '../interaction/types.js'` → `'../core/index.js'`
- react/DefaultReactContextMenu.ts:3 | `{ MenuItem } from '../interaction/types.js'` → `'../core/index.js'`
- react/createReactPromoteOverlay.ts:10 | `{ NodeKind, NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- react/createTestAnchorOverlay.ts:2 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- react/createTestAnchorOverlay.ts:3 | `{ nodeDomTestId } from '../interaction/nodeTestId.js'` → `'../core/index.js'`
- react/createTestAnchorOverlay.ts:4 | `{ TestAnchorCandidate } from '../interaction/nodeTestId.js'` → `'../core/index.js'`
- media/types.ts:3 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- media/MediaService.ts:2 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- media/diagramMedia.ts:2 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- OrgHierarchyDiagram.ts:1 | `{ nodeEntityKey, parseNodeEntityKey } from './interaction/nodeKey.js'` → `'./core/index.js'`
- OrgHierarchyDiagram.ts:104-110 | блок `{ orgNodeRef, personNodeRef, resolveNodeRefInData, seatNodeRef, testIdForRef } from './interaction/nodeRefs.js'` → `'./core/index.js'`
- interaction/ContextMenuController.ts:8 | `{ nodeEntityKey } from './nodeKey.js'` → `'../core/index.js'`
- interaction/SearchIndexService.ts:10 | `{ nodeEntityKey } from './nodeKey.js'` → `'../core/index.js'`
- interaction/searchIndex.ts:2 | `{ orgTestId, personTestId, positionTestId } from './nodeTestId.js'` → `'../core/index.js'`
- interaction/searchIndex.ts:4 | `{ NodeRef, SearchResult } from './types.js'` → `'../core/index.js'`
- interaction/nodeRefs.ts (переїжджає): всередині core стає core/nodeRefs.ts, import nodeKey/nodeTestId/types → локальні core-шляхи.

### Група A — test
- state/SelectionStore.test.ts:3 | `{ NodeRef } from '../interaction/types.js'` → `'../core/index.js'`
- react/createTestAnchorOverlay.test.ts:3 | `{ TestAnchorCandidate } from '../interaction/nodeTestId.js'` → `'../core/index.js'`
- interaction/nodeRefs.test.ts:…-11 | `from './nodeRefs.js'` → переїжджає у core/nodeRefs.test.ts, import `'./nodeRefs.js'` (локально в core)
- interaction/nodeTestId.test.ts:9 | `from './nodeTestId.js'` → переїжджає у core/nodeTestId.test.ts, import `'./nodeTestId.js'`

### Група C — non-test
- render/DiagramRenderer.ts:54 | `{ resolveSeatDrop, type SeatDrop } from '../interaction/positionMove.js'` → `'../core/index.js'`
- render/contour/ContourPainter.ts:15 | `type { SeatDrop } from '../../interaction/positionMove.js'` → `'../../core/index.js'`
- render/contour/ContourPainter.ts (projectedOccupantMove+assertNeverSeatDrop) → ВИРІЗАТИ у core/seatDrop.ts; ContourPainter імпортує projectedOccupantMove назад: нове `{ projectedOccupantMove } from '../../core/index.js'`.
- render/DiagramRenderer.ts:8 | `{ ContourPainter, projectedOccupantMove } from './contour/ContourPainter.js'` → РОЗДІЛИТИ: `{ ContourPainter } from './contour/ContourPainter.js'` + `{ projectedOccupantMove } from '../core/index.js'`.
- OrgHierarchyDiagram.ts:84-98 барель-блок `from './interaction/index.js'`: вирізати core-символи → новий import з `'./core/index.js'`: `resolveSeatDrop, applySeatDrop, type SeatDrop, type NodeRef, InteractionError, resolveTestIdInData, type TestAnchorCandidate`. Лишити в interaction-блоці: `revealOrgPath, resolveOrganizationIdForNode, shiftPositionBlock, type SearchResult, type ContextMenuRequest, type ContextMenuPointer`.
- interaction/positionReparent.ts (InteractionError) | import з `./types.js` → `'../core/index.js'` (downward).
- interaction/positionMove.ts (залишок shiftPositionBlock): InteractionError з `./types.js` → `'../core/index.js'`.

### Група C — test
- interaction/positionMove.test.ts:3 | `{ applySeatDrop, movePositionToCell, resolveSeatDrop } from './positionMove.js'` → `'../core/index.js'` (усі три в core). Решту (snap*/shift*) тест не юзає.
- interaction/interaction.test.ts:5 | `{ movePositionToCell, shiftPositionBlock, snapToGrid, snapWorldToCell } from './positionMove.js'` → РОЗДІЛИТИ: `{ movePositionToCell } from '../core/index.js'` + `{ shiftPositionBlock, snapToGrid, snapWorldToCell } from './positionMove.js'`. (InteractionError import у цьому тесті → core.)
- render/personDrag.contract.test.ts:5 | `{ snapWorldToCell } from '../interaction/positionMove.js'` → БЕЗ ЗМІН (snapWorldToCell лишається в interaction).
- render/OrgHierarchyDiagram.interactions.test.ts, render/seatCollisionPreview.contract.test.ts, render/contour/ContourPainter.test.ts: НЕ імпортують moved-символи напряму (лише через OrgHierarchyDiagram/ContourPainter публічні методи) — репойнт не потрібен; мають лишитись зеленими.
- render/dropTargetIndex.test.ts: не торкається T3a.

## §5  Барелі (план: БЕЗ shim у interaction)
- core/index.ts: re-export усіх перенесених символів (див. §0).
- interaction/index.ts: ПРИБРАТИ re-export перенесених — рядки 1 (NodeKind/NodeRef/SearchResult/MenuItem→всі в core), 7 (InteractionError→core), 27-30/33 (isValidGridCell/movePositionToCell/resolveSeatDrop/applySeatDrop/SeatDrop→core), 62-68 (nodeDomTestId…resolveTestIdInData/TestAnchorCandidate→core). ЛИШИТИ: ContextMenu* (2-6), searchIndex(8-22), revealPath(23), snapToGrid/snapWorldToCell/shiftPositionBlock/GridSnap(25,26,31,32), positionReparent(35-42), selection(43-53), doubleTap(54), contextMenu(55-60). Жодного re-export-з-core (no shim) — усі внутрішні сайти репойнчено напряму (§1).
- public src/index.ts: репойнтнути moved-символи з `'./interaction/index.js'` на `'./core/index.js'` — рядки 182-190 (NodeRef/SearchResult/MenuItem/NodeKind) та 195/196/200 (movePositionToCell/InteractionError + nodeDomTestId/normalizeTestIdKey/orgTestId/personTestId/positionTestId/resolveTestIdInData/TestAnchorCandidate). Так ПУБЛІЧНИЙ API пакета не змінюється (0 behavior change для споживачів), а interaction без shim. (SearchResult/MenuItem: якщо писар вирішить лишити їх у interaction/types.ts — тоді split-import у callbacks/react/searchIndex і public барель лишає їх на interaction; рекомендація — перенести в core заради єдиного джерела й нуля split-ів.)

## §6  Мікро-staging: 2 коміти
- T3a-1 (словник A): створити core/{types(NodeKind/NodeRef/SearchResult/MenuItem), nodeKey, nodeRefs, nodeTestId, index}; репойнт усіх A-сайтів (§1 A); викинути A з interaction/index.ts; репойнт public index.ts (A-частина); перенести nodeRefs.test/nodeTestId.test у core. InteractionError НЕ потрібен для A → не чіпати в цьому коміті. Самодостатній, зелений окремо.
- T3a-2 (drop-pipeline C): додати core/errors.ts(InteractionError) + core/seatDrop.ts(SeatDrop/resolve/apply/isValidGridCell/movePositionToCell/projectedOccupantMove); розщепити positionMove.ts; вирізати projectedOccupantMove/assertNeverSeatDrop з ContourPainter; репойнт C-сайтів + positionReparent/positionMove(InteractionError); public index.ts (C-частина).
Чому 2, не 1: A самодостатній і ризик-вільний; C несе escalation (InteractionError+movePositionToCell) і розщеплення positionMove — ізолювати blast-radius. Один коміт прийнятний лише якщо писар хоче атомарність, але тоді ревʼю важче.

## §7  Контрольні проби (tooling циклів НЕМА → ручні)
- Напрям залежності (головна інваріанта): `grep -rn "from '\.\./interaction\|from '\.\./render\|from '\.\./\.\./interaction\|from '\.\./\.\./render" packages/sdk/src/core/` МУСИТЬ бути порожнім. Непорожній рядок = upward-ребро. Це і є проба-що-мусить-впасти: тимчасово додати в будь-який core/*.ts рядок `import '../interaction/positionMove.js'` → grep його ловить (а tsc — ні, бо шлях валідний); прибрати після перевірки.
- A tsc-проба: тимчасово прибрати `nodeEntityKey` з core/index.ts → tsc червоніє в render/promoteMath.ts, render/DiagramRenderer.ts, render/SceneRegistry.ts, OrgHierarchyDiagram.ts, interaction/ContextMenuController.ts, interaction/SearchIndexService.ts. Доводить, що символ тече з core.
- C tsc-проба: тимчасово прибрати `SeatDrop` re-export з core/index.ts → tsc червоніє в render/contour/ContourPainter.ts:15, render/DiagramRenderer.ts:54, OrgHierarchyDiagram.ts:89. (аналог для applySeatDrop → OrgHierarchyDiagram:88/2069, positionMove.test.)
- Тести, що МУСЯТЬ лишитись зеленими (0 behavior): interaction/positionMove.test (репойнт import), interaction/nodeRefs.test (переїзд), interaction/nodeTestId.test (переїзд), interaction/interaction.test (split import), render/dropTargetIndex.test (без змін), render/personDrag.contract.test (без змін), render/seatCollisionPreview.contract.test (без змін), render/contour/ContourPainter.test, render/OrgHierarchyDiagram.interactions.test, state/SelectionStore.test, react/createTestAnchorOverlay.test.

КІНЕЦЬ ПЛАНУ.

====================================================================
# [RE-GATE 2026-10-26] T3a-2 — підтверджені правки (3 сліпі критики + звірка по коду)
====================================================================
Критики P1, P2 (gate-reviewer) і Cass 1 — ВСІ ТРИ незалежно знайшли ту саму прогалину; звірено по коду. Застосувати ДО коду T3a-2.

**BLOCKING — §1 карта імпортерів неповна щодо InteractionError (escalation).** Після §5 «no shim»
(зняття re-export з interaction/index.ts:6 + винос класу з interaction/types.ts) ТРИ сайти ламаються:
- `render/OrgHierarchyDiagram.interactions.test.ts:4` ← `../interaction/index.js` → репойнт на `../core/index.js`.
- `interaction/positionReparent.test.ts:10` ← `./types.js` → репойнт на `../core/index.js`.
- `interaction/positionMove.test.ts:4` ← `./types.js` → репойнт на `../core/index.js` (окремо від seatDrop-символів §1 L116).
→ ВИПРАВИТИ §1 (додати ці 3) і §7/§1-L119 (хибно каже interactions.test «зелений без змін» — ні).

**NB1 — §7 grep-проба denylist вужча за §0-інваріант.** Замінити denylist `interaction|render` на
allowlist: будь-який `from '../` у `core/` ОКРІМ `../data/` = fail (ловить core→state/media/react/layout).

**NB2 — InteractionError мусить ПЕРЕЇХАТИ як єдиний клас (не копія).** instanceof-сайти
`OrgHierarchyDiagram.ts:937/949/2060/2072` вимагають одну ідентичність класу — R3(копія) правильно відкинуто; тримається лише якщо ВСІ importers (вкл. 3 вище) ведуть на core-source.

**NB (стиль, не блок):** `positionMove.test` варто переїхати в `core/seatDrop.test.ts`; номери рядків плану — до T3a-1, звіряти по ІМЕНІ (DiagramRenderer SeatDrop :52 не :54; OrgHD-блок 96-106; public index movePositionToCell:201/InteractionError:203).

Решту плану (§C-RED/R1, 0-behavior, публічний API 240/240, межа T3a-2/T3c, §4 розщеплення) 3 критики ПІДТВЕРДИЛИ.
