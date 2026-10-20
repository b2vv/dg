# WIP — bulk-mutations (Cass 2, SDK-side)

## Handoff
- **Гілка:** `bulk-mutations` @ `b8dd519`. Писар: Cass 2 (SDK). Рев'ювер: Cass 1 — **пізніше**,
  коли закінчить sprint-13 баг-фікси й стане хост-консумером dg.
- **Де зупинились:** заземлення завершено; стартую TDD з дефекту **A12/A13** (перший, бо
  незалежний від host-контракту).
- **Наступна точна дія:** дописати RED-тести A12/A13 в `orgCardInteractions.test.ts` → прогнати
  rstest (НЕ vitest!) → делегувати фікс codex → ratchet.
- **На що чекаємо:** Cass 1 перемкнеться на інтеграцію → звірити форму `BulkStepChoice` ДО
  заморозки в `USAGE.md`. Доти callback-контракт НЕ фіксую в публічному API.
- **Відкрите питання власника:** хто реально веде host-alpha/4328 — Cass 1 плутала мене з host-
  сесією; я на dg.

## Контекст
- AI Factory пінновано для dg (external root, c427bd8). Деталі — `dg/.ai/`.
- Спека: `work/reports/bulk-mutations/spec.md` (GATE 1 пройдено, автор Dg 1). Коду ще немає
  (grep `bulk-delete|BulkStepChoice|onBulk` — порожньо).
- Поріг 🔴: нові пункти меню + новий callback-канал = публічний API (`USAGE.md`, гейт `check:docs`).

## Шви (заземлено в коді)
- `interaction/contextMenu.ts:41-49` — гуртове меню, гард `selection.every(n=>n.kind==='organization')`.
- `callbacks.ts:7` LayoutPatch · `:66` SeatDropChoice · `:124` onLayoutChange · `:147` onSeatCollision.
- `OrgHierarchyDiagram.ts:604` handleNodeSelect · `:784` onOrgClick→handleNodeSelect.
- `render/orgCardInteractions.ts:48-58` — безумовна гілка shift-кліку: `onOrgClick` для ОБОХ сцен.
- `render/DiagramRenderer.ts:919` штатний bind (з `onSingleTap`) · `:1091` деревний bind. Обидва
  передають один і той самий `options` як `handlers`.

## РІШЕННЯ — форма A12/A13 фіксу
Дефект (власник 2026-09-13): у штатній сцені org-картка не має потрапляти у виділення взагалі;
деревна — як раніше. Обидва call-sites ділять `handlers`, тож:
- Додати `selectable?: boolean` (default `true`) в `OrgCardBindArgs`.
- Штатний сайт (`:919`) → `selectable: false`; деревний (`:1091`) → дефолт.
- У `bindOrgCardInteractions` гейтити **обидва** виклики `onOrgClick` (modifier-гілка + plain-tap)
  на `selectable`. `onSingleTap`, double-tap, context-menu лишаються.
- **Відкинута альтернатива:** передавати штатному сайту `handlers` без `onOrgClick` — брудно
  (клонувати `options`), дрейфить; прапор самодокументований.

## Acceptance (зі спеки)
- A12: shift-клік org у штатній → НЕ у виділенні; у деревній → виділяє.
- A13: одинарний тап у штатній → `onSingleTap` (розгорнути/занурити) й далі НЕ виділяє.
- A9 (регрес): деревна сцена й дефолтний bind поведінку не змінили.

## Журнал
- 2026-10-20: заземлення + ця нота. Далі — RED-тести.
- 2026-10-20: **A12/A13 ЗАКРИТО.** `selectable?: boolean` (default true) у `OrgCardBindArgs`;
  гейт обох `onOrgClick`; штатний сайт `DiagramRenderer.ts:919` → `selectable:false`.
  - RED: 2 unit (A12 modifier, A13 tap) + 1 integration (`nodeDoubleClick` штатна, фіксувала
    старий `onOrgClick=1`) → mutation-проба «немає гейту».
  - GREEN: full SDK **1036/0**, typecheck/lint/check:docs ✅. Integration `onOrgClick=0`
    доводить досяжність `selectable:false` у рендері, не лише примітив.
  - Файли: `render/orgCardInteractions.ts`, `render/DiagramRenderer.ts`,
    `render/orgCardInteractions.test.ts` (+3), `render/nodeDoubleClick.interactions.test.ts` (flip).
  - ⚠️ Не комічено (чекаю рев'ю/дозволу). USAGE.md нота про зміну поведінки виділення штатної
    сцени — відкладено до doc-pass A10 (не gated: публічних методів не додано).
- **ДАЛІ (розвилка власнику):** далі bulk-delete/bulk-edit меню + `BulkStepChoice` callback —
  це host-контракт, який я тримаю незамороженим у USAGE.md до інтеграції Cass 1. Будувати
  механізм зараз по GATE-1-спеці чи тримати паузу до звірки з інтегратором?
