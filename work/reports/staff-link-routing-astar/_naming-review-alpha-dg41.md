# Naming-review alpha-порта (dg41)

**Мета:** «mockup» в іменах — це вже не мокап, а канонічний staff layout+routing. Перейменувати ДО Codex-правок (§10.4+perf) у тому ж файлі.

## Blast radius (повний)
- **Rust:** `packages/core/src/staff_mockup_layout.rs` (файл) · `lib.rs:12,33-35` (mod + pub use) · `lib.rs:100-104` (wasm js_name `computeStaffMockupLayout`) · `types.rs:709-716` (ts-rs export).
- **Generated:** `packages/sdk/src/wasm/generated/rust-types.ts:138-177` (регенерується з Rust через `cargo test` ts-rs).
- **SDK (6 файлів):** `wasm/layoutBridge.ts` (`computeStaffMockupLayoutWasm`, типи), `contour/bridge.ts:32`, `wasm/staffGeometryBridge.test.ts:74`, `render/types.ts:321`, `render/staffLiveGeometry.ts:36,327,356,364` (`buildStaffMockupInput`), generated.
- ⚠️ **Alpha-порт УЖЕ вайриться в `staffLiveGeometry.ts` (прод-шлях live staff-геометрії)** — не лише демо. Треба підтвердити, чи це дефолт-live чи за прапором, ПЕРЕД будь-яким ребілдом dist.
- **Публічний API (`docs/USAGE.md`): НЕ чіпає** — це внутрішня wasm-bridge-поверхня, не фасад `OrgHierarchyDiagram`. Рефактор нижче порога.

## Символи з токеном «Mockup» (перейменувати)
| Поточне | Вид |
|---|---|
| `staff_mockup_layout.rs` | файл/модуль |
| `StaffMockupRouting` enum (`"simple"\|"astar"`) · `StaffMockupParams` · `StaffMockupInput` · `StaffMockupNode` · `StaffMockupFrame` · `StaffMockupPoint` · `StaffMockupEdge` · `StaffMockupResult` | pub struct/enum (ts-rs) |
| `compute_staff_mockup_layout` · wasm `computeStaffMockupLayout` · `wasm_compute_staff_mockup_layout` | fn / wasm-binding |
| `computeStaffMockupLayoutWasm` · `buildStaffMockupInput` | SDK TS |
| `mockup_stats` (internal) · тести `mock3_*` | internal/test |

## 🔴 Колізія імен
Найочевидніший канонічний токен — `staff_layout` / `StaffLayout*` — **зайнятий СТАРИМ файлом** `staff_layout.rs`, який ми прибираємо (deprecated→видалення ПІСЛЯ enable). Тобто в момент rename хороше ім'я ще зайняте. Варіанти розв'язання — нижче.

## Пропозиції токена (за тобою)
- **Варіант 1 — `StaffTidy*` / `staff_tidy_layout.rs` / `computeStaffTidyLayout`.** Описує метод (two-level tidy-tree). Не конфліктує зі старим. Не треба чекати видалення старого.
- **Варіант 2 — reclaim `StaffLayout*` / `staff_layout.rs`.** Спершу перейменувати СТАРИЙ у `staff_layout_legacy.rs`, тоді канон бере чисте ім'я. Чистий цільовий стан, але +крок і більший diff зараз.
- **Варіант 3 — нейтральне `StaffScene*` / `staff_scene_layout.rs`.** Якщо «tidy» завузько (файл містить і layout, і routing, і stats).

## ✅ РІШЕННЯ: токен = `Tidy` (варіант 1), залочено 2026-11-06
Правило власника: «старе вирізати відразу → вар.2; якщо ні → вар.1». Факт (staffLiveGeometry.ts:171-192):
`compute_staff_geometry` (staff_layout.rs) — **живий прод-дефолт** (computeViaRust), alpha за прапором
`staffAlphaMockup:false` (types.ts:527). Старе НЕ вирізати зараз → **варіант 1 (StaffTidy)**.
Бонус: alpha flag-gated → rename зараз найбезпечніший (жива dist на alpha-js_name не залежить).

### Rename-мапа (Mockup → Tidy)
- Файл: `staff_mockup_layout.rs` → `staff_tidy_layout.rs`; `mod` у lib.rs:12.
- Типи: `StaffMockup{Routing,Params,Input,Node,Frame,Point,Edge,Result}` → `StaffTidy*`.
- Fn: `compute_staff_mockup_layout`→`compute_staff_tidy_layout`; `wasm_compute_staff_mockup_layout`→`wasm_…tidy…`;
  js_name `computeStaffMockupLayout`→`computeStaffTidyLayout`; internal `mockup_stats`→`tidy_stats`.
- SDK: `computeStaffMockupLayoutWasm`→`computeStaffTidyLayoutWasm`; `buildStaffMockupInput`→`buildStaffTidyInput`.
- НЕ чіпати: wire-значення (`"simple"`,`"astar"`,`"admin"`), fixture-назву `mock3`.

### Безпечна валідація (БЕЗ запису в спільний dist)
`cd packages/core && cargo test export_rust_types --features ts-export` (регенерує rust-types.ts) · `cargo test` ·
`npm run typecheck -w @org-hierarchy/sdk` (tsc check, no emit) · `npm run test -w @org-hierarchy/sdk`.
ЗАБОРОНА: `build`, `build:types`, `build:wasm`, root `typecheck`/`test` (пишуть dist = деплой у cass).

ДАЛІ: Codex rename-крок (без коміту) → мій рев'ю → коміт координатором → Codex §10.4+perf.

## Виконано (2026-11-06)
- ✅ **Rename Mockup→Tidy** — коміт `bb2c956` (гілка feat/t126-staff-rust-geometry, не пушено).
  9 файлів: staff_tidy_layout.rs (git mv), StaffTidy* (8 типів), *tidy*-fn, rust-types.ts regen, 2 SDK-обгортки.
  Межа `computeStaffMockupLayout` лишена (4 TODO(dg41)-якорі) — під координований build:wasm.
  Гейти незалежно перевірено: cargo 205+8+0 · ts-export (8 StaffTidy/0 StaffMockup) · sdk typecheck · sdk test 1240/0.
  Grep: рівно 5 boundary-токенів у 4 KEEP-сайтах. Codex гейт-4 впав на EPERM порту (пісочниця) — я догнав сам, зелено.
- 🔄 **§10.4 гейт + perf@500** — Codex task b61bgcvoi (Rust-only).
