claude-opus-4-8

# R6 рев'ю-після: T7 гібрид (int-елбоу + A*-гнучка для брудних)

ДАЛІ: читаю staff_router.rs ~900-1050 (route_scene, rip-up), новий тест
ripup_bends_a_dirty_internal_elbow, та дотичні тести (t7_internal_tree_edges_are_ortho_elbows,
ac10, route_edges*). Потім git diff до попереднього коміту. Потім cargo test/clippy/fmt.

## ФАКТИ (перевірено)

- **Зміна (staff_router.rs 964-991):** rip-up прибрав `!is_int`-фільтр; тепер re-routить увесь
  `bad` із `route_stats_detailed`. Детектор (170-243) один для гейта і rip-up → узгоджено.
- **Чистий int не гнеться:** детектор не додає чистий елбоу в `bad` (0 порушень) → лишається
  `route_ortho`. Фаза 1 (937-948) кладе int-елбоу першими; `is_int` живий (916-919, 925, 938) —
  не dead-code.
- **release-симетрія (984):** `old` = та сама полілінія, що occupy в фазі 1; `release`/`occupy`
  через `edit_occupancy` симетричні (add true/false), owner = `e.from_id`. Коректно.
- **Новий тест ripup_bends_a_dirty_internal_elbow (2090-2127):** сцена m(0,0)/a(150,200)/b(400,400)
  усі dept A. route_ortho(m,b) = шина y=225 x[50,450] ріже a (y200-250, x150-250) → control-ассерт
  `polyline_hits_box_interior` НЕ вакуумний (y=225 всередині a без будь-якого паду). Фінал
  `route_stats==default` доводить, що A*-згин m→b дає чисту сцену.
- **RED-first (логічно):** старий код `bad_ce = bad.filter(!is_int)` → для цієї сцени bad=[1],
  is_int[1]=true → bad_ce порожній → break → m→b лишається колізійним елбоу → through_card=1 →
  фінал падав. Інверсія однорядкова, доказ airtight (емпірично не реверсив — заборона правок репо).
- **Регрес:** `t7_internal_tree_edges_are_ortho_elbows` OK (чисті сіблінги -150/150, y=155 нікого
  не ріже → bad порожній → точні елбоу). `ac10_all_schemas_zero_violations` OK (якщо int був би
  flagged, AC10 падав би й ДО зміни; reroute-all лише чистить bad, не псує чисте).
- **Детермінізм/термінація:** 4 фікс-проходи, reverse на непарних, astar seq-tie-break; більший
  `bad` не ламає детермінізм; int гнеться → стає чистим → не повертається; cap=4 обмежує будь-що.
- **Перф:** tidy → усі int чисті → 0 A* для int (t7 підтверджує точні елбоу); платять лише брудні.
  Відповідає рішенню власника (ВАР.1).
- **Doc:** коментар route_scene (898-907) і rip-up (964-967) оновлені — більше нема «never
  re-routed»; дивергенція від мокапу («mockup never bends det, relies on layout spacing»)
  зафіксована чесно.

## ПРОГОНИ
- cargo test: 183 passed, 0 failed (вкл. новий + t7 + ac10 + ripup_clears_a_crossing).
- cargo clippy --all-targets: чисто, 0 warnings.
- cargo fmt --check: чисто (exit 0).

## ДРІБНІ (non-blocking)
1. RED-first доведено міркуванням, не повторним прогоном старого коду (емпірика = заборона правок).
2. Нема окремого determinism-тесту саме для int-bend-гілки route_scene (AC8 покрито структурно +
   наявні determinism-тести route_edges/side_detour).
3. Коментар «a residual stays marked» — route_scene сам не ставить `marked` (to_staff_route →
   marked:None); маркування downstream. Фраза скопійована з route_edges_ripup, нешкідлива.

## ВЕРДИКТ: ПРИЙНЯТИ (гейт зелений, блокерів нема)
