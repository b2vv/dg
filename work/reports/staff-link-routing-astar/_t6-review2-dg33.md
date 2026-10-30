claude-opus-4-8

ДАЛІ: читаю staff_router.rs (route_stats_detailed, route_edges_ripup, рефактор, 3 тести), lib.rs re-export, еталон mock2/shps-links.js :158-172, tasks.md:27.

## ФАКТИ (звірено з кодом)

ЗАПУСК: `cargo test staff_router` 26/26 ok; `ac10_all_schemas_zero_violations` ok; clippy чисто; fmt чисто (exit 0).

### П.1 route_stats_detailed = одна істина
- `route_stats` :163 = `route_stats_detailed(...).0`. ✓ одна істина, не розійтись.
- bad-семантика: cross :187-191 → bad[i]+bad[j] (обидва); overlap :194-198 → bad[i]+bad[j] (обидва, з !same_manager); card through :211-215 → bad[idx]; near :220-223 → bad[idx]; frame :228-234 → bad[idx] при n>0. Паритет мокап :166-170. ✓
- індекси = у масив routes; bad = bool-vec→filter_map :236-240 → автоматично відсортовано ↑ й унікально (кожен idx раз). Сильніше за мокап-Set. ✓
- cross не скіпає same_manager (геом-ексемпт proper_cross) — документовано :16-22, тести sibling_bus/straight_through. Відхилення від мокап :165 свідоме, з T1, не крок2.

### П.2 route_edges_ripup vs :158
- single_pass :855, потім `for pass in 0..4` :856 (≤4); detailed→bad :862; empty→break :863-865; reverse на непарних `pass%2==1` :866-868 (паритет мокап); для bad: release(СТАРИХ routes[idx].points, from_id) :871 → astar(з поточним occ) :872 → occupy новий :875 → routes[idx]=r :876. ✓
- release САМЕ старих точок ПЕРЕД re-route — так (routes[idx] перезаписується лише :876). occ-симетрія ✓, не протікає. best-effort (off-grid) occupy/release = noop (edit_occupancy скіп :730-733/:742-745) — симетрично. Весь AStarRoute замінюється → жодного stale fail-флага (мокап робив e.fail=0 вручну). ✓

### П.3 детермінізм
- 4 проходи фіксовано; bad відсортований bool-vec; reverse-парність від pass; astar seq-tiebreak :629-634. Жодної ітерації по HashMap у вихідній логіці (лише keyed get/entry). Тест ripup_is_deterministic ✓.

### П.4 best-effort чесність
- doc :841-845 прямо каже «does not guarantee zero (a residual stays marked)». Тест ripup_clears асертить cross==0 ЛИШЕ на weave-сцені :1927, не загальна гарантія. ✓

### П.5 тести зубаті
- ripup_clears: контроль single-pass cross>=1 :1921-1924 РЕАЛЬНИЙ (тест зелений), ripup cross==0 :1927, !failed :1932. Не вакуум. ✓
- noop-on-clean: flat(a)==flat(single) + flat(a)==flat(b). АЛЕ сцена = ОДНЕ ребро :1942 → bad завжди порожнє (нема пар) → break на pass 0 тривіально. Слабкий тест noop (не 2 неперетинні ребра). Minor.
- route_stats_detailed_flags_both: bad==vec![0,1] :1964. ✓

### П.6 рефактор без регресу
- route_edges :780-789 = single_pass(default occ). routing_order :793-804 = secondary→start.1→start.0→index (мокап :156 по manager card y/x; start монотонний до card; + явний index-tiebreak сильніший за JS). Існуючі T5-тести зелені → без регресу. ✓

### П.7 перф/термінація
- 4×(O(E²·seg) детектор + re-route), фіксовано, без нескінченного циклу. clippy/fmt чисто. re-export lib.rs :33-37 без ForTests (той гейт — для SDK barrel, не Rust). ✓

## 🔴 ГОЛОВНА ЗНАХІДКА (блокер T6-критерію)
- Акцептанс-гейт `ac10_all_schemas_zero_violations` (staff_routes.rs:1915) викликає `astar_schema_stats` :1861, яка на :1894 використовує **route_edges (single-pass)**, НЕ route_edges_ripup.
- `route_edges_ripup` викликається ЛИШЕ у власних 2 unit-тестах (grep: staff_router.rs:1926/1949/1950). Жодного продакшн/гейт-виклику.
- tasks.md:27 критерій T6 = «rows 5,7,8 → 0/0/0/0/0». Гейт AC10 зелений, але досягає нуля БЕЗ rip-up — через крок1 (secondary-порт) + single-pass. Отже код крок2 (rip-up) акцептанс-схемами §10.1 НЕ покритий; регрес rip-up НЕ впаде на AC10.
- Мокап: rip-up :158 — ЧАСТИНА route()-пайплайна ПЕРЕД `return [...det,...ast]` :159. Тобто вірний Rust-еквівалент route() мав би включати rip-up. Коментар гейту :1912-1913 заявляє «routed through the A* pipeline (T6)», але маршрутизує single-pass (до-T6).
- Фікс дешевий і безпечний: astar_schema_stats :1894 має кликати route_edges_ripup (на чистих схемах ripup = noop → AC10 лишиться зеленим), тоді гейт реально вправляє крок2.

ВЕРДИКТ: ПОВЕРНУТИ — rip-up коректний і детермінований як примітив, але не під'єднаний до свого акцептанс-критерію; гейт T6 проходить без нього. + minor: noop-тест на 1 ребрі тривіальний.
