# R6-3b критик (Dg23) — card-avoidance + obstacle-builder

Модель: claude-opus-4-8

ДАЛІ: читаю staff_routes.rs, staff_edge_box.rs, staff_clearance.rs, probe-файли, design-v3 §5/§12, probe-results, _r6-boundary-dg22, _r6-missed-points-analysis-dg23.

ФАКТ (крок 1 — читання коду):
- staff_routes.rs: route_ortho — bottom→corridorY→top, елбоу 4 точки або пряма 2т (STRAIGHT_EPS 0.5). resolve_box precedence person→org. Жодного avoidance. corridor = середина (from.y+from.h+to.y)/2.
- staff_edge_box.rs: EdgeRect{obstacle:Option<Rect>}; figma-row дає obstacle=весь рядок; person per-LOD shrink (mid-band/far-dot); org far=chip36.
- staff_clearance.rs (#[cfg(test)]): seg_rect_distance ТОЧНА; card_clearance self-exempt по id; foreign_frame_intrusions interior-eps 0.75; obstacle_rect розгортає figma obstacle. MIN_CLEARANCE_PX=8.
- missed-points: власник вирішив org-лінки/колапс = R6-7 (плінк); cross-tier drop крізь dept-рамки (M4) — tier-рівень, R6-7. Детектор прийнято.
ДАЛІ: probeA, clearance/crossingDetector probe, design-v3 §5/§12, probe-results.

ФАКТ (крок 2):
- probeA.constructive.ts: routeOrtho (:160) наївний БЕЗ avoidance (його слабкість, probe-results:31-36); інтер-dept track-алокатор (:181-196, §5.4 доріжки) + §12 markCrossingEdges (:208). Трек-алокація = ПЕР-РЕБРО-координація по x цілі.
- probe-results: A обрано; слабкість A = «добудувати obstacle-avoidance на НАЯВНИХ примітивах (polylineHitsBoxInterior + bounded §5)», НЕ глобальний grid. B(ELK)=глобальний роутер, відхилено (перф, deps).
- design-v3 §Поза межами:160-163: v3 СВІДОМО НЕ відтворює коридор/track spec §5.4 — замість нього frame-around-lane + §12-маркер. Повернення коридору — ОКРЕМИЙ крок, якщо потрібно.
- мокап route(): ГЛОБАЛЬНИЙ grid-A* над усіма стінами+коридорами+картками РАЗОМ, фолбек елбоу. Тобто це §5-коридор+§12 в одному — тягне R6-4/R6-7.

ВИСНОВОК (див. фінальний вердикт у хендбеку): метод = ЛОКАЛЬНИЙ пер-ребро детур lane, НЕ grid-A*. Білдер — лише картки. Claim вузький. Вердикт старту YELLOW (2 блокуючі дизайн-піни).
