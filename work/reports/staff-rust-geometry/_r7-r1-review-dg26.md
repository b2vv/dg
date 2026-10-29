Model ID: claude-opus-4-8

# R7 R1 Review + Contract Audit (dg26)

ДАЛІ: прочитати staff_layout.rs, lib.rs (computeStaffGeometry), types.rs (324/374/398), і TS-джерела (orgBlockLayout.ts, canvasLayout.ts, staffDeptGrouping.ts, staff/types.ts, render/staffLayoutInputs.ts). Прогнати cargo test + clippy.

## ФАКТ (крок 1): staff_layout.rs + TS orgBlockLayout/deptGrouping/types прочитано
- cargo test: 125 passed, 0 failed. clippy --all-targets -D warnings: exit 0. Обидва зелені.
- dept.order ПІДТВЕРДЖЕНО gap: TS compareDepartments (staffDeptGrouping.ts:37-41) сортує (order??0)-(order??0) || id. Rust group_staff_by_department (staff_layout.rs:489-495) сортує лише .sort() за id. StaffDepartmentInput (types.rs:374) несе лише id.
- Паритет tree-порту в межах tree-гілки виглядає точним: reparent (D5), recenter root, pack_side_column, dept region-pack, pin_external — всі відтворюють TS 1:1.
- Rust group_staff_by_department НЕ викликає validateRouteInput і НЕ застосовує memberOrder (TS layoutDeptGroupedBlock:234-262). validateRouteInput може повертати skip→fallback tree + diagnostics; memberOrder переупорядковує positions перед групуванням.
- TS collapse (visiblePositions, expandedPositionIds, collapseUnexpandedPositions) — не в Rust; default false (demo), тож golden за замовч. не чіпає, але контракт не несе.
- ДАЛІ: canvasLayout.ts (композиція ярусів, tier1 leadership, head resolution), render/staffLayoutInputs.ts (buildStaffLayoutOptions — що реально подається), coords.ts (positionSize/resolveGeom/resolvePositionAABB).

## ФАКТ (крок 2): решта TS + zone-аудит + джерело порядку вузлів
- Zone (Part A §4): uncommitted зміни types.rs/staff_routes.rs/staff_clearance.rs = `endsOnDeptTop` (R6-7b/A2), НЕ R1. R1 = новий staff_layout.rs + lib.rs binding (+16). Контрактні типи StaffLayoutInput/Position/Department R1 не чіпав. ОК.
- lib.rs:75-85 wasm-binding викликає options.validate() (NaN/Inf-гейт) перед compute. ОК.
- validateRouteInput.ts:70 ЗАВЖДИ сортує members comparePositions=(parentId, order, id) перед groupStaffByDepartment. Rust dept-path бакетить у ВХІДНОМУ порядку (staff_layout.rs:479) → sibling-порядок у WASM різний → x у відділах розходиться НАВІТЬ без order. Major.
- compute_org_row_tree_layout (org_layout.rs:38-42) емітить nodes у детермінованому traversal-порядку ploeg (build_from_flat), НЕ HashMap як каже коментар staff_layout.rs:305. Отже TS (без sort) і Rust (sort_by id, :309) розходяться в ПОРЯДКУ масиву. Геометрично нейтрально в межах одного дерева й у dept-регіонах (region_bounds — min/max), але pack_side_column eject-петля детача залежить від порядку обробки → вузький parity-ризик.
- edgePorts: input.edge_ports у контракті, але compute_staff_geometry передає person_hints:&[] і НЕ конвертує edge_ports → docking (ADR-0002) не застосовано. Якщо routes у golden-скоупі R1 → розходження; інакше A2.
- Unknown-dept: Rust кидає членів, чий departmentId не в departments (dept_ids фільтр :489-492) — TS кладе їх у no-dept bucket (validateRouteInput null→NO_DEPARTMENT). Edge-divergence.
- ВЕРДИКТ готовий, повертаю.
