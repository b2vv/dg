model: claude-opus-4-8

# T3a-2 (drop-pipeline C) — незалежна критика плану ПЕРЕД імплементацією

ДАЛІ: прочитати план `_wip-T3a-relocation-plan.md` (§C-RED, §4, §1 Група C, §5, §6, §7) і код
(positionMove.ts, interaction/types.ts, ContourPainter.ts, DiagramRenderer.ts, OrgHierarchyDiagram.ts).
Потім спростувати/підтвердити кожну тезу ПО КОДУ.

## ФАКТИ (звірка по коду, HEAD 17b237e, стан ПІСЛЯ T3a-1)

ФАКТ RED-C правильний:
- positionMove.ts:92 resolveSeatDrop кидає InteractionError. ✓
- positionMove.ts:148/153/154 applySeatDrop КЛИЧЕ movePositionToCell. ✓
- positionMove.ts:163/166/170 applySeatDrop кидає InteractionError (план пише "169" — насправді throw на :170, :169 це `if(!moverFrom)`; тривіально). ✓
- Отже без переносу InteractionError+movePositionToCell виникає 2× upward core→interaction. Теза ВИТРИМУЄ.

ФАКТ R1:
- InteractionError = leaf: types.ts:8-13 `extends Error`, 0 import. ✓
- movePositionToCell core-clean: isValidGridCell(:215)+InteractionError(:216/220/232)+DiagramPosition. ✓
- movePositionToCell рантайм-споживач поза positionMove: НЕМА non-test коду (grep); лише public barrel index.ts:201, interaction/index.ts:27, і тести interaction.test.ts:5/positionMove.test.ts:3. Теза (єдиний = applySeatDrop) по суті ВИТРИМУЄ.

ФАКТ C-символи (SeatDrop/resolve/apply/move/projectedOccupantMove) — карта §1 ПОВНА:
- SeatDrop: OrgHD:101, DiagramRenderer:52(план каже 54, дрейф), ContourPainter:15 — всі в §1. ✓
- resolveSeatDrop runtime: OrgHD:99, DiagramRenderer:52 — обидва в §1. ✓
- applySeatDrop: OrgHD:100, positionMove.test:3 — в §1. ✓
- projectedOccupantMove: DiagramRenderer:8/335, ContourPainter:328/394 — §1 line 109/110. ✓
- callbacks.ts:43 (коментар) / :66 SeatDropChoice (інший тип) — коректно НЕ імпортери. ✓

РІШЕННЯ — BLOCKING: карта §1 НЕПОВНА щодо InteractionError (escalation-символ). Пропущені 3 сайти:
1. render/OrgHierarchyDiagram.interactions.test.ts:4 `import { InteractionError } from '../interaction/index.js'`.
   План §1 line 119 І §7 line 136 ЯВНО кажуть, що цей тест лишається зеленим БЕЗ репойнту. Це ХИБНО:
   InteractionError їде в core/errors.ts, а §5 line 124 ПРИБИРАЄ re-export InteractionError з
   interaction/index.ts (line 6), «no shim». → tsc червоніє, тест не зелений.
2. interaction/positionReparent.test.ts:10 `import { InteractionError } from './types.js'` — ніде в §1 не згадано.
   Після вирізання InteractionError з types.ts (§0) цей import не резолвиться.
3. interaction/positionMove.test.ts:4 `import { InteractionError } from './types.js'` — §1 line 116 згадує лише
   import з ./positionMove.js (3 символи), а окремий InteractionError-з-./types.js НЕ згадано. Частковий пропуск.
Усі 3 ловить tsc/тест-ран миттєво; фікс механічний (репойнт на core). АЛЕ план декларує §1 повною картою й
§7 — інваріантом «зелене без змін», а це фактично хибне твердження → гейт на повноту = RED.

ФАКТ §4 (розщеплення) ВИТРИМУЄ:
- Залишок positionMove.ts = snapToGrid/snapWorldToCell(без moving-deps)/shiftPositionBlock(InteractionError з core, downward)/GridSnap. Циклу нема. ✓
- Residual не потребує isValidGridCell (snap*/shift не викликають). ✓

ФАКТ §7 проби — ЛОГІКА валідна, номери рядків застарілі:
- grep-напрям (line 133) — справжній guard; «додати import '../interaction' у core → grep ловить, tsc ні» коректно. ✓
- C tsc-проба: прибрати SeatDrop → tsc червоніє в ContourPainter:15, DiagramRenderer:52(план 54), OrgHD:101(план 89). Живий шов ловить. ✓ (номери дрейфнули — весь план написаний ДО T3a-1).

ФАКТ R2/R3 відкинуті обґрунтовано:
- R2: resolveSeatDrop все одно тягне InteractionError(:92) → core його потребує попри все; розрив pipeline. ✓
- R3: дублювання guard суперечить його анти-drift призначенню (коментар positionMove.ts:202-207). ✓

NON-BLOCKING спостереження:
- §1/§5 номери рядків застарілі (T3a-1 зсунув): OrgHD-блок тепер 96-106 (не 84-98); DiagramRenderer SeatDrop :52 (не 54);
  interaction/index.ts isValidGridCell :26 (план діапазон «27-30» стартує з 27 — символ НАЗВАНО, тож не пропуск, лише стале число);
  public index.ts movePositionToCell:201/InteractionError:203 (не 195/196/200). Символи названо скрізь → не блокує, але звіряти по імені, не по рядку.
- positionMove.test.ts тестує ТІЛЬКИ перенесені символи (resolve/apply/move) → за логікою локальності мав би переїхати в core/seatDrop.test.ts (як nodeRefs.test у T3a-1), а не лишатись в interaction з import-з-core. Стиль, не коректність.

## ВЕРДИКТ: BLOCKING (1 блокер) — решта витримує
Блокер: §1 карта імпортерів неповна + §7/§1 хибно оголошують render/OrgHierarchyDiagram.interactions.test.ts:4
зеленим-без-змін. Треба додати репойнт InteractionError для 3 сайтів (interactions.test.ts:4,
positionReparent.test.ts:10, positionMove.test.ts:4) на core ПЕРЕД імплементацією. Архітектура (R1/напрям/core-clean),
§4 розщеплення, §7 логіка проб, відкид R2/R3 — ВИТРИМУЮТЬ.
