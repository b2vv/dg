claude-opus-4-8

# R7 A4.2b FORK1 — позиція «зберегти canvas.tiers БЕЗ rebaseline golden»

ДАЛІ: звіряю первинні джерела —
1) golden-поле `bands` (staffGeometry.golden.test.ts:49-54)
2) що таке live.canvas.tiers сьогодні (layoutStaffCanvas: y=cursorY, height formula)
3) Rust-вихід namespaces (staff_compose.rs ~54 — нулі; enrich_namespaces staff_bounds.rs:135 / staff_layout.rs:1157)
4) чи споживає canvas.tiers хтось крім golden
Тоді порівнюю (а) reconstruct RAW у TS vs (б) прибрати bands з golden; визнаю найсильніший контраргумент.

## ФАКТИ (звірено з кодом)

1. golden `bands` = `canvas.tiers.map(...)` → фіксує {id=organizationId??'org-cards', x=band.x??margin, y, w=band.width??canvas.width-2*margin, h} — staffGeometry.golden.test.ts:48-54. Сирі staff-block яруси НЕ мають x/width (canvasLayout.ts:90-96,124-130), тож x/w завжди = margin / canvas.width-2*margin. Реально унікальне в bands = **лише y/height + tier→org id**.
2. Сирий yarus y/height = cursorY-стек: tier1.y=margin, height=max(block.height,orgCardHeight)+zoneLabelBand; tier2 після +tierGap; tier3 height=contentHeight+margin (canvasLayout.ts:60-131,222-232). Залежить від block.height (per-block row-tree) + Math.max-кламп + акумуляція cursorY.
3. Rust compose_tiers СТАМПУЄ ті самі сирі y/height (staff_compose.rs:54-63: y=cursor_y, height=max(block_height,min_height)+zone_label_band), x/width=0.
4. АЛЕ staff_layout.rs:1157 `let namespaces = enrich_namespaces(...)` ЗАТІНЮЄ сирі namespaces — на вихід WASM ідуть ЛИШЕ enriched. enrich (staff_bounds.rs vertical:38-54) рахує content-hug y/height з меж вузлів → ≠ сирих. Отже сирі y/height ЗНИКАЮТЬ на межі Rust.
5. Рендерер малює live.zones (enriched) — DiagramRenderer.ts:694; svgExport.ts:225-244 re-enrich-ить canvas.tiers через enrichStaffTierBands і малює enriched tier.x/y/w/h. Сирі tier y/height НІХТО не малює.
6. golden фіксує painted-зони ОКРЕМО: `zones` = live.zones (enriched, hard-check «missing zone bounds»), staffGeometry.golden.test.ts:96-99,108. Тобто painted-геометрія вже під асертом поза `bands`.
7. StaffCanvasResult.tiers — non-optional (types.ts:152), тож поле лишиться у типі; питання лише в тому, чи golden його ЧИТАЄ.
8. live.zones=[] коли config.staffZoneChrome off (staffLiveGeometry.ts:100-107) — для таких табів `zones` порожні, а `bands` є.

## РІШЕННЯ
- (а) reconstruct RAW у TS: реконструкція з node-позицій = дублювання видаленого cursorY-стекінгу+Math.max-клампів+block.height — саме та математика, яку A4.2b переносить у Rust. НЕ дешево, суперечить меті. Варіант (а-Rust: виставити сирі namespace y/height окремим полем виходу) = production-поле ЛИШЕ заради тесту, мертве в усіх реальних споживачах. Гірше за (б).
- (б) прибрати `bands` з normalizeLayout: видалення рудиментарного тест-поля (сирі y/height ніхто не малює; painted-зони лишаються під асертом `zones`; nodes/orgCards/edges/width/height/routes байт-ідентичні). НЕ геометричний rebaseline. Чистіше.

РЕКОМЕНДАЦІЯ: (б).

## Контраргумент опонента (визнання)
«Rust фізично не має сирих смуг (затерто на 1157) → byte-identity bands неможливий без дублювання; rebaseline ЛИШЕ bands з diff-доказом U4-сумісний, бо zones/nodes/routes identical.»
Поступаюсь у фактичній частині: byte-identity ЧИСЕЛ bands чисто недосяжний (reconstruct-in-TS дублює видалене; expose-raw = мертва surface). ЦЕ приймаю і знімаю половину «reconstruct у TS» зі своєї тези.
Спростування решти: моя теза НЕ вимагає зберегти числа — вимагає НЕ робити rebaseline. (б) дає третю двері: видалити рудиментарну асерцію, а не благословити нові числа. U4 («diff=баг, не rebaseline») (б) шанує буквально — diff'у для адюдикації НЕМАЄ (усе мальоване identical), тоді як rebaseline-bands ВИМАГАЄ людину очима підтвердити змінені числа = саме той casual rebaseline, що U4 забороняє.

## Чесна ціна (б)
Для табів з staffZoneChrome=off `zones` порожні, тож `bands` був єдиним tier-level асертом; після (б) tier-геометрія таких табів не асертиться. Але вона й не малюється (chrome off), а layout накритий nodes+width+height. Втрата = неспостережуваний проміжок.
