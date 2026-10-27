# A6 debate — adversarial critic (dg17)

Model: claude-opus-4-8

ДАЛІ: прочитати файл захисту _a6-ts-vs-rust-defense-dg17.md, потім перевірити у коді
lib.rs / layoutBridge.ts / orgBlockLayout.ts / staffDeptGrouping.ts / canvasLayout.ts /
DiagramRenderer.ts / visualEdgeBox.ts / staffEdgeGeometry.ts / staffZoneBounds.ts / svgExport.ts.

## ФАКТ (крок 1 — перевірка §2 захисту)
- Rust експортує РІВНО одну layout-функцію для org: `computeOrgRowTreeLayout` (lib.rs:11,20). Приймає node_width/height, gaps, margin — НЕ знає про відділи/яруси/обгортки/ребра. ПІДТВЕРДЖЕНО.
- TS правит вихід Rust: root re-center (orgBlockLayout.ts:93-102), dept region shift (staffDeptGrouping.ts:82-98 `x: node.x - bounds.x + region.x`), tier shift+zoneLabelBand (canvasLayout.ts:80-84,114-118,193-199), tier1 центрування над головою tier2 (canvasLayout.ts:148-155 `n.x += dx`). ПІДТВЕРДЖЕНО: фінальні positionNodes = Rust + багато TS-постів.
- Точки лінків — на рендері з LOD: visualEdgeBox.ts:25-49 (near/mid/far дають різні бокси), mapStaffEdgeBoxesForLod:134-143. ПІДТВЕРДЖЕНО. Спільне live+SVG заявлено коментом:95.
- T125 корінь: figma-row порт докується на tile (box.x+hints.tileX), а center-картка — на центр; лікується style.edgePort==='center' (visualEdgeBox.ts:68-69). ПІДТВЕРДЖЕНО — правило порту ≠ форма, не Rust-vs-TS.
- Подвійний сайт меж обгорток: worldBoundsForTier чиста (staffZoneBounds.ts:15-110), але contentPadding і labelBand приходять з РЕНДЕРУ (перевірю в DiagramRenderer). pad = margin/2 + contentPadding (:36), vertical hug (:50-55).

ДАЛІ: DiagramRenderer.ts:640-745,840-856 (звідки contentPadding/labelBand, як рахуються ребра), staffEdgeGeometry.ts buildStaffEdgeSegments, svgExport.ts (той самий код?).

## ФАКТ (крок 2 — ДВІ ПРАВДИ про wrapper padding, поза T125) 🔴
- Live-render contentPadding = `departmentWrapperPadding(theme,config)` (DiagramRenderer.ts:712,1220-1228):
  - card-стиль → `card.padding + (labelRow? labelFontSize+6 :0)` (:1222-1225)
  - blob-стиль → `contourButtonGroupMargin(config.paddingCells, theme.department.strokeWidth)` (:1227)
- SVG-export contentPadding = `contourButtonGroupMargin(config.paddingCells ?? 0, DEPT_STROKE_W)` (svgExport.ts:223) — ЗАВЖДИ blob-формула, константа DEPT_STROKE_W.
- ОТЖЕ для departmentStyle==='card' (а демо shps-staff — саме card, ShpsStaffCard) рамка зони в SVG-export рахується ІНШИМ padding, ніж у live. Це справжня «друга правда» СЬОГОДНІ, поза T125. Коментар svgExport.ts:222 «Same rule as the canvas» — НЕПРАВДА для card.
- edge-бокси: live і SVG викликають ОДИН і той самий `mapStaffEdgeBoxesForLod(mapPositionNodesToStaffEdgeBoxes(...))` (DiagramRenderer.ts:846-850 vs svgExport.ts:296-299) — тут паритет Є. Розбіжність саме у ВІДСТУПАХ обгорток (contentPadding), не в точках лінків.
- Другий нюанс: labelBand у live = this.lastZoneLabelBand (instance state, DiagramRenderer.ts:722,656), у SVG-export НЕ передається взагалі (svgExport.ts:214-224 опускає labelBand) → ще одна розбіжність live vs SVG.

ВИСНОВОК КРОКУ: інтуїція власника «немає однієї правди → неправильне розміщення» ПІДТВЕРДЖУЄТЬСЯ реальним кодом — АЛЕ розбіжність TS-vs-TS (render vs export), не Rust-vs-TS. Ліки = одне джерело padding у виході лейауту (a4), НЕ перенесення в Rust (T126).

ДАЛІ: T127a (a1/a4/a6 + умовне правило), ADR-0002, DEPT_STROKE_W константа, чи card-демо.

## ФАКТ (крок 3 — контекст рішень)
- DepartmentCardView малює картку з `padding = options.padding ?? style.padding ?? 8` + labelRow (`:43-48`) — ТОЧНО дзеркалить live `departmentWrapperPadding` card-гілку (DiagramRenderer.ts:1224-1225). Отже live-рамка і реальне малювання dept-картки узгоджені (одне джерело style.padding). А SVG-export (contourButtonGroupMargin) — ТРЕТЄ число, не узгоджене ні з тим, ні з тим для card.
- T126 сам де-скоупнутий власним арх-аналізом (_arch-review-req3): координати ВЖЕ в одному world-просторі (coords.ts:38, lib.rs:20 лише row-tree), переносити нема чого; «не в одній системі» = лише якір порту (3+ місця) = DIP/організація коду, НЕ мова шару. B3: перенесення = велика зміна стек-контракту AGENTS.md «core = contours + row-tree; canvas paint is TS».
- Граф T127a вже кодує a4 → a6 (a6 залежить від a4, бо обидва правлять міжрамкові відступи; послідовно). a4 переносить межі обгорток у ВИХІД лейауту (worldBoundsForTier у лейауті), рендер лише читає.

## РІШЕННЯ / ВЕРДИКТ
Дихотомія умовного правила a6 («одне джерело → TS; інакше → чекати T126») — ХИБНА бінарність.
Код показує: padding СЬОГОДНІ НЕ з одного джерела (live card-формула ≠ SVG blob-формула), тобто
передумова «TS-зараз безпечний» зараз НЕ виконана. Але це НЕ означає «чекати T126» — означає
«спершу a4 уніфікує джерело padding (у виході лейауту, читають І рендер, І svgExport), ПОТІМ a6».
Саме це вже закладено у граф (a4 → a6). T126 нерелевантний: це TS-консолідація, не міграція в Rust.

ВЕРДИКТ: a6 — TS, але УМОВНО й СЕКВЕНОВАНО після a4, де a4 робить ОДНЕ джерело padding спільним
для live-рендеру ТА svgExport (зараз розходяться). «Чекати T126» — відхилити (нуль коректності,
велика ціна, де-скоупнуто власним арх-аналізом). «TS безумовно зараз» — теж відхилити (padding
реально має 2-3 джерела — інтуїція власника правильна).
