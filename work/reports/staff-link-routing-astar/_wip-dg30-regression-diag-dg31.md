
---
## dg31 — діагностика регресу 46 падінь (staffLiveGeometry → Rust)
ДАЛІ: читаю staff_layout.rs:125-165 (resolve-head), WIP staffLiveGeometry.ts (увесь), git show HEAD-версію того ж файлу, і git diff OrgHierarchyDiagram.ts/DiagramRenderer.ts — щоб визначити (A) staff хибно для орг-сцен чи (B) Rust строгіший.

ФАКТ: гейт staff-vs-org НЕ змінений FORK2. `DiagramRenderer.renderStaff`: `hasStaff=positions.length>0`; `renderStaffCanvas` лише якщо `resolveStaffCurrentOrgId(...)!=null` (staffLayoutInputs.ts:53). Помилка «org1» → staff-шлях запускається ЛЕГІТИМНО. → (A) ВІДКИНУТО.

ФАКТ: старий TS `resolveHead.ts:48-72` кидав ДОСЛІВНО ту саму помилку — Rust `staff_layout.rs:161-163` це порт. Отже Rust НЕ «строгіший» сам по собі. → наївне (B) теж неточне.

ФАКТ (корінь): старий `orgBlockLayout.ts:356-440 layoutStaffOrgBlockCore` ГІЛКУЄТЬСЯ за `staffCoordMode`+наявністю координат:
 - matrix / (coords є) → `layoutMatrixBlock` (orgBlockLayout.ts:273-300): позиції за gridCell-AABB, дає «Anchor overlap», БЕЗ resolveStaffHead → НЕ кидає.
 - tree / (hybrid без coords) → tree-блок + resolveStaffHead.
Rust `compute_staff_geometry` (staff_layout.rs:972) — ЛИШЕ tree (коментар 971: «matrix/hybrid — TS-адаптер»). Tier-2 завжди: :1042 → layout_staff_org_block:883 (dept_grouping=false) → layout_tree_block(..., None):883 → resolve_staff_head(...)?:494 → Err → пропагація → bridge throws.

ФАКТ: WIP `staffLiveGeometry.ts:97` кличе computeStaffGeometryWasm БЕЗУМОВНО — немає гейту за staffCoordMode, немає TS-matrix-адаптера, хоча Rust-коментар його обіцяє. adaptStaffGeometry.ts / buildStaffLayoutInput.ts coordMode не дивляться.

ФАКТ: фікстури — coord-bearing+headless: layoutDiagnostics overlappingStaffData (a,b, no isHead, reportLines[], staffCoordMode:'matrix'); interactions.test 15×gridCell, усі staffCurrentOrgId:'org1'. 45 падінь — прямий throw. 46-те (personDrag F39, assert onDrop 1≠0) — наслідок: throw ловиться reportIfRenderFails → сцена без seats → drag без drop. Один корінь.

РІШЕННЯ: корінь = НЕ (A), варіант (B) уточнений — Rust реалізує лише staffCoordMode='tree'; WIP втратив matrix/hybrid-гілку старого layoutStaffOrgBlockCore. Фікс — гейтнути Rust-шлях за coordMode у staffLiveGeometry.ts і для matrix/hybrid-з-координатами лишити TS-layout (layoutStaffCanvas ще існує). Опція «зробити Rust толерантним (fallback на 1-шу позицію як head_id_of:936)» відкинута: прибирає крах, але дає tree-геометрію замість gridCell-AABB + зникає «Anchor overlap» — хибна семантика matrix.
