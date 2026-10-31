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

## 📋 HANDOFF (dg33) — холодний старт наступної сесії БЕЗ переразжовування
**`work/reports/staff-link-routing-astar/_handoff-dg33.md`** — повний стан, коміти T2→R3, архітектура A*,
діагноз зигзагів (= LAYOUT плаский vs мокапів дерево-блоків), готовий алгоритм layout-фіксу (§5), стилізація
1:1 (§6), C-flip борг (N1/N2), check:docs-борг, мапа файлів. **Читай його першим.**

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

### T8(A) ✅ — прод-wiring route_scene за внутр-перемикачем, дефолт DETOUR (golden-safe), R6
Рішення власника: (A) зараз (safe), (C) flip+rebaseline коли за ПК для R3. `resolve_staff_routes(inputs,w,h,use_astar)`
+ const `DEFAULT_STAFF_ASTAR=false` на staff_layout.rs call-site. Detour-гілка байт-незмінна (183 rust-тестів).
`route_via_astar`: build_card_set (persons+org B2), порти з obstacle_rect (B1), index-zip+скіпи (B3), deptTop reuse,
secondary промоут, marked=failed‖intrusion (N2 закрито), ends_on_dept_top. Критик-перед (B1/B2/B3+golden-proof) +
рев'ю-після ПРИЙНЯЛО (0 блокерів). Тест t8a (far-LOD admin on-grid + org + kinds). 184 passed, clippy/fmt чисті.
**N1 латентно (C-рішення):** matrix/dotted/lead-org через A* не доведені (lead-org best_effort — вхід у рамку ззовні).

### R3-prep ✅ (коміт 0d791a9) — demo-таб ШПС на даних mock3 через A*, готовий до візуальної звірки
Рантайм dev-перемикач `useAstar` (optional на StaffLayoutInput, serde default; читається замість compile-const;
build:wasm регенерував pkg+rust-types.ts). Проброс: `RenderConfig.staffUseAstar`→buildStaffLayoutInput→WASM (дефолт false).
Сценарій `mock3Shps.ts` (дані mock3 shps-links.js: 10 DEPTS+50 POS, da.p2→secondary; лише ДАНІ). Таб `staff-mock3`
(«ШПС · A* (mock3 R3)», useAstar:true). Golden: виключено з coverage + R3-smoke (WASM-A*: >40 ліній, best-effort <25%).
rust 184 / SDK 1231 / demo 108 (golden БАЙТ-незмінний) / typecheck чистий. **R3: власник робить візуальну звірку
з мокапом.** ⚠️ matrix/dotted/lead-org через A* не доведені (N1) — можуть виглядати не так, це C-рішення.

**ЗАПУСК R3:** `npm run dev` → таб «ШПС · A* (mock3)» (або `?tab=staff-mock3`); порівняти з mock3-мокапом/скрінами.
⚠️ **check:docs push-гейт:** CTO-RESEARCH.md відстав 28>25 комітів (наслідок 9 комітів сесії) — рефреш брифінгу перед БУДЬ-ЯКИМ push.
Лишилось: **C** (flip дефолту A* + T10 rebaseline golden після R3-ОК), T9 (контракт-шов x/y), T11 (перф-бенч), T12 (видалити detour), T13 (USAGE).

## 🆕 Відкладена задача (рішення власника dg32): демо на даних mock3 як ЕТАЛОН — ПІСЛЯ A* (T4-T6)
Зробити demo-таб на даних мокапу `/Users/strelia/Downloads/mock3/ШПС лінії зв'язку.html` (`shps-links.js`:
`DEPTS` + `POS{id,p=parentId,d=deptId,t=title,w=worker}`) → мапити в `DiagramData`, рендерити через
Rust-пайплайн, звіряти координати+лінії з мокапом як еталоном. Візуальний еталон: `mock3/screenshots/` +
`mock3/export/`. Операціоналізує R3-візуальний гейт (той, що golden-park/T10 відклали). ⚠️ `shps-links.js` =
third-party код → брати ДАНІ, НЕ цитувати A*-алгоритм буквально (пам'ять no-verbatim). Будувати ПІСЛЯ A*
(detour-вихід звіряти з еталоном сенсу мало — реальна парність на A*-виході).

## 🆕 Крок 1 — дерево-блоковий layout (dg34, 2026-10-31, за прапором)
Корінь зигзагів (R3-b) = ПЛАСКЕ пакування відділів. Фікс: `tree_block_layout` flag (default OFF,
detour-golden байт-незмінний) → `Geom.tree_block` → нова гілка `pack_tree_block` у
`group_staff_by_department`: рекурсивне tidy-дерево блоків-відділів (block.parent = блок голови-
рапортування; діти сортуються за X-привʼязки; cycle-guard; stamp department_id; no-dept → singleton-
блоки, паритет мокапу). SDK: `RenderConfig.staffTreeBlockLayout` → mock3-таб ON (разом з A*).
R6: критик-перед (`_treeblock-critic-dg34.md`) + рев'ю-після (`_treeblock-review-dg34.md`) — обидва
GREEN, 0 блокерів; F1 (хибний коментар) виправлено, F2 (рамка vs vgap spacing) → R3-тюнінг.
TDD 5 тестів (3 дискримінаційні). Гейти: rust 189/0 · SDK 1231/0 · demo 108/0 · typecheck · clippy/fmt.
**Відкрите:** R3-візуал власника (HUD bends/cross на mock3 мають падати); R3-a (far-render drop ліній)
заведено окремим пунктом. Не закомічений push (гілка ahead, локально).

## 🔴 dg35 (2026-10-31) — R3 візуал ВИЯВИВ: крок 1 був мертвим кодом → фікс (напрям D, approved)
Візуальна перевірка R3 у браузері (mock3, HUD bends=112 = точний dg33-базлайн → «наче змін не було»).
**Корінь:** tree-гілка живе в `group_staff_by_department` (staff_layout.rs:649), яка виконується лише при
`deptGrouping=true`. mock3 мав deptGrouping=false (бо воно прив'язане до `staffEdgeRouter==='v2'`, а mock3
на 'legacy'). → `pack_tree_block` = МЕРТВИЙ код для mock3.
**Probe (4 конфіги, Rust-шлях, mock3-дані):** A legacy+treeOFF=112 · B legacy+treeON=112 (A≡B: прапор
нічого не змінює) · C v2+treeOFF=136 · D v2+treeON=126 (C≠D: оживає, форма мокапу). Діагноз handoff dg33
(«зигзаги=flat dept packing») ПЕРЕВЕРНУТО: поточна сцена = ціле tidy-дерево (`layout_tree_block`), не
деп-пакування; деп-пакування навіть додає заломів.
**Фікс (approved «go», напрям D):** розчепити deptGrouping від роутера. Новий DEV-прапор
`RenderConfig.staffDeptGrouping` (default false); `deptGrouping = staffDeptGrouping===true || staffEdgeRouter==='v2'`
(OR, staffLayoutInputs.ts:92 + svgExport.ts:205); mock3 → `staffDeptGrouping:true`. ~15 рядків, 4 файли.
Гейти: typecheck · SDK 1231/0 · demo 108/0. Візуал: bends=126, департаменти-блоки в дереві (QA під dev).
**Залишок:** 126 bends (кінки в/між блоками) → spacing-тюнінг (F2) + deptHead-порт/A* на згрупованій
сцені; R3-a (far-render) окремо. R6 review-after запущено; коміт після вердикту.
