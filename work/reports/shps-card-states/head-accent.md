# spec — head-позиція як розрізнюваний акцент canvas-картки

**Status:** `ready` · крок **1b-i** (per-node canvas-стани). **Поріг:** 🟡 внутрішня render-гілка;
`isHead` уже в `DiagramPosition` — поля не додаються.

Робить `isHead`-посаду **візуально розрізнюваною** на canvas-картці: ім'я у brand-колір + brand-рамка.
Стан світу: `isHead` керує лише layout/камерою (`resolveHead.ts`, camera), на рендер КАРТКИ не впливає
(звірено — head-варіанта картки нема). **Виняток:** pixel-exact head-glow/brand-soft на робочому зумі —
HOST HTML-overlay (card-split); canvas несе розрізнюваність для far/mid/export/pan.

## Чому
Blueprint §4: head-картка = brand border #e5491d + glow + `.pos`→brand-soft #ff8d68. На canvas head
зараз невідрізнювана від звичайної посади — керівник структури губиться на far/export/pan, де overlay нема.

## Рішення
У `PersonNode.renderNear`: `isHead` (не vacant) → `nameFill = style.brandColor` (перед keyPosition/temporal
гілками, після vacant); у `drawCard` brand-рамка (`:383`) розширюється на `isKeyPosition || isHead`.
Форма акценту — через наявний `brandColor` (один brand; brand-soft vs brand розрізняє host-overlay).

**Відкинута альтернатива:** окреме поле `headAccentColor` + glow на canvas — ціна: дублює overlay, pixel-exact
на canvas не потрібен (card-split), зайвий стиль-API. Відкинуто.
**Шов:** два рядки `renderNear` (nameFill-гілка + border-умова).

## Поза межами
- Pixel-exact glow / brand-soft на робочому зумі — HOST.
- vacant-head, head+acting конфлікти кольору — vacant виграє (ясність), head > temporal/keyPosition.
- org `role` leading/current і `external` — наступні інкременти 1b.

## Форма перевірки
- **Чистий шов** (`PersonNode.test.ts`): head-seat (`isHead:true`, filled, style з `brandColor`) →
  `findText(name).style.fill === brandColor`.
- **Регрес:** не-head filled → ім'я НЕ brandColor (лишається permanent/nameColor).
- **Проба (mutation):** без фіксу head-тест падає (isHead ім'я не фарбує).

## Acceptance
| # | Критерій | Спростування |
|---|---|---|
| H1 | `isHead` (filled) → ім'я у `brandColor` | колір імені не brand |
| H2 | не-head filled → ім'я НЕ brandColor | звичайна посада побрендована |
| H3 | Поля `DiagramData` не змінились | доданий публічний тип/поле |
