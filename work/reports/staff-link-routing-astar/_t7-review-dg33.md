claude-opus-4-8

ДАЛІ: читаю staff_router.rs (route_scene, is_internal), staff_routes.rs (route_ortho pub(crate), новий тест, харнес), lib.rs re-export, мокап shps-links.js для звірки класифікації/occupy/rip-up.

ФАКТ (прогони): cargo test = 182 passed / 0 failed / 0 ignored; clippy -D warnings чисто; fmt --check чисто. staff_r-підмножина 66 passed, у т.ч. ac10_all_schemas_zero_violations і t7_internal_tree_edges_are_ortho_elbows. AC10-гейт більше НЕ #[ignore] (харнес жене route_scene).

ФАКТ (1 класифікація): is_internal (staff_router.rs:888-893) = обидва member_of Some && рівні повні (dept,part) (`a==b` по DeptPart=(String,Option<u32>)). route_scene:912-915 `!e.secondary && is_internal(...)` → secondary ніколи int ✓. from None → _=>false → A* ✓. S3: m(A)→ca(A) int, m(A)→cb(B) cross ✓. S6 ceo(None)→* → None → A* ✓. S8 m(A)→cb(B) cross ✓. Жодне ext не int.
ВАЖЛИВО: у 9 AC10-схемах лише S3 має 1 int-ребро (S1/S2 мають dept=None через node() → НЕ int, ідуть A*). Підтверджує переобрамлення; t7-тест із явним dept «A» закриває розрив покриття.

ФАКТ (2 int-елбоу REUSE): route_scene:933-944 кличе route_ortho(fc,tc) (staff_routes.rs:72-77, corridor=midY), points=елбоу не A*. Дитина=card-top (deptTop-докінг у route_scene не застосовується; він лише для крос-dept, а int=той самий dept) ✓.

ФАКТ (3 occupy+bus_ys ЧИСЛОВИЙ ЗБІГ): bus_ys push (fc.y+fc.height+tc.y)/2 (:923) == route_ortho corridor (:75) байт-у-байт. build_corridor_grid:430-432 ys.push(quant(by)); line_key(quant(by))=round(by*2)=line_key(corridor). occupy→edit_occupancy→grid.yi(corridor) РЕЗОЛВИТЬСЯ ✓. Торці трунка/коридора всі на грід-лініях (card bottom :426, card top :425, cx :420-423, bus :430). Отже int-шина РЕАЛЬНО occupied → A* бачить foreign і уникає. Overlap мовчазного пропуску occupy НЕМАЄ.

ФАКТ (4 rip-up тримає int FIXED): :968 filter(!is_int[i]). Int ніколи не re-route. Межа задокументована в коментарі route_scene:900-902 «internal elbows are clean by construction and never re-routed». Якщо int-елбоу став би bad і нема bad cross/ext → bad_ce порожнє → break → AC10 red (немає graceful). Для S3+t7 int чистий. НЕ-блокер (документована межа; поточні фікстури чисті).

ФАКТ (5 AC10): ac10_all_schemas_zero_violations проходить = 0/0/0/0/0 + diag 0 + !failed на 10 сценах через route_scene.

ФАКТ (6 t7 зубатий): порівнює got==route_ortho(find(from),find(to)) повним (f32,f32)-вектором. Зубатість РЕАЛЬНА: A* на цій сцені (нема перешкод між m і дітьми в рідній рамці) має рівновартісні шляхи з поворотом на БУДЬ-ЯКОМУ y∈(50,260), tie-break за h → поверне рано (y≈58), НЕ на corridor=155 → відрізнявся б від route_ortho. Отже тест доводить int-шлях, не вакуум. 2 int одного m: shared trunk overlap-exempt (same from_id), junction crossing-exempt (вершина) → route_stats==0 підтверджено.

ФАКТ (7 регрес/детермінізм): route_edges/route_edges_ripup тести живі (route_edges_single_pass_separates_two_managers, ripup_clears_a_crossing_that_single_pass_leaves, + детермінізм :2067-2068). routing_order:947-950 filter(routes[i].is_none()) зберігає відн. порядок решти + secondary останнім. h6 byte-identical і avoidance_is_deterministic проходять (AC8). 4 проходи rip-up фіксовано (термінація).

ФАКТ (8 дивергенції): org→root ext лишається A* — is_internal doc 883-887 + route_scene коментар. int=(dept,part) повний ключ (критик B2) — is_internal doc 883-887. Обидві в коментарях, не мовчазні.

ФАКТ (latent, НЕ-блокер): is_int-ребро з ненайденою карткою → routes[i]=None → phase2 ce_order підхопить і прожене A*, але rip-up усе одно трактує як int (fixed). Недосяжно by construction: int вимагає обидва кінці dept-persons = у cards, тож find не падає. Паніки/дропу нема.

ФАКТ (re-export): lib.rs:33-37 route_scene експортовано. B1 (route_ortho pub(crate) staff_routes.rs:71) — REUSE в одному крейті, нема циклу ✓.

РІШЕННЯ: блокерів немає. Код і тести відповідають мандату T7; обидва критик-блокери (B1 REUSE, B2 повний ключ) закриті в коді; числовий збіг occupy↔route_ortho перевірено; AC10 збережено; t7-тест зубатий. Три НЕ-блокери (документована межа «int clean by construction», неявна зубатість t7, latent find-asymmetry недосяжна).

ВЕРДИКТ: ПРИЙНЯТИ.
