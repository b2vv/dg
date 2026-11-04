# Research sources — ШПС edit-mode + spliceData + інкрементальна Rust-геометрія

ДАЛІ: прочитати T124-T129, SPEC.md staff-розділи, grep edit-mode/spliceData/incremental, core Rust staff_*.rs на предмет кешу.

Джерело: субагент-дослідник, 2026-11-04. Усі факти — з path:line / doc§. Де нема — `⚠️ unverified`.

---
ФАКТ (крок 1 — spliceData/edit-mode grep):
- `spliceData` НЕ існує в коді (grep: лише спек/репорти). Згадки:
  - spec.md:49-55 (власне рішення цієї сесії, не контракт).
  - work/reports/viewport-window/report.md:436 «T88.12 spliceData» — setData не вкладається в бюджет кадру (1,5с проти 16-33мс); report.md:510 «Взявся за spliceData і почав із розкладу тих 1,5с».
- `appendData` — ІСНУЄ як вимога/API: docs/REQUIREMENTS.md:466 «Incremental build: нові дані з API → добудова без full reload»; :538 «fetchNeighborhood/fetchStaffPage замінено на data/setData()/incremental appendData()»; :621 «[x] Incremental API merge (appendData/setData)». work/SPEC.md:477 «### 5.2 Incremental data».
- edit-mode згадки: T117 (GoJS-хост cassiopeia-admin-ui «режим редагування», reparent) — edit-mode gap у SDK; T128:14 «Бар-2 (довільні позиції) ВІДКЛАДЕНО з edit-mode (Q5)»; T56:350 H4 incremental render; T116:53 reparent відсутній у SDK.

ФАКТ (крок 1 — T126 = міграція геометрії в Rust, НЕ edit-mode):
- T126 статус: 🔵 не почато, ЗАБЛОКОВАНО спекою + «го» власника (T126:3). Про інкрементальність/кеш НЕ йдеться — це міграція розрахунку координат/пакування/композиції/лінків у Rust (T126:7-14).
- Сьогодні Rust рахує лише `computeOrgRowTreeLayout` (packages/core/src/lib.rs:20) на орг-блок; входи w×h+gaps (orgBlockLayout.ts:63,78; layoutBridge.ts:30-52) (T126:31).
- Перф WASM-межі на 1M-вікнах НЕ виміряно (T126:37 R10, :61 Q-2). Жодного поняття «кеш незмінних нод» у T126.

---
ФАКТ (крок 2 — seam WASM↔TS для staff-геометрії):
- Повний pass-through, НЕ delta: layoutBridge.ts:84-97 `computeStaffGeometryWasm(input: StaffLayoutInput)` — «the whole StaffLayoutInput crosses as one object» (:86-88); нема поняття змінені/незмінні ноди.
- Тип входу: generated/rust-types.ts:98 `StaffLayoutInput = {currentOrgId, positions[], reports[], organizations[], departments[], nodeSizes[], options}`.
- Будується щоразу з нуля: buildStaffLayoutInput.ts:207 `buildStaffLayoutInput(args): StaffLayoutInput`; staffLiveGeometry.ts компонує і кличе bridge на кожен render.
- staffLiveGeometry.ts:8-14 «T126 R7 A4.2b: geometry now comes from Rust (computeStaffGeometryWasm), the single source (T66 V2a)» — міграція геометрії в Rust ВЖЕ ВИКОНАНА на render-шляху (стара TS-пайплайн layoutStaffCanvas+enrichStaffTierBands+resolveStaffRouting прибрана з render, лишилась лише в golden Seam-A до A4.4).
- Друга Rust-ліба (alpha): computeStaffMockupLayoutWasm (layoutBridge.ts:105), T129 порт shps-links.js.

ФАКТ (крок 2 — чи є кеш незмінних нод у Rust? НІ):
- Усі «cache/memo» в core — ВНУТРІШНЬОКАДРОВІ, не крос-edit:
  - staff_layout.rs:902-1046 `memo: &mut [Option<f32>]` — мемоізація ширини піддерева в межах ОДНОГО виклику layout.
  - staff_mockup_layout.rs:897 `cache: HashMap<(bool,usize,usize),bool>` — всередині A* одного маршруту.
  - staff_router.rs:255 — КОМЕНТАР «built ONCE per scene... can be cached by bbox across a routing pass (plan §4 perf-lever)» — потенціал, не реалізоване крос-edit кешування.
- ⚠️ Інкрементальна геометрія з кешем незмінних нод при live-edit — НЕ реалізована ніде; існує лише як пам'ять-правило/вимога, у коді/спеці формально не специфікована.

ФАКТ (крок 2 — staff edit-mode у спеці):
- Найближче до edit-mode: T128:14 «Бар-2 (довільні позиції) ВІДКЛАДЕНО з edit-mode (Q5); контракт-шов під x/y закладається адитивно, не будується»; T128:106 T9 «контракт-шов x/y» — відкритий пункт. Тобто edit-mode add/edit/delete у staff — ВІДКЛАДЕНО, шов лише задекларований.
- T124 (🔵 не почато): штатна сцена не валідує org-ієрархію (validateOrgHierarchy orgTree.ts:10 не кличеться на create/setData; цикл parentOrgId не ловиться) — релевантно для delta-валідації при edit.
- T129 (🟡 L1 GREEN / L2 BLOCKED): alpha Rust layout порт + React near-view на x/y; не edit-mode.
- ⚠️ Окремої спеки «staff edit-mode add/edit/delete у рантаймі» (нода/деп/зв'язок) в T124-T129 / SPEC.md / REQUIREMENTS.md НЕ знайдено як оформлену вимогу. Є лише: загальний reparent edit-mode для ORG (T116/T117, GoJS-хост), appendData incremental (SPEC §5.2, REQUIREMENTS), і відкладений Бар-2 (T128).

---
ФАКТ (крок 3 — існуючий delta-API appendData; setData контракт):
- `appendData` ІСНУЄ: OrgHierarchyDiagram.ts:1352-1377. Патч від mappers.append/toDiagram → mergePartial(this.data, patch) (:1367) → searchService.append (злиття індексу, НЕ rebuild, :1368) → this.data=merged → await render() (:1376, повний re-render). Epoch-guard :1365,:1372.
- mergePartial = mergeById, **patch wins per key** (mergeData.ts:25-31, T77-M04) — тобто ADD/UPDATE; **DELETE НЕ підтримується** (нема вилучення за id).
- setData контракт (USAGE.md): §812 «setData гасить виділення, appendData — ні»; §818 «appendData дедуплікує за id (patch виграє) і зливає індекс замість перебудови»; §774-795 «виграє останній setData» (epoch/overtaken тихо); §801 «setData скасовує чанки в дорозі».
- Публічні колбеки даних (USAGE.md:518-522): onLayoutChange (persist-канал, §578 «SDK нікуди не пише»), onDataMapped, onViewportChange; §681-697 onLayoutChange тепер на кадр пізніше (T104).
- Документований host-патерн вікнування: USAGE.md:765-769 `onViewportChange → void diagram.setData(buildWindowAround(transform))`; USAGE.md:753 appendData приклад.
- ВИСНОВОК для spliceData: add/update-delta вже є (appendData, re-render повний, index-merge). spliceData доклав би (а) delete, (б) уникнення повного re-render / incremental geometry — обох зараз нема.

ФАКТ (крок 3 — межа staff vs org / culling / вікно):
- SPEC.md:532-535 «Вікно за камерою — патерн ХОСТА, не функція SDK… Culling у сцені немає — T89 закрито без імплементації».
- SPEC.md:523-524 T88 onViewportChange + searchBeyondWindow (host тримає повні дані, SDK — вікно).
- SPEC.md:477-483 §5.2 Incremental data — ПСЕВДОКОД-план: appendData→mergePartial→diff visible viewport→recompute affected dept contours only (намір, частково реалізований лише як merge, не як viewport-diff геометрії).

ФАКТ (крок 3 — archive / статуси T124-T129):
- Жоден T124-T129 НЕ в архіві (work/archive/ має лише tasks-2026-09-*, branch-inventory; grep T12[4-9] порожній). Усі staff-задачі активні у work/tasks/.
- Статуси: T124 🔵 не почато; T125 (cross-tier anchor + mockup match); T126 🔵 не почато/ЗАБЛОКОВАНО спекою (парасолька, але код під нею — T128/T129 — вже пишеться; код staffLiveGeometry.ts каже R7 A4.2b ВИКОНАНО → task-файл T126 стале vs код); T127/T127a/T127b (zones/namespaces/org-edges); T128 🟢 implement РОЗПОЧАТО (A* роутер у Rust, dg37 cross 6→0); T129 🟡 L1 GREEN / L2 BLOCKED.

ФАКТ (крок 3 — ризики/борг для staff-геометрії):
- D5-orphan-position-layout.md: orgBlockLayout.ts layoutConnectedTree — борг розкладки orphan-позицій.
- T126:35 дефект «двох правд» padding (live departmentWrapperPadding DiagramRenderer.ts:1220-1228 ≈36 vs SVG svgExport.ts:223 ≈6) — мандат лікує через єдиний Rust-вихід меж.
- T126:37 R10, :61 Q-2: перф WASM-межі на 1M-вікнах НЕ виміряно; поріг бюджету не заданий.
- viewport-window/report.md:436,510: setData на slide вікна = 1,5с (у 45-90× понад бюджет кадру 16-33мс) → мотив spliceData; але це НЕ про рендер, а про WASM-розкладку.
- CRITIQUE-dg_9352d52.md: staff контури/origin борг (не прямо про incremental).
