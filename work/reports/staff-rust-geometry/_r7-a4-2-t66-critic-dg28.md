claude-opus-4-8

ДАЛІ: звіряю код-факти з промпту — orgBlockLayout collapse-гілка, DiagramRenderer:813, staff_layout.rs (compute + expandedOrgIds cap), types.rs StaffLayoutInput, canvasLayout.ts:161, orchestration R7, terrain-map. Потім оцінюю обсяг V2 і ранжую V1/V2/V3.

## ФАКТ — анатомія T66 (що саме геометрія, що ні)
- Геометрія collapse = РІВНО ОДНА чиста функція `visiblePositions` (positionExpand.ts:48-79): BFS від голови по admin-ребрах, нерозгорнутий вузол не ставить дітей у чергу (ховає піддерево), detached-корені завжди засіяні. Координат НЕ рахує — лише ВІДБІР, яких нод лейаутити.
- Застосування: orgBlockLayout.ts:378-383 — гейт `collapse` → `inOrg = visiblePositions(...)` ПЕРЕД лейаутом. Чистий pre-filter.
- DiagramRenderer.ts:812-813,829,846-851 — `collapsePositions`/`expandedPosIds` ведуть лише chevron-афорданс (showExpand, isPositionExpanded, onToggle). Це ПРЕЗЕНТАЦІЯ/інтеракція → лишається в TS за будь-якого варіанта.
- `maxExpandedPositions`/`victimsForExpand` — споживаються ТІЛЬКИ в OrgHierarchyDiagram.ts:1353-1356 (togglePositionExpand, viewState-евікція). НЕ вхід лейауту. Ніколи не доходить до геометрії → TS за будь-якого варіанта.
- Отже геометрична частина T66 = {visiblePositions pre-filter, гейтований collapse-прапором, параметр expandedPositionIds}. Крапка.

## ФАКТ — автор уже зафіксував рішення в коді
- staff_layout.rs:1-8 (хедер модуля, R7 В2): «collapse/`detached:true`/`expanded`/`memberOrder` ... не в контракті ⇒ TS-адаптер». matrix/hybrid «структурно недосяжні — TS-адаптер гейтить їх до виклику». → collapse СВІДОМО винесено в TS-адаптер автором A1.
- R7 orch (orchestration-dg26.md:14-18,29): контракт StaffLayoutInput перелічено — T66-полів НЕМАЄ; collapse не згадано ніде в декомпозиції. A4 = «видалення пост-проходів + rewire», без згадки релокації collapse-фільтра.
- types.rs:445-461 StaffLayoutInput: НЕ несе collapse/expandedPositionIds/maxExpandedPositions. Несе expandedOrgIds (:458).
- Rust ВЖЕ має помічники, що потрібні visiblePositions: admin_children_map (staff_layout.rs:106), resolve_staff_head (:134), detached_root_ids (:173), head_id_of (:928). ⇒ порт BFS = ~15-25 рядків реюзу.

## ФАКТ — прецедент TS-пре-відбору вже є
- canvasLayout.ts:75-76 tier1 передає `leadershipOf(head,...)` — TS ВІДБИРАЄ підмножину посад ПЕРЕД блок-лейаутом. «TS обирає які посади входять у блок» — вже усталений патерн, не новий антипатерн. visiblePositions — та сама форма.
- collapse:false → visiblePositions = no-op (повертає все). Non-collapse сцени й так ефективно йдуть крізь міст без змін.

## ФАКТ — golden coverage (спростовує засновок V1 частково, б'є V1 в обидва боки)
- staffGeometry.golden.test.ts:26-27 — 6 сцен: mockup-staff-figma/magnetic/gojs, staff-brigade, staff-1m, worker.
- collapse:true РЕАЛЬНО в golden: 'staff-brigade' (tabConfigs.ts:286, коментар section-chiefs = staffBrigade). mockupLayouts/shpsStaff = collapse:false. ⇒ collapse — МЕНШІСТЬ golden, але НЕ порожня: staff-brigade не можна лишити без обробки.
- Наслідок: не можна «відвантажити rewire й проігнорувати collapse» — staff-brigade golden зламається або лишиться на мертвому коді. Треба АБО дубль (V1), АБО обробити collapse.

## РІШЕННЯ — V2 має два підваріанти; ключ не «Rust чи ні», а «де фільтр»
- V2a (адаптер-пре-фільтр): buildStaffLayoutInput кличе visiblePositions, фільтрує positions+reportLines до видимих, годує ІСНУЮЧИЙ міст. НУЛЬ змін Rust/контракту. Малий TS-зріз. golden має бути ІДЕНТИЧНИЙ (той самий фільтр). Збігається з хедером staff_layout.rs («TS-адаптер гейтить») І з прецедентом leadershipOf.
- V2b (порт у Rust): +2 поля StaffLayoutInput (collapse, expandedPositionIds) + порт visiblePositions (реюз наявних helpers) + ts-rs regen. Малий-середній. golden ідентичний якщо faithful. Виграє ЛИШЕ якщо є консюмер, що кличе Rust МИНАЮЧИ TS-адаптер — такого немає (DiagramRenderer і svgExport обидва TS і обидва можуть ділити адаптер). ⇒ V2a домінує V2b.
- maxExpandedPositions — поза обома (interaction-only).

## РІШЕННЯ — принцип відповідальності (завдання 4)
visiblePositions НЕ є геометрією — це відбір видимості (0 координат). Rust лишається ЄДИНИМ власником координат і в V2a: адаптер лише обирає входи (як уже робить leadershipOf). Тому «collapse в TS» НЕ суперечить «єдине джерело геометрії в Rust» — за умови, що це pre-filter, а не альтернативний лейаут (саме тому V1 порушує принцип: V1 тримає ДРУГИЙ лейаут-пайплайн).

## РІШЕННЯ — «3 потім 2» (завдання 3)
Те, що мав би з'ясувати V3-refresh (чи T66-via-Rust планувався), ВЖЕ однозначно відповіли первинні джерела в дереві: ні — свідомий scope-out (staff_layout.rs:1-8 + orch:14-18). CTO-RESEARCH відстає ~12 комітів, але він не джерело по цьому питанню — джерело це orch-doc + змерджений Rust, обидва свіжі. ⇒ повноцінний V3-pause надлишковий; «3» фактично виконано цим дослідженням. Що V3 ВИЯВИВ реальним: orch A4 не назвав, що collapse-фільтр треба РЕЛОКувати в адаптер (не видалити). Це діра плану на 1 абзац, не цикл.

## РАНЖУВАННЯ
1. V2a (адаптер pre-filter) — РЕКОМЕНДОВАНО. Повне видалення пост-проходів, 0 контракт-змін, Rust=власник координат, golden identical, збіг із документованим дизайном і прецедентом.
2. V2b (Rust-порт) — прийнятно, пуристично, але зайва контракт-поверхня+regen заради відбору-не-геометрії; бери лише якщо з'явиться не-TS консюмер Rust (зараз немає).
3. V3 (повний pause) — здебільшого надлишковий; згорнути до 1-абзацної правки плану (релокація фільтра). Намір уже в дереві.
4. V1 (conditional dispatch) — ВІДХИЛИТИ. Розв'язує неіснуючу проблему (collapse МОЖЕ крізь міст через 1 виклик адаптера), цементує перманентний дубль-пайплайн (той самий антипатерн, що V3-barrel), лишає staff-brigade golden на мертвому коді, гарантує дрейф.

## РЕКОМЕНДАЦІЯ З УМОВАМИ
Робити V2a. Умови:
(У1) buildStaffLayoutInput застосовує visiblePositions per-org (current + кожна expanded-дитина) ПЕРЕД побудовою входу; фільтрувати й reportLines до видимих ендпоінтів (бо Rust-ребра/маршрути інакше вкажуть на відсутні ноди).
(У2) positionExpand.ts НЕ видаляти — visiblePositions лишається (його кличе й адаптер, і OrgHierarchyDiagram-інтеракція). «Видалення пост-проходів» = видалити orgBlockLayout tree/matrix+canvasLayout composition+staffDeptGrouping+enrich, НЕ positionExpand.
(У3) collapse:false → no-op (вже так). Non-collapse golden має лишитись byte-identical.
(У4) staff-brigade golden (collapse:true) — верифікувати identical ПІСЛЯ V2a; якщо дифить — баг фільтра/порядку, не rebaseline. Порядок detached/queue — input-order в обох (positionExpand.ts:63 / detached_root_ids:173), сортдивергенції (staff_layout.rs:198 UTF-8≠UTF-16) тут немає.
(У5) Дописати в план R7, що A4 РЕЛОКує collapse-фільтр в адаптер (діра orch:29). maxExpandedPositions лишається в OrgHierarchyDiagram:1354.
(У6) Опц. сплит: A4.2 rewire non-collapse → A4.3 додати pre-filter для collapse. Низька цінність (інкремент ~1 виклик), лише якщо хочеш ізолювати ризик самого rewire.

## ЧЕСНА ОЦІНКА ОБСЯГУ V2 (як питав власник)
V2-як-сформульовано (поля+порт = V2b): МАЛИЙ-СЕРЕДНІЙ Rust (BFS реюзить 4 наявні helpers, ~20-30 рядків + apply) + 2 поля контракту + ts-rs regen + порт тестів collapse. НЕ великий. АЛЕ зайвий: V2a дає те саме видалення пост-проходів меншим коштом і без контракт-зміни. Тобто «обсяг V2» чесно = малий у будь-якому підваріанті; питання не обсяг, а чи платити контракт-поверхнею (V2b) за те, що адаптер уже має робити (V2a).
