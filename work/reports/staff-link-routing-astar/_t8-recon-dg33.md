# T8 — картографія прод-поверхні (dg33 розвідка, read-only)

Прод-виклик роутера: `compute_staff_geometry` (staff_layout.rs:983) → `staff_routes(&RouteInputs{...})`
(staff_layout.rs:1260) → `StaffGeometryResult.routes` (:1277). **route_scene у проді НЕ кличеться** (лише тести).

## Поверхня wiring
- **RouteInputs** (staff_routes.rs:50-58): persons, org_cards, edges, lod, person_hints, department_frames, card_pad.
  Формуються staff_layout.rs:1233-1268. `department_frames_from_nodes`(:1233)+`resolve_dept_heads`(:1237)→FrameRect{…,head_id}.
  card_pad=`resolve_card_pad`(:1257).
- **Canvas W/H** для сітки — Є, але ОКРЕМО: `canvas_dimensions`(staff_layout.rs:1165)→dims.width/height(:1278). route_scene
  бере (canvas_w,canvas_h) першими арг — у wiring передати dims окремо (RouteInputs їх не має).
- **Контракт** StaffEdgeRoute (types.rs:593): {fromId,toId,kind,points,marked?,endsOnDeptTop?} — серіалізується в rust-types.ts.
  route_scene→AStarRoute{points,failed}. Мапінг: failed→marked=Some(true); endsOnDeptTop=dept_top_y.is_some();
  **kind НЕ тече крізь route_scene** (EdgeSpec без kind) → зшити з вхідних StaffEdge за (from,to). Контракт НЕ змінюється.
- **deptTop (D3)** detour staff_routes.rs:536-561: FrameRect де head_id==to & крос-dept → `(to.cx, frame.y)`. Reusable
  один-в-один для EdgeSpec.target.
- **diagnostics** (types.rs:647) вже тече в adaptStaffGeometry (canvas.diagnostics=[...cap,...result.diagnostics],
  adaptStaffGeometry.ts:172) → stats→diagnostics БЕЗ зміни TS. **marked→markedCrossings** вже є (adapt:180-182).
- **member_of**: route_scene вимагає замикання; staff_routes будує внутрішньо (staff_routes.rs:509) → підняти на рівень compute_staff_geometry.
- **Перемикач**: НЕ існує. Логічне місце — staff_layout.rs:1260 (внутр. dev-constant/обгортка → staff_routes АБО route_scene).

## 🔴 Диспетч + golden — головна залежність
- staffLiveGeometry.ts:160 ДИСПЕТЧ: **tree-сцени → computeViaRust** (Rust compute_staff_geometry → adaptStaffGeometry);
  matrix/headless → computeViaTs (TS-шлях). **T8 впливає ЛИШЕ на tree-шлях.**
- **Golden** (packages/demo/src/scenarios/staffGeometry.golden.test.ts + __golden__/staff-geometry.json) звірений на
  `points` маршрутів ±1px (структура строго). **detour→A* ЗМІНИТЬ golden майже напевно.** Rebaseline = T10,
  **гейтиться ручним R3-візуалом** (plan.md:95 крок 7). Агент без браузера R3 зробити не може.

## Розвилка T8 (дефолт перемикача)
- plan §4 каже «дефолт A*», АЛЕ це ламає golden до T10/R3.
- (A) wiring із дефолтом DETOUR (A* досяжний+тестований новим rust-тестом) → golden цілий, CI зелений; flip+rebaseline = T10 після R3.
- (B) flip на A* зараз → golden червоний → rebaseline БЕЗ R3 (ховає неперевірений вихід у baseline, проти плану).
- (C) власник робить R3 зараз → тоді flip+rebaseline разом.
