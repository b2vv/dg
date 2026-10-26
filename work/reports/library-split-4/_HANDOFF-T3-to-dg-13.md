# HANDOFF T3 → dg-13 (від сесії Cass 2, rooted у cassiopeia-admin-ui)

**Дата:** 2026-10-25. Власник наказав передати написання коду й увесь стан T3 сесії **dg-13** (rooted у `~/projects/dg`). Мова з власником — українська.

## Стан за 30 секунд
- Репо: `~/projects/dg`, гілка `bulk-mutations`, база HEAD **`17b237e`** (T2b). **Нічого ще НЕ закомічено** цією роботою.
- Крок **T3** (Pixi за RendererPort + lift камери + ПОВНА §9-інверсія інтеракцій). Scope owner-ухвалений.
- **T3a-1 (словник A) — ПРАВКИ ПОВНІ, tsc ЗЕЛЕНИЙ.** Лишились гейти (oxlint/format/тести) + коміт.
- Далі: T3a-2 (drop-pipeline C) → потім **re-gate** переозначеного контракту ПЕРЕД T3b/T3c.

## Першоджерела (НЕ дублюю — читай)
- **Design-doc (спека, пройшла gate-раунд-1):** `work/reports/library-split-4/T3-renderer-port.md` — контракт переозначено під знахідки гейта (правки `[gate-1]`), стейджинг T3a→T3b→T3c, інваріанти, форма перевірки, контрольні проби.
- **План релокації T3a (ТОЧНА карта):** `work/reports/library-split-4/_wip-T3a-relocation-plan.md` — повна карта імпортерів, 2 RED-прапори (nodeTestId, positionMove escalation), мікро-staging T3a-1/T3a-2.
- **Recon:** `_wip-T3-renderer-camera-recon.md` (камера/фасад/рендер) + `_wip-T3b-interaction-inversion-recon.md` (interaction-шар).
- **Gate-рев'ю (раунд-1):** `_wip-T3-review-cass-rev.md` + `_wip-T3-review-cass-1.md`.
- **Канон (джерело правди, ІНШИЙ vault):** `~/vaults/diagram-hierarchy/1 - Notes/Reports/2026-10-25 dg — спліт на 4 міні-бібліотеки (vision + архітектура).md` — §9 контракт, §11/§12 вердикти критиків, §17/§18 owner-spec, §20-T3.

## OWNER-ДИЗПОЗИЦІЇ (чинні)
- **Scope = ПОВНА §9-інверсія зараз:** RendererPort + lift камери у #4 + viewport-жести вгору + ВСІ 13 node-callbacks → єдиний `handleNodePointer(e: NodePointerEvent)` вгору (event-об'єкт з `mods`! — gate-B1) + винос поведінки (selection/doubleTap/contextMenu/positionMove) у #4.
- **Один `core`** (NB6/NB7-обрізка; БЕЗ domain/ports/logic розколу).
- **hitTest** — публічного нема, point→node вже приватний → у порт не виноситься, роботи нема.
- **Шлях:** T3a — зараз; **T3b/T3c — re-gate переозначеного контракту ПЕРЕД кодом тих під-кроків** (контракт сильно змінився: event-об'єкт+mods, dragStart/dragMove/dragEnd+applyDragPreview, onMeasurable-сигнал, камера-шов без Pixi-ref у #4).

## T3a-1 — ЩО ЗРОБЛЕНО (uncommitted; усе в `packages/sdk/src/`)
Релокація словника A у новий `core/` (0 зміни поведінки):
- **Створено:** `core/types.ts` (NodeKind, NodeRef, SearchResult, MenuItem), `core/index.ts` (барель).
- **git mv у core/:** `nodeKey.ts`, `nodeRefs.ts`, `nodeTestId.ts`, `nodeRefs.test.ts`, `nodeTestId.test.ts` (внутрішні `./types.js`/`./nodeKey.js`/`./nodeTestId.js` resolve'яться локально в core — сиблінг-структура збережена).
- **interaction/types.ts:** вирізано 4 словникові типи; лишились ContextMenu re-export + `InteractionError` (InteractionError переїде у T3a-2).
- **interaction/index.ts:** прибрано re-export словника (рядок 1) + nodeTestId-блок; `InteractionError` лишено.
- **Репойнт ~25 імпортерів** на `core/index.js` (список нижче в «перевірка»). УВАГА: план §1 проґавив 7 interaction-внутрішніх споживачів (contextMenu/selection/contextMenuPayload/ContextMenuController/SearchIndexService/bulkContextMenu.test/ContextMenuController.test) — вони теж репойнтнуті. Також інлайн `import('../interaction/types.js').NodeRef` у `media/types.ts:37` → `NodeRef` (top-level grep його не ловив).
- **public `src/index.ts`:** NodeRef/SearchResult/MenuItem/NodeKind/TestAnchorCandidate + 6 nodeTestId-функцій → з `core/index.js`; `movePositionToCell`/`InteractionError` лишено на interaction (переїдуть T3a-2). **Публічний API пакета НЕ змінився.**
- **Merge-імпорти:** файли з кількома core-імпортами злиті в один рядок (import-плагін oxlint має no-duplicates).

**Гейт-стан T3a-1:** `tsc -p tsconfig.check.json` **ЗЕЛЕНИЙ** (0). Core-purity grep **CLEAN** (жодного core→interaction/render). **НЕ запускав ще:** oxlint, format:check (oxfmt — мої merge-рядки можуть потребувати `npm run format:fix`), цільові тести, повний rstest.

## T3a-1 — ЩО ЛИШИЛОСЬ (наступні дії dg-13)
1. `cd ~/projects/dg && npm run format` (oxfmt --check); якщо червоно → `npm run format:fix` (merge-рядки імпортів).
2. `npx oxlint --max-warnings 0 packages/sdk/src` (0).
3. Цільові тести (МУСЯТЬ бути зелені, 0 behavior): `cd packages/sdk && npx rstest run core/nodeRefs.test core/nodeTestId.test interaction/interaction.test interaction/bulkContextMenu.test interaction/ContextMenuController.test state/SelectionStore.test react/createTestAnchorOverlay.test render/dropTargetIndex.test`.
4. **Контрольна проба A** (мусить ПОЧЕРВОНІТИ): тимчасово прибрати `nodeEntityKey` з `core/index.ts` → tsc червоніє в promoteMath/DiagramRenderer/SceneRegistry/OrgHierarchyDiagram/ContextMenuController/SearchIndexService; повернути.
5. Повний `npx rstest run` (baseline ~1128/0) перед комітом.
6. Коміт **T3a-1** (`git add` лише core/ + репойнтнуті файли; звір `git diff --cached --stat`; НЕ чіпати не-split хвости).

## T3a-2 — ДАЛІ (drop-pipeline C; план §C-RED)
- Створити `core/errors.ts` (InteractionError — escalation) + `core/seatDrop.ts` (SeatDrop, resolveSeatDrop, applySeatDrop, isValidGridCell, **movePositionToCell** [escalation], projectedOccupantMove [вирізати з ContourPainter.ts:394-413], private sameCell/assertNever).
- Розщепити `interaction/positionMove.ts` (лишаються snap*/shiftPositionBlock — імпортують InteractionError з core, downward).
- RED-C (звірено по коду): `applySeatDrop` кличе `movePositionToCell` (:148/153/154) + кидає InteractionError → БЕЗ переносу обох у core вийде upward core→interaction. Тому обидва їдуть у core (план R1).
- Репойнт C-сайтів (ContourPainter:15, DiagramRenderer:54/8, OrgHierarchyDiagram барель, positionReparent, positionMove-залишок, positionMove.test, interaction.test) + public index.ts (C-частина: movePositionToCell/InteractionError → core).
- Контрольна проба C: прибрати SeatDrop reexport з core → tsc червоніє в ContourPainter:15/DiagramRenderer:54/OrgHierarchyDiagram.
- Core-purity grep знову CLEAN.

## T3b / T3c — RE-GATE ПЕРШ НІЖ КОД
Переозначений контракт (у design-doc `[gate-1]`) ще не рев'ювнутий. Перед кодом T3b/T3c — прогнати re-gate (plan-critique+plan-defense на дельти: event-об'єкт+mods, drag-канали, onMeasurable, камера-шов). 2 сліпі `gate-reviewer`.

## ПРАВИЛА СЕСІЇ (виміряні)
1. **Writer = Claude(opus) напряму.** codex-rescue sandbox'нутий на primary workspace, у `~/projects/dg` НЕ пише (2 спроби впали). Загальні субагенти читають/пишуть робочі файли.
2. **Рев'ю = 2 незалежні сліпі `gate-reviewer` (Opus).** Знахідку писар ПЕРЕВІРЯЄ по коду, не на віру.
3. **Контрольна проба:** зелений suite НЕ доводить живий шов — саботуй передане/прибери символ → цільове мусить почервоніти, тоді відкоти.
4. **Гейти:** `cd packages/sdk && npx rstest run` (рушій rstest, НЕ vitest; baseline ~1128/0) · `npx tsc -p tsconfig.check.json` · `npx oxlint --max-warnings 0 <files>` · `cd packages/core && cargo test` (25/0). Формат — `npm run format` / `format:fix` (oxfmt, НЕ prettier).
5. **Коміт у межах замовленого.** НЕ замітати не-split хвости дерева: `M .gitignore`, `M AGENTS.md`, `M packages/sdk/package.json` (0.5.1→0.6.0 packaging), `M packages/sdk/src/layout/staff/orgBlockLayout.ts` + `?? _recenterProbe.test.ts` (parent-centering проба). Їх НЕ чіпати.
6. **Атрибуція:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` + `Claude-Session`.
7. **Мікро-staging T3a = 2 коміти** (T3a-1 словник ✓-готовий-до-коміту, T3a-2 drop).

## ttsc-graph / CRG (для dg-13)
- **CRG база dg** — створена (повний rebuild: 407 файлів, 3895 вузлів). Готова.
- **ttsc-graph** — dg уже налаштований (`@ttsc/graph`+`ttsc` ^0.28.3 у package.json, `tsconfig.graph.json`, `.mcp.json` сервер `--cwd dg --tsconfig tsconfig.graph.json`, бінарі в node_modules). У dg-rooted сесії (тобто в тебе, dg-13) MCP `ttsc-graph` має підхопитись сам на dg.
