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

## Леджер / статус
🔵 усі таски — не почато. Код НЕ рушає до: (1) явного «го» власника на implement; (2) рішення Q2 (доля WIP
dg30 — Коміт B / падаючий svgExport.parity-тест). Паралельні таски — різні робочі файли, append-протокол.
