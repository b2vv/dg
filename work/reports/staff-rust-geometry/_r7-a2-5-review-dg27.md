# A2.5 dockHints — НЕЗАЛЕЖНИЙ РЕВʼЮ impl (Dg27)

> Ревʼю ПІСЛЯ зрізу (R6). Код проти узгодженого рішення (варіант 1, nested, видалити edgePorts) + оракула.
> Вердикт: 🟢 approve / 🟡 approve-with-nits / 🔴 змінити перед комітом.

## Узгоджене рішення (власник + дискусія-критик)
- Варіант 1: ОКРЕМИЙ dockHints-вхід; `edgePorts`/`StaffEdgePortInput` ВИДАЛИТИ (YAGNI).
- Форма: nested `StaffDockHintInput{id, hint: StaffDockHint}`; `StaffDockHint` — internally-tagged enum (tag="layout") дзеркало TS `PersonEdgeVisualHints` (staffEdgeGeometry.ts:2-15). БЕЗ flatten.
- Rust hints НЕ рахує; мапінг 1:1 contract→internal PersonEdgeHints. Вхід наповнює TS-адаптер (A3/A4).

## Scope (uncommitted, feat/t126-staff-rust-geometry)
`git diff -- packages/core/src/ packages/sdk/src/wasm/generated/rust-types.ts`
- types.rs: −StaffEdgePortInput; +StaffDockHint +StaffDockHintInput; StaffLayoutInput.edge_ports→dock_hints; export-тест; 2 контракт-тести.
- staff_layout.rs: +resolve_person_hints; виклик staff_routes person_hints=&person_hints; import; тест-init dock_hints; 1 мапінг-тест.
- generated/rust-types.ts: regen.

## Перевірити (path:line-доказ)
1. `StaffDockHint` поля/renames 1:1 = TS PersonEdgeVisualHints (cardY/cardH/countBarH, tileX/tileY/tileSize, layout gojs-row/figma-row).
2. `resolve_person_hints` — рівно 1:1, порядок входу, без дедупу/фільтра; поля не переплутані (gojs↔figma).
3. Видалення edgePorts повне: нема висячих посилань у Rust; жоден TS (крім generated) не споживав; typecheck зелений.
4. Wiring: person_hints справді тече в staff_routes (не лишився &[]); default dock_hints порожній → паритет зі старою поведінкою (порти на повний бокс).
5. Тести дискримінують (RED був реальний: мапінг 0 vs 2); контракт-тести не тавтологія.
6. Чи generated rust-types.ts = очікуване (StaffDockHint union, dockHints у StaffLayoutInput).

## Пастки — шукай вільно
Напр.: f32-копіювання (не &), порядок полів enum, serde tag-колізія, чи resolve_person_hints не ламає існуючий figma_hint_docks тест, чи default(dock_hints) не змінює наявні golden-тести (150/150 — але перевір, що жоден не став тривіальним).

---
## ХІД РЕВʼЮ (append нижче)

---
## ХІД РЕВʼЮ — Dg27 (claude-opus-4-8)

ДАЛІ: diff + оракул + 6 критеріїв + пастки (serde-rename, f32-копія, wiring, дрейф generated).

ФАКТ (крит.1) — StaffDockHint (types.rs:396-424) 1:1 з TS PersonEdgeVisualHints (staffEdgeGeometry.ts:2-15):
  tag="layout"; GojsRow→"gojs-row"{cardY,cardH,countBarH}; FigmaRow→"figma-row"{tileX,tileY,tileSize}.
  serde-rename кожного поля в camelCase присутній. StaffDockHintInput{id,hint} nested (types.rs:433-436). ✅
ФАКТ (крит.2) — resolve_person_hints (staff_layout.rs:250-275): map 1:1, GojsRow→GojsRow / FigmaRow→FigmaRow
  (варіанти НЕ переплутані), поля НЕ переплутані, f32 скопійовано через deref `*card_y` тощо (не &),
  `d.id.clone()`, порядок входу збережено (.iter().map.collect), без дедупу/фільтра. ✅
ФАКТ (крит.3) — grep edgePorts|StaffEdgePortInput|edge_ports: живих посилань НЕМА. Лишились тільки:
  (a) пояснювальний докстринг types.rs:393 (навмисно), (b) sdk/dist/*.d.ts — білд-артефакт (gitignored,
  регенерується). typecheck зелений → жоден TS-source не споживав видалений тип. ✅
ФАКТ (крит.4) — wiring: compute_staff_geometry (staff_layout.rs:1252) `resolve_person_hints(&input.dock_hints)`
  → staff_routes `person_hints: &person_hints` (було `&[]`). Сигнатура staff_routes.rs:55
  `&'a [(String, PersonEdgeHints)]`, lookup `.find(|(k,_)| k==id)` (staff_routes.rs:212,243) = «перший
  match за id». Порожній dock_hints → порожній Vec → паритет; тест
  near_no_hints_is_numerically_identical_to_raw_node_route ✅ PASS. ✅
ФАКТ (крит.5) — regen `cargo test --features ts-export`: generated/rust-types.ts байт-ідентичний внесеній
  зміні (стат 21+/6-, ніякого нового дрейфу). StaffDockHint union з "layout"; dockHints:Array<StaffDockHintInput>
  у StaffLayoutInput; StaffEdgePortInput зник. ✅
ФАКТ (крит.6) — тести дискримінують:
  • staff_dock_hint_deserializes_camelcase_variants — deser із camelCase+tag; зламаний rename → fail. ✅
  • staff_dock_hint_input_key_and_default — serialize, перевіряє nested `"hint":{"layout":...}` + camelCase;
    ловить flatten і rename-дрейф. ✅
  • resolve_person_hints_maps_both_variants_one_to_one — порядок+значення+варіант; переплутані поля → fail.
    Виконано окремо: 1 passed, 0 ignored. ✅
ФАКТ (пастки) — serde tag колізії нема (internally-tagged, поле "layout" не перетинається з даними);
  порядок полів enum збігається з TS; default(dock_hints) НЕ зробив golden тривіальними (стара поведінка =
  &[], нова з порожнім входом = той самий &[]; 150/150 PASS, у т.ч. figma_hint_docks + parity).
ФАКТ — cargo fmt --check чисто; cargo clippy --all-targets -D warnings чисто; npm typecheck зелений (sdk+demo+e2e).

NIT (non-blocking) — назва тесту `staff_dock_hint_input_key_and_default` обіцяє перевірку default-а
  (dockHints відсутній → порожній), але тест цього не робить (лише serialize одного інстансу). Поведінка
  default покрита побічно (parity-тест + init dock_hints:Vec::new()), контракт `#[serde(default)]` на
  StaffLayoutInput.dockHints прямо не асертиться. Косметика назви, не діра в контракті.

РІШЕННЯ: 🟢 approve. Усі 6 критеріїв виконано доказово; мапінг 1:1 без off-by/переплутаних полів;
serde-rename точно = TS-оракул; generated без дрейфу; видалення edgePorts повне; тести дискримінують.
Один non-blocking косметичний nit (назва тесту).
