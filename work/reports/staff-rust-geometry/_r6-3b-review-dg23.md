# R6-3b незалежне ревʼю (Dg23)

Модель: claude-opus-4-8

ДАЛІ: читаю три файли зрізу (staff_geom.rs — новий, staff_clearance.rs — рефактор, staff_routes.rs — детур) + lib.rs; потім git diff проти точки R6-3a (7c72b71) для рефактора та детуру.

## ФАКТИ (перевірено проти коду)

1. РЕФАКТОР staff_clearance — поведінково-ідентичний. Усі примітиви (clampf, hypot, point_seg_dist, orient, on_seg, seg_seg_intersect, seg_seg_dist, point_in_rect, seg_rect_distance, obstacle_rect) ПЕРЕНЕСЕНІ у staff_geom.rs ВЕРБАТИМ (git diff — рядки лише видалені тут, додані там; тіла збігаються). ORIENT_EPS тепер pub у staff_geom:11, імпортується. Дублю нема: staff_clearance:12 `use staff_geom::{obstacle_rect, seg_rect_distance}`. Детектор-тести ті самі (2 seg_rect_distance-тести переїхали в staff_geom, лише імпорт змінився). ЄДИНЕ джерело підтверджено.

2. ДЕТУР коректний. self-exempt staff_routes:~176 `filter(|c| c.id != from_id && c.id != to_id)`. Кандидати ry-pad / ry+rh+pad. Сорт: dedup по зростанню значення → re-sort за |Δ corr0| з tiebreak `.then(a.partial_cmp(b))` (нічия→менший y=вгору) — тотальний, детермінований. Перевірка route_clear_of проти ПОВНОГО self-exempt obstacles-set (не лише блокера). Пряма-вертикаль (|ax-bx|<0.5) і no-lane → base (залишок R6-4).

3. ПАРИТЕТ. card_pad<=0 → avoid=false → route_ortho напряму (чистий R6-3a). card_pad>0 без блоку → route_clear_of(base) true → повертає base. elbow_or_straight дає байт-ідентичний вихід старому route_ortho (ay=from.y+h=port.y, by=to.y=port.y). Тест avoidance_is_byte_identical_when_no_card_blocks підтверджує.

4. per-LOD. build_card_set будується на input.lod (staff_routes build_card_set param), figma obstacle через СПІЛЬНИЙ obstacle_rect у route_clear_of і в lane-генерації.

5. ЧЕСНІСТЬ (PIN-2). no-lane тест avoidance_leaves_unresolvable_block_as_remnant асертить violations>0 (НЕ 0) + base незмінний. Розв'язний: 1→0. foreign_frame поза scope R6-3b. 0 глобально не заявляється.

6. f32-ДЕТЕРМІНІЗМ. partial_cmp().unwrap() безпечний: lane-значення = ry±pad±rh з геометрії вузлів (скінченні), corr0 скінченний, NaN не виникає. Сорт тотальний/стабільний.

7. У ЧУЖУ картку завести не може: кандидат валідується route_clear_of проти ВСЬОГО self-exempt set → lane, що кліпає іншу картку, відкидається. edge-edge між незалежними детурами НЕ розв'язується — ВИЗНАНО в модуль-докстрингу staff_routes та критику.

8. КОНТРАКТ/regen. StaffRouteSet (вихід) незмінний. RouteInputs отримав поле card_pad, але RouteInputs/staff_routes НЕ обгорнуті в #[wasm_bindgen] (єдиний wasm-експорт — computeOrgRowTreeLayout); js-boundary не ламається, regen не потрібен. debug_assert інваріант card_pad>=MIN_CARD_PAD(8) або <=0. Гейт-паритет: card_clearance violations коли d<MIN_CLEARANCE_PX(8); детур відкидає d<pad(>=8) → прийнятий маршрут d>=8 → детектор 0 порушень. Інваріант тримає.

NIT (не блокер): docstring detour_edge «над і під кожною блокуючою карткою» — насправді код генерує lanes для ВСІХ non-self карток (не лише блокуючих). Нешкідливо (більше кандидатів, усі валідуються), лише неточність коментаря.

## ВЕРДИКТ: GREEN. R6-3b можна комітити. 4 піни критика РЕАЛЬНО виконані. Єдина знахідка — NIT у коментарі, не блокуюча.
