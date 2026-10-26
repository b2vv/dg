Model: claude-opus-4-8

# T3a-2 gate review (r2) — незалежний рев'ю

ДАЛІ: прочитати діф tracked-файлів + нові core-файли (errors.ts, seatDrop.ts). Далі звірити 7 пунктів.

## ФАКТИ (перевірено по коду)

1. Нульова поведінка — PASS. Перенесений блок у core/seatDrop.ts (рядки 4-203 для функцій з positionMove; 205-245 для projectedOccupantMove+assertNeverSeatDrop з ContourPainter) байт-ідентичний видаленим рядкам у tracked-дифі. diff HEAD-екстракту vs seatDrop дав лише розбіжність на граничному порожньому рядку (offset мого sed), не в тілі.
2. InteractionError — PASS. `grep "class InteractionError"` → рівно один: core/errors.ts:1. Тіло байт-ідентичне HEAD-копії в interaction/types.ts (constructor+name). Копію з types.ts видалено. Усі сайти імпорту резолвляться на core (core/index.ts реекспортить з ./errors.js).
3. core-purity — PASS. Усі non-test core/*.ts імпортують лише з ../data/ або локально ./. seatDrop.ts: ../data/types.js + ./errors.js; errors.ts: нічого.
4. Публічний API — PASS. Відсортований набір ідентифікаторів index.ts: 217 vs 217, diff порожній (IDENTICAL NAME SET). movePositionToCell та InteractionError у plain `export { ... } from './core/index.js'` (index.ts:213-216), НЕ в export type. tsc exit 0.
5. Повнота репойнту — PASS. Жоден файл не тягне перенесені символи зі старих локацій. Залишкові import з positionMove.js — лише snapToGrid/snapWorldToCell/shiftPositionBlock. interaction/index.ts не реекспортить перенесене (grep порожній) і не має shim. projectedOccupantMove — DiagramRenderer.ts:8 та ContourPainter.ts:15 тягнуть з core. 4 тест-файли перенаправлені на core.
6. Residual — PASS. positionMove.ts лишив лише GridSnap/snapToGrid/snapWorldToCell/shiftPositionBlock (і коректно скинув невикористаний GridCell-import). ContourPainter.ts лишив усе крім projectedOccupantMove/assertNeverSeatDrop, тепер споживає projectedOccupantMove+SeatDrop з core.
7. tsc -p tsconfig.check.json → exit 0.

## ВЕРДИКТ: PASS
