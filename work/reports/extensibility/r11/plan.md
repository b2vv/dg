# R11 — plan: обгортки як obstacle-регіони (Rust-роутер)

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/core` (Rust routing) + TS routing-input. GATE-1 з роадмапу.

## 1. Архітектура (рев.2 — GATE-2 B1/B2)
**🔴 B1 — цільовий роутер = A* `staff_router.rs` `route_scene`.** Рішення власника (пам'ять `staff-link-routing-astar`,
dg31): A* — обраний роутер; **detour/V-B «мертвий як рантайм»**. A* наразі за гейтом (`DEFAULT_STAFF_ASTAR=false`,
`staffUseAstar`), host-visibility — окремим A*-гейтом (R3-visual + golden). R11 розширює обстакли **A*-роутера**; це
бібліотечний роутер власника, не demo. ⚠️ **Наслідок (owner-review при пуші):** R11 доходить до хоста лише коли A*
увімкнено — окрема міграція. **НЕ** чіпаємо TS `StaffRoutingInput` (то вхід TS-detour, інший роутер — моя рев.1 помилка).

Обгортки виводяться **в Rust** із `StaffLayoutInput` (positions+departments+expandedOrgIds): dept-frames уже деривуються
в Rust; grid-collapsed-сиблінги (T113) — ЯКЩО геометрія деривується в Rust, **без зміни types.rs / build:wasm** (preferred,
KISS); якщо ні — нове поле у **`StaffLayoutInput`** (не StaffMockupInput) + `build:wasm` регенерація (координатор). R11-A
визначає, чи достатньо derive-в-Rust.

**🔴 B2 — nested self-exclusion через ГЕОМЕТРИЧНЕ containment** (наявна модель однорівнева — власний endpoint + 1 frame
`dept_ok` staff_router.rs:541/1042 — недостатньо для dept⊃grid⊃ноди). Механізм: для КОЖНОЇ лінії обгортка є предком
endpoint'а, якщо **endpoint-rect ⊂ wrapper-rect** (геометрично); усі обгортки, що містять будь-який із двох endpoint'ів,
**виключаються з перешкод цієї лінії**. Вкладеність (e: dept⊃grid) обходиться автоматично (обидві містять endpoint →
обидві виключені). KISS: не потребує parent-метаданих на вході, лише containment-тест. Застосовується поверх наявного
own-endpoint/own-frame exemption.

(c) clearance: роздування перешкод на `MIN_CARD_PAD`/`MIN_CLEARANCE_PX` (8px, вже в прод-роутерах) — поширити на
обгортки; (b) докінг до краю collapsed-обгортки (edge-port на прямокутнику, ADR-0002), якщо її геометрія адресовна в Rust.
Без обгорток у вході — A* як зараз (паритет AC6).

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| obstacle-список | node-box уже перешкоди (`staff_router.rs`/`staffEdgeGeometry.ts:334`) + `frames`/`zones` | обгортки в той самий список |
| clearance | `staff_clearance.rs` (наявний) | маржа-роздування обгорток (F11.2 константа) |
| докінг | edgePort/avatar-dock (ADR-0002) | edge-port на прямокутнику collapsed-обгортки |
| A*-роутер | `staff_router.rs` ядро | self-exclusion предків-ланцюга per-line |

## 3. Контракт (межа WASM — явний)
A* вхід — `StaffLayoutInput` (серіалізований WASM-тип; `EdgeRect/FrameRect/Rect/DeptPart` — ВНУТРІШНІ Rust-структи, не
на межі). Якщо всі обгортки (incl collapsed-grid T113) деривуються в Rust із наявного `StaffLayoutInput`
(positions+departments+expandedOrgIds) — **без зміни types.rs / build:wasm** (preferred, KISS). Якщо grid-геометрія
(TS-side `collapsedSiblingGrid.ts`) недеривовна в Rust → нове поле у **`StaffLayoutInput`** (НЕ StaffMockupInput) +
`npm run build:wasm` (регенерація rust-types.ts, координатор). R11-A вирішує це першим кроком.


## 4. Наріза
| ID | Файли | Що | Залежить | Приймання |
|---|---|---|---|---|
| R11-A | `packages/core/src/staff_router.rs` (+ `staff_geom.rs`/`staff_edge_box.rs`/`types.rs` за потреби) + cargo-тести | **(у A* `route_scene`)** деривувати обгортки (dept-frames уже; grid-collapsed — derive-в-Rust або нове поле); додати їх у множину перешкод нарівні з node-box; **containment self-exclusion** (endpoint-rect ⊂ wrapper-rect → виключити для цієї лінії; вкладеність авто); clearance 8px (`MIN_CARD_PAD`/`MIN_CLEARANCE_PX`) на обгортки; докінг до краю collapsed-обгортки; NaN/degenerate-guard (не панікувати в `wall()`/`finalize_lines`); no-path fallback — наявний `best_effort`/§12 marker | — (контракт §3 першим кроком) | AC1-AC4,AC6 |
| R11-B | `packages/sdk/src/.../` TS-side (ЛИШЕ якщо §3 вимагає нового StaffLayoutInput-поля) + координатор `build:wasm` | наповнити нове поле collapsed-grid-прямокутниками; якщо derive-в-Rust достатній — R11-B НЕ потрібен | R11-A контракт | AC5 |

**Паралель:** R11 (Rust) незалежний від R3/R2. R11-A (Rust) — основна робота; R11-B лише за потреби WASM-поля.
⚠️ A* наразі за гейтом (`staffUseAstar=false`); R11 доходить до хоста при вмиканні A* (окрема міграція — owner-review).
`build:wasm`/`cargo test`/`test:rust` — координатор (спільний wasm-pkg). Codex пише Rust, `cargo test` локально.


## 5. Side effects / rollback
- Поведінка: лінії огинають обгортки (видимо інакший роут у вкладених контейнерах) — покращення коректності, не регресія
  на плоских сценах (AC6 паритет без обгорток). **Owner-review:** видимо змінені роути ліній у хості — показати при пуші.
- Межа WASM: explicit контракт (конституція), rust-types.ts синхронно. clearance-константа — одна (тюнінг пізніше).
- Rollback = revert R11-*; без обгорток-входу роутер як зараз.

## 6. Acceptance-table
| # | Сценарій | Дія | Результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | обгортка = перешкода | лінія між департаментами, чужий контейнер між | лінія огинає чужий контейнер | cargo + integ | AC1 |
| 2 | self-exclusion (коректність) | лінія зсередини вкладеного grid⊂департамент | виходить зі свого контейнера (не застрягає) | cargo | AC2 |
| 3 | nesting | департамент⊃grid⊃ноди, лінія зсередини | виходить крізь власні предки, огинає чужі | cargo | AC2 |
| 4 | clearance | лінія повз борт обгортки | не торкається борту (маржа) | cargo | AC3 |
| 5 | докінг collapsed | лінія до collapsed-grid | док на край обгортки, не до внутр. ноди | cargo + integ | AC4 |
| 6 | паритет без обгорток | вхід без обгорток-перешкод | роут як зараз (node-box-only) | cargo | AC6 |
| 7 | WASM-контракт | types.rs змінено (якщо) | rust-types.ts перегенеровано; TS компілюється | координатор | AC5 |

## 7. Конституція (inline): TDD (cargo test перед кодом — success+failure); KISS (один плоский список, реюз clearance);
**межа WASM↔TS — явний контракт** (rust-types.ts синхронно, якщо types.rs чіпається — найважливіший рядок тут);
Rust судиться загальною інженерією (Pocock лише TS). **PASS** за умови WASM-контракту.


## 8. КОРЕКЦІЯ рев.3 (R11-A impl-знахідка: T113-grid в іншій координатній системі)
R11-A виявив: collapsed-grid (T113) геометрія планується в ОКРЕМОМУ org-layout (rowTreeLayout.ts: окремий org-WASM +
restore matrix-coords) і НЕ передається в staff-роутер (route_scene отримує лише cards/frames/edges/member_of); координати
іншої сцени. Threading T113-grid у staff-координати = важка крос-сценова інтеграція + нове StaffLayoutInput-поле + build:wasm.

**Рішення координатора (флаг власнику при пуші):** R11 робить **frame-обгортки** (dept/group/staff-chrome — вже в
staff-координатах, уже частково перешкоди через `department_frames`) + containment self-exclusion + clearance + NaN-guard.
**T113 collapsed-grid-обгортки + докінг-до-collapsed (b) ВІДКЛАДЕНО** у follow-on (потребує крос-сценового координатного
контракту StaffLayoutInput.collapsedGridWrappers + build:wasm). Це НЕ ламає unified-принцип — просто один тип обгортки
(T113-grid) приходить пізніше; dept/group/chrome (основний кейс) — зараз. AC4 (docking collapsed) → follow-on.
