claude-opus-4-8

# GATE v3 re-review (r2) — ШПС-роутер

ДАЛІ: прочитати design-v3.md, gate-v3-review.md (r1), spec.md; потім перевіряти 6 умов на реальному Rust/TS коді.

## ФАКТ — умова #2 (Rust no-sort) — ПЕРЕВІРЕНО НА RUST
Ланцюг staff-layout: computeOrgRowTreeLayoutWasm → compute_org_row_tree_layout (org_layout.rs:6) →
extract_subtree (org_tree.rs:114) → build_from_flat (hierarchy.rs:5) → compute_ploeg_layered_layout
(ploeg_layout.rs:11). Дизайн цитує hierarchy.rs+ploeg_layout — обидва РЕАЛЬНО в ланцюгу (org_layout.rs:3,33,36).
- hierarchy.rs:29 `children_by_parent.entry(parent).or_default().push(item)` — push у порядку ітерації items, ЖОДНОГО .sort(). ✅
- hierarchy.rs:49-56 HierarchyNode.children збирається у порядку children_by_parent (вхідний). ✅
- ploeg_layout.rs:48 `for child in node.children.iter().rev()` — коментар 25-27 прямо: порядок збережено, нумерація від обходу. Жодного sort. ✅
- extract_subtree org_tree.rs:128-146 — теж жодного sort.
РІШЕННЯ: заява дизайну «WASM зберігає вхідний порядок сиблінгів без сортування» — ПРАВДИВА. Умова #2 ЗАКРИТА.
NON-BLOCKING нюанс: extract_subtree (stack-DFS pop) + ploeg reverse → net вихідний x-порядок = РЕВЕРС вхідного sibling-порядку. Канал керований і детермінований (swap на вході → swap на виході), тож probe 1b валідна; але sort-ключ має врахувати напрям (реверс). Impl-деталь, не blocking.

## ФАКТ — умови #1,#3,#4,#5,#6 + seam
- #1 forced тихий: staffEdgeGeometry.ts:381 `return {via:'forced', points:alt}` БЕЗ blocked() — підтверджено. Дизайн §3+Форма(3b): frame-intrusion detection (polylineHitsBoxInterior проти deptFrames) + видимий маркер над ФІНАЛЬНИМИ маршрутами. Детекція sync, дешева, не залежить від rebuild → закриває тихий шлях. ЗАКРИТО.
- #3 NO_DEPARTMENT_ID: types.ts:244 `'\u0000no-department'` ✅; contourInputs.ts:39-49 memberBoxesByDept КЛЮЧИТЬ і loose-bucket. Дизайн §2 (65-66) явно виключає + probe 3c. ЗАКРИТО.
- #4 re-entrancy: ingestIsCurrent epoch-guard (OrgHierarchyDiagram.ts:647), epoch threaded (DiagramRenderer:167). staffDeptGrouping у §1 живе в orgBlockLayout (tree-гілка) = layoutStaffCanvas (async, awaited 631, epoch-guarded). ЗАКРИТО.
- #5 валідація: StaffLayoutError РЕАЛЬНИЙ патерн (layout/staff/types, resolveHead.ts:55/61). Дизайн §0 (43-48) портує spec §5.1 (cycle/self/dangling/unknown dept/hidden dept). ЗАКРИТО.
- #6 all-loose: §Поза межами 109-111 явно (no-op grouping, legacy route, §3.2 vacuous). ЗАКРИТО.

## 🔴 НОВА BLOCKING-ДІРА — §12 K-релаксація seam (саме той додатковий чек)
Render-flow (DiagramRenderer renderStaffCanvas:600): `canvas = await layoutStaffCanvas` (631, async, epoch) →
paintStaffDepartments (666, async, малює dept-контури з canvas.positionNodes) → paintStaffFrameAndEdges
(668, **SYNC**, no await) → addStaffPersonCards (669, малює картки з canvas.positionNodes).
- buildStaffEdgeSegments(edges, boxes) (staffEdgeGeometry.ts:409) = ROUTING-ONLY; НЕ будує boxes/layout.
- paintStaffFrameAndEdges НЕ кличе buildStaffEdgeSegments напряму — кличе StaffEdgesView.fromLayout (801) → redraw (SYNC) → buildStaffEdgeSegments (StaffEdgesView.ts:89).
ПРОТИРІЧЧЯ дизайну §12-seam (100-104): staffRouterV2 у paintStaffFrameAndEdges «перебудувати через staffDeptGrouping (async WASM) → перемаршрутизувати» у ≤K циклі:
 (a) paintStaffFrameAndEdges SYNC — не може await async staffDeptGrouping у циклі;
 (b) rebuild layout відбувається ПІСЛЯ paintStaffDepartments:666 (контури з boxes0) і картки addStaffPersonCards:669 теж із canvas.positionNodes(boxes0) → релаксовані boxes1 розійдуться з контурами+картками (візуальна неконсистентність); дизайн НЕ описує propagate boxes1 назад;
 (c) суперечить власному §4 дизайну: staffDeptGrouping async+epoch-guarded (= layout-фаза, не sync-paint).
РІШЕННЯ: §1 кладе ПЕРШИЙ grouping-пас у orgBlockLayout (layout-фаза) — КОРЕКТНО. Але §12 K-loop, що RE-invoke'ає grouping, прив'язаний до paint-фази — НЕКОГЕРЕНТНО. Fix: K-loop (reorder→rebuild→detect) має жити на layout-фазі (renderStaffCanvas/layoutStaffCanvas, вже async+epoch), а route-only frame-skip + intrusion-marker — на edge-фазі. Це правка design-doc ПЕРЕД кодом (дизайн сам зробив «де живе K-релаксація» умовою re-GATE, рядок 165).

## ВЕРДИКТ: 🔴 BLOCKED
6/6 оригінальних blocking закрито адекватно (не косметично). Code-заяви v3 (Rust+TS) звірено — всі правдиві, 0 хибних. Нових blocking-дірок від правок #1-#6: 0. АЛЕ §12 K-релаксація seam (додатковий чек + власна re-GATE умова дизайну) розв'язано НЕкогерентно = 1 відкрита blocking-умова. Гейт лишається ЧЕРВОНИМ, поки §12-seam не перенесено на layout-фазу.
