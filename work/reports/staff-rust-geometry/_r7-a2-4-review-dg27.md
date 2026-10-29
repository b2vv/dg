# A2.4 deptTop — НЕЗАЛЕЖНИЙ РЕВʼЮ impl (Dg27)

> Ревʼю ПІСЛЯ зрізу (R6-цикл). Перевірити код проти TS-оракула + умов критика. Автор — інша сесія.
> Вердикт: 🟢 approve / 🟡 approve-with-nits / 🔴 змінити перед комітом.

## Scope змін (uncommitted на feat/t126-staff-rust-geometry)
- `staff_layout.rs`: нова `resolve_dept_heads(positions, reports)`; наповнення `frames_rect.head_id` з гейтом laid-out; 5 unit-тестів.
- `staff_geom.rs`: `FrameRect.head_id: Option<String>` (внутрішній).
- `staff_routes.rs`: `dept_top_y` + `routed_to` синт-порт у edge-loop; `ends_on_dept_top`; 3 тести + `frame_head` хелпер.
- `staff_clearance.rs`: `head_id: None` у тест-хелпері.

## Що перевірити (з path:line-доказом)
1. `resolve_dept_heads` ТОЧНО = `resolveDeptHeads.ts`: global adminParent (без org-фільтра), root=батько-поза-dept-або-відсутній, sort positionId, dept-без-кореня відсутній. Порівняй рядок-у-рядок.
2. deptTop у staff_routes = `staffEdgeGeometry.ts:454-473`: гейт kind=="admin"; headFrame match `head_id==to && from НЕ в тому ж DEPT`; синт `{to.cx-1, frame.y, 2×2}`; to_id збережено; ends_on_dept_top=Some(true) ЛИШЕ on-hit.
3. T9: head_id ставиться лише коли head серед laid-out нод рамки (staff_layout).
4. R7: head_id НЕ тече в golden `StaffDepartmentFrameGeo` / `department_frames`.
5. `routed_to` проведено крізь УСЮ геометрію (same_band, V/H-кандидати, detour, route_ortho) — ніде не лишився старий `to` у геометрії; але `dst`/id-lookup лишаються на реальному to_id.
6. Чи синт-бокс коректно взаємодіє з ладдером (h=2 → same_band false → [V,H]); чи власна рамка голови exempt (dst).
7. Тести: чи RED був справжній; чи немає assert-без-фічі; чи очікування portX=to.cx (не to.cx-1) вірне.

## Будь-які пастки, що автор/критик проґавили — шукай вільно
Напр.: дубль-емісія ends_on_dept_top у non-avoid гілці; поведінка коли head_id вказує на НЕ-persona; multiple frames з тим самим head_id; from org-картка (member_of=None) edge-case.

---
## ХІД РЕВʼЮ (append нижче)

## РЕВʼЮ Dg27 (claude-opus-4-8)

ФАКТ (кр.1 resolve_dept_heads=TS): staff_layout.rs:196-243 рядок-у-рядок = resolveDeptHeads.ts:19-45.
dept_of (id→Option<dept>) = deptOf; admin_parent глобальний, усі reports, kind!="admin"||from==to skip,
last-write-wins = Map.set (TS:24-27). root-гейт: `dept_of.get(parent).copied().flatten()==Some(dept)`
= `deptOf.get(parent)===dept` (parent невідомий / без dept → None/undefined → не збіг → корінь). sort_unstable
= sort() (ASCII, усі id ASCII, усі distinct → стабільність нерелевантна). dept без кореня відсутній. ✔

ФАКТ (кр.2 deptTop staff_routes:540-560): гейт строго `kind=="admin"` (:540) = TS:455. headFrame
`head_id==to_id && from_dept != f.department_id` (:543-544). Rust from_dept — DEPT-рівень (part відкинуто,
:541), = TS `!memberIds.has(from)` (член того ж депу / org-картка None / інший деп — усі три збігаються,
звірено). Синт {to.x+to.w/2-1, f.y, 2×2} = TS:459. to_id збережено (:552). dst=реальна голова (:533). ✔

ФАКТ (кр.3+5 routed_to крізь усю геометрію): same_band (:567-568), route_vertical/horizontal (:587-588),
detour_edge (:607), route_ortho (:611) — усі на routed_to. Старий `to` лише у build routed_to + None-фолбек.
id-lookup на реальних to_id: idx.clear_of (:574), foreign_frame_blocks(&src,&dst :575-581),
obstacles_for_edge(:599-606), frame_intrusion_count(:615-621). §12 ok: frame_intrusion_count exемптить
рамку dst (staff_geom.rs:192) → синт-порт на верх власної рамки голови не дає хибний маркер. ✔

ФАКТ (кр.4 head_id не тече в golden): FrameRect derive лише Debug/Clone/PartialEq (staff_geom.rs:156) —
без Serialize/TS. StaffDepartmentFrameGeo (types.rs:488-499) не має head_id. department_frames golden —
окремий Vec<StaffDepartmentFrameGeo>. ends_on_dept_top: skip_serializing_if None + ts(optional) (types.rs:573-576);
emission `dept_top_y.map(|_|true)` → ЛИШЕ Some(true) on-hit, ніколи Some(false). ✔

ФАКТ (T9 гейт laid-out, staff_layout:1195-1200): head_id ставиться лише коли node.id==head && node.department_id==f.dept
серед laid-out nodes — паритет staffRouterV2.ts:76 `memberIds.has(headId)`. ✔

ФАКТ (пастки): part_index у Rust завжди None (department_frames_from_nodes:909-932, одна рамка/деп) → «кілька
частин того ж head_id» НЕ застосовно; find_map не промахується. Non-avoid (route_ortho) теж отримує deptTop —
це паритет TS (buildStaffEdgeSegments єдиний шлях, без avoid), не подвійна емісія (прапор ставиться раз/сегмент).
from=org-картка (member_of None) → None!=Some(dept) → deptTop застосовується = TS !has. from не laid-out →
resolve_box None → edge skip (:529) до deptTop-логіки. Усі FrameRect-літерали (layout prod + 3 test-хелпери) мають head_id.

ФАКТ (кр.6/7 тести дискримінують): cross_dept — кінець (50,280) vs card-top (50,300) + прапор; синт x=49,w=2,
center=50 → ендпойнт 50 підтверджує port=to.cx (не 49/routed_to.x). intra_dept — None+(50,300) ловить from-виключення.
non_admin(matrix) — None ловить kind-гейт. 5 layout-тестів дзеркалять resolveDeptHeads.test (outside-root, same-dept-exclude,
H6-детермінізм flip, no-dept ignore, cycle-absent). ПРИМІТКА: cross_dept має from.cx==to.cx==50 → не розрізняє
port=to.cx vs port=from.cx (обидва 50), але розрізняє 50 vs 49 — ключова перевірка -1/w2 пройдена. Нит, не блокер.

РІШЕННЯ: 146/146 lib-тестів ok; clippy чисто; жодного витоку head_id; gate-паритет DEPT-рівня підтверджено.

ВЕРДИКТ: 🟢 approve. Один нит (не блокер): cross_dept-тест не розводить port=to.cx vs from.cx через
збіг центрів — опц. додати from.cx≠to.cx кейс.
