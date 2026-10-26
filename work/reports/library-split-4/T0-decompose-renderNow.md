# T0 — розчепити `renderNow` (спліт dg #0, передумова #1/#3/#4)

**Status:** spec готова, код push → codex. Критика: 1 раунд (seam/ordering), 0 відкритих.
**Репо:** `~/projects/dg`, гілка `bulk-mutations`, база = HEAD `1a34034` (T1 Ф1+gap#6).
**Файл:** `packages/sdk/src/OrgHierarchyDiagram.ts:737-873` (`private async renderNow()`, ~137 LOC, 25 членів `this`).

`renderNow` — найбільше порушення фасаду (T119): 138 рядків, 25 звернень до `this`. Доки він
монолітний, кроки спліту #1/#3/#4 успадкують цей вузол у будь-який новий шов. T0 розчеплює його на
названі приватні суб-кроки **БЕЗ зміни поведінки** — щоб наступні кроки виносили чисті фрагменти,
а не 138-рядкову кулю. Стан світу: рендер кличеться через `renderCoalesce` (:299); тіло lifecycle-only.

## Чому
Монолітний `renderNow` змішує 6 незалежних турбот (тема, rebind, capture, render-виклик,
подієві колбеки, post-render), тому будь-який крок спліту, що чіпає ОДНУ з них (напр. винос
layout у #4, або renderer-інтерфейс), мусить читати й не зламати всі шість. Вада наявного шляху:
подієвий bundle (~15 колбеків, :779-857) і capture-before-await-інваріант (:753-759, T104/T109)
живуть в одному тілі — рев'ю кожної правки = перечитати весь метод. Виміряна корекція посилки:
це НЕ переписування логіки (спокуса «заразом спростити» — заборонено), а extract-method під стелю
max-lines, з точним збереженням ПОРЯДКУ й семантики capture.

## Рішення
**Розбити на приватні методи, orchestrator лишає послідовність як є.** `renderNow` стає тонким:
```
renderNow():
  if (!host || destroyed) return
  const {nodeTheme, resolved} = applyRenderTheme()      // :740-744 (resolveTheme/resolveNodeTheme/setBackground) — SIDE-EFFECT: пише this.nodeTheme + host.setBackground
  bindCanReparent(host)                                  // :745-752 (roster+reportLines → host.renderer.canReparent)
  const captured = captureDrawingState()                // :753-759 → {drawing, drawingStaffOrgIds} — МУСИТЬ лишитись ПЕРЕД await (T104/T109)
  await reportIfRenderFails(
    host.renderer.render(captured.drawing, nodeTheme, resolved, renderConfig, buildRenderOptions(captured)),
    captured.drawing, captured.drawingStaffOrgIds)       // :760-861
  afterRender()                                          // :862-873 (requestPaint/destroyed-guard/repaintHighlight/diagnostics/promoteSync/prefetch)
```
- `buildRenderOptions(captured)` будує options-об'єкт (:761-857), **включно** з подієвим bundle. Якщо
  options+колбеки разом усе ще > стелі — винести `buildInteractionCallbacks()` окремим методом (колбеки
  :779-857 — чисто замикання над `this`, легко відділяються).
- **Причина саме extract-method, а не клас-Renderer:** клас/стратегія тут — спекуляція (YAGNI); renderer-інтерфейс
  (RendererPort) — це крок **T3**, не T0. T0 лише зменшує вузол, не вводить абстракцію.
- **Відкинута альтернатива (та її ціна):** «заразом підняти layout-виклик у #4» (крок T2) — НЕ тут: змішає
  2 кроки, сховає головну претензію T0 (розмір методу) і додасть поведінкову зміну в «no-behavior-change» коміт.

**🔒 Інваріанти, які код МУСИТЬ зберегти (інакше регресія):**
1. **capture-before-await** (:753-759): `drawing`/`drawingStaffOrgIds` знімаються ПЕРЕД `await render()`; читання
   `this.data` після await — заборонено (T104 «стан, якого ніхто не малював»). `captureDrawingState()` кличеться ДО `render()`.
2. **порядок side-effect'ів незмінний:** theme→setBackground ПЕРЕД bind; bind ПЕРЕД capture; post-render у тому ж
   порядку (requestPaint → destroyed-guard → repaintHighlight → diagnostics → promoteSync → prefetch).
3. **guards:** ранній `!host||destroyed` (:738); другий `destroyed||!host` після await (:864) — лишаються на місцях.
4. `reportIfRenderFails(pending, drawing, drawingStaffOrgIds)` — підпис і rethrow-семантика НЕ чіпаються (T97).

## Поза межами
- Будь-яка зміна ПОВЕДІНКИ рендеру; підняття layout у #4 (T2); renderer-інтерфейс (T3).
- Рефактор `this`-членів у поля-групи, перейменування, «заразом» — ні (коміт у межах замовленого).

## Форма перевірки
- **Чистий шов:** `highlight.test.ts:144` («facade request during render deferred and applied at renderNow tail»)
  — прямо стереже post-render-хвіст; МУСИТЬ лишитись зеленим без правки тесту.
- **Повний gate (writer перед передачею):** `cd packages/sdk && npx rstest run` (увесь suite); `npx tsc` typecheck 0; oxlint 0;
  `cd packages/core && cargo test` (має лишитись 25/0 — T0 Rust не чіпає). Діф = лише `OrgHierarchyDiagram.ts` (+ можливо тест, якщо знадобиться).
- **Контрольна проба:** тимчасово переставити один post-render виклик (напр. repaintHighlight ДО render) → highlight.test має почервоніти; повернути.

## Критика (seam/ordering, 1 раунд)
- **seam:** `applyRenderTheme` має side-effect (пише `this.nodeTheme`) — НЕ робити «чистою» функцією, що повертає тему без запису: `this.nodeTheme` читається деінде (repaintHighlight). Лишити side-effect, повертати лише `{nodeTheme, resolved}` для локального вжитку. ВЕРДИКТ: прийнято, зафіксовано в підписі.
- **ordering:** `buildRenderOptions` читає `this.data`/`this.viewState` у момент виклику (до await) — колбеки замикають `this` (пізнє читання, це вже наявна семантика). Capture стосується лише `drawing`/`drawingStaffOrgIds`; options-поля (lod/orgLayout/staff/selected) читаються синхронно до await як і зараз. ВЕРДИКТ: зберегти точку виклику `buildRenderOptions` ДО await, НЕ всередині.

## Закрито в grilling
- Чи виносити колбеки окремо — залежить від стелі max-lines (умова в Рішенні). Кодер вирішує за фактом рядків.
