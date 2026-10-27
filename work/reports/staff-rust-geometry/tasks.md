# tasks.md — T126: геометрію staff(ШПС) рахує Rust

**Етап spec-flow:** 6 (tasks). Вхід: `spec.md` (GATE 1 PASS), `plan.md` (GATE 2 PASS — `plan-critique` 🟢 + `plan-defense` 🟢 + конституція ✓).
**Код НЕ запускати** до явного code-«го» власника (C9). Коміт/пуш — лише з «го». Task branch від `b3545b8` створюється на старті імплементації.
**TDD обов'язковий:** тест-рядки (нові `*.test.ts` / `cargo test`) пишуться **першими** (success+failure, red-green-refactor). Кожен таск називає рядки приймальної таблиці `plan.md §8`, які закриває.
Порядок: `R0 → R1 → (R2 ∥ R3 ∥ R4) → R5 → R6 → R7 → R8 → R9 ∥ R10`. `[P]` = можна паралельно.

| Таск | Опис (атомарний) | Файли | Закриває (plan §8) | Критерій «готово» | Залежить |
|---|---|---|---|---|---|
| **R0** | Baseline-golden **нормалізованої геометрії** всіх staff-сцен (координати/межі/edges/orgCards, ±1px; **не** форма секції). Зелений до змін (виняток із «червоний першим»; мутація ловиться). | нові golden `*.test.ts` у `layout/staff/` | B7, (інфра для B8, H1) | golden зелений на HEAD; мутація координати → червоний | — |
| **R1** | Під-спека межі Rust/TS: входи (DOM-розміри/gaps/дерево/namespaces/`edgePort`/LOD) і виходи (координати/межі/namespaces/точки-маршрути); що переходить, що лишається адаптером; API результату (ламаємо `tiers`→`namespaces`); Rust-convention нота `packages/core`. | `work/reports/staff-rust-geometry/_r1-boundary.md`; `packages/core/src/types.rs` (контракт) | A6, A8 | контракт входів/виходів зафіксовано; `types.rs`↔`rust-types.ts` план перегенерації | R0 |
| **R2** [P] | Під-спека + реалізація розриву циклу DOM↔Rust: two-pass headless-вимір, склад ключа кешу, generation-токен (latest-wins), джерело розміру на far/mid. | `layout/staff/` вимірювач, `wasm/layoutBridge.ts` | F2, F3, F8, H5 | нема фідбек-ребра layout↔DOM; reentry-тест latest-wins зелений | R1 |
| **R3** [P] | Rust: пакування відділів і обгорток з внутрішніми відступами; **контури/частини відділів** (magnetic-розріз, O-48, вхідна умова S7); I-A2 (корені без відділу вниз на шапку+відступ). | `packages/core/src/` (новий модуль), заміна `staffDeptGrouping.ts` | B1, B3, B4, B5 | `cargo test` пакування; зазор рамок = `gap+2·padding` (I-T5); I-A2 зелений | R1 |
| **R4** [P] | Rust: композиція ярусів + namespaces + вісь (замінює `canvasLayout.ts` композицію/зсуви; `dx≤0`, ярус-3). | `packages/core/src/`, тонкий `canvasLayout.ts` | H1, B3 | `cargo test` осі/namespaces; golden R0 на новому шляху зелений | R1 |
| **R5** | Rust: межі обгорток і namespaces як **єдиний вихід** (live і `svgExport` читають; прибирає подвійний padding + `labelBand`-розбіжність). | `packages/core/src/`, `render/staffZoneBounds.ts`, `render/svgExport.ts` | H3, A2 | паритет live vs SVG на `card`-сцені зелений | R3, R4 |
| **R6** | Rust: точки лінків = **повні ортогональні маршрути** (Q-3→O-48) per-LOD; `edgePort` вхід; перешкоди = Rust-геометрія для всіх LOD (§7b); зберегти паритет live/SVG. | `packages/core/src/`, `layout/staffEdgeGeometry.ts`, `render/visualEdgeBox.ts` | H4, H6, B5 | 0 перетинів/§12-маркер, ≥8px, детермінізм (H6); паритет | R5 |
| **R7** | TS-адаптер + видалення TS-пост-проходів; **ламаємо форму** `tiers`→`namespaces` — усі споживачі в одній зміні (повний `grep` на старті: `canvasLayout`, `StaffZonesView`, `staffZoneBounds`, `personInteractions`, `render/types`, `svgExport`, `e2eBridge`, `DiagramRenderer`, тести). | ↑ усі + `layout/staff/types.ts` | B8, §4 side-effects, N-1 архітест | typecheck зелений; адаптер-тест `tiers↔namespaces` (B8); архітест «пост-проходів нема» | R6 |
| **R8** | `/debug` режим ідентичності canvas=DOM (O-16.2): рендер обох з одного розміру, порівняння, розбіжність = баг; Pixi(far)+React(near). | нові `render/`/demo, e2e | H2, F1 | `/debug` ловить штучну розбіжність (F1 negative) | R7 |
| **R9** [P] | Документи: стек-нота `AGENTS.md` (нова правда «canvas paint» + «contours у core»), `work/SPEC.md`, `work/CTO-RESEARCH.md` рефреш, `docs/USAGE.md` якщо публічне; перейменувати ADR-0002 (ім'я застаріле). `check:docs`. | `AGENTS.md`, `work/`, `docs/` | A9 (check:docs) | `npm run check:docs` зелений; стек-нота правдива | R7 |
| **R10** [P] | Гейти: `build:wasm` → `cargo fmt --check`/`clippy -D warnings`/`cargo test` → `npm test` (**без pipe**) → oxlint → `check:docs` → typecheck; **перф-вимір** перерахунку (A10 ≤2-3с) на типовому й 1M-вікні; браузер near+far. | CI-команди, `e2e/staff-1m.spec.ts`, `measure` | A9, B6, F5, F7 | усі гейти exit 0; перф ≤2-3с або **стоп+перегляд** (O-52) | R7 |

**Ручні рядки (назавжди в звіті):** B6, F5 (перф `measure`, поза CI-гейтом).
**Нові тест-файли (пишуться першими, TDD):** golden R0, `staffResultAdapter.test.ts` (B8), `staffEdgeGeometry.determinism.test.ts` (H6), `layoutBridge.invalidInput.test.ts` (F6), `layoutBridge.wasmFailure.test.ts` (F7), `layoutStaffCanvas.reentry.test.ts` (F8), `staff-debug-identity.spec.ts` (H2/F1), `staff-rust-geometry.spec.ts` (H1), `staff-routing.spec.ts` (H4/B5), `svgExport.parity.test.ts` (H3).

## Стан по checkpoint (`pre-code-checkpoint.md`)
- C1 acceptance-spec — **PASS** (таблиця `plan.md §8`).
- C6 plan-critique — **PASS** (🟢 раунд 2).
- C7 plan-defense — **PASS** (🟢 раунд 2).
- C8 briefing свіжий — PASS (R9 оновить стек-ноту перед кодом).
- **C9 «го» власника на код — NOT_RUN (єдиний лишений блокер).**
→ **Readiness 8/9. BLOCKED лише на C9.** Наступна дія для розблокування = **явне «го» власника**, далі task branch від `b3545b8` + `/tdd` (Coder = `codex exec`), R0 першим.
