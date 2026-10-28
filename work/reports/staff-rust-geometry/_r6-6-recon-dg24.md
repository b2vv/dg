# R6-6 Recon (Dg24)

ДАЛІ: читаю handoff dg23, plan.md H3 §8, tasks.md R6; далі — staffLiveGeometry, staffRouterV2, svgExport, visualEdgeBox@134, staffEdgeGeometry, layoutBridge.

## ФАКТ (Q1 — хто рахує точки лінків)
- Спільний код точок лінків: `staffEdgeGeometry.ts` — `classifyStaffEdgeRoute`/`staffEdgePolyline`/`buildStaffEdgeSegments` (layout/staffEdgeGeometry.ts:314,413,433). Обидва шляхи (live, SVG) приходять сюди.
- Мапа боксів→visual-LOD: `visualEdgeBox.ts` — `mapStaffEdgeBoxesForLod` @134, `mapPositionNodesToStaffEdgeBoxes` @96, `visualPersonEdgeBox` @25 (near-гілки gojs-row/figma-row), `visualOrgEdgeBox` @116.
- LIVE: `staffLiveGeometry.ts:121-139` — v2 → `resolveStaffRouting(...)`, інакше (legacy) → `mapStaffEdgeBoxesForLod(...)` + `buildStaffEdgeSegments`. LOD = `input.lod` (параметр, бере з рендера).
- SVG: `svgExport.ts:282-303` — v2 → `resolveStaffRouting({... lod:'near'})`, інакше `mapStaffEdgeBoxesForLod(..., 'near')` + `buildStaffEdgeSegments`.
- ВИСНОВОК: обидва шляхи йдуть через ОДИН набір функцій (router + box-mapper) — паритет by construction на рівні коду. РІЗНИЦЯ одна: LIVE передає реальний `lod`, SVG хардкодить `'near'` (svgExport.ts:288,299). Тобто паритет точний лише коли екран теж у near; на mid/far SVG != екран by design.

## ФАКТ (Q3 — хардкод lod='near')
- Два місця хардкоду в SVG: `svgExport.ts:288` (v2 гілка, `lod: 'near'`) та `svgExport.ts:299` (legacy, `'near'`).
- «near-набір first-class» = зробити near-геометрію самостійним, явно іменованим виходом, щоб SVG не «вгадував» рядком, а споживав той самий near-набір, що й екран у near. Конкретна зміна — див. розвилку Р3.

## ФАКТ (Q2 — Rust vs TS, layoutBridge)
- `layoutBridge.ts` віддає ЛИШЕ row-tree орг-лейаут (`computeOrgRowTreeLayoutWasm`, :25). Жодного staff-routing / department_frames / StaffRouteSet тут немає.
- Увесь staff edge-routing на рендер-боці — TS (`staffEdgeGeometry.ts`, `staffRouterV2.ts`). Rust `staff_routes`/StaffRouteSet НЕ wired у live/SVG шлях.
- ВИСНОВОК: R6-6 паритет — це TS-live vs TS-SVG, НЕ про споживання Rust-виходу. Споживання Rust — борг R7.

## ФАКТ (Q2b — staffRouterV2 теж TS)
- `staffRouterV2.ts::resolveStaffRouting` (:33) теж суто TS: будує deptFrames з `contourSceneInputs`, боксі через `mapStaffEdgeBoxesForLod(...)` (:43) той самий, що legacy. Rust не торкається. Підтверджує: R6-6 = TS-TS.

## ФАКТ (Q4 — R0-golden ±1px, стан)
- Є: `packages/demo/src/scenarios/staffGeometry.golden.test.ts` + знімок `__golden__/staff-geometry.json` (1.4 МБ, 27 жовт).
- Що знімає (capture, :60-111): через `computeStaffLiveGeometry` (LIVE-шлях) для 11 staff-табів, для ВСІХ трьох LOD (near/mid/far, :21,:91):
  - `nodes`(координати), `bands`, `orgCards`, `edges`, `zones` (межі обгорток-зон), і головне `routes` per-LOD — `segment.points` (ТОЧКИ ЛІНКІВ) (:100-105).
- Допуск: `compare(... tolerance=1)` ±1px для чисел, 0 для структури (:113-133). Плюс детермінізм 2-прогонів tolerance=0 (:157-159).
- КРИТИЧНО: golden знімає ЛИШЕ LIVE (`computeStaffLiveGeometry`). SVG-вихід (`buildDiagramSvg`) НЕ покритий — немає жодного знімка/порівняння SVG. Тобто R0-golden стереже live-регрес, але НЕ доводить live==SVG.
- `svgExport.parity.test.ts` (H3, tasks.md:30) — ПОЗНАЧЕНИЙ «новий», ЩЕ НЕ існує (grep: нема файлів parity).
- «Наявний паритет точок лінків» = unit-тести боксів у `render/visualEdgeBox.test.ts` (per-LOD `visualPersonEdgeBox`/`staffEdgeEndpoints`) — це паритет на рівні БОКСІВ, не пряме live-vs-SVG порівняння сегментів.

## ФАКТ (Q5 — card-сцена)
- `departmentStyle:'card'` vs 'blob' — у `staffLiveGeometry.ts:63-69` (card → padding+labelRow). SVG-гілка меж також залежить від zone chrome.
- Staff-таби (golden list, :24-28): `staff-shps, variant-b, staff-tree, staff-dept-legacy, staff-dept-v2, mockup-staff-figma, mockup-staff-magnetic, staff-brigade, staff-1m, mockup-staff-gojs, worker`.
- `staff-dept-v2` = v2-роутер+deptGrouping (той, що SVG вмикає при `staffEdgeRouter==='v2'`, svgExport.ts:282). Найближчий кандидат на «card»-сцену H3.
- SDK `export.test.ts` вже будує staff-сцени inline (:306,:323 паритет контурів/gap) — є патерн для нового parity-тесту без demo-залежності.
- Demo card-chrome фікстури: `scenarios/mockupStaff.ts` (card:{width,height}), `mockups.test.ts` (GoJS/Figma card).

## РІШЕННЯ/ВИСНОВКИ ПО СКОУПУ R6-6 vs R7
- H3-рядок (plan.md:122) має ДВІ половини: «межі обгорток» І «точки лінків».
  - **Точки лінків → R6-6 (зараз, TS-TS):** live і SVG вже йдуть через спільні `mapStaffEdgeBoxesForLod`+`buildStaffEdgeSegments`/`resolveStaffRouting`; єдина розбіжність — SVG хардкодить near. Паритет досяжний БЕЗ Rust.
  - **Межі обгорток → R7:** «дві правди» формул меж (стара TS + Rust-вихід), зведення споживачів (`staffZoneBounds` live + `svgExport`) на єдиний Rust-вихід — tasks.md:15,26 прямо кажуть H3/A2 OPEN до R7; канал Rust→TS меж на R5 ще нема (`layoutBridge` лише row-tree).
- Отже R6-6 закриває половину H3 (точки лінків/near-set), друга половина (межі+Rust-wiring) лишається R7. R0-golden треба РОЗШИРИТИ на SVG, щоб довести live==SVG на near.

## РОЗВИЛКИ R6-6 (рішення для власника)
- **Р1. Чи R6-6 можливий до R7-wiring Rust?** Так — паритет TS-live vs TS-SVG, Rust не в шляху рендера (layoutBridge:25, staffRouterV2 TS). Рек: робити R6-6 як TS-TS; не чекати R7.
- **Р2. Що саме перевіряємо?** Лише точки лінків (сегменти/порти) у near. Межі обгорток — відкласти на R7 (підтверджено tasks.md:15,26). Рек: явно зафіксувати цей спліт у плані R6-6, щоб H3-рядок не читався як «і межі теж зараз».
- **Р3. Що робить «near-first-class»?** Варіанти:
  - (A) МІНІМУМ: прибрати магічний рядок — винести `lod:'near'` у названу константу/контракт SVG (або `SvgExportInput.lod?`, default 'near'), щоб тест міг його пінити. Паритет уже by construction (ті самі чисті функції, ті самі входи). Найменша зміна, нуль ризику.
  - (B) СПРАВЖНІЙ single-site: SVG споживає ГОТОВИЙ near-вихід `computeStaffLiveGeometry` замість власного перерахунку маршрутів. Дає паритет не «by construction», а «by sharing». Але svgExport сам розкладає canvas (svgExport.ts:197) і має свої org-card/zone гілки → більший рефактор, ризик зачепити R7-борг меж.
  - (C) Новий first-class тип `StaffNearGeometry` як окремий експорт. Надлишково — ніхто крім SVG не просить.
  - Рек: **(A)** + новий `svgExport.parity.test.ts`, який доводить рівність сегментів live(near) vs SVG на card-сцені. (B) лишити на R7, коли межі так само зводяться на єдиний вихід (одна зміна — обидві половини H3).
- **Р4. Де тест і що порівнює?** Варіанти: (i) sdk `export/svgExport.parity.test.ts` — порівняти `resolveStaffRouting({lod:'near'})` сегменти vs сегменти, витягнуті з `buildDiagramSvg` (парсинг `<g id="edges">`); (ii) розширити demo-golden знімком SVG. Рек: (i) sdk-unit (tasks.md:30 саме його називає), бо тримає R6-6 у sdk без demo-залежності; плюс опційно (ii) як B7-страховка.
- **Р5. Яка «card»-сцена?** Варіанти: (i) переюз demo-таб `staff-dept-v2`/`mockup-staff-gojs`; (ii) мінімальна sdk-local фікстура (патерн export.test.ts:306). Рек: (ii) мінімальна inline-фікстура з `departmentStyle:'card'`+`staffEdgeRouter:'v2'` — тест самодостатній у sdk.
- **Р6. v2 і legacy — обидві гілки?** Хардкод near у ДВОХ місцях (svgExport.ts:288 v2, :299 legacy). Legacy = досі shipped шлях відкату (plan.md:85). Рек: покрити ОБИДВІ гілки (або щонайменше пінити near в обох через спільну константу Р3-A), інакше паритет доведено лише для v2.
- **Р7. Mid/far за скоупом?** SVG завжди near by design — екран на mid/far != SVG, і це НЕ баг (SVG — друк near-деталізації). Рек: тест перевіряє лише near-рівність; НЕ вимагати mid/far-паритету від SVG (інакше зламаємо намір експорту).

ФАКТ-кінець. Фінал → SubagentHandback.
