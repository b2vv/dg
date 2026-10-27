# R3 — Rust пакування відділів/обгорток (impl-журнал Dg20)

Гілка `feat/t126-staff-rust-geometry`. Шов (узгоджено з власником): чиста Rust-функція в
`packages/core`, спостереження через `cargo test`. Вхід `StaffLayoutInput`, вихід
`departmentFrames`+`nodes`. Coder = codex exec (green); red-тести пише оркестратор (незалежний оракул).

## Оракул рамки відділу (незалежне джерело — TS, НЕ Rust-реалізація)
`contourButtonGroup.ts`:
- `contourButtonGroupMargin(paddingCells, strokeWidth) = max(6, strokeWidth/2 + 4) + paddingCells*8`
- рамка = union AABB членів, розширений на `margin` з кожного боку:
  `{ x: bbox.x−m, y: bbox.y−m, w: bbox.w+2m, h: bbox.h+2m }` (рядки 60-63).
`margin` = `contentPadding` (r1 §2c: TS рахує ОДИН раз, подає як вхід → усуває дві правди
live `staffLiveGeometry.ts:62/99` vs SVG `svgExport.ts:223`).

Пакування сьогодні (`staffDeptGrouping.ts`): групує за відділом, layout row-tree кожного
(`layoutConnectedTree`=Rust `compute_org_row_tree_layout`), bbox (`regionBounds`), розкладка
регіонів зліва направо від `margin`, колізії через `aabbOverlap(region, placed, hGap, vGap)`.
⚠️ Рамка з padding НЕ додається тут сьогодні — рахується окремо (ті самі дві правди). R3 обʼєднує.

## Вертикальні зрізи (tracer bullets)
1. [ ] **RED** один відділ+член → `department_frame` = bbox ± contentPadding (оракул вище).
2. [ ] B4 зазор рамок = gap+2·padding (I-T5; оракул — чинний `staffZoneBounds*.test.ts`/I-T5).
3. [ ] B1 0 посад → порожня рамка з коректним padding, не падає.
4. [ ] B3 корінь без відділу (I-A2): верх картки кореня = перший ряд карток відділів (зсув=шапка+відступ).
5. [ ] B5 magnetic-розріз: рамка-на-частину зі спільним departmentId + partIndex (0-база, None=цілий).

ДАЛІ: модуль `staff_packing.rs` + red-тест зрізу 1; `cargo test` → red; тоді codex green.

---
## Зріз 1 — GREEN (Dg20)
`department_frame(department_id, members, content_padding) -> Option<StaffDepartmentFrameGeo>`:
union AABB членів ± content_padding; None для порожнього. Реекспорт у lib.rs (clippy dead_code,
та сама ідіома що compute_org_row_tree_layout — НЕ allow-suppress).
Гейти: staff_packing 2/2 · повний cargo test 56/56 · fmt 0 · clippy -D warnings 0. [1] ✓

⚠️ Coder-шлях codex:rescue впав на API-safeguard драйвер-моделі (Sonnet 5.5, reasoning_extraction),
НЕ на коді — codex нічого не зачепив. Green зроблено оркестратором (red-оракул незалежний → TDD ок).
Рішення про Coder для зрізів 2-5 — за власником.

---
## Зріз 2 (B4/I-T5) — ЗАБЛОКОВАНО на неоднозначності (питаю власника)
I-T5 «зазор між рамками = gap + 2·padding» — новий інваріант R3; ніде в коді не зафіксований
(чинний staffDeptGrouping розділяє bbox-регіони лише `horizontalGap`, рамки з padding у пакуванні
не рахує). Два читання дають РІЗНИЙ оракул:
- Читання A: розділення bbox-регіонів = horizontalGap + 2·padding → краї рамок = horizontalGap один від одного.
- Читання B: край-рамки↔край-рамки = horizontalGap + 2·padding → розділення bbox = horizontalGap + 4·padding.
T127a:52 «прибрати +2×padding → червоний» схиляє до A, але прямо суперечить фразі «зазор РАМОК».

ⓘ Додаткова напруга: БУДЬ-ЯКЕ з читань змінює x-координати вузлів (сьогодні лише horizontalGap)
→ конфліктує з R0-golden «identical before=after» (plan §5.1). Треба рішення: rebaseline golden
для сцен із відділами (R3 = свідома зміна поведінки) чи інакше.
ДАЛІ: рішення власника по I-T5 + golden, тоді red зрізу 2.

### Рішення власника (Dg20)
- I-T5 = **Читання A**: розділення bbox-регіонів = horizontalGap + 2·padding; краї рамок на horizontalGap.
- R0-golden: **ребазувати** для сцен із відділами в тому ж коміті (R3 = свідома зміна поведінки), пояснити дельту.
Зріз 2 seam: `pack_departments(depts, hGap, vGap, padding, margin) -> {nodes, department_frames}`;
реюз `department_frame`. Оракул B4-A: frame[1].x − (frame[0].x+width) == horizontalGap.

## Зріз 2 — GREEN (Dg20)
`pack_departments` + `DepartmentMembers`/`StaffPackResult` (реекспорт ентрі в lib.rs, не хелпера).
Розставляє зліва направо; розділення bbox = hGap+2·padding; емітить рамку/відділ через department_frame.
Тест B4-A: 2 відділи, frame-edge gap == hGap (20). Гейти: staff_packing 3/3 · clippy 0 · cargo test 0. [2] ✓

Лишилось у R3: зріз 3 (B1 порожній відділ — рамка з padding, позиція?), зріз 4 (B3/I-A2 корінь без
відділу — зсув «шапка+відступ» з того ж джерела), зріз 5 (B5 magnetic-розріз — потребує S7 card+blob).
Усі три мають дизайн-рішення → checkpoint власнику перед продовженням.
