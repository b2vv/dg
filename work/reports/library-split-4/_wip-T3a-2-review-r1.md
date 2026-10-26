claude-opus-4-8

# T3a-2 gate-review (r1) — чиста релокація у core/

ДАЛІ: прочитати діф tracked-файлів + нові core-файли (errors.ts, seatDrop.ts); потім звірити 7 пунктів.

ФАКТ (1 — нульова поведінка / byte-identity):
- errors.ts vs HEAD interaction/types.ts клас InteractionError — diff IDENTICAL.
- seatDrop.ts функції з positionMove-походження (isValidGridCell, SeatDrop, sameCell, resolveSeatDrop, assertNever, applySeatDrop, movePositionToCell) vs HEAD positionMove.ts — IDENTICAL (хибний «differ» був лише через мій regex `assertNever*`, що зачепив ще й assertNeverSeatDrop).
- seatDrop.ts хвіст (2 doc-коменти + projectedOccupantMove + assertNeverSeatDrop) vs HEAD ContourPainter.ts — CONTOUR-MOVED IDENTICAL.
- Жоден рядок логіки не змінено. Єдині відмінності — import-рядки (InteractionError тепер з ./errors.js у seatDrop.ts).

ФАКТ (2 — InteractionError єдиний клас):
- `grep class InteractionError packages/sdk/src` → лише core/errors.ts:1. Копія в interaction/types.ts видалена (діф підтверджує).
- OrgHierarchyDiagram.ts: єдиний import (рядок 103) з ./core/index.js; усі `throw new`/`instanceof` (928-2069) резолвляться на нього.

ФАКТ (3 — core-purity):
- grep не-тестових import у core/*.ts, що НЕ з ../data/ або ./ → порожньо. seatDrop.ts імпортує тільки ../data/types.js + ./errors.js; errors.ts — лише вбудований Error.

ФАКТ (4 — публічний API):
- diff name-set `git show HEAD:index.ts` vs working → NAME-SETS IDENTICAL (240).
- movePositionToCell та InteractionError лишились VALUE-експортами (без `type`), просто переїхали з interaction-блоку в core-блок.

ФАКТ (5 — повнота репойнту):
- Усі src-імпорти moved-символів ідуть через ../core/index.js. Старі локації (interaction/types|positionMove|index) згадуються ТІЛЬКИ в packages/sdk/dist/* (застарілий build-output, не джерело).
- interaction/index.ts барель більше НЕ реекспортує moved (діф видалив InteractionError, isValidGridCell, movePositionToCell, resolveSeatDrop, applySeatDrop, SeatDrop); shim-реекспорту з core немає.
- 4 тест-файли перенаправлені на ../core/index.js коректно.

ФАКТ (6 — residual):
- positionMove.ts експортує лише: GridSnap, snapToGrid, snapWorldToCell, shiftPositionBlock.
- ContourPainter.ts: ContourPainterDeps, ContourPaintRequest, ContourPainter — projectedOccupantMove/assertNeverSeatDrop прибрані.

ФАКТ (7 — збірка/тести):
- `npx tsc -p tsconfig.check.json` → exit 0.
- rstest 4 перенаправлені файли → EXIT=0, passedTests=103, failedTests=0.

Нотатка (не блокує): positionMove.ts (та деякі interaction-файли) імпортують InteractionError із барелю ../core/index.js, а не напряму з ../core/errors.js. Функціонально коректно, циклу немає (core не залежить від interaction). Стилістика, не дефект.

РІШЕННЯ: PASS. Чиста релокація, нульова зміна поведінки підтверджена byte-identity + зеленими тестами + tsc=0. Блокерів немає.
