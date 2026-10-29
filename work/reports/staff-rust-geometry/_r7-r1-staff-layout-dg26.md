
---
## Dg26 R1 «rust-staff-layout» — старт $(date +%F)

ДАЛІ: читаю контракт types.rs (StaffLayoutInput, StaffNodeGeo, StaffGeometryResult), ядро org_layout.rs, композицію/пакування (staff_compose/staff_packing/staff_bounds), TS-еталон orgBlockLayout.ts (layoutStaffOrgBlock/layoutTreeBlock) + staffDeptGrouping/resolveHead/coords. Мета — відтворити tree-геометрію в Rust.

---
### ФАКТИ рекогносцировки (Dg26, звірено з кодом)

- Контракт `StaffPositionInput` (types.rs:324) = {id, organizationId, isHead, departmentId}. **НЕ несе** `layoutCoords`/`gridCell`/`layoutX/Y` (coords.ts:31 positionHasCoords), ані `detached`/`expanded`. `StaffLayoutInput` (types.rs:398) не має `staffCoordMode`, `collapseUnexpandedPositions`, `expandedPositionIds`, `maxExpandedOrgCards`. `options: StaffLayoutMetrics` має лише `dept_grouping: bool`.
- **Наслідок (межа):** matrix/hybrid-з-member-координатами СТРУКТУРНО недосяжні з Rust-контракту — positionHasCoords завжди false ⇒ orgBlockLayout.ts:395 гілка (tree) завжди. Детектувати matrix у Rust нема з чого; TS-адаптер гейтить їх ДО виклику. Отже порт = чистий tree, БЕЗ matrix-гілки й БЕЗ structured-error-гілки (нема сигналу).
- **collapse (visiblePositions, positionExpand.ts:48) — теж TS-адаптер:** нема прапора/expandedPositionIds у контракті. Rust отримує вже видимі позиції. НЕ портую collapse.
- **detached:** контракт не несе `detached:true`; лишається лише ВИВЕДЕНИЙ detached (resolveHead.ts:33 `!parents.has(id)` && не head). Портую inferred-only. (Обмеження контракту — занотовано.)
- **Переюз ядра:** layoutConnectedTree (orgBlockLayout.ts:47) викликає computeOrgRowTreeLayoutWasm = Rust `compute_org_row_tree_layout` (org_layout.rs:6). Per-node w/h = node_sizes ?? geom (positionSize coords.ts:38). Recenter кореня над bbox (orgBlockLayout.ts:93-102).
- **dept-grouping (staffDeptGrouping.ts:44):** власна region-packing (collision-eject aabbOverlap) — ВІДМІННА від staff_packing.rs::pack_departments (cursor+region_gap+header). Паритет-ціль = TS layoutStaffOrgBlock ⇒ портую TS-пакування member-боксів; рамки деривую `department_frame` (staff_packing.rs:15) з позиціонованих per-dept боксів. pack_departments НЕ викликаю для member-позицій (дивергує). РІШЕННЯ занотовано для оркестратора/ревʼю.
- **pinExternalManagers (externalManagers.ts:53):** representable (admin-edge ззовні орг); застосовний пост-крок. Портую.
- **Оркестратор (canvasLayout.ts:43):** tiers 1/2/3 — переюз compose_tiers / compose_org_cards / canvas_dimensions (staff_compose.rs). Межі смуг — enrich_namespaces (staff_bounds.rs). Рамки — department_frame. Маршрути — staff_routes (staff_routes.rs:50 RouteInputs). expandedOrgIds з контракту; cap=TS-adapter (honor list as-is).
- Golden-оракул паритету (P3): packages/demo/src/scenarios/staffGeometry.golden.test.ts (layoutStaffCanvas+computeStaffLiveGeometry, ±1px).

### ПЛАН (bottom-up, red-first, cargo-тести з ручними TS-оракулами)
1. Geom + helpers: admin_parent_map, admin_children_map, resolve_staff_head(Result), detached_root_ids, admin_descendant_ids.
2. layout_connected_tree (reuse compute_org_row_tree_layout + recenter + node_sizes map).
3. pack_side_column + layout_tree_block.
4. group_staff_by_department (TS region-packing) + per-dept boxes.
5. pin_external_managers.
6. layout_staff_org_block → StaffBlock{org_id,nodes,edges,width,height,diagnostics,dept_boxes}.
7. Оркестратор compute_staff_geometry → StaffGeometryResult (compose+bounds+frames+edges+routes).
8. wasm-експорт у lib.rs.
9. Тести: паритет (ручні значення за TS), детермінізм, межові (0/1 посада, корінь без відділу, порожній відділ).

ДАЛІ: крок 1-2 — пишу staff_layout.rs каркас + helpers + layout_connected_tree з red-first тестами, cargo test.

---
ФАКТ: routes-API — `staff_routes(&RouteInputs)` (staff_routes.rs:299); `RouteInputs{persons,org_cards,edges,lod,person_hints,department_frames:&[FrameRect],card_pad}`. `FrameRect` (staff_geom.rs:157) = {department_id,part_index,x,y,width,height} ↔ `StaffDepartmentFrameGeo`. card_pad має бути ≤0 (вимк.) або ≥MIN_CARD_PAD=8.
ФАКТ: StaffDepartmentInput не має `order` ⇒ dept-сорт = лише id (TS order?? 0 → всі рівні → id). memberOrder теж не в контракті. dept_header_height не в контракті ⇒ рамки з header=0, pad=content_padding (ПРИПУЩЕННЯ).
РІШЕННЯ (тест-стратегія): layout_connected_tree викликає ТОЙ САМИЙ ploeg, що TS через WASM ⇒ raw-координати байт-ідентичні за конструкцією. Паритет-тести перевіряють wrapper-логіку (recenter-формула, side-column offset, dept cursor, pin), а не нутрощі ploeg (вони вже покриті row-tree тестами).
ДАЛІ: пишу staff_layout.rs кроки 1-6 + тести.

---
ФАКТ: Кроки 1-6 (member-positioning + block) готові, 18 cargo-тестів зелені.
ФАКТ(bug-upstream): `compute_org_row_tree_layout` емітить nodes у HashMap-порядку → порядок Vec недетермінований (координати стабільні). Поза зоною R1 (org_layout/hierarchy). Фікс у staff_layout: sort nodes by id у layout_connected_tree ПІСЛЯ геометрії (golden усе одно нормалізує за id; робить side-column/dept eject детермінованим). Занотовано в коментарі коду.
ДАЛІ: крок 7 — compute_staff_geometry (порт layoutStaffCanvas: tiers1/2 via compose_tiers, tier3 via compose_org_cards, bounds via enrich_namespaces, frames via department_frame, edges lead-org+matrix/dotted, routes via staff_routes) + крок 8 wasm-експорт + тести оркестратора.

---
## ПІДСУМОК (Dg26 R1) — ГОТОВО

**Створено:** `packages/core/src/staff_layout.rs` (новий, ~900 рядків з тестами).
**Змінено:** `packages/core/src/lib.rs` — `mod staff_layout;`, `pub use`, wasm-експорт `computeStaffGeometry`.
**НЕ чіпав:** staff_routes/staff_geom/types/staff_packing/staff_compose/staff_bounds/org_layout (лише читав+викликав).

### Публічний API
- `pub fn layout_staff_org_block(positions, reports, org_id, departments, dept_grouping, &Geom, &sizes) -> Result<StaffBlock,String>` — tree-блок одної орг + pin зовнішніх менеджерів.
- `pub fn compute_staff_geometry(&StaffLayoutInput) -> Result<StaffGeometryResult,String>` — оркестратор.
- `#[wasm_bindgen(js_name=computeStaffGeometry)] wasm_compute_staff_geometry(JsValue)->Result<JsValue,JsValue>` (lib.rs) — ЄДИНИЙ staff-експорт; валідує options, парсить StaffLayoutInput, серіалізує StaffGeometryResult.
- `pub struct Geom`, `pub struct StaffBlock`.

### Переюз (path:line)
- `compute_org_row_tree_layout` (org_layout.rs:6) — ядро row-tree у layout_connected_tree.
- `compose_tiers`/`compose_org_cards`/`canvas_dimensions` (staff_compose.rs:34/122/194) — яруси 1/2/3 + розміри.
- `enrich_namespaces`+`BoundsOptions` (staff_bounds.rs:135) — межі смуг.
- `department_frame` (staff_packing.rs:15) — рамки відділів з композованих боксів.
- `staff_routes`+`RouteInputs` (staff_routes.rs:299), `FrameRect` (staff_geom.rs:157) — маршрути.

### Портовано (member positioning, orgBlockLayout.ts / canvasLayout.ts)
admin_parent_map/admin_children_map/resolve_staff_head/detached_root_ids/admin_descendant_ids (resolveHead.ts, positionExpand.ts); layout_connected_tree (+recenter); pack_side_column; layout_tree_block; group_staff_by_department (TS region-packing); external_managers_for + pin_external_managers; admin_edges/bounds; оркестратор tiers1/2/3 + lead-org + matrix/dotted + frames + routes.

### Тести (27 нових, усі зелені; cargo test=125 загалом)
Helpers, connected-tree (empty/single/recenter), side-column offset, tree-block detached, dept-grouping (right+stamp, no-dept last), pin external (exact y/x/edge/height + skip-unknown), org-block (empty/single/filter/determinism), оркестратор (unknown-err, tier2-only, determinism, managing tier1+lead-org, tier3 cards+lead-org, expanded child tier3, dept frames, zero-positions, **exact composition shift = block.y+margin**).
**Паритет-стратегія:** layout_connected_tree кличе ТОЙ САМИЙ ploeg що TS (WASM) ⇒ raw-координати ідентичні за конструкцією; тести перевіряють wrapper-арифметику (recenter/shift/offset/pin) точними значеннями за TS-алгоритмом. Повна параметрична звірка — P3 R0-golden.

### ГЕЙТИ: cargo test ✓(125) · cargo fmt --check ✓ · cargo clippy --all-targets -D warnings ✓. НЕ комічено. TS не чіпав.

### ПИТАННЯ/ФЛАГИ для оркестратора/ревʼю (не блокери)
1. **matrix/hybrid-з-координатами структурно недосяжні** — контракт StaffPositionInput не несе координат ⇒ порт чистий tree, БЕЗ structured-error-гілки (нема сигналу детектувати). Межу тримає TS-адаптер. (Відхилення від буквального «поверни помилку» — обґрунтоване.)
2. **Не в контракті (⇒ TS-адаптер):** staffCoordMode, collapse/expandedPositionIds, detached:true (лише inferred), memberOrder.
3. **StaffDepartmentInput без `order`** ⇒ dept-сорт лише за id. Якщо golden залежить від dept.order — можливий розхід. ПЕРЕВІРИТИ на P3.
4. **dept_header_height не в контракті** ⇒ рамки з header=0, pad=content_padding (ПРИПУЩЕННЯ).
5. **maxExpandedOrgCards не в контракті** ⇒ honor expanded_org_ids як є (cap=адаптер).
6. **routes-wiring:** card_pad=content_padding (гейт ≥8, інакше 0), person_hints=[] (near=повний бокс). Паритет маршрутів — гейт R6; тут лише коректний виклик.
7. **edge_ports (контракт) НЕ використано** оркестратором — deptTop/avatar-порт це R6-7b/A2 (rust-routing), поза R1.
8. **Детермінізм:** sort nodes by id у layout_connected_tree (upstream ploeg емітить у HashMap-порядку). Golden нормалізує за id ⇒ безпечно; можливий розхід із TS лише у рідкісних eject-колізіях side-column/dept.

---
## FOLLOW-UP Dg26 (аудит контракту закрив gaps) — ГОТОВО

**#1 dept.order:** контракт уже має `StaffDepartmentInput.order: Option<f64>` (types.rs:381). Оновив 5 літералів (`order: None`). Новий тест `dept_grouping_order_overrides_id_alphabet`: "A"(order 2) vs "B"(order 1) → B лівіше A попри алфавіт (x-перевірка).
**#2 dept-сорт:** `group_staff_by_department` тепер сортує відділи `(order ?? 0, id)` = TS `compareDepartments` (staffDeptGrouping.ts:37).
**#3 member sibling-order — ВЕРДИКТ: ЛЕЙАУТ (не A2), лише dept-grouped шлях.** Верифіковано по коду: `validateRouteInput` сортує `comparePositions=(parentId null-first, order??0, id)` → `orderedPositions` → `groupStaffByDepartment` вхідний порядок = sibling-канал WASM row-tree (children=input order) ⇒ впливає на координати. Plain tree-шлях (layoutTreeBlock) цього сорту НЕ має. Впровадив `comparePositions`-сорт членів перед бакетингом (parentId null-first, tie-break id). **Tie-break `order` потребує `StaffPositionInput.order` — ПИТАННЯ до координатора:** додати поле (як з dept.order); зараз `order` трактується як 0, тож повний паритет лише коли member-order не покладається на `position.order`.
**#4** — N/A (не було в списку; нумерація координатора 1,2,3,6).
**#6 unknown departmentId:** додав fallback — departmentId не серед оголошених `departments` → NO_DEPARTMENT bucket (TS `validateRouteInput` unknown→null→no-dept), не викидається. Тест `dept_grouping_unknown_department_falls_back_to_no_dept`.
**#5 коментар:** виправлено. Жорсткий доказ пробом (тимчасовим, уже прибраним): `compute_org_row_tree_layout` з ІДЕНТИЧНИМ входом дав **97 різних порядків Vec на 200 викликів при COORDS_STABLE=true**. Причина — порядок емісії `tidy-tree::get_pos()` (зовнішній крейт), НЕ «deterministic ploeg-traversal» (твердження ревʼю хибне щодо ПОРЯДКУ; щодо координат — вірне). Сорт за id лишається обґрунтованим.
**#6(детач-колізія) тест:** `side_column_collision_ejects_second_box_down_deterministically` — два боксы в одній точці → другий виштовхнуто рівно на node_height+vertical_gap; точний ejected-y + детермінізм (orgBlockLayout.ts:144).
**#7 ts-регенерація:** `cargo test export_rust_types --features ts-export` → `order?: number` у StaffDepartmentInput (generated/rust-types.ts:44).

### ГЕЙТИ: cargo test ✓ 128 · cargo fmt --check ✓ · cargo clippy --all-targets -D warnings ✓. НЕ комічено. staff_routes/staff_geom не чіпав; types.rs лише читав; generated/rust-types.ts регенеровано (item #7).

### ВІДКРИТЕ ПИТАННЯ до координатора
`StaffPositionInput.order` відсутнє. gap #3 (member sibling-order у dept-grouped шляху) впроваджено частково (parentId+id); tie-break `order` неможливий без поля. Якщо golden-сцена покладається на position.order для порядку сиблінгів — додати поле (serde default, як dept.order), тоді дошлю tie-break у comparePositions-сорт.

---
## FOLLOW-UP-2 Dg26 (gap #2 tie-break закрито) — ГОТОВО

**#1** контракт `StaffPositionInput.order: Option<f64>` (types.rs:339) — є; оновив `pos()` helper (`order: None`) + додав `pos_ord()`.
**#2 tie-break:** вставив `order.unwrap_or(0.0)` у member-сорт МІЖ parentId та id: тепер `(parentId null-first, order ?? 0, id)` — дзеркало TS comparePositions (validateRouteInput.ts:36). partial_cmp з fallback Equal (f64).
**#3 тест:** `dept_grouping_member_sibling_order_follows_order_not_id` — "za"(order 1) лівіше "ab"(order 2) попри алфавіт; контроль з переставленими order інвертує (доводить, що порядок за order, не id).
**#4 ts-регенерація:** `order?: number` тепер у StaffPositionInput (generated/rust-types.ts:143) + StaffDepartmentInput (:44).

### ПІДТВЕРДЖЕННЯ: member sibling-order = ПОВНИЙ ПАРИТЕТ із TS — `(parentId null-first, order ?? 0, id)`, точно як validateRouteInput.ts:36. Жодних відкритих контракт-прогалин по member/dept порядку не лишилось.

### ГЕЙТИ: cargo test ✓ 129 · cargo fmt --check ✓ · cargo clippy --all-targets -D warnings ✓ · ts-export ✓. НЕ комічено. staff_routes/staff_geom не чіпав; types.rs лише читав; generated регенеровано.
