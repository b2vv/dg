Model ID: claude-opus-4-8

# Inspector-review b601cba — alpha-розкладка ШПС: розмір на картку

УВАГА: я той самий провайдер (Anthropic), що й автор коміту. Це НЕ незалежне ревʼю іншого провайдера — свіжий контекст тієї ж моделі.

ДАЛІ: читаю дифф `git show b601cba` (база 8daa0a5), щоб зрозуміти обсяг змін.

## ФАКТИ (верифіковано незалежно)

### (1) Розмір на картку доходить end-to-end
- TS `buildStaffMockupInput` (staffLiveGeometry.ts:333-335): sizes будуються з `position.width/height` кожної посади з org; фолбек 300×112; `inOrg[0]`-патерн прибрано. ВЕРИФІКОВАНО.
- Rust приймає `StaffMockupInput.sizes` (staff_mockup_layout.rs:111-113), будує `dims` на кожну посаду (:1344-1366), прокидає у subtree_width/place_within/row_heights, у роутер (RouteInput.dims, wof/hof), у ноди (:1604-1605) і рамки.
- Поверхні споживають per-node: DiagramRenderer.ts:839 `{...theme.person, width:n.width, height:n.height}` та :868 box; StaffChromeBackdrop.ts:109-110 `n.x+n.width`; promoteMath box-based. Жодного хардкоду 300/112 на alpha-рендері. Dispatch — staffLiveGeometry.ts:171 (staffAlphaMockup→computeViaMockup, єдиний alpha-шлях). ВЕРИФІКОВАНО.

### (2) Тести перевіряють поведінку, не зелені без фічі
- Rust: bus-тест має передумову-assert `trs.height>acc.height && trs.y==acc.y` (без неї зелений і без фічі); top-align, taller-frame, wider-siblings, mixed-scene (cross=0/card=0 на mock3_dg), invalid→Err. 14 passed/0 (1 ignored dump).
- Demo staffAlphaSizes.test.ts: через РЕАЛЬНИЙ computeStaffLiveGeometry+tabConfig; перевіряє per-card height і що перша посада більше не задає всіх. 2 passed/0.

### (3) Golden-регресія справді проти ДО-зміни
- mockup-golden-*.json створені в 8daa0a5 (parent) і НЕ торкнуті b601cba (git log підтверджує). Тест `equal_sizes_reproduce_the_pre_change_golden` порівнює вихід нового коду з тими фікстурами, і без sizes, і з sizes=params. ВЕРИФІКОВАНО.

### (4) Пастки ліній при змішаних висотах
- Int-шина: `by = cards[c].1 - lv/2` (діти рівня top-aligned → середина gap під низом РЯДКА, не картки нижчого менеджера). Коректно й коли менеджер нижчий за сусіда рядка (тест ловить).
- Ext/cross-block: `cards[m].1 + hof(m) + bv/2` — власна висота менеджера.
- edge_target secondary/dept-head docking, astar start, build_grid walls, stats_core obstacle (dims[id]) — усі per-card. mixed-scene integration: 0 перетинів/0 card-hits.

### (5) Err там, де раніше працювало
- Невалідний (0/нег/NaN/Inf) чи дубльований розмір → Err (:1347-1366) — рішення власника, fail-loud. Відсутній розмір (width&height undefined) → не в sizes → фолбек params, без Err.
- Демо-дані (SHPS_SEAT 300×112 на всіх посадах) не містять нулів → alpha-таб не ламається; рівні розміри = golden. Жодної нуль-дефолтної width/height у demo/SDK не знайдено.

## Спостереження (неблокувальні)
- Host, що подасть width:0, отримає throw на весь alpha-render (немає часткового рендеру). Це навмисне рішення власника (fail-loud), не дефект.
- TS дублює 300/112 у двох місцях (params і `?? 300/112` у map); якщо колись змінити params-дефолт, треба синхронізувати. Косметика.
- Export-шлях (SVG) не трейсив глибоко — поза заявленим списком поверхонь; геометрія спільна (та сама StaffLiveGeometry), тож ризик низький, але не перевірено явно.

## РІШЕННЯ
Verdict: FIT. Усі 5 критеріїв власника виконано й верифіковано кодом+свіжими тестами (Rust 14/0, demo 2/0). Блокувальних розходжень немає. Я той самий провайдер (Anthropic) — не незалежне крос-провайдерне ревʼю.
