claude-opus-4-8

# Критик R6-3a (інтеграція маршрутів + оракул обходу) — Dg22, незалежний

ДАЛІ: прочитати дизайн R6-3, staff_routes.rs, staff_edge_box.rs (готово), clearance.ts,
edgeIntrudesForeignFrame, types.rs, staff_bounds.rs, visualEdgeBox.ts.

## ФАКТИ (path:line)

- staff_routes lookup лише по nodes: staff_routes.rs:62 `nodes.iter().find(|n| n.id == id)`.
  Org-cards не знаходить → HOLE-2 реальна.
- Org-card ідентифікується `org_id`, НЕ `id`: types.rs:458. У StaffEdge лише from_id/to_id
  (types.rs:519-523). Отже ребро person→org-card цілиться по org_id — припущення треба підтвердити.
- StaffDepartmentFrameGeo НЕ має memberIds: types.rs:476-487 (лише department_id, part_index, xywh).
  TS edgeIntrudesForeignFrame вимагає `frame.memberIds.has(from.id)`: staffEdgeGeometry.ts:251-252.
  → членство в Rust треба ВИВОДИТИ з StaffNodeGeo.department_id (types.rs:439). Найбільша діра порту.
- throughThirdFrame (clearance.ts:116-134) бере `deptOfNode` callback + `frame.id`; part_index
  розрізаного відділу (types.rs:479) дає кілька рамок з тим самим department_id — неоднозначність
  «чужа рамка».
- clearance.ts — THROWAWAY probe (заголовок :1 «⚠️ THROWAWAY probe scaffold»), НЕ прод.
  edgeIntrudesForeignFrame — прод (staffEdgeGeometry.ts:244).
- Оракул перетинів у staff_routes вже test-only (#[cfg(test)], staff_routes.rs:84-172) — прецедент.
- `.dn`/label-band НЕ окремий rect: staff_bounds.rs:50-53 вкладає label_band у y/height. Після
  enrich (staff_bounds.rs:143-151) StaffNamespace несе лише xywh — значення label_band втрачене,
  відновити з namespace неможливо.
- figma-row visual box має obstacle=весь рядок: staff_edge_box.rs:133-138 / visualEdgeBox.ts:45.
  TS obstacle-index бере `(b.obstacle ?? b)`: staffEdgeGeometry.ts:290-291. clearance.ts НЕ знає
  про obstacle → наївний порт cardClearance пропустить семантику obstacle.
- cardClearance self-exemption по id: clearance.ts:103 `node.id===edge.fromId||toId`. Потрібен
  єдиний id-простір person.id / org_id, інакше хибні violations на власних кінцях.
- hints продюсер — TS staffEdgeBoxForPosition (visualEdgeBox.ts:52-93) через
  resolveGojsRowLayoutMetrics/figmaRowAvatar (theme+position). Доставка — R7.

## ВЕРДИКТИ по питаннях — див. SubagentHandback (фінал).
