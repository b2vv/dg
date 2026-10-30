# dg32 — незалежне рев'ю T1 (R6 ПІСЛЯ кроку): детектор route_stats + 9 фікстур

РОБОЧИЙ ФАЙЛ рецензента. Дописуй append. Перший запис — `ДАЛІ:`. Фінал = переказ + вердикт PASS/BLOCKED.

## Що рев'юємо (нове в T1, dg32)
- `packages/core/src/staff_router.rs` (НОВИЙ, прод): `RouteStats`, `route_stats()`, `diagonal_segments()`
  + 11 юніт-тестів.
- `packages/core/src/staff_routes.rs` tests (додано вкінці): type `SchemaScene`, `schema_member`,
  `schema_stats`, `schema_scenes()` (S0-S9), тести `clean_schemas_have_no_violations`,
  `detour_leaves_a_violation_on_the_hard_schemas`, `ac10_all_schemas_zero_violations` (#[ignore]).
- `packages/core/src/lib.rs`: `mod staff_router` + `pub use`.

## Контекст / що T1 мав зробити (tasks.md T1)
RED-first: детектор §10.4 (5 метрик) + 9 фікстур §10.1. Критик-перед-зрізом (`_dg32-T1-traps-critic-WORK.md`)
дав 3 блокери (B1 crossings-exemption, B2 позитивні тести, B4 near-vs-through) — усі заявлені закритими.
Під час impl проба виявила ще ваду: перше визначення crossing (спільна вершина обох полілі­ній) давало
ХИБНІ crossings на S2 (3-дітне дерево, прямий стовбур середньої дитини) → переписано на **власне перетин
= точка строго всередині ОБОХ сегментів** (T-стик гілки = вершина одного сегмента → не interior → не crossing).

## Твердження (перевір КОЖНЕ проти коду, не на слово)
1. 5 метрик: crossings (proper-interior H×V), overlaps (колінеарне >0 довжини, from_id-exempt),
   through_card (interior-hit), near_card (d<8 && !interior, self-exempt), through_foreign (reuse прод
   `frame_intrusion_count`). Жодного подвійного рахунку (edge,card) пари.
2. crossing-визначення коректне: T-стик (гілка→стовбур/шина) НЕ crossing; реальний X (interior-interior)
   рахується; straight-through стовбур сиблінга (S2) НЕ crossing. Чи немає сцени, де реальний перетин
   ХИБНО пропускається (proper-interior замість спека «спільна tree-точка»)? Оцінити ризик vertex-touch
   різних керівників.
3. overlaps from_id-exemption: спільна шина одного керівника (сиблінги на одному боці) НЕ рахується;
   різні керівники колінеарно — рахується. Чи не маскує реальне накладання?
4. RED-first НЕ вакуумний: `detour_leaves_a_violation` пінить S4.overlaps≥1, S5.crossings≥1 (реальні дефекти);
   `ac10_*` #[ignore] падає з --ignored. 8 чистих схем — live-гарди. Чи фікстури S0-S9 розумно відповідають
   §10.1 (проксі — plan §7 + `_r6-lines-spec-analysis-dg23.md:57-61`; raw-спеки в репо нема)?
5. Прод-розміщення route_stats (pub use) — чи не тягне проблем (dead_code/WASM-export)? staff_clearance
   лишено cfg(test) (reuse прод-примітивів staff_geom без промоуту).
6. `diagonal_segments` — ortho-проба (окремо від 0/0/0/0/0 панелі).

## Стан: 164 rust green + 1 ignored · clippy -D warnings · cargo fmt — чисті (перевірено dg32).

## Питання-пастки
- Чи `strictly_between` з COINCIDE_EPS=0.5 не пропускає/не вигадує перетини на реальних f32-координатах детур-виходу?
- Чи `classify` коректно розрізняє H/V/Degenerate/Diagonal на реальних орто-маршрутах (corr-елбоу)?
- Чи `schema_stats` використовує той самий card_pad=8, що й рендер (не 0/16)? Чи boxes = near_boxes адекватні детектору?

## Вердикт: PASS / BLOCKED (зі списком) — у кінці.

---

## dg32 R6 ПІСЛЯ-кроку — незалежне рев'ю (рецензент)

Модель: claude-opus-4-8

ДАЛІ: прочитати staff_router.rs, staff_routes.rs (1600-1830), staff_geom.rs, lib.rs, хелпери тестів; прогнати тести; винести вердикт.

ФАКТ (crossings): `proper_cross` (router:112-118) рахує лише interior-interior H×V через `strictly_between` (COINCIDE_EPS=0.5). T-стик/вершина не interior → не рахується. Подвійного рахунку немає: `proper_cross(si,sj)||proper_cross(sj,si)` — лише одна гілка істинна на пару (H,V); кожна геом-точка унікальна (спільна точка = вершина = виключена).

ФАКТ (ключова перевірка на пропуск реального перетину): розглянув vertex-touch РІЗНИХ керівників, коли пряма лінія A проходить interior через вершину P ребра B. Для ортогональних ліній: якщо A проходить через вершину B, A НЕОБХІДНО колінеарна одній з двох перпендикулярних ніжок B у P → ловиться метрикою `overlaps` (різні керівники → !same_manager). Тобто all-zero панель НЕ обманюється: реальний перетин-на-вершині між різними керівниками зринає як overlaps>=1. Бакет інший, але гейт «усі 5 нулі» тримається. Висновок: немає хибного пропуску, що протік би крізь гейт.

ФАКТ (overlaps): `collinear_overlap` (router:121-149) — positive-length, same-y/same-x у межах eps, `max(lo)+eps<min(hi)`. Exempt `!same_manager` (router:177). S4 overlap=1 через РЕАЛЬНИЙ staff_routes-детур (не рукотворні точки).

ФАКТ (card): through_card = polyline_hits_box_interior(INTERIOR_EPS=0.75, звужено); near_card = seg_rect_distance<8. Власні кінці skip по id (router:188). `continue` після through_card → одна (edge,card) пара рахується раз, interior домінує near. Boundary-лінія = near (тест 380). Жодного подвійного рахунку.

ФАКТ (through_foreign): reuse прод `frame_intrusion_count` (geom:180-200), рамка джерела/цілі exempt. Один і той самий примітив, що й §12-маркер роутера — без «двох правд».

ФАКТ (near_boxes/card_pad): near_boxes = `visual_person_edge_box(near, None)` = ПОВНИЙ бокс картки без паддінгу (edge_box:106,144). schema_stats routes з card_pad=8.0 (routes:1655). MIN_CLEARANCE_PX=8=MIN_CARD_PAD (router:32; routes:44). Прод card_pad = options.content_padding (>=8 інакше 0; layout:1246). 8 = мінімальне увімкнене значення, що рівно збігається з порогом детектора → найтугіший коректний сетап для гейта. Коментар «card_pad=8 the renderer uses» трохи неточний (рендер бере content_padding, може бути >8), але це НЕ блокер — вибір 8 правильний для acceptance.

ФАКТ (RED-first не вакуумний): прогнав `ac10 --ignored` → FAILED (S4 overlaps=1). `detour_leaves_a_violation` зелений (S4.overlaps>=1, S5.crossings>=1). `clean_schemas` зелений (8 схем = default). Усі через реальний staff_routes. 11 router-тестів зелені, 2 schema+1 ignored.

ФАКТ (lib.rs): `mod staff_router` (13), `pub use {diagonal_segments, route_stats, RouteStats}` (33). Не wasm_bindgen — plain pub, вживається тестами → без dead_code. Компіляція тестів без warning.

РІШЕННЯ — залишкові (НЕ блокери):
1. eps=0.5 «мертва зона» біля кінців сегмента: перетин у <0.5px від кінця V-сегмента (коли interior, але не колінеарний H) міг би пропуститися і НЕ зринути як overlap. Нереалістично на lane/card-координатах (сотні px); коментар сам каже «fixtures sit far». Низький ризик.
2. ac10 (5 метрик) НЕ асертить `diagonal_segments==0` — діагональ, що «перетинає», не ловиться панеллю (proper_cross/collinear_overlap повертають false на Diagonal). За дизайном окремий ortho-probe (тестований юніт-тестом), роутер орто за конструкцією. Низький ризик; T6 варто додати diagonal-асерт у гейт.
3. overlaps blanket `!same_manager`: теоретично маскує same-manager overlap після розгалуження шини. Реально ризери дітей на різних x, шина — легітимна спільна структура. Низький ризик.
4. Формулювання «card_pad=8 the renderer uses» (routes:1632) — рендер бере content_padding; уточнити до «мінімум обходу = поріг детектора».

ВЕРДИКТ: PASS. Детектор §10.4 рахує 5 метрик коректно й без подвійного рахунку. Головна пастка (пропуск реального перетину через interior-interior замість «спільна tree-точка») знята: для різних керівників перетин-на-вершині неминуче зринає як overlap, тож all-zero гейт не обманути. Хибних позитивів, що завалили б чистий A*-маршрут, не знайдено (interior-crossing і different-manager overlap — справжні дефекти). RED-first реальний (ac10 падає на S4). Фікстури S0-S9 розумно покривають §10.1. Блокуючих дір немає.
