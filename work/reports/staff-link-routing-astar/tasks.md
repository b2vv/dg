# tasks.md — T128 staff link-routing A* (крок 6 spec-flow)

**GATE 1 ✅ · GATE 2 ✅ PASS** (recheck `_gate2-recheck-dg31.md`). Гілка `feat/t126-staff-rust-geometry`.
Implement — `tdd` (red-green-refactor), по одному таску. Рядки «AC#»/«row#» = приймальна таблиця `plan.md §7`.
Статус у самому файлі (у dg нема теки «в роботі»). Scope = **A* фундамент на Бар-1** (Бар-2 відкладено).

## Порядок залежностей
```
T1(stats+фікстури RED) → T2(card_pad) 
                       → T3(сітка) → T4(A* ядро) → T5(occupancy/доріжки) → T6(rip-up)
                                                  → T7(int→дерево класифікація)
T4,T5,T6 → T8(дріт adaptStaffGeometry + cap/WASM деградація) → T10(rebaseline golden*) 
T4 → T11(перф-бенчмарк)                                        
усі зелені → T12(видалити detour+застарілі тести) → T13(verify USAGE.md)
```
`*` T10 потребує ВІЗУАЛЬНОГО гейта R3 (ручний, власник) перед rebaseline.

## Таски
| # | Таск | Файли | Критерій «готово» | Закриває | Залежить | [P] |
|---|---|---|---|---|---|---|
| T0 | Інвентар reuse-vs-replace у `staff_routes.rs` (1626 ряд.) + sizing NEW (перевірити ~470-530) + поіменний список ~25 detour-тестів на винесення | — (аналіз → дописати в цей файл) | список функцій reuse/replace + тести названо поіменно | N1 | — | — |
| T1 | **RED-first:** порт `route_stats()`-детектора §10 + 9 фікстур §10.1 (S0-S9) — тести падають без роутера | `packages/core/src/staff_routes.rs` (або новий `staff_router.rs`) + `#[cfg(test)]`; фікстури | 9 тестів існують і ПАДАЮТЬ (RED); детектор рахує 5 метрик §10.4 | rows 1-10,13,15,18 (механізм) | — | — |
| T2 | card_pad-гейт: безумовний обхід карток | `packages/core/src/staff_layout.rs:1246` (`MIN_CARD_PAD`) | row 18 зелений (0 через-картку при content_padding<8) | row 18 / AC11 | T1 | [P] з T3 |
| T3 | `build_corridor_grid` — X/Y-стіни з рамок+карток, інфляція §5.1 (картка+8, заголовок+4, чужі рамки) | новий `staff_router.rs` | сітка будується; тест прохідності клітин | (інфра) | T1 | — |
| T4 | `astar_route` — 3-стан (x,y,dir), turn-penalty 30, `BinaryHeap`, Manhattan, ліміт 250k; cap-hit→best-effort | `staff_router.rs` | орто-маршрут між портами; детермінізм (row 15/AC8) | AC4, row 1-3 | T3 | — |
| T5 | `occupancy`+ваги+доріжки §5.4 (крок 8px) | `staff_router.rs` | row 6 (S4) 0 перетинів доріжками | row 6 / AC1,§5.4 | T4 | — |
| T6 | `rip-up` 4 проходи — re-route дорогих ребер | `staff_router.rs` | rows 5,7,8 → 0/0/0/0/0 | rows 5,7,8 / AC1-3 | T5 | — |
| T7 | класифікація int→дерево, cross/ext→A* (перф) | `staff_router.rs` | int-ребра орто-дерево (не A*); row 1 | AC4 | T4 | [P] з T5 |
| T8 | дріт у `adaptStaffGeometry`: stats()→`diagnostics`, залишок→`marked`; cap-hit + WASM-деградація best-effort | `adaptStaffGeometry.ts`, bridge | row 16 (marked видимий); контракт форму НЕ змінив | row 16 / Q1(а) / defense#2 | T5,T6 | — |
| T9 | контракт-шов під майбутній x/y (документувати адитивний optional, НЕ будувати) | `plan.md`/`types.rs` комент | шов описано; код без x/y | B1-шов | T8 | [P] |
| T10 | rebaseline golden на A*-вихід | golden-фікстури | golden оновлено ПІСЛЯ R3-візуалу; CI зелений | (розблоковує dg30 R1) | T2,T6,T8 + **R3 ручний** | — |
| T11 | перф-бенчмарк §8.4: найгірша §10.1 п.7×п.4 ~500 посад | `*.measure.test.ts` (`npm run measure`) | ≤50мс АБО застосовано важелі §4 до ≤50мс | row 14 / AC9 | T4 | [P] |
| T12 | видалити detour + застарілі тести (список з T0) | `staff_routes.rs` | detour прибрано; усі AC-тести зелені | (чистота) | усі вище зелені | — |
| T13 | verify `docs/USAGE.md` незмінний (конституція #5) | — | публічний API `OrgHierarchyDiagram` без нового методу; `check:docs` зелений | конст.#5 | T12 | [P] |

## Ручні рядки (у звіт назавжди)
Частина row 12 і row 16 — **візуальний гейт R3 проти мокап-скрінів** (агент без браузера; власник відкриває
мокап/дозволяє сервер). Детекторні частини — автоматичні (T1/T5/T6/T8).

## T0 інвентар (виконано dg32) — reuse / replace / detour-тести

### REUSE — геопримітиви (прод `staff_geom.rs`, вже у WASM)
`seg_rect_distance`, `obstacle_rect`, `polyline_hits_box_interior`+`INTERIOR_EPS`, `frame_intrusion_count:180`,
`FrameRect`, `DeptPart`. → сітка T3 (інфляція/прохідність) + детектор T1 метрики 3/4/5.

### REUSE — `staff_routes.rs` прод (<645)
- Орто-білдери (int-tree T7): `port:61`, `route_ortho:71`, `elbow_or_straight:79`, `route_vertical:98`, `route_horizontal:126`.
- Резолв геометрії: `resolve_box:204`, `member_of:227`, `build_card_set:235`, `obstacles_for_edge:264`.
- Кліренс/індекс (стіни сітки T3 + детектор): `route_clear_of:290`, `CardIndex:314`/`build:326`/`clear_of:356`, `foreign_frame_blocks:394`.
- Вхід/вихід: `RouteInputs:50`, `staff_routes:486` (**MODIFY**: cross/ext → A*, int → ладдер), `deptTop`-синтпорт `:540-560` (докінг AC5 — зберегти).
- Константи: `MIN_CARD_PAD:44`, `STRAIGHT_EPS:42`, `LANE_DEDUP_EPS:46`.

### REUSE→PROMOTE — детектор-агрегати (`staff_clearance.rs`, нині `#[cfg(test)]`)
`card_clearance:29` (метрики 3+4: через-картку + <8px, `ClearanceReport`), `foreign_frame_intrusions:61` (метрика 5),
`MIN_CLEARANCE_PX:18`. Q4: детектор = прод-під-`/debug` → `route_stats` компонує 5 метрик; ці два агрегати
винести/реекспортувати в прод (не cfg(test)) або обгорнути в `staff_router::route_stats`.

### NEW — `staff_router.rs` (~470-530; sizing plan §2 підтверджено)
`build_corridor_grid`, `grid_blocked`+`deptOK`, `astar_route` (3-стан x/y/dir, turn-penalty 30, BinaryHeap, Manhattan,
ліміт 250k), `occupancy`+доріжки §5.4, **`route_stats` — НОВЕ лише метрики 1/2 (перетини ліній-ліній із
виключенням спільних tree-точок + накладання/колінеарні); 3/4/5 = reuse вище**, `rip-up` 4 проходи, класифікація int↔cross/ext.

### REPLACE — detour (stateless per-edge)
`side_detour:169`, `detour_edge:417`, fallback-гілка `staff_routes:596-608`. Ладдер `:562-593` → int-tree швидкий
шлях (T7), cross/ext ідуть через A*.

### Detour-тести — поіменно (27; тег для T12)
**RETIRE (механізм detour/ладдера):** `avoidance_is_byte_identical_when_no_card_blocks:918`,
`avoidance_detours_resolvable_block_clearing_violations:930`, `avoidance_leaves_unresolvable_block_as_remnant:950`,
`avoidance_is_deterministic_across_runs:969`, `card_index_matches_naive…:1017`, `card_index_near_miss…:1071`,
`matrix_edge_prefers_horizontal_side_ports:1092`, `admin_vertical_blocked_horizontal_clean_takes_horizontal:1113`,
`same_band_admin_flips_to_horizontal:1139`, `admin_vertical_clean_stays_vertical:1155`,
`route_horizontal_none_without_clear_gap:1171`, `matrix_child_above_routes_vertical_upward:1186`,
`route_vertical_direction_and_nullable:1204`, `foreign_frame_resolvable_via_side_detour:1396`,
`side_detour_is_deterministic_across_frame_reorder:1424`, `foreign_frame_resolvable_is_avoided_without_marker:1353`.
**PORT→A* (контрактна поведінка, не механізм — переписати асерт проти A*-виходу):**
`cross_dept_admin_into_head_docks_on_frame_top:1231`, `dept_top_port_tracks_head_cx_not_source_cx:1262`,
`intra_dept_admin_stays_on_card_top:1281`, `non_admin_into_head_does_not_dock_on_frame_top:1300`,
`no_frames_means_no_marker_and_parity:1336`, `foreign_frame_unresolvable_is_marked:1378`,
`own_frame_is_neither_obstacle_nor_marked:1445`, `marker_equals_detector_by_construction:1463`,
`oracle_clean_fixture_zero_violations_and_frame_is_detected:1482`, `h6_combined_scene_matches_golden:1567`,
`h6_combined_scene_is_byte_identical_across_runs:1614`.
**Тест-хелпери REUSE для фікстур T1:** `node*:645-679`, `org_card:680`, `edge/edge_kind:690/693`,
`frame/frame_head:700/711`, `persons_input:722`, `is_orthogonal:740`, `point_eq/points_eq:745/748`.

## Леджер / статус
🟢 T0 ✅ (dg32). 🟡 T1 ЧАСТКОВО (dg32): **детектор ГОТОВО** — `staff_router.rs` `route_stats`/`RouteStats`/
`diagonal_segments` (прод, pub use в lib.rs), 10 позитивних/негативних юніт-тестів зелені, 161/161 rust +
clippy -D + fmt чисті. R6 критик-before застосовано (`_dg32-T1-traps-critic-WORK.md`; блокери B1/B2/B4/B5 закрито).
НЕ закомічено (чекає завершення T1).
**T1 ЛИШИЛОСЯ:** 9 фікстур S0-S9 (§10.1-канон: `_r6-lines-spec-analysis-dg23.md:57-61` + spec `~/Downloads/mock2/
Вимоги - Лінії зв'язку ШПС.md`), виклик `staff_routes`→`route_stats` асерт 0/0/0/0/0; **RED-first доказ (B3):
S4/S5 червоні САМЕ на crossings на поточному detour**, S3 планом НЕ гарантований. Reuse scene-білдери
staff_routes.rs tests (node*/frame*/edge*/near_boxes/persons_input, :645-918). Потім: незалежне рев'ю T1 → коміт з «го».
Паралельні таски — різні робочі файли, append-протокол.
