# R7 оркестрація (Dg26) — Варіант 2: роутинг-геометрія → Rust

> Рішення власника: «робимо правильно» = В2 (повна заміна; роутинг-геометрія в Rust за принципом
> відповідальності). Стиль лінків (штрих/колір/стрілка/.ent-кружечок) ЛИШАЄТЬСЯ в TS (презентація).
> Паралелізм вузький — це пайплайн із залежностями. Контракт типів фіксується ПЕРШИМ (серійно).

## Межа відповідальності (принцип)
- **Rust/core:** уся ГЕОМЕТРІЯ — пакування, композиція, межі, координати нод/карток/рамок,
  **точки маршрутів** (ортогональні полілінії, обхід перешкод, порти: низ картки, deptTop-рамки),
  §12-маркер залишку, прапор endsOnDeptTop (де чіпляти entry-маркер).
- **TS/render:** лише ФАРБА — per-kind stroke (lead-org штрих #6b6b73, matrix/dotted dash),
  стрілка, entry-кружечок rendering, тема, host EdgeStyle. Споживає points+прапори з Rust.

## СПІЛЬНИЙ КОНТРАКТ (seam; фіксую я, Phase 0, серійно) — «узгодь типи»
Вхід/вихід уже існують як типи (`core/src/types.rs`), генеровані в `wasm/generated/rust-types.ts`:
- **ВХІД `StaffLayoutInput`** (types.rs:398): розміри нод (w×h), дерево (орг/відділи/namespaces lead|current|subordinate), edgePort, gaps/padding, LOD, **reportLines** (для dept-head/deptTop), edges {fromId,toId,kind}.
- **ВИХІД `StaffGeometryResult`** (types.rs:579): nodes(coords), orgCards, **namespaces**(bounds, поле tier:1|2|3 ЗБЕРІГАЄТЬСЯ), departmentFrames(per-part), edges, **routes: StaffRouteSet** (per-LOD), width/height, diagnostics.
- **`StaffEdgeRoute`** (у StaffRouteSet): {from_id, to_id, kind:String, points, marked:Option<bool>, **+НОВЕ ends_on_dept_top:Option<bool>**} — прапор для TS-фарби entry-маркера. ← єдина зміна контракту; ts-rs regen (A8, types.rs+rust-types.ts в одному диффі).
Phase 0 РОЗВ'ЯЗУЄ: чи `routes` у єдиному виході (В2 — ТАК, наповнюємо) — закрито рішенням В2.

## Декомпозиція (DAG; файл-диз'юнктні зони)
- **P0 — контракт (Я, серійно, foundation).** types.rs: підтвердити StaffLayoutInput/StaffGeometryResult, додати `ends_on_dept_top`; ts-rs regen rust-types.ts. Усі агенти кодять до цього.
- **P1 Rust (паралельно після P0):**
  - **A1 `rust-orchestrator`** — новий `core/src/staff_layout.rs`: оркестратор packing+compose+bounds → заповнює StaffGeometryResult (геометрія); кличе `staff_routes(input)` для routes. + `lib.rs` wasm_bindgen-обгортка (єдиний staff-експорт). ФАЙЛИ: `staff_layout.rs`(new), `lib.rs`.
  - **A2 `rust-routing`** — `staff_routes.rs`+`staff_geom.rs`: просторовий індекс (проти n²/A10), lead-org drop-перевага, deptTop синтет-порт + `ends_on_dept_top`, matrix/dotted preferHorizontal. ФАЙЛИ: `staff_routes.rs`, `staff_geom.rs`.
  - (диз'юнкт: A1 кличе staff_routes за стабільною сигнатурою; A2 покращує її нутрощі + додає поле з P0.)
- **P2 TS (після P1 wired, серійно між собою на спільних файлах):**
  - **A3 `ts-bridge`** — `wasm/layoutBridge.ts`: метод, що кличе новий wasm-експорт, мапить StaffGeometryResult→TS. + regen generated.
  - **A4 `ts-rewire`** — tiers→namespaces (staff/types.ts, StaffZonesView.ts, render/types.ts, render/index.ts, staffLiveGeometry.ts, staffZoneBounds.ts, svgExport.ts, e2eBridge.ts, DiagramRenderer.ts) + ВИДАЛЕННЯ TS-пост-проходів (staffDeptGrouping.ts, canvasLayout композиція, orgBlockLayout, staffZoneBounds enrich) + підключити споживачів до bridge. StaffEdgesView/svgExport читають points+ends_on_dept_top (фарба лишається TS).
- **P3 — зведення (Я/серійно):** golden rebaseline (H1/H3 — вигляд лінків ЗМІНИТЬСЯ, свідомо), B8 адаптер namespaces→tiers, N-1 архітест «пост-проходів нема», повні гейти (build:wasm/rust/ts/oxlint/check:docs без pipe).

## Правила оркестрації (ledger)
Кожен агент: РОБОЧИЙ ФАЙЛ (append по кроках), файл-диз'юнктна зона, R6-мікроцикл (tests-first; я ревʼю кожен крок незалежним агентом). Рахую запущені проти повернутих числом. Статуси: QUEUED/RUNNING/RETURNED/MERGED.

## Ledger
| Агент | Зона (файли) | Залежить | Статус |
|---|---|---|---|
| P0 контракт (я) | types.rs, rust-types.ts | — | QUEUED |
| A1 rust-orchestrator | staff_layout.rs(new), lib.rs | P0 | QUEUED |
| A2 rust-routing | staff_routes.rs, staff_geom.rs | P0 | QUEUED |
| A3 ts-bridge | layoutBridge.ts, generated | P1 | QUEUED |
| A4 ts-rewire | ~9-11 TS + видалення пост-проходів | A3 | QUEUED |
| P3 зведення (я) | golden, архітест, гейти | A4 | QUEUED |

## Відкриті під-рішення (прошу підтвердити перед спавном)
1. **Вигляд лінків зміниться** (Rust-detour ≠ TS-ladder) — golden-baseline роутингу переписуємо. Приймаєш?
2. **Просторовий індекс у Rust** — робимо в A2 (перф-передумова), не відкладаємо. ОК?
3. **endsOnDeptTop** як єдина нова зміна контракту (решта типів уже є). ОК?
