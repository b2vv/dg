
---
## Dg26 — КОДЕР A1 rust-orchestrator (R7 Варіант 2)

ДАЛІ: recon — читаю types.rs (StaffLayoutInput:398, StaffGeometryResult:579), staff_routes.rs, staff_packing.rs, staff_bounds.rs, staff_geom.rs, staff_edge_box.rs, compose*, lib.rs; звіряю порядок композиції з canvasLayout.ts.

### FACT — контракт (types.rs)
- Вхід `StaffLayoutInput` (types.rs:398): current_org_id, positions[StaffPositionInput], reports[StaffEdgeInput], organizations[StaffOrgInput], departments[StaffDepartmentInput], node_sizes[StaffNodeSize], options[StaffLayoutMetrics], edge_ports, expanded_org_ids, lod.
- `StaffPositionInput` (types.rs:324): лише id, organization_id, is_head, department_id — **БЕЗ x/y/width/height**. ⇒ matrix/hybrid режими (потребують коорд посад) у Rust **непредставні**; представний лише tree(+dept-grouping).
- Вихід `StaffGeometryResult` (types.rs:586): nodes, org_cards, namespaces, department_frames, edges, routes(StaffRouteSet), width, height, diagnostics.

### FACT — наявні Rust-блоки (усі СПОЖИВАЧІ вже розкладених членів)
- staff_packing.rs:69 `pack_departments(&[DepartmentMembers{members: Vec<StaffNodeGeo>,…}], …) -> StaffPackResult` — приймає ВЖЕ розкладені StaffNodeGeo. staff_packing.rs:45 прямо каже «члени приходять із row-tree».
- staff_compose.rs:34 `compose_tiers(&[TierBlock{members: Vec<StaffNodeGeo>,…}], …)` — приймає ВЖЕ розкладені члени (локальні коорд). Робить head-center tier1→tier2 (вбудовано).
- staff_compose.rs:122 `compose_org_cards(card_y, &[OrgCardInput{expanded_block: Option<ExpandedBlock{members: Vec<StaffNodeGeo>}>}], &OrgCardOptions)` — expand-in-place потребує ВЖЕ розкладені члени.
- staff_compose.rs:194 `canvas_dimensions(nodes, cards, tier2_width, margin, content_bottom)`.
- staff_bounds.rs:135 `enrich_namespaces(&[StaffNamespace], nodes, cards, &BoundsOptions)` — R5 межі, готове.
- staff_routes.rs:299 `staff_routes(&RouteInputs{persons:&[StaffNodeGeo], org_cards, edges:&[StaffEdge], lod, person_hints, department_frames:&[FrameRect], card_pad})` — самодостатня; будується з композованої геометрії. OK.
- FrameRect (staff_geom.rs:157) будується з StaffDepartmentFrameGeo (поля збігаються).

### FACT — TS-еталон layoutStaffCanvas (canvasLayout.ts:43-279)
Конвеєр: tier1 (managing leadership) → `layoutStaffOrgBlock` → зсув y; tier2 (current full) → `layoutStaffOrgBlock`; head-center tier1; tier3 org-cards + expand-in-place → `layoutStaffOrgBlock`; lead-org cross-tier edges; matrix/dotted decorative edges; width/height.
**Ключ:** кожен ярус спирається на `layoutStaffOrgBlock(positions,reports,orgId,opts)` (orgBlockLayout.ts:340) → повертає члени в ЛОКАЛЬНИХ коорд + edges + width/height + diagnostics. Саме цей вихід живить compose_tiers/compose_org_cards.

### ПИТАННЯ (БЛОКЕР) — відсутня центральна ланка: Rust-порт layoutStaffOrgBlock
Жодна Rust-функція не бере StaffPositionInput/StaffLayoutInput і не будує StaffNodeGeo-члени з positions (перевірено grep: 0 результатів). Відсутній цілий шар — per-block member layout:
- orgBlockLayout.ts:340 `layoutStaffOrgBlock` + :357 core (tree/matrix/hybrid)
- orgBlockLayout.ts:47 `layoutConnectedTree` → `computeOrgRowTreeLayoutWasm` (row-tree Є в Rust: org_layout.rs:6) + recenter root
- orgBlockLayout.ts:171 `layoutTreeBlock` (detached side-column pack)
- staffDeptGrouping.ts `groupStaffByDepartment` (dept-групування; емітить department_frames)
- resolveHead.ts (adminParentMap, resolveStaffHead, detachedRootIds), positionExpand.ts (visiblePositions, adminDescendantIds), externalManagers.ts (pinExternalManagers), coords.ts, routing/validateRouteInput.ts
Це сотні рядків нової геометрії у 6+ TS-файлах. Завдання прямо забороняє «вигадувати нову складну геометрію» і скоупить мене на «збирання наявного + staff_routes». ⇒ оркестратор НЕ може бути написаний, доки цей шар не існує в Rust.

**Варіанти для координатора (R рішення власника):**
A. Окремий кодер/зона портує layoutStaffOrgBlock (tree+dept-grouping only, бо matrix/hybrid непредставні поточним input-контрактом) у Rust; я оркеструю поверх, щойно є сигнатура `fn layout_staff_org_block(positions,reports,org_id,depts,geom) -> BlockResult{nodes:Vec<StaffNodeGeo>, dept_frames:Vec<StaffDepartmentFrameGeo>, width,height,diagnostics}`.
B. Block-layout лишається в TS, TS віддає вже розкладені члени в Rust — потребує зміни P0-контракту StaffLayoutInput (додати коорди в StaffPositionInput). Поза моєю зоною (P0 заморожено).
C. Переглянути скоуп A1: якщо порт block-layout входить у мою зону — це НЕ «оркестратор», а новий модуль; треба явний дозвіл власника (суперечить «не вигадуй складну геометрію»).

РІШЕННЯ: НЕ пишу оркестратор проти неіснуючої функції й НЕ винаходжу block-layout (заборонено). Повертаю ПИТАННЯ. Гейти не ганяв (коду не писав).
