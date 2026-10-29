claude-opus-4-8

[ДОДАТОК ПІСЛЯ ДИСКУСІЇ — САМОВИПРАВЛЕННЯ. Перший прохід помилився; нижче спростування з кодом.]

## 🔴→🟡 РЕТРАКЦІЯ no-op/double-draw. Admin ДОСЯЖНИЙ у staff_routes.

ПОМИЛКА 1-го проходу: я прочитав лише push на 1089-1127 і пропустив `edges.extend(block.edges)`.

ФАКТ (admin В edge-set): `staff_layout.rs:903` edges=Vec::new(), далі
`edges.extend(block1.edges)` 929 (ярус-1 managing), `edges.extend(block2.edges)` 960 (ярус-2
current — основний набір), `edges.extend(block.edges)` 1022 (ярус-3 expanded). block.edges несуть
admin (layout_staff_org_block; pins 695-704 kind="admin"). Тести staff_layout.rs:1598/1767
АСЕРТЯТЬ admin у вихідних edges. → admin ПОТРАПЛЯЄ в staff_routes (1147).

ФАКТ (staff_routes роутить admin): `staff_routes.rs:511` `for edge in input.edges` — БЕЗ kind-
фільтра. Усі ребра роутяться. `:595-601` StaffEdgeRoute{kind, points, ends_on_dept_top:None}
з коментарем «A2 (rust-routing) заповнить для deptTop head-цілей». Тобто A2.4 — явно заплановане
заповнення цього None, не no-op.

ФАКТ (нема double-draw): StaffEdgesView `StaffEdgesView.ts:55-106` — ЧИСТИЙ painter над
segments; admin малюється з seg.points (76), endsOnDeptTop → entry-dot (92,105) замість arrow (87).
Другого рендерера admin-конекторів НЕМА. Ploeg/row-tree лише ПОЗИЦІОНУЄ вузли; у Rust block.edges
стають роутованим набором, не окремо-мальованим деревом. → «подвійне малювання» — МІЙ хибопрочит,
НЕ транзитивний і НЕ кінцевий стан. R2 знято.

ФАКТ (A2.4 = передумова A4): orchestration `_r7-orchestration-dg26.md:29` — «A4: StaffEdgesView/
svgExport читають points+ends_on_dept_top (фарба лишається TS)»; :25 — «A2 … deptTop синтет-порт
+ ends_on_dept_top»; :9 — Rust володіє портами «низ картки, deptTop-рамки». Отже після A4 TS-
роутинг (resolveStaffRouting/buildStaffEdgeSegments) ВИДАЛЯЄТЬСЯ, painter читає Rust-routes. Без
A2.4 ends_on_dept_top=None для всіх admin → cross-dept-into-head докається на КАРТКУ + малює
СТРІЛКУ замість entry-кружечка = візуальна регресія проти поточного TS. A2.4 робить A4 lossless.

ФАКТ (що РЕАЛЬНО бракує, не «емісія»): emisія admin ВЖЕ є (929/960/1022). Бракує:
- per-dept голови в Rust. RouteInputs (staff_layout.rs:1147-1154) несе department_frames=FrameRect
  БЕЗ head_id/reportLines. FrameRect staff_geom.rs:157-164 і StaffDepartmentFrameGeo types.rs:488
  без head. staff_routes НЕ може дізнатись голову відділу. TS бере з resolveDeptHeads(reportLines)
  + гейт memberIds.has(headId) staffRouterV2.ts:76. → порт resolveDeptHeads у Rust + прокид
  dept→head у RouteInputs (або head_id у FrameRect).
- exempt `!memberIds.has(from)`: Rust має member_of(id)→DeptPart (staff_geom.rs) — порівняння
  DeptPart достатнє.
- синт-порт: route до {to.cx-1, frame.y, 2×2} зі ЗБЕРЕЖЕНИМ to.id; resolve_box (staff_routes.rs:515)
  повертає EdgeRect — треба синт-EdgeRect з реальним id (obstacle-skip/foreign-frame keyять на id).
- ends_on_dept_top=Some(true) лише при hit.

РІШЕННЯ: ВЕРДИКТ переглянуто 🔴→🟡. A2.4 ДОСЯЖНА і є ПЕРЕДУМОВОЮ A4. Блокери зняті (R1/R2),
лишаються real-пастки R3(head)/R5(синт-id)/R6(ладдер×2px)/R7(head внутрішній)/R8(golden-верифікація).
