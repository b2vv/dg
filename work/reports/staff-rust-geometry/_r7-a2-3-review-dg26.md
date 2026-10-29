# R7 A2.3 (переосмислений) — незалежне рев'ю (Dg26, R6/R7 after-step)

Model ID: claude-opus-4-8

ДАЛІ: читаю повний diff staff_routes.rs (від e887a70), сам файл, оракул staffEdgeGeometry.ts (verticalPolyline :129-175, ladder :384-401). Паралельно — git diff.

## ФАКТИ (звірка з кодом і оракулом)

1. route_vertical порт (staff_routes.rs:98-120 vs staffEdgeGeometry.ts:129-175)
   - child_below = to_cy>=from_cy, tie→below: :103 == оракул :134 ✓
   - childBelow порти from.bottom→to.top (:105) == оракул :137-138 ✓
   - childAbove порти from.top→to.bottom (:107) == оракул :157-158 ✓
   - gap-знаки АСИМЕТРИЧНІ: childBelow y1<=y2-eps (:111) = !(оракул :139 y1>y2-0.5); childAbove y2<=y1-eps (:113) = !(оракул :159 y2>y1-0.5). Межа (==) збігається ✓
   - None при !gap (:115-117) == оракул return null ✓
   - corr=(y1+y2)/2 (:118) == оракул midY (:148,:168) ✓
   - elbow_or_straight (:79-91): straight при |Δx|<STRAIGHT_EPS, інакше 4-точк. елбоу через corr == оракул :142/:162 ✓
   - STRAIGHT_EPS=0.5 (:42) == оракул 0.5 ✓

2. childBelow+gap ≡ route_ortho байт-у-байт — ДОВЕДЕНО:
   route_ortho (:71-76): a=(from.cx, from.y+h), b=(to.cx, to.y), corridor=(from.y+h+to.y)/2.
   route_vertical childBelow: y1=from.y+h, y2=to.y, from_cx/to_cx = ті самі центри, corr=(y1+y2)/2==corridor.
   → elbow_or_straight викликається з ІДЕНТИЧНИМИ аргументами → ідентичний вивід.
   УТОЧНЕННЯ: тотожність строго за УМОВИ gap. childBelow БЕЗ gap: ortho=Some(зуби), vertical=None —
   це свідома oracle-faithful зміна (вироджені no-gap), власником прийнята. Коментар автора (:97)
   точний: заявляє саме «childBelow+gap». Не прихована регресія. lead-org/childBelow matrix норм.
   drop (ціль нижче+зазор) → ідентично A2.2. ✓

3. Ладдер swap (:558-564): V-кандидат=route_vertical(nullable), lazy через or_else.
   prefer→clean_horizontal().or_else(clean_vertical); else→clean_vertical().or_else(clean_horizontal).
   Перший ЧИСТИЙ виграє (filter(is_clean) до or_else) == оракул ітерація :397-401 ✓.
   V=None(no-gap) → or_else пробує H; H теж None → chosen=None → detour (:567-578) ✓.
   Лінивість: невикористаний кандидат (другий) не викликається, Vec не алокує ✓.
   FnOnce-рух closures у обох гілках if/else — компілюється (cargo clean build EXIT=0).

4. route_ortho ТІЛЬКИ у detour_edge (:424) + non-avoid (:582); route_vertical ТІЛЬКИ ладдер (:558).
   Grep-підтверджено. detour-база й non-avoid НЕ змінені ✓.

5. childAbove фікс prod-досяжний — matrix_child_above_routes_vertical_upward (:1148-1164):
   F(0,300,100,50) cy=325, T(0,0,100,50) cy=25 вище, та сама колонка. matrix→preferH.
   H: goRight, clearGap fromRight(100)<=to.x(0)+0.5 → false → None. or_else V:
   childAbove, y1=300,y2=50, gap 50<=299.5 true, |Δx|=0→straight [(50,300),(50,50)] ✓.
   is_clean: лише F,T — обидва skip по id → clean → chosen. На A2.2 (route_ortho V) дало б
   [(50,350),(50,0)] (зуби). Арифметика вірна, тест реально ловить відсутність фічі (RED).

6. A2.2 тести вижили: admin_vertical_clean_stays_vertical, admin_vertical_blocked_horizontal_*,
   same_band_admin_flips, matrix_edge_prefers_horizontal — усі PASS, жоден не зламаний хибно.
   admin_vertical_clean (:1127) асертить childBelow V≡route_ortho — осмислений survivor.

7. §12-маркер (:586-592) рахується на `points` = ОБРАНИЙ маршрут (H/V/detour) ✓.

8. Assert-без-фічі: route_vertical_direction_and_nullable (:1166-1186) перевіряє (a) childBelow≡
   route_ortho — guard проти ненавмисної дивергенції, (b) childAbove напрям [(50,300),(50,50)],
   (c) no-gap→None. Усі три предикати нетривіальні. matrix_child_above — інтеграційний RED.
   Хибнозелених тестів не знайдено.

## ПРОГОНИ
- cargo test staff_routes: 32 passed, 0 failed.
- cargo clippy --all-targets -D warnings (fresh, touch+rebuild, без pipe): EXIT=0, 0 warnings.

## ВЕРДИКТ: 🟢 GREEN. Блокуючих знахідок немає.
Діри/нотатки (не блокуючі):
- Жодна. Твердження «childBelow≡route_ortho» коректно звужене автором до «+gap»; no-gap
  childBelow навмисно тепер None (oracle-faithful, власником схвалено). h6-golden не чіпався —
  наявні сцени не містять childAbove/no-gap, тож ширший golden не знадобився (не приховано).
