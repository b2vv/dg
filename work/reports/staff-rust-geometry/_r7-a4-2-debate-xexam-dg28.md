claude-opus-4-8

ДАЛІ: прочитати контекстні звіти + ключовий код, перевірити факт V2a про visiblePositions як чистий відбір, інваріант зв'язності Rust, straddle FFI.

## ФАКТ — верифікація коду (усе звірено з файлами)
- positionExpand.ts:48-79 — visiblePositions: BFS від head по admin-ребрах; дитина в чергу ЛИШЕ коли батько visible+expanded (:72-74); detached-roots засіяні (:63). 0 координат. ⇒ вихід ЗАВЖДИ зв'язний префікс-піддерево від head; СИРІТ не породжує за конструкцією.
- orgBlockLayout.ts:378-383 — collapse-гейт застосовує visiblePositions ПЕРЕД layoutTreeBlock, per-org (inOrg = фільтр по orgId). Чистий pre-filter усередині блоку.
- canvasLayout.ts:108-113 — tier2 передає ПОВНИЙ data.positions; collapse спрацьовує ВСЕРЕДИНІ блоку. canvasLayout.ts:75-76 — tier1 = leadershipOf(head) ПОТІМ layoutStaffOrgBlock (collapse всередині). ⇒ порядок у TS: leadershipOf → collapse.
- staff_layout.rs:972-1180 compute_staff_geometry — Rust ПОВНІСТЮ реімплементує тир-декомпозицію: tier1 leadership_of(head,...) (:1011) → layout_staff_org_block; tier2 layout_staff_org_block(FULL input.positions) (:1042); tier3 expanded children (:1105). Collapse НЕ застосовується в Rust (хедер :6-8: collapse/expanded не в контракті ⇒ TS-адаптер).
- staff_layout.rs:106-130 admin_children_map — ребро враховується ЛИШЕ коли обидва ендпоінти in-set (:121). ⇒ нефільтровані reportLines БЕЗПЕЧНІ для admin/tree-побудови (авто-guard).
- staff_layout.rs:314-353 layout_connected_tree — REPARENT: валідний in-set батько → він; інакше → під КОРІНЬ (:332-339). ⇒ сироту Rust НЕ крешить — ТИХО репарентить під корінь (silently-wrong, не паніка).
- OrgHierarchyDiagram.ts:1353-1358 — victimsForExpand/maxExpandedPositions = interaction-eviction, у layout-input НЕ потрапляє. TS-only в обох варіантах. Підтверджено.

## ВІДПОВІДІ НА ПЕРЕХРЕСНИЙ ДОПИТ

### 1. Чи visiblePositions справді лише відбір без впливу на координати? ТАК — але з уточненням, яке обидва стілмени затерли.
- Місце фільтра (ДО Rust vs усередині) НЕ змінює геометрію: row-tree лейаутить ТОЙ САМИЙ видимий набір в обох випадках; collapse зсуває сиблінгів (менше видимих дітей → інше центрування батька), але ІДЕНТИЧНО незалежно від місця фільтра. Відбір впливає на координати лише через ВМІСТ набору, не через МІСЦЕ. ⇒ V2a golden-identical — коректно, але CONDITIONAL (див. нижче), не «тривіально by construction».
- ХИБНИЙ ЗАСНОВОК, який прийняли обидва: V2a ≠ «один глобальний visiblePositions + існуючий міст». compute_staff_geometry бере ПЛОСКИЙ positions і сам ділить на тири по organization_id. visiblePositions ОРГ-СКОУПНИЙ (BFS від однієї голови). ⇒ адаптер мусить КРУТИТИ ПО ОРГАХ: managing (tier1) + current (tier2) + КОЖНА expanded-дитина (tier3), і конкатенувати. Це не «1 виклик», а visiblePositions × (1+1+N).
- Друга незатерта тонкість: managing-орг-видимість стає ДВОСТУПЕНЕВИМ фільтром ЧЕРЕЗ FFI: TS collapse → Rust leadership_of(:1011). Перевірив комутативність: leadership_of = head+прямі-репорти (глиб.1); collapse прибирає піддерева. head згорнутий → {head} в обох порядках; head розгорнутий → {head+прямі} в обох. Комутативно НА ГЛИБИНІ 1. ⇒ коректно сьогодні, але латентна зв'язка: якщо leadership_of колись стане глиб>1, комутативність ламається і V2a стає тихо-неправильним для managing-орг.

### 2. Інваріант зв'язності. visiblePositions НЕ може породити сироту (BFS: дитина лише через visible+expanded батька). Якщо адаптер усе ж подасть сироту (неузгоджений фільтр ребер/нод) — Rust НЕ крешить: layout_connected_tree:332-339 репарентить під корінь ⇒ сирота з'явиться як дитина кореня (тихо-неправильно, не паніка). Нефільтровані admin-reportLines самі по собі безпечні (guard:121). РЕАЛЬНИЙ ризик — matrix/dotted ребра на приховану ноду (canvasLayout.ts:253-260 будує їх із reportLines) — їх треба зафільтрувати до видимих ендпоінтів (U1 критика коректний для matrix/dotted, зайвий для admin).

### 3. Найслабше V2b. Контракт +2 поля (collapse, expandedPositionIds) + ts-rs regen заради 0 не-TS консюмерів = YAGNI-ПОРУШЕННЯ, не інвестиція. computeStaffGeometryWasm БЕЗ консюмерів (terrain:6); DiagramRenderer+svgExport обидва TS, обидва ділять адаптер. Горизонт не-TS консюмера (сервер-рендер/інший хост) спекулятивний: AGENTS.md §5 прямо каже «не припускай, що хост споживає SDK — він НЕ споживає»; у відкритій черзі (T80/T102/T109/T116/T117/...) сервер-рендеру НЕМАЄ. StaffLayoutInput — ПУБЛІЧНА контракт-поверхня (дисципліна check:docs); платити нею за можливість, якої ніхто не кличе, — передчасно.

### 4. Найслабше V2a′. Окремий selection-stage проти простого фільтра-в-адаптері = спекулятивна абстракція (ponytail «мертва гнучкість») ЗА ПОТОЧНОГО одного консюмера. Межа SRP-виправданості: окремий stage виправданий коли (a) >1 консюмер відбору, АБО (b) логіка досить складна, що інлайн ховає головну роботу адаптера, АБО (c) потрібне ізольоване тестування. Тут: visiblePositions ВЖЕ тестована чиста функція; нова робота адаптера = тонкий per-org цикл над нею. Загортати цикл у «stage» з власним типом = YAGNI. Слабкий контр: positionExpand.ts уже має СІМʼЮ відбору (visiblePositions/expandIdsForDepth/assignExpandToDepth) — якщо відбір РОСТЕ (depth-expand+search+collapse в один оркестр-пойнт), V2a′ стає виправданим. Зараз — ні.

### 5. Задокументований намір. staff_layout.rs:1-8 + orch:14-18 — СИЛЬНИЙ аргумент, НЕ просто поточний стан: це свідоме рішення ЦЬОГО циклу (R7 В2) з явним резоном («не в контракті ⇒ TS-адаптер»), а не легасі-дрейф. Автор A1 міркував саме про цей шов. АЛЕ це аргумент від дизайну/авторитету, не від першопринципів — тож корроборує, не вирішує. Першопринципний аналіз (відбір≠геометрія; YAGNI на контракт) НЕЗАЛЕЖНО дає той самий висновок ⇒ намір ПІДСИЛЮЄ V2a, не несе його. Дискусія МОГЛА б переглянути — але лише за новим фактом (зафіксований не-TS консюмер). Факту немає.

### 6. СУДЖЕННЯ — ранжування
1. **V2a (фільтр у адаптері, per-org) — ПЕРЕМАГАЄ за сукупністю.** Responsibility: Rust лишається єдиним власником координат, відбір-видимості (0 координат, керований interaction-станом) законно TS-бік. SOLID: без зміни контракту, збіг із прецедентом leadershipOf (canvasLayout.ts:75). YAGNI: нуль спекулятивної поверхні. Drift: golden-identical за конструкцією (CONDITIONAL на per-org fidelity + guard matrix/dotted).
2. **V2a′** — лише якщо відбір набуде 2-го консюмера/помітно виросте.
3. **V2b** — лише якщо з'явиться реальний не-TS консюмер compute_staff_geometry.

**Коли V2a ПРОГРАВ БИ:**
- → V2b, якщо реальний не-TS консюмер (сервер-рендер/не-TS хост) — тоді collapse МУСИТЬ бути в Rust, інакше той консюмер бачить незгорнуту геометрію. Також → V2b, якщо leadership_of стане глиб>1 (ламає комутативність managing-straddle; V2b correct-by-construction).
- → V2a′, якщо selection-family (collapse+depth+search) злити в один оркестр-пойнт із власним тестом.

**Forest-погляд НЕ змінює локальний V2a>V2b — підтверджує його:** саме forest (managing+current+N дітей) ВИМАГАЄ per-org visiblePositions, бо кожна орг згортається незалежно від власної голови. Це РОБИТЬ collapse per-org SELECTION-концерном (а не єдиним глобальним гео-проходом) ⇒ підсилює TS-adapter-ownership. Forest робить адаптер важчим за «1 виклик», але не флінає вердикт.

## УМОВИ РЕКОМЕНДАЦІЇ V2a
(1) адаптер застосовує visiblePositions per-org: managing(tier1), current(tier2), кожна expanded-дитина(tier3) — НЕ глобально.
(2) managing: collapse ПЕРЕД подачею; Rust leadership_of зверху. Додати тест-асерт комутативності (поточна залежить від leadership depth=1).
(3) фільтрувати matrix/dotted reportLines до видимих ендпоінтів (admin — авто-guard staff_layout.rs:121, matrix/dotted — ні).
(4) verify golden-identical ПІСЛЯ (не rebaseline); diff = баг фільтра/скоупу.
(5) positionExpand.ts НЕ видаляти (адаптер і OrgHierarchyDiagram-інтеракція обидва кличуть).
(6) НЕ V2a′ зараз (1 консюмер), НЕ V2b зараз (0 не-TS консюмерів, §5 проти горизонту).
