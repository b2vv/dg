claude-opus-4-8

# T6 критик-на-пастки (R6, критик-перед), dg33 — незалежна сесія №2

ДАЛІ: читаю первинні джерела — _algo-comparison-dg33.md (варіант b, D1-D7), мокап shps-links.js (:105-172), spec.md (§11.1 :70), tasks.md (:26-27), staff_router.rs (T1-T5), types.rs (StaffNodeGeo/StaffEdge), hierarchy.rs/org_tree.rs (reuse ancestor-утиліти), staff_routes.rs (:1627-1834 AC10 harness).

ФАКТ (мокап): класифікація вторинного — мокап не детектує «≥2 вхідних» графом. Secondary у мокапі заданий ЯВНО полем `c.p2` у даних POS (shps-links.js:30 `{id:'da',p:'ah',p2:'ceo',...}`). route:112 робить окремий прохід ПО `c.p2` → ast.push(sec:1). Тобто еталон НЕ виводить secondary з «≥2 вхідних admin-ребер» — у даних явно два окремі поля p (primary) і p2 (secondary). Жодного обходу графа / ancestor-логіки в мокапі НЕМА для класифікації sec.
ФАКТ (мокап): tgt(c,sec) :105 — sec → [cx+cw/2+SX, cy] (SX=28, :104). Для НЕ-sec голови депту → [cx+cw/2, d.y1] (deptTop), інакше card-top-center.
ФАКТ (мокап): grid X.add(cx+cw/2) І X.add(cx+cw/2+SX) :118 — обидва порти безумовно для КОЖНОЇ картки.
ФАКТ (мокап): mH/mV exempt для власної картки :136 — для ребра e, якщо сегмент вертикальний і на cx АБО cx+SX і картка c.id===e.m||e.c → перевіряє RAW (не padded) → вхід зверху у свою картку дозволений навіть на cx+SX.
ФАКТ: ЗАПРОПОНОВАНИЙ дизайн T6 п.1 РОЗХОДИТЬСЯ з еталоном: пропонує вивести sec «≥2 вхідних admin + ребро від предка іншого батька», а мокап читає явне p2. Треба перевірити модель даних нашого порту (чи є p2-еквівалент).

ФАКТ (spec scope): grep по work/SPEC.md + усьому work/ НЕ знаходить «§11.1» ані «подвійне підпорядкування». SPEC.md:4 «Версія scope: v1». Посилання промпта «spec:70 §11.1 OUT OF SCOPE» НЕ підтверджується в work/SPEC.md. Треба: або §11.1 в іншому файлі, або твердження про scope базоване на неіснуючому рядку. T128-task:37 каже «p2/sec ПОЗА [скоупом для T8-wiring]», :43 «S5 over=1 — відсутня стадія еталону».
ФАКТ (route_edges sort, staff_router.rs:752-761): ключ (start.1, start.0, idx) — БЕЗ sec. Відповідає D7.
ФАКТ (astar exempt, staff_router.rs:860): `c.endpoint && vert && (seg.0 - c.cx).abs() <= COINCIDE_EPS` — exempt ЛИШЕ для cx, НЕ cx+SX. Мокап :136 exempt для cx АБО cx+SX. ПАСТКА: якщо додати sec-порт cx+SX, цей рядок треба розширити на cx+SX, інакше secondary-ребро не ввійде у ВЛАСНУ ціль зверху (padded-rect заблокує) → fail/обхід.
ФАКТ (reuse): org_tree.rs:73 `walk_parent_chain` — обхід предків по parent_org_id; extract_subtree:114 будує children_by_parent. hierarchy.rs:5 build_from_flat — теж children_by_parent по parent_id. АЛЕ обидва над OrgFlatInput/FlatNodeInput, НЕ над StaffEdge; StaffNodeGeo БЕЗ parent_id (types.rs:471+). Reuse НЕ drop-in. А головне: мокап НЕ рахує предків взагалі — читає явний p2. Граф-предок у дизайні T6 = винахід поза еталоном.

ФАКТ (S5 fixture, staff_routes.rs ~1747): nodes m(0,0),sib(300,220),gc(300,440); edges m→gc, m→sib, sib→gc. gc має 2 вхідні admin: m→gc та sib→gc. sib сам дитина m (m→sib). Тобто m — предок sib. Мокап-аналог: da{p:'ah',p2:'ceo'}, ceo предок ah. Паритет інтенту: bypass(m→gc) = sec → cx+SX; прямий(sib→gc)=primary → cx.
РІШЕННЯ (secondary-правило): граф-предок НЕОБХІДНИЙ, edge.kind НЕ працює (усі 3 ребра admin → kind-правило дає sec=∅ на S5). Naive «перше за порядком = primary» ТЕЖ хибне: порядок вхідних у gc = [m→gc(перше), sib→gc] → дало б m=primary (інверсія мокапу!). Отже треба саме «bypass(предок іншого батька)=sec». Для 9 схем правило спрацьовує ЛИШЕ на S5 (решта не має 2-вхідних admin — звірено S1 m→a,b; S2 h→a,b,c; S3 m→ca,cb; S4 distinct; S6 ceo→ha,hb; S7 w→w0-9; S8 single; S9 m→big,n). ХИБНИХ спрацювань на S1-S9 НЕМА.
ПИТАННЯ (детермінізм general): правило визначене ЛИШЕ коли один з ≥2 батьків є предком іншого (bypass). Справжнє dual-sub (два незалежні батьки, жоден не предок) → sec невизначений. У 9 схемах такого нема; у мокапі єдиний dual=bypass. Для scope (9 схем + паритет мокапу) детерміновано; для general real-data — недовизначено (= те саме «dual-sub out of scope»).
ФАКТ (reuse): НЕМАЄ drop-in ancestor-утиліти над StaffEdge. org_tree.walk_parent_chain/hierarchy.build_from_flat працюють над ЄДИНИМ parent (Option), а тут суть у ДВОХ admin-батьках → не лягає. Треба маленька цільова перевірка «m предок to через admin-ребра» (parent-map з from→to admin), не форсити org_tree.

ФАКТ (ХАРНЕС-ВАЙРИНГ, блокер): route_edges/astar_route/build_corridor_grid викликаються ЛИШЕ з тестів staff_router.rs (1260-1543); lib.rs:34 лише ре-експорт. `staff_routes` (detour, staff_routes.rs:486) A* НЕ викликає. schema_stats (харнес, ~1662) викликає `staff_routes(frames_input(...))` = DETOUR. Отже AC10 зараз міряє DETOUR, не A*. Un-ignore AC10 ВИМАГАЄ зібрати в харнесі окремий A*-пайплайн (grid→secondary-classify→EdgeSpec→route_edges→rip_up→StaffEdgeRoute→route_stats), бо продакшн staff_routes лишається detour (вайринг=T8).
ФАКТ (geom S5): node()=100×50 (staff_routes.rs:646). gc cx=350, cx+SX=378 (інтер'єр картки, 22px від правого краю 400, pad=8). sib теж x=300 → cx+378 інтер'єр sib; лейн x=378 вільний лише в проміжку sib_bottom(278)→gc_top(440); вхід у gc зверху потребує exempt на cx+SX (інакше заблоковано). Сусідніх карток поруч нема → не наїде. Тісно, але здійсненно.
ФАКТ (EdgeSpec, staff_router.rs:734): поля from_id,to_id,start,target — БЕЗ sec/kind. Порт cx+SX задається як `target` ДО побудови EdgeSpec (у харнесі/новому хелпері). route_edges sort (start.y,start.x,idx) — для S5 секундарне m→gc(y=50) йде ПЕРШИМ, primary sib→gc(y=270) ДРУГИМ — ІНВЕРСІЯ мокапу (:156 sec останнім). Порти різні (cx vs cx+28) → може не зламати S5, але для паритету додати sec-прапор у EdgeSpec+sort.

## ВЕРДИКТ: GATE = RED

BLOCKING:
- B1 (харнес-вайринг): AC10 не un-ignore-иться додаванням коду лише в staff_router.rs — schema_stats жене DETOUR. Треба явно зібрати A*-пайплайн у харнесі. Дизайн п.5 це занижує (найбільша частина T6).
- B2 (exempt cx+SX): staff_router.rs:860 exempt лише для cx. Секундарне ребро не ввійде у власну ціль на cx+28 без розширення exempt на cx+SX (мокап :136). Без цього S5 лишиться red.

РЕКОМЕНДАЦІЯ (не блок, але головне рішення):
- Secondary-правило = ГРАФ-ПРЕДОК (bypass), НЕ edge.kind, НЕ naive-order. edge.kind дає sec=∅ на S5 (усі admin); order інвертує (routes m як primary). Reuse org_tree/hierarchy НЕ лягає (single-parent, інші типи) — маленька цільова перевірка «m предок to через admin-ребра». Правило детерміноване й без хибних спрацювань на 9 схемах; на general dual-sub недовизначене → документувати вузькість.
- §11.1: посилання «spec:70» НЕ існує в work/SPEC.md (grep порожній). S5-bypass ≠ general dual-sub → spec правити НЕ треба; але зафіксувати в T128, що T6 вводить secondary-порт ЛИШЕ для bypass-кейсу. Не заявляти «реалізовано §11.1».
- rip_up: best-effort, НЕ гарантія 0; детермінований (reverse дет.списку+дет.astar, 4 проходи bounded). Можливо НЕ потрібен для 9 схем (S5 over=1 = чиста колінеарність на cx; cx+28 розводить → ймовірно 0 single-pass). ВИМІРЯТИ спершу.
- Декомпозиція: МІНІМУМ для un-ignore = secondary-classify + cx+SX(grid+tgt) + exempt-fix + харнес-пайплайн. rip_up+bad(route_stats Vec<usize>) — ОКРЕМИЙ суб-коміт, гейтити виміром. +assert diagonal_segments==0 на сцену.
