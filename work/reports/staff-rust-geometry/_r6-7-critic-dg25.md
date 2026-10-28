claude-opus-4-8

# Критик на пастки — T126 R6-7 (ярусні плінки + deptTop head-target порт)

ДАЛІ: читаю заземлення — staffEdgeGeometry.ts (union kind, classify, buildSegments), canvasLayout.ts (ребра 245/249), StaffEdgesView.ts (стилі/акцент/стрілка/dashed), staffRouterV2.ts (routing-seam), svgExport.ts (per-kind малювання), staff_routes.rs/types.rs (kind=String), spec-ноти §8/§3.2.

## Крок 1 — заземлення прочитано

ФАКТ: `staffEdgeGeometry.ts:55` union kind `'admin'|'matrix'|'dotted'|'cross-tier'`; `:367` cross-tier гілка (prefer vertical drop); `:433` buildStaffEdgeSegments(edges, boxes, frames) — НЕ знає про head депу, лише memberIds у frames.
ФАКТ: `StaffEdgesView.ts:19-31` STROKE_LIGHT/DARK мають ключ 'cross-tier'; `:50-55` staffEdgeStrokes теж будує 'cross-tier'; `:117` accent лише admin|cross-tier; `:122` withArrow лише admin|cross-tier; `:123` dash з таблиці.
ФАКТ: `staffRouterV2.ts:49-80` єдиний seam; deptFrames мають {deptId, rect, memberIds} — БЕЗ head.
ФАКТ: `svgExport.ts:296-320` SVG малює ВСІ staff-ребра одним EDGE_STROKE/EDGE_W, БЕЗ per-kind кольору й БЕЗ dash; arrow лише для admin|cross-tier (:302). Тобто SVG вже НЕ тримає паритет стилю (колір/штрих) для matrix/dotted — паритет R6-6 = лише ТОЧКИ.
ФАКТ: cross-tier вживається поза scope: типи `layout/staff/types.ts:154`, Rust `types.rs:336/511` + тест `staff_routes.rs:492/505`, generated `rust-types.ts:41/46`, тести `staffLayout.test.ts:285`, `staffEdgeGeometry.test.ts:119-122`, `staffEdgeStrokes.test.ts:16` (figma['cross-tier']=0xa6a6a6), `mockupEdgeInventory.test.ts:7/40`, `staffEdgeFallbackCensus.test.ts`, `svgExport.parity.test.ts:97`, golden `staff-geometry.json` (сотні входжень).

## Крок 2 — підтверджені факти для пасток
ФАКТ: `resolveHead.ts:48-53` resolveStaffHead фільтрує по organizationId — голова ОРГ, НЕ депу. Поняття head(dept) у SDK немає.
ФАКТ: `staffEdgeGeometry.ts:25-29` StaffEdgeFrame = {deptId, rect, memberIds} — без headId.
ФАКТ: `staffRouterV2.ts:19-34` StaffRoutingInput НЕ має reportLines; frames будуються з memberBoxesByDept (лише departmentId-членство).
ФАКТ: `staffLiveGeometry.ts:87` reportLines доступні в caller; `svgExport` має DiagramData.reportLines — обидва МОЖУТЬ передати, але seam треба розширити (інакше H3-розрив).
ФАКТ: prod-маршрутизація = TS seam (staffLiveGeometry + svgExport → resolveStaffRouting). Rust staff_routes НЕ на prod-шляху; `:303` kind clone, без kind-гілки → Rust kind-агностичний. Rust-тест `:489-508` і доки `types.rs:336/511` з "cross-tier" стають сиротами (не ламаються).
ФАКТ: `svgExport.ts:296-320` SVG малює всі staff-ребра одним EDGE_STROKE/EDGE_W, без dash/per-kind color; arrow лише admin|cross-tier (:302). matrix/dotted вже НЕ мають стиль-паритету в SVG.
ФАКТ: golden `staffGeometry.golden.test.ts` сортує edges byLink з kind.localeCompare → rename міняє і значення, і ПОРЯДОК ('c'<'l') у сотнях записів.
ФАКТ: dept може мати кілька коренів (spec-нота :70-72) — head=roots[0], решта → у картку; вибір roots[0] мусить бути детермінованим (H6).
ФАКТ: StaffEdgesView не рендерить текст-мітки ребер — "порожня мітка" = no-op.
