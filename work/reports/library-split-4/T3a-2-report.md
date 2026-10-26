# T3a-2 — drop-pipeline C → core/ (звіт)

**Коміт:** `530d24c` (гілка `bulk-mutations`). Дата: 2026-10-26. Координатор/рев'ювер: Claude Opus 4.8.
Писар коду: codex (A→B). Тип: чиста релокація, 0 зміни поведінки.

## 1. Зроблено
Перенесено drop-pipeline та базовий клас помилки у новий найнижчий шар `packages/sdk/src/core/`:
- **`core/errors.ts`** (новий): `InteractionError` (leaf, 0 import).
- **`core/seatDrop.ts`** (новий): `isValidGridCell`, `SeatDrop`, `resolveSeatDrop`, `applySeatDrop`,
  `movePositionToCell`, `projectedOccupantMove` (+ приватні `sameCell`/`assertNever`/`assertNeverSeatDrop`).
  Імпортує лише `../data/types.js` + `./errors.js`.
- **`core/index.ts`**: реекспорт перенесеного.
- Вирізано з `interaction/positionMove.ts` (лишились `GridSnap`/`snapToGrid`/`snapWorldToCell`/
  `shiftPositionBlock`), `interaction/types.ts` (лишився лише ContextMenu-реекспорт),
  `render/contour/ContourPainter.ts` (лишилось усе крім `projectedOccupantMove`/`assertNeverSeatDrop`).
- Репойнт 8 prod-споживачів + 4 тестів на `core`; барелі `interaction/index.ts` і public `index.ts`
  почищено (без shim). Публічний API незмінний: `InteractionError`/`movePositionToCell` — VALUE-експорти.

## 2. Протестовані сценарії (гейти, стадія C, незалежний прогін)
- `tsc -p tsconfig.check.json` → **0**; `oxlint --max-warnings 0` (усі split-файли) → **0**.
- `rstest run` → **1128/0** (двічі: до і після фіксу dead-import).
- `cargo test` (packages/core) → **25/0**.
- Публічний API: набір експортів `index.ts` = `HEAD:index.ts` (**240/240**, нічого не додано/прибрано).
- **Контрольна проба C** (зелений suite ≠ живий шов): тимчасове прибирання `type SeatDrop` з
  core-бареля → tsc червоніє саме у `OrgHierarchyDiagram.ts:103`, `ContourPainter.ts:15`,
  `DiagramRenderer.ts:53`; прибирання `applySeatDrop` → `positionMove.test.ts:3` + `OrgHierarchyDiagram.ts:103`.
  Відновлено, tsc знову 0, файл ідентичний бекапу. Споживачі справді резолвляться через core.
- Байт-ідентичність: `diff` тіл `resolveSeatDrop`/`applySeatDrop`/`movePositionToCell`/`projectedOccupantMove`
  (core vs HEAD-джерело) — IDENTICAL.
- 2 сліпі незалежні gate-reviewer (Opus 4.8): **2/2 PASS**, 0 блокерів.

## 3. Неочевидні знахідки
- **oxlint зловив те, що tsc пропустив**: після вирізання `GridCell` став мертвим import у
  `positionMove.ts` (residual `shiftPositionBlock`/`snap*` його не вживають). tsc з наявним конфігом
  не падає на unused import — тому oxlint у гейтах обов'язковий, не опційний.
- **Повнота споживачів ширша за handoff-список, але збіглася**: греп виявив `callbacks.ts`
  (`SeatDropChoice` — ІНШИЙ символ), `seatCollisionPreview.contract.test.ts`, `ContourPainter.test.ts`
  — усі згадують `SeatDrop`/`resolveSeatDrop` лише в коментарях, import перенесеного не мають. Репойнт
  не потрібен. Список handoff (8 prod + 4 тести) виявився повним.
- **CRG після коміту позначає перенесені символи «Untested»** — хиба test-gap евристики на нових
  файлах; реально покриті `positionMove.test`/`interaction.test` через core-import (rstest 1128/0).
- **InteractionError мусить лишитись ЄДИНИМ класом** (не копією): `instanceof`-сайти в
  `OrgHierarchyDiagram.ts` (~937/949/2060/2072) ламаються від двох класів. `applySeatDrop` кличе
  `movePositionToCell`, обидва кидають `InteractionError` → всі троє їдуть у core разом (інакше 2× upward core→interaction).

## 4. Скріни / 5. User flow
N/A — внутрішній рефакторинг шарів, без UI та зовнішньої поведінки.

## 6. Ризики й обмеження
- Residual-файли тягнуть `InteractionError` через core-**барель** (`../core/index.js`), а не прямо з
  `core/errors.js` (нотатка r1). Функціонально коректно, циклу немає; стилістично можна звузити пізніше.
- Коміт **не пушнуто**, хвости робочого дерева (`.gitignore`, `AGENTS.md`, `package.json`,
  `orgBlockLayout.ts`, `_recenterProbe.test.ts`) свідомо поза T3a-2.
- Поза скоупом: T3b/T3c (re-gate RED D1–D5) — окрема авторська сесія.

## Post-deploy
Не застосовно (без деплою; гейти локальні). Наступний крок лінії робіт — T3b/T3c контракт або
інша черга з AGENDA.
