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
Прогрес dg33 (T5): ✅ `Occupancy` + `occupy`/`release` + cost-терми (6000/4000/0.15) + `route_edges` single-pass драйвер.
R6 повний: критик 3 блокери (off-grid-паніка; відсутній драйвер→невимірюваний S4; node-key) → верифіковано/виправлено
→ рев'ю ПРИЙНЯЛО (0 блокерів). 4 тести (divert / release / driver S4 overlaps 0 vs 1 / off-grid-no-panic).
**Відоме (non-blocking, для T8-wiring):** драйвер-sort без первинного ключа `sec` (cross-перед-ext) — p2/sec поза
скоупом (N2), детермінізм тримається, але порядок може розійтись з мокапом при cross+ext у реальній сцені.
Далі: **T6 rip-up** (4 проходи, rows 5/7/8 → 0) → un-ignore AC10.

## dg33 — РІШЕННЯ ВЛАСНИКА по S5 (варіант b): ввести «вторинне ребро»
Порівняння алгоритмів (`work/reports/staff-link-routing-astar/_algo-comparison-dg33.md`): 8/9 канон-схем
чисті через A* single-pass, лише **S5 over=1** — відсутня стадія еталону (secondary `c.p2` → порт `cx+SX`).
Критик+вимір підтвердили: rip-up і T7 цього НЕ закривають. **Власник обрав (b): secondary-ребро + `cx+SX`-порт
+ `tgt(sec)`** (паритет мокапу, детектор лишається строгим). T6 тепер = D2 (secondary) + D5/D6 (rip-up+bad) +
un-ignore AC10. Розбіжності: D1/D4=T7 (перф int-елбоу), D3=T8 (deptTop).

### T6 крок1 ✅ (secondary + AC10 un-ignore) — R6 повний
`SECONDARY_PORT_DX`=28, grid `cx+SX`-лінія, exempt `cx||cx+SX`, `EdgeSpec.secondary`+sort, харнес
`astar_schema_stats` (граф-предок `edge_is_secondary`+`admin_reaches`). **AC10-гейт un-ignored → A*-пайплайн,
усі 9 схем 0/0/0/0/0 + diagonal 0 + no-fail.** S5 закрито secondary-портом. Критик 2 блокери (B1 харнес-A*,
B2 exempt cx+SX) + M1 (no-fail асерт) → закрито; рев'ю ПРИЙНЯЛО. 178 passed, 0 ignored.
**ВУЗЬКІСТЬ (явно):** secondary-детекція = ЛИШЕ bypass (ціль із батьком-предком іншого батька). Загальне
подвійне підпорядкування (два НЕЗАЛЕЖНІ батьки, жоден не предок) лишається ПОЗА СКОУПОМ — `edge_is_secondary`
дасть false для обох, overlap повернеться (коли дані це збудять). §11.1 у спеці НЕ існує (фантом) — не чіпано.
**ВИМІР:** AC10 зелений БЕЗ rip_up → для 9 канон-схем rip_up не потрібен. rip_up+bad (D5/D6) — рішення власника
(будувати для non-canon робустності чи відкласти YAGNI; залишок покриває `marked` best-effort).

### T6 крок2 ✅ (rip_up + bad-детектор) — рішення власника «будувати зараз», R6
`route_stats_detailed` → (RouteStats, Vec<usize> bad; одна істина, route_stats=.0). `route_edges_ripup` =
single_pass + ≤4 проходи (детектор→bad→re-route release/astar/occupy, reverse непарні; best-effort, не гарантія 0).
Рефактор route_edges → routing_order/single_pass (без регресу). **Рев'ю ПОВЕРНУЛО** (блокер: ripup не під'єднаний
до гейта — astar_schema_stats жене single-pass) → ФІКС: гейт тепер кличе `route_edges_ripup` (на чистих = no-op,
AC10 лишився зелений) + noop-тест на 2 ребрах. Тести: ripup_clears_a_crossing (weave single-pass cross=1→ripup 0),
det+noop, route_stats_detailed_flags_both. 181 passed, 0 ignored, clippy/fmt чисті.
**T6 ЗАКРИТО ПОВНІСТЮ:** D2 (secondary) + D5 (rip-up) + D6 (bad) + AC10 un-ignored через повний A*-пайплайн.

### T7 ✅ (класифікація int-елбоу / cross-ext→A*, D1/D4) — R6 повний
`route_ortho`→pub(crate) (REUSE, не порт — критик B1); `is_internal`=повний (dept,part) ключ (B2); `route_scene`
(staff_router, прод-вхід для T8): int-елбоу route_ortho+occupy FIXED (corridor-Y у грід bus_ys) → cross/ext A* →
rip-up ≤4 лише cross/ext ∩ bad. Харнес жене route_scene. Критик-перед 2 блокери+переобрамлення (у 9 схемах лише
1 int-ребро S3 m→ca → ДОДАНО int-tree тест `t7_internal_tree_edges_are_ortho_elbows`, доводить елбоу==route_ortho).
Рев'ю ПРИЙНЯЛО (числовий збіг occupy↔route_ortho; AC10 лишився 0; тест зубатий). 182 passed, 0 ignored.
Дивергенції (зафіксовано): org→root ext лишається A* (не елбоу як мокап :110); int=(dept,part) не department.
### T7-гібрид ✅ (рішення власника) — брудний int-елбоу гнеться через A*
Власник: наївний елбоу у ЩІЛЬНІЙ рамці ріже сусідні картки, а T7 тримав int FIXED. Порівняння 1 vs 2
(`_t7-hybrid-compare-dg33.md`): ВАР.2 (lane-scan) відпав (фатальна діра — не обходить картку на порт-колонці
вертикально + конфлікт з T12); власник обрав **ВАР.1 (A*-відкат)**. Зміна: route_scene rip-up прибрав `!is_int`-фільтр
→ брудний int-елбоу (за детектором) перероутиться A* («гнеться»); чистий лишається швидким елбоу (перф не псується).
Тест `ripup_bends_a_dirty_internal_elbow` (щільна рамка, канон цього не вправляв). Критик-порівняння + рев'ю ПРИЙНЯЛО.
**Межа:** надщільні колізії — архітектурно layout (§6/Бар-2); ВАР.1 = router-side safety net. 183 passed.

Лишилось у T128: **T8** (wiring route_scene у прод — розвідка `_t8-recon-dg33.md`; РОЗВИЛКА дефолт detour/R3 відкрита),
T9-T13 + демо mock3. T8 чіпає лише tree-шлях; golden зламається → T10 rebaseline гейтиться ручним R3.

## 🆕 Відкладена задача (рішення власника dg32): демо на даних mock3 як ЕТАЛОН — ПІСЛЯ A* (T4-T6)
Зробити demo-таб на даних мокапу `/Users/strelia/Downloads/mock3/ШПС лінії зв'язку.html` (`shps-links.js`:
`DEPTS` + `POS{id,p=parentId,d=deptId,t=title,w=worker}`) → мапити в `DiagramData`, рендерити через
Rust-пайплайн, звіряти координати+лінії з мокапом як еталоном. Візуальний еталон: `mock3/screenshots/` +
`mock3/export/`. Операціоналізує R3-візуальний гейт (той, що golden-park/T10 відклали). ⚠️ `shps-links.js` =
third-party код → брати ДАНІ, НЕ цитувати A*-алгоритм буквально (пам'ять no-verbatim). Будувати ПІСЛЯ A*
(detour-вихід звіряти з еталоном сенсу мало — реальна парність на A*-виході).
