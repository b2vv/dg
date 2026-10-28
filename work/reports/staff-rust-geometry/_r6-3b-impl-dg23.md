# R6-3b імплементація (жива нота, Dg23) — обхід карток локальним детуром

Критик YELLOW→дизайн із 4 пінами; власник підтвердив **локальний детур, НЕ grid-A***.
Цикл: критик ✅ → TDD red-first (тут) → ревʼю-агент → гейти → коміт з «го».

ДАЛІ: промоут спільних геопримітивів у прод (staff_geom), рефактор staff_clearance на них, детур у staff_routes.

## ПІНИ (критик, обов'язкові)
- PIN-1: метод = ЛОКАЛЬНИЙ пер-ребро корид-детур (compute R6-3a → check per-LOD card-set через
  СПІЛЬНИЙ obstacle_rect/seg_rect_distance → scan детермінованих corridorY-доріжок при pad≥8 →
  no-lane: лишити R6-3a-маршрут як залишок R6-4). НЕ grid-A*, НЕ треки, НЕ рамки.
- PIN-2: чесний оракул — card_clearance 1→0 на фікстурі з РОЗВ'ЯЗНИМ блоком + контроль «чиста фікстура
  байт-ідентична R6-3a» + no-lane фікстура явно → R6-4 (НЕ асерт 0). foreign_frame поза scope.
- PIN-3: білдер = ЛИШЕ картки (per-LOD visual_*_edge_box + figma obstacle через СПІЛЬНИЙ obstacle_rect),
  детермінований порядок; FrameRect/`.dn` → R6-4.
- PIN-4: контракт заморожений (StaffRouteSet незмінний, без regen); детур лише подовжує points;
  near first-class; байт-ідентичність 2 прогони; CARD_PAD ≥ MIN_CLEARANCE_PX (assert-інваріант).

## Архітектура (щоб не було «двох правд» — PIN-3)
- **НОВИЙ прод-модуль `staff_geom.rs`:** seg_rect_distance + помічники (point_seg_dist/orient/on_seg/
  seg_seg_*/point_in_rect) + obstacle_rect(EdgeRect)+ORIENT_EPS. Прод (не cfg(test)).
- **Рефактор `staff_clearance.rs`:** прибрати перенесені примітиви, імпортувати з staff_geom
  (оракул і детур діляться ОДНИМ seg_rect_distance/obstacle_rect). Лишається test-only: interior-hit
  (sampling), card_clearance, foreign_frame_intrusions, FrameRect, MIN_CLEARANCE_PX/INTERIOR_EPS.
- **`staff_routes.rs`:** RouteInputs += `card_pad: f32` (0 = вимкнено, паритет R6-3a). Білдер card-set
  (усі persons+orgs per-LOD боксі). Детур пост-route_ortho: якщо card_pad>0 і лег блокує картку
  (seg_rect_distance<card_pad, крім from/to), сканувати corridorY-доріжки (card.y-pad / card.y+h+pad),
  сорт за |Δ| (нічия→вгору), перша чиста. Нема чистої → лишити базовий (залишок R6-4).

## Журнал
- (старт) дизайн+піни зафіксовано; план рефактора готовий.
- **staff_geom.rs** створено (прод): seg_rect_distance+помічники+obstacle_rect+ORIENT_EPS, 3 тести.
- **staff_clearance.rs** рефакторено: примітиви прибрано, імпорт із staff_geom (ОДНЕ джерело, PIN-3);
  лишилось test-only — interior-hit(sampling)/card_clearance/foreign_frame/FrameRect. Тести зелені.
- **staff_routes.rs**: RouteInputs += card_pad (0=вимк=паритет R6-3a); build_card_set (persons+orgs
  per-LOD, PIN-3); detour_edge — route_ortho→route_clear_of→scan corridorY-доріжок(над/під карткою,
  сорт |Δ| нічия-вгору, дедуп)→no-lane:базовий залишок R6-4 (PIN-1); MIN_CARD_PAD=8 debug_assert (PIN-4).
  14 тестів: R6-3a (card_pad=0) + 4 R6-3b — byte-ident коли чисто, детур 1→0 на розв'язному блоці
  (МУТАЦІЯ детур-off → падає, вивірено), нерозв'язний→залишок+violations>0 (0 НЕ заявляємо, PIN-2),
  детермінізм 2 прогони.
- Гейти: **89/89, fmt, clippy -D warnings** (warnings staff_geom зникли — детур споживає в прод).
- ДАЛІ: ревʼю-агент → коміт з «го».
