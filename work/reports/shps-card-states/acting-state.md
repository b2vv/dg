# spec — ТВО (`status:'acting'`) як розрізнюваний стан canvas-картки

**Status:** `ready` · **крок 1** поетапної SDK-поставки під host-інтеграцію (варіант 1 власника).
**Поріг:** 🟡 внутрішня render-гілка; НЕ публічний API (`status:'acting'` уже в `PositionStatus`,
`DiagramPosition`). Поля не додаються.

Робить `status:'acting'` **видимим станом** на canvas-картці посади — тим самим amber-hourglass
маркером, що й темпоральний виконавець, поважаючи `tempMarkerStyle`. Стан світу: `status:'acting'`
визначений (`data/types.ts:1`), але **ніде не рендериться** — читається лише `'vacant'`
(`PersonNode.ts:476`); маркер гейтиться виключно на `position.isTemporary` (`:536-537`). **Виняток:**
pixel-exact бейдж `.tmp` на робочому зумі дає HOST через HTML-overlay (card-split); canvas несе стан
для far/mid/export/pan та поза-капових карток.

## Чому
Host (`cassiopeia-admin-ui`) шле ТВО як `status:'acting'` і **не** ставить dg-`isTemporary`/`pending`
для своїх даних (звірено Cass 1: їхнє темпоральне поняття одне — holder `status==='Temporary'` →
`acting`). Тож на canvas ТВО-посада зараз **невідрізнювана** від звичайної — на far/export/pan, де
HTML-overlay відсутній, стан зникає. Це розходження з вимогою «стани розрізняються» (card-split).

## Рішення
`status:'acting'` рендериться **ідентично темпоральному маркеру**: вводимо локальний
`temporal = position.isTemporary || position.status === 'acting'` і вживаємо його там, де зараз
стоїть `position.isTemporary` для маркера — name-tint (`:508`), legacy-«T» (`:536`), hourglass
(`:537`). Форма маркера й далі визначається `tempMarkerStyle` (host ставить `'hourglass'`).

**Чому так:** acting і isTemporary дають ОДИН візуал (єдиний amber-hourglass — підтверджено Cass 1),
тож спільний render-шлях коректний; семантику даних це не зливає (host шле лише `acting`, demo —
лише `isTemporary`).
**Відкинута альтернатива:** окрема render-гілка для acting з власною іконкою — ціна: дублює hourglass,
розходиться з `tempMarkerStyle`, і суперечить «один темпоральний маркер» мокапа. Відкинуто.
**Шов монтування:** `PersonNode.renderNear` (три рядки з `position.isTemporary`).

## Поза межами
- Pixel-exact бейдж на робочому зумі — HOST (HTML-overlay).
- `tsa`/ОР-індикатор — окреме host-дата-питання (Cass 1 → власнику), на картці ігнор.
- head-org стиль і per-node акцент — наступні кроки цієї ж групи.
- Відмінний візуал acting vs isTemporary — якщо колись знадобиться, окрема зміна.

## Форма перевірки
- **Чистий шов** (`PersonNode.test.ts`, figma-seat harness): acting-seat (`status:'acting'`,
  `isTemporary:false`, `tempMarkerStyle:'hourglass'`) → `findText('⏳')` є, після імені.
- **Регрес:** наявний `isTemporary:true` acting-seat лишається зелений; `filled`+не-temporal → без ⏳.
- **Контрольна проба (mutation):** без фіксу тест acting-seat падає (маркер гейтиться лише на isTemporary).

## Acceptance
| # | Критерій | Спростування |
|---|---|---|
| S1 | `status:'acting'` (без isTemporary) показує темпоральний маркер (⏳ при hourglass-стилі) | маркер відсутній |
| S2 | `isTemporary:true` далі показує маркер (регрес) | наявний тест упав |
| S3 | `filled` без isTemporary і не-acting → маркера нема | ⏳ з'явився на звичайній |
| S4 | Поля `DiagramData` не змінились (лише render-гілка) | доданий/змінений публічний тип |
