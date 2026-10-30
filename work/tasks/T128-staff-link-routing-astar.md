# T128 — staff link-routing: повний A*-орто-роутер ліній ШПС із §10-гарантіями в Rust

**Пріоритет:** P2 · **Статус:** 🟢 implement РОЗПОЧАТО (dg32: «го» власника + Q2 закрито Комітом B `a60e79f`) ·
**Під парасолькою:** [T126](T126-staff-layout-anchors-spacing-into-rust.md)
**Гілка:** `feat/t126-staff-rust-geometry` (та сама, рішення власника dg31).

## Мандат
Рішення власника dg31 (дебата V-A/V-B/V-C): **V-A — повний A* у Rust** (не доробка detour, не JS-бібліотека).
Синтез: `work/reports/staff-rust-geometry/_r7-routing-debate-SYNTHESIS-dg31.md`. Мандат T126 O-33/O-48:
маршрути рахує Rust = одна правда. Еталон = мокап `shps-links.js` A* + 3 скріни + §10 (НЕ TS-паритет).

## Scope (рішення власника GATE 2 dg31, B1)
A* як **ФУНДАМЕНТ на Бар-1** (обчислена tree-розкладка, 9 схем §10.1); перевага §10.1 демонстровна на
п.4/п.5. **Бар-2** (довільні позиції) ВІДКЛАДЕНО з edit-mode (Q5); контракт-шов під x/y закладається
адитивно, не будується. §6 повна перебудова layout, бус для не-голови §3.2, matrix-staff — out of scope.

## Артефакти spec-flow (дім: `work/reports/staff-link-routing-astar/`)
- `spec.md` — ЩО/ЧОМУ, AC1-AC11, 5 відкритих питань закрито на GATE 1.
- `plan.md` — ЯК: reuse-first, сайд-ефекти/міграція/rollback, конституція, приймальна таблиця (18 рядків).
- `tasks.md` — T0-T13, red-first, з посиланням на рядки приймальної таблиці.
- `_gate2-VERDICT-dg31.md` / `_gate2-recheck-dg31.md` — GATE 2 PASS після 4 blocking.
- `_plan-prior-art-search-dg31.md` — вже-обговорене (design-v3 variant C, dept-grouping вже в Rust).

## Наступний крок
implement за `tasks.md` T0→T13, red-first, R6 кожен крок. Жива нота: `1 - Notes/Sessions/2026-10-30 T128 staff link-routing A* spec-flow.md`.
Прогрес dg32: T0 ✅, T1 ✅ (детектор route_stats + 9 фікстур S0-S9 + RED-first; незалежне рев'ю в процесі → коміт).
Прогрес dg33: T2 ✅ (card_pad безумовний, AC11), T3 ✅ (`build_corridor_grid` — статична розріджена сітка `wall()`
+ `mH`/`mV` по картках, рамки→координати; deptOK→T4). R6 повний: критик завернув хибний дизайн → виправлено
проти мокапу → рев'ю ПРИЙНЯЛО. Коміт `088ee7f` (T2+T3 батч). plan.md:62-63 узгоджено з кодом.
Прогрес dg33 (T4): ✅ `astar_route` + `dept_ok` + best-effort. R6 повний: критик 2 блокери (role per-(dept,part);
f64-вартість+heap-Ord+carry-g) → верифіковано проти мокапу/детектора → виправлено → рев'ю ПРИЙНЯЛО (0 блокерів).
5 тестів astar_*. **Відоме обмеження (non-blocking):** `astar_is_deterministic` слабкий (AC8 by-construction
через seq-tiebreak); cap-hit 250k без прямого тесту. Далі: **T5 occupancy/доріжки** → T6 rip-up → un-ignore AC10.

## 🆕 Відкладена задача (рішення власника dg32): демо на даних mock3 як ЕТАЛОН — ПІСЛЯ A* (T4-T6)
Зробити demo-таб на даних мокапу `/Users/strelia/Downloads/mock3/ШПС лінії зв'язку.html` (`shps-links.js`:
`DEPTS` + `POS{id,p=parentId,d=deptId,t=title,w=worker}`) → мапити в `DiagramData`, рендерити через
Rust-пайплайн, звіряти координати+лінії з мокапом як еталоном. Візуальний еталон: `mock3/screenshots/` +
`mock3/export/`. Операціоналізує R3-візуальний гейт (той, що golden-park/T10 відклали). ⚠️ `shps-links.js` =
third-party код → брати ДАНІ, НЕ цитувати A*-алгоритм буквально (пам'ять no-verbatim). Будувати ПІСЛЯ A*
(detour-вихід звіряти з еталоном сенсу мало — реальна парність на A*-виході).
