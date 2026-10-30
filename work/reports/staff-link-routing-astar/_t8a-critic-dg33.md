# T8(A) критик-перед (R6) — dg33

Модель: claude-opus-4-8

ДАЛІ: читаю staff_layout.rs:1150-1282, staff_routes.rs (detour+test-harness), staff_router.rs (route_scene/EdgeSpec/astar), staff_edge_box.rs, staff_geom obstacle_rect, golden-тест.

## ФАКТИ (path:line)
- Прод call-site: staff_layout.rs:1260 `staff_routes(&RouteInputs{...})`; dims на :1165 (до :1260 — доступні). nodes/org_cards/edges/frames_rect/person_hints/card_pad усі сформовані до :1260.
- detour build боксів: staff_routes.rs:205-224 `resolve_box` → `visual_person_edge_box(...lod,hint)` / `visual_org_edge_box`. Obstacle-set: build_card_set :236-258 = **persons+orgs** через obstacle_rect.
- route_scene (staff_router.rs:909-999): бере `cards:&[EdgeRect]`, повертає `Vec<AStarRoute>` **в INPUT-порядку** (:935,:996). EdgeSpec БЕЗ kind (:769). AStarRoute{points,failed} (:522).
- Grid seeds (build_corridor_grid :419-432): card centre cx=`obstacle_rect.x+w/2` (:422), cx+SX (:423), card top/bottom = obstacle_rect y / y+h (:425-426), frame.y (:429). ⇒ порти мусять лежати на obstacle_rect боксу, інакше xi/yi=None → **best_effort (failed=true)** (astar_route :1026).
- Test-harness astar_schema_stats (staff_routes.rs:1862-1910): boxes=`near_boxes` = **near, NO hints, NO org** (:1868,911-916); start=`(m.x+m.width/2, m.y+m.height)` **RAW NODE** (:1887); target=`(cx[+SX], c.y)` (:1888); zip по index :1895-1906; member=schema_member. edge_is_secondary/admin_reaches — у TEST-модулі (:1827-1858), лише admin (:1851).
- obstacle_rect (staff_geom.rs:112): figma-row → `b.obstacle` (ВЕСЬ рядок), інакше бокс. ⇒ під figma-row cx/bottom боксу-tile ≠ cx/bottom obstacle_rect.
- Golden (staffGeometry.golden.test.ts): LODS=**near/mid/far** (3 compute-виклики на таб); знімок містить routes.points, **marked, endsOnDeptTop**; **diagnostics — НЕМА** (grep=0).
- route_scene/EdgeSpec/AStarRoute/RouteStats — звичайні pub-структури, БЕЗ wasm_bindgen/serde. StaffEdgeRoute (серіалізований контракт) НЕ міняється.

## РІШЕННЯ по 8 пунктах — див. фінальний звіт (handback).
