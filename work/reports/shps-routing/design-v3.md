# Дизайн ШПС-роутера v3 — dept-grouping (обмежений) + route-only (варіант C)

**Status:** `🟢 GATE PASS (r5) → код можна починати`. Критика: 5 раундів (r1 BLOCKED 6; r2 seam→layout;
r3 seam Q5→єдина render-ділянка; r4 svgExport→спільна standalone; r5 PASS — sweep: 2 site, уніфіковано,
третьої нема), yield = 6+1+1+1+1, N1-N3 вкладено. Суперсідить `design-v2.md` (над-scope: повне
переписування layout). Власник обрав **варіант C** (2026-10-21): dg робить ОБМЕЖЕНЕ dept-групування +
route-only навколо отриманих рамок; залишкові міждеп-перетини → §12 видимий маркер.

Дає ШПС-схемі читабельні лінії підпорядкування на **реальних BE-даних** (tree mode, без authored-
координат): члени кожного департаменту збираються в роз'єднаний dept-регіон, а лінії позицій-НЕ-членів
огинають чужі рамки (req §3.2). Стан світу: dg-роутер (`layout/staffEdgeGeometry.ts
classifyStaffEdgeRoute:293`) уже огинає **картки** як перешкоди, але НЕ рамки департаментів; а layout
(`layout/staff/orgBlockLayout.ts`) у tree-режимі **взагалі не групує за `departmentId`** — департаменти
лишаються декором контурів поверх report-дерева, тож їхні AABB перекриваються і «обхід рамки» на
реальних даних недосяжний без попереднього групування. **Виняток:** authored/matrix-режим (демо
Figma/Magnetic з руками проставленим `gridCell`) уже дає роз'єднані регіони — там групування не
застосовується, працює лише route-only.

## Чому
Замінюємо GoJS-роутер на dg. На реальній ШПС (кілька департаментів, міждеп-зв'язки) лінії мусять читатись
як оргструктура: не ховатись під рамками чужих департаментів і не перетинатись без потреби. Вада наявного
шляху, виміряна на коді цієї сесії (не grep — повне читання файлів):
- `orgBlockLayout.layoutStaffOrgBlock` розставляє посади ТІЛЬКИ за admin-report-деревом (WASM row-tree);
  `departmentId` не читається ніде для розміщення. Член департаменту A, чий керівник у B, фізично сідає
  під керівником у регіоні B → dept-AABB перекриваються.
- `DiagramRenderer.paintStaffFrameAndEdges:769` передає в роутер лише картки (`buildStaffEdgeSegments(edges,
  boxes)`), не рамки; `classifyStaffEdgeRoute.blocked()` пропускає з перешкод тільки `from.id`/`to.id`.
- `contourSceneInputs` вже рахує `memberBoxesByDept: Map<deptId, {positionId,x,y,w,h}[]>`, але це
  споживається лише для фарбування контурів, не для роутингу.

**Виміряна корекція власної посилки (двічі за трек):** (1) spec-v1 вважав routing «розширенням EdgeStyle»
— ні, §6 вимагає layout-гарантій. (2) design-v2 вважав, що треба ПОВНІСТЮ переписати layout — ні, власник
показав демо: dept-aware вигляд ІСНУЄ, але (перевірено цією сесією) лише для authored `gridCell`; реальний
host-мапер `position-tree-to-dg-diagram.ts` authored-координат НЕ віддає. Отже правда посередині: layout на
реальних даних треба ДОГРУПУВАТИ (обмежено), а не переписувати і не лишати як є.

## Рішення
**За прапором `staffEdgeRouter:'v2'` layout отримує dept-aware arrangement-пас, який ПЕРЕВИКОРИСТОВУЄ
наявні деревні примітиви для intra-dept і лише ПАКУЄ dept-блоки в роз'єднані регіони; далі наявний роутер
додатково дістає рамки департаментів як per-edge перешкоди (чужі рамки — обхід, рідна — пропуск); залишок
міждеп-перетинів мінімізується й видимо позначається (§12). Default — `legacy`, поточна поведінка без змін.**

Механізм (шов — мінімальний, без заміни `layoutStaffOrgBlock`):
0. **Валідація входу (перенесено зі spec §5.1 — GATE-v3 #5).** Перед групуванням: цикл `parentId`
   (A→B→A), self-parent (`id===parentId`), dangling `parentId` (на неіснуючу/відфільтровану посаду) →
   structured-error, схема показує помилку, НЕ hang (патерн `StaffLayoutError`); невідомий/застарілий
   `deptId` (нема в `departments`) → трактуємо як loose (поза-dept) + діагностика; `deptId` на
   згорнутий/прихований dept → член і його вхідне ребро ховаються. Детермінований сорт входу
   `(parentId, order, id)` (spec N1) — єдине джерело tie-break.
1. **Arrangement-пас `staffDeptGrouping.ts` (новий, у `layout/staff/`, tree-режим).** Кличе його НЕ
   `layoutStaffCanvas`, а `resolveStaffRouting` (крок 1 + rebuild у K-loop; див. §12-шов); вхід: валідований
   `inOrg` (сирі tree-positionNodes від `layoutStaffCanvas`), `reports`, `departments`. Псевдокод:
   `bucket(positions by departmentId; null АБО невідомий deptId → loose)` →
   `perDept: layoutConnectedTree(deptMembersSortedBySourceOrder, reports)` (ПЕРЕВИКОРИСТАННЯ наявного
   примітива — не новий алгоритм дерева) →
   `placeBlocks(depts anchored під parentPositionId, зліва-направо за order, пакування без overlap через
   наявний overlap-ejection; loose-бакет — окрема область)` →
   `crossDeptMembers` впорядковуються так: **вхідний порядок членів у `layoutConnectedTree` сортуємо за
   x-позицією їхніх джерел-керівників** — ключ §10.1.4. 🔴 **Точка інжекції (GATE-v3 #2):** WASM row-tree
   зберігає ВХІДНИЙ порядок сиблінгів без сортування (перевірено на Rust: `packages/core/src/hierarchy.rs`
   `children_by_parent.entry(parent).or_default().push(item)` — push у порядку ітерації, жодного
   `.sort()` на дітях; `ploeg_layout` цей порядок зберігає). Отже порядок задається позицією членів у
   масиві, що подається у `layoutConnectedTree`. Контрольна проба обов'язкова (див. Форму перевірки).
   Вихід — `StaffNodeBox[]` з РОЗ'ЄДНАНИМИ dept-AABB + сумісними координатами (контур-пакування працює).
2. **Рамки як per-edge перешкоди.** `resolveStaffRouting` (НЕ paint — див. §12-шов) будує похідні
   рамки `deptFrames = [{deptId, rect: unionBoxes(memberBoxesByDept[deptId], pad), memberIds}]` і передає
   їх у `buildStaffEdgeSegments` як перешкоди.
   🔴 **loose-бакет виключається (GATE-v3 #3):** `NO_DEPARTMENT_ID` (`data/types.ts:244`) НЕ дає рамки —
   інакше фіктивна «рамка без департаменту» стала б перешкодою. Dept без членів → `unionBoxes` поверне
   null → рамка пропускається. `classifyStaffEdgeRoute.blocked()` розширюється: рамка — перешкода для
   ребра, ЯКЩО ні `from`, ні `to` не ∈ `memberIds` цієї рамки (рідну рамку пропускаємо — ендпоінт
   усередині неї). Перевикористання `polylineHitsBoxInterior:221`/`segmentHitsBoxInterior:199`.
3. **§12 драбина — покриває І edge-edge, І frame-intrusion (GATE-v3 #1).** Поточний `forced`-fallback
   (`staffEdgeGeometry.ts:380-381`) повертає маршрут БЕЗ перевірки → міг би ТИХО пройти крізь чужу
   рамку. v3 це закриває: перед `forced` пробуємо around-frame lane (обхід рамки як перешкоди); якщо
   навіть він перетинає чужу рамку АБО лишаються edge-edge перетини — релаксація §6.5 (≤K, монотонна
   міра, стоп) → мінімізація → **видимий маркер залишку** (не тихе прийняття). 🔴 Маркер застосовується
   і до frame-intrusion, не лише edge-edge: будь-яке ребро-НЕ-члена, що після драбини все ще
   penetrує чужу рамку (`polylineHitsBoxInterior` проти `deptFrames`), позначається видимо. На §10.1.4
   схемах ціль 0; §Виняток — коли 0 математично недосяжний.
4. **Re-entrancy (GATE-v3 #4).** `staffDeptGrouping` async (WASM) — обгорнутий epoch-guard'ом так само,
   як edge-routing: `setData`/ресайз під час arrangement скасовує прогін (патерн `ingestIsCurrent`);
   паралельної перебудови немає.
5. **Фарба / highlight / rollback** — без змін проти spec §6-8: колір через `EdgeStyle`, kill-switch
   `staffEdgeRouter:'legacy'`, будь-який збій v2 (validation-error / K-перевищення / throw) → fallback на
   legacy для цього прогону.

**Чому C, а не B (повний layout rewrite):** B замінює вхідну точку `layoutStaffOrgBlock` і дублює WASM
row-tree власним дерево-алгоритмом — ризик розходження з наявними tier/hybrid/external-pin/detached
гілками (T65/T78/T91) і подвійна підтримка. **Ціна B:** кожна з цих перевірених гілок потребує повторної
реалізації й регрес-тестів. C платить меншим: один arrangement-пас поверх вже перевіреного
`layoutConnectedTree`, legacy лишається живим fallback. **Відкинута альтернатива A (чистий route-only):**
на tree-даних рамки перекриваються — «обхід рамки» математично невизначений; A вимагав би, щоб host-мапер
віддавав authored-координати (робота Cass 1, якої ще нема) — поза контролем цього заходу.

Шов монтування: `layoutStaffCanvas` (async) віддає БАЗОВІ tree-positionNodes (БЕЗ групування — воно за
прапором цілком усередині resolveStaffRouting) + **нова СПІЛЬНА async-функція
`resolveStaffRouting(positionNodes, edges, {theme.person, lod, orgCards, reports, departments,
positions})`** (за прапором: dept-групування + §12 K-loop + ЄДИНА маршрутизація + marking) — живе у
**`render/`**
(GATE-r5 N1: їй потрібні і render-map-функції `visualEdgeBox`, і layout-примітиви; напрям import у репо —
render→layout дозволено, layout→render НІ, тож дім = `render/staffRouterV2.ts`, не `layout/`). Кличуть
ОБИДВА споживачі: render-path (`DiagramRenderer` МІЖ layout(:631) і zones/контурами(:665/:666)) і
**`svgExport`** — + `paintStaffFrameAndEdges:769` та `svgExport` (read-only: малюють готові
`routedSegments` + маркери) + `classifyStaffEdgeRoute` (per-edge frame-skip). `StaffEdgesView.redraw`
приймає precomputed-сегменти (additive). **Сигнатура (GATE-r5 N2):** несе й grouping-входи (`reports`/
`departments`/`positions`), бо K-loop re-invoke'ає `staffDeptGrouping`; обидва споживачі ці дані тримають.
🔴 **Функція ПОВЕРТАЄ** `{positionNodes, routedSegments, markedCrossings}` — caller присвоює
`canvas.positionNodes = result.positionNodes` ДО zones(:665) (не internal-мутація — явне присвоєння на
стороні споживача, детерміновано).

🔴 **Де живе §12 K-релаксація + маршрутизація — ОДНА async render-ділянка (GATE-v3 r3 #seam, виправлено).**
Еволюція: r1 клав усе в sync paint (десинх фаз); r2 переніс scoring у `layoutStaffCanvas` — але r3 показав
нову діру: layout НЕ має `theme.person`/`lod`/`orgCards`, а paint маршрутизує над ЗБАГАЧЕНИМИ edge-boxes
(`mapPositionNodesToStaffEdgeBoxes` + `mapStaffEdgeBoxesForLod`, + `orgCards` як перешкоди,
`DiagramRenderer:789`; `visualEdgeBox.ts:25/52` зсуває AABB). Дві ділянки routing над РІЗНОЮ геометрією →
`markedCrossings` з layout не збігся б із фактичними перетинами paint → §12-маркер позначав би НЕ ті ребра.
**Фікс — НЕ ділити routing на кілька ділянок. Увесь цикл — в одній СПІЛЬНІЙ standalone async-функції
`resolveStaffRouting` (`staffRouterV2.ts`), НЕ метод рендера** — щоб її могли викликати ОБИДВА наявні
споживачі (render-path і `svgExport`), зберігаючи інваріант кодбази «one builder for canvas, matrix and
export» (`svgExport.ts:243`, `visualEdgeBox.ts:91`). Їй передають `positionNodes`+`edges`+
`{theme.person, lod, orgCards}`; вона будує edge-boxes ТИМИ САМИМИ `mapPositionNodesToStaffEdgeBoxes`/
`mapStaffEdgeBoxesForLod` + orgCards-obstacles, що й обидва споживачі нині. Кроки: (1) стартове
`staffDeptGrouping`; (2) `buildStaffEdgeSegments` над ЗБАГАЧЕНИМИ boxes оцінює перетини (edge-edge +
frame-intrusion) по всьому набору; (3) якщо >0 — ≤K проходів §6.5 (reorder → `await staffDeptGrouping`
rebuild → re-score над тими самими boxes), міра монотонно спадає, стоп; (4) мінімізує; (5) повертає
ФІНАЛЬНІ `positionNodes` + готові `routedSegments` + `markedCrossings` (у `StaffCanvasResult` як additive).
**Одна функція → `markedCrossings` = фактичні перетини BY CONSTRUCTION** (не «детермінізм як обіцянка»),
однаково для live-render і export.
- **render-path (`DiagramRenderer`):** `await resolveStaffRouting` між layout(:631) і zones(:665)/
  контурами(:666); 🔴 **guard-after-await (GATE r4 non-blocking):** одразу після await — `if
  (!this.isRenderCurrent(epoch)) return;` (щілина нового await не покрита guard'ом :643, що стоїть ПЕРЕД
  ним; патерн guard-after-await вже канон 643/667). Caller присвоює `canvas.positionNodes =
  result.positionNodes` ДО :665/:666, тож zones/контури/картки/лінії — на ОДНИХ фінальних боксах.
  `paintStaffFrameAndEdges` НЕ маршрутизує — передає `routedSegments` у `StaffEdgesView.redraw`
  (precomputed, additive) + малює маркери. svgExport epoch НЕ потрібен (one-shot, нема re-entrancy —
  GATE-r5 підтвердив асиметрію коректною).
- **`svgExport` (GATE r4 #blocking — друга ділянка, усунено):** нині має власний `buildStaffEdgeSegments`
  (`svgExport.ts:270`) + `memberBoxesByDept` (:244). За v2 — кличе ту саму `resolveStaffRouting` і малює
  `routedSegments`+маркери замість власного routing. Інваріант «shared by live render + SVG export»
  збережено: export збігається з live-render by construction, а не напів-мігрований.
- **Legacy-шлях:** `resolveStaffRouting` не викликається; обидва споживачі маршрутизують
  `buildStaffEdgeSegments` як нині, без групування/маркерів.

## Поза межами
- authored/matrix+hybrid режими (gridCell) — групування НЕ застосовується (вже роз'єднані); лише route-only
  навколо рамок.
- **Граничний tree-усі-loose (GATE-v3 #6):** якщо жодна посада не має валідного `departmentId` (усі в
  loose-бакеті) — `deptFrames` порожній, групування — no-op, роутинг = поточний legacy над картками.
  Коректно (нема рамок = нема що огинати), але §3.2 для такого входу беззмістовний — явно задокументовано.
- Орг-діаграма (фаза 2, GoJS) — не чіпаємо. 🔴 **Co-caller (GATE-r5 N3):** `classifyStaffEdgeRoute` після
  frame-skip-розширення має 3-го callera `matrixLayout.ts:125` (орг-діаграма). Нейтрально BY CONSTRUCTION:
  frame-skip gated на `deptFrames.memberIds`, а орг-obstacles (організації) `memberIds` не мають → гілка
  не активується, поведінка орг-роутингу незмінна. Тест-нейтральність підтвердити (орг-фікстура без
  регресу).
- Повна заміна `layoutStaffOrgBlock` (= B) — відхилено власником.
- Host-side authored-координати (= A) — Cass 1, не цей захід.
- Pixel-exact картки — host overlay; роутер працює з AABB.
- Форма §12-маркера й поріг мінімізації — власник лишив «можливо повернемось», не блокує старт.
- Повернення spec §3.3/§5.4 коридор/track-алокатор+порти (яких design-v2 мовчки позбувся) — v3 НЕ
  відтворює повний коридорний роутер; замість нього frame-aware around-lane + §12-маркер frame-intrusion.
  Це свідоме відхилення від spec-механізму (не мовчазне) — якщо around-lane виявиться недостатнім на
  §10.1 схемах, коридор повертається окремим кроком (ризик нижче).

## Форма перевірки
- **Чисті шви (юніт, кожен RED спершу з контрольною пробою):** (1) `staffDeptGrouping` — dept-AABB
  РОЗ'ЄДНАНІ (контрольна проба: крос-dept член, що без впорядкування дав би перекриття); (1b) **інжекція
  порядку (GATE-v3 #2):** переставити двох крос-dept членів на вході → їхній x-порядок на виході
  міняється місцями (доводить, що канал порядку = вхідний масив, а WASM його тримає; контрольна проба —
  якби WASM сортував сам, порядок би НЕ змінився); (2) crossing-detector пар поліліній, включно edge-edge,
  спільний стовбур НЕ перетин; (3) frame-obstacle: ребро НЕ-члена огинає чужу рамку (контрольна проба:
  без frame-skip-логіки ребро йде крізь); ребро-члена входить у рідну рамку без «forced»; (3b)
  **frame-intrusion маркер (GATE-v3 #1):** вхід, де обхід рамки недосяжний → ребро позначається видимо
  (контрольна проба: тихий forced-крізь-рамку БЕЗ маркера має провалити тест); (3c) loose-бакет НЕ дає
  рамки (контрольна проба: позиція без deptId не створює перешкоду-рамку); (4) §12 термінація: вхід, де
  0 недосяжний → стоп у K, маркер з'являється; (5) **валідація (GATE-v3 #5):** цикл/self/dangling
  parentId → structured-error не hang; невідомий deptId → loose+діагностика; прихований dept → ціль
  схована (кожен RED: наївна версія крашить/зависає).
- **Компонентні (замокано layout-seam):** §10.1 схеми s1/s2/s4/s5 + 0/1 посада → 0 перетинів деревних,
  ≥8px до картки, не під карткою/заголовком, не крізь третю рамку; §10.1.4=0. Детермінізм: 2 прогони
  deep-equal.
- **Перф:** 500 посад ≤50мс (контрольна проба — штучно важка схема, що МУСИТЬ перевищити). 🔴 вимір мусить
  іти саме K-pass шляхом оркестратора (вхід, що провокує ≥2 проходи релаксації з WASM-rebuild), інакше
  гейт не впаде на реальній вартості (GATE r2 non-blocking).
- **Ручний гейт (екран, живе демо):** на реальному tree-вході з кількома департаментами — рамки
  роз'єднані, лінії НЕ-членів огинають чужі рамки; контрольна проба — вимкнути прапор → legacy-картина
  (регрес видно). Маркер §12 — на штучно-інфізибельному вході, не на §10.1.
- **Rollback:** `staffEdgeRouter:'legacy'` → поточна поведінка без змін.

## Критика
**Раунд 1 (GATE, свіжий контекст, gate-reviewer Opus 4.8) — BLOCKED → вкладено, чекає re-GATE.** Усі
code-заяви v3 звірено повним читанням файлів і верифіковано ПРАВДИВИМИ (0 хибних). 6 blocking:
- **#1 (correctness/seam) §3.2 тихий forced-крізь-рамку:** `forced:380-381` повертав маршрут без
  перевірки, §12 ловив лише edge-edge. → §Рішення п.3 розширено: around-frame lane перед forced +
  маркер frame-intrusion (`polylineHitsBoxInterior` проти deptFrames). ✅ вкладено.
- **#2 (decision/completeness) §10.1.4=0 без точки інжекції:** reused WASM сам керує сиблінгами. →
  перевірено Rust (`hierarchy.rs` push у вхідному порядку, без sort) → інжекція = порядок вхідного
  масиву; §Рішення п.1 + контрольна проба 1b. ✅ вкладено.
- **#3 (completeness) loose-bucket NO_DEPARTMENT_ID як фіктивна рамка:** → §Рішення п.2 виключає
  `NO_DEPARTMENT_ID` з deptFrames + проба 3c. ✅.
- **#4 (completeness) re-entrancy нового async-пасу:** → §Рішення п.4 epoch-guard на `staffDeptGrouping`. ✅.
- **#5 (completeness) валідація входу зі spec §5.1 не перенесена:** → §Рішення п.0 + проба 5. ✅.
- **#6 (completeness) граничний tree-усі-loose:** → §Поза межами. ✅.
- Non-blocking (у tasks): WASM-down = legacy теж на WASM (не новий mode); dept-без-членів → unionBoxes
  null; де живе K-прохідна релаксація у одноразовому класифікаторі (потребує стану між ребрами —
  уточнити шов); термінологія коридор/доріжка/шина (spec N5).
- **Залишковий ризик (decision):** v3 свідомо НЕ відтворює коридор/track spec §3.3/§5.4 — ставка, що
  frame-aware around-lane + §12-маркер достатні на §10.1 схемах. Якщо ручний гейт покаже недостатність —
  коридор повертається окремим кроком. Позначено явно (§Поза межами), не мовчки.
- **Вердикт r1:** BLOCKED. Умова зняття: re-GATE підтверджує вкладення #1–#6 + вирішує non-blocking
  «де живе K-релаксація» (єдине, що стосується шва, а не формулювання). Код НЕ починаємо до re-GATE PASS.

**Раунд 2 (re-GATE, свіжий контекст, gate-reviewer Opus 4.8) — BLOCKED → виправлено, чекає re-GATE r3.**
Усі 6 умов r1 підтверджено ЗАКРИТИМИ адекватно (не косметично; #2 звірено на всьому Rust-ланцюгу
`org_layout→org_tree→hierarchy→ploeg_layout`, жодного sort на дітях). 0 нових blocking від самих правок.
- 🔴 **1 НОВА blocking (seam):** §12 K-релаксацію було покладено в СИНХРОННУ paint-фазу
  (`paintStaffFrameAndEdges:668` без await; `buildStaffEdgeSegments:409` routing-only, layout не будує;
  фазова десинх контурів/карток/ліній). → **виправлено:** K-loop перенесено в `layoutStaffCanvas`
  (async+epoch, `DiagramRenderer:631 await`); routing — чиста sync-геометрія для scoring; paint лишився
  sync route-only + малює `markedCrossings` з layout. ✅ вкладено (§Рішення §12-seam).
- Non-blocking (у tasks): (a) #2 реверс порядку в `extract_subtree`+`ploeg` → sort-ключ має врахувати
  напрям (проба 1b ловить); (b) перф-гейт мусить міряти K-pass шлях (додано у Форму); (c) deptFrames
  дотягнути в `paintStaffFrameAndEdges` (нині memberBoxesByDept рахується в `paintStaffDepartments`);
  (d) WASM-down = не новий mode (legacy теж на WASM) — назвати явно в tasks.
- **Вердикт r2:** BLOCKED. Єдина відкрита умова — когерентність §12-seam (виправлено вище). Код НЕ
  починаємо до re-GATE r3 PASS.

**Раунд 3 (re-GATE вузький, свіжий контекст, gate-reviewer Opus 4.8) — BLOCKED → виправлено, чекає
re-GATE r4.** Q1-Q4 PASS на реальному коді (layout awaited+epoch; `buildStaffEdgeSegments` чиста sync;
`StaffCanvasResult` приймає additive поля; memberBoxesByDept — чиста fn над layout-входами).
- 🔴 **1 НОВА blocking (Q5, знову наслідок r2-переносу):** r2 лишив ДВІ ділянки routing — layout-scoring
  над сирими positionNodes vs paint-re-route над ЗБАГАЧЕНИМИ edge-boxes (`theme.person`-зсув,
  `mapStaffEdgeBoxesForLod`, `orgCards`-obstacles, `visualEdgeBox.ts:25/52`, `DiagramRenderer:789`). Різна
  геометрія → `markedCrossings` з layout ≠ фактичні перетини paint → §12-маркер (головний deliverable C)
  позначав би не ті ребра. → **виправлено конструктивно:** НЕ дві ділянки — одна. Увесь routing+K-loop+
  marking у новому async `resolveStaffRouting` (render-path між layout і контурами), який будує edge-boxes
  ТИМИ САМИМИ map-функціями + orgCards, що й paint; paint read-only споживає `routedSegments`+
  `markedCrossings`. `markedCrossings` = фактичні перетини BY CONSTRUCTION. ✅ вкладено (§Рішення §12-seam).
- **Патерн (чесно):** r2 і r3 — обидві нові діри від фіксу попередньої; корінь — РОЗМІЩЕННЯ routing
  відносно layout/render/paint фаз. r3-фікс прибирає корінь (одна ділянка з усіма входами), а не пересуває
  проблему далі. Якщо r4 знайде ЩЕ одну нову діру цього ж класу — зупинка й ескалація власнику (ознака, що
  шов потребує іншого підходу, не чергової латки).
- **Вердикт r3:** BLOCKED. Єдина відкрита умова — Q5 (виправлено). Код НЕ починаємо до re-GATE r4 PASS.

**Раунд 4 (re-GATE вузький, свіжий контекст, gate-reviewer Opus 4.8) — BLOCKED → виправлено, чекає
re-GATE r5.** Q1-Q3 PASS: r3-фікс (єдина render-ділянка) КОГЕРЕНТНИЙ — `renderStaffCanvas` async(:600),
вставка `await resolveStaffRouting` між :664 і :665 реальна, guard коректний, `StaffEdgesView.redraw`
precomputed = additive. markedCrossings = фактичні by construction у render-path підтверджено.
- 🔴 **1 НОВА blocking (Q4/Q5) — але НЕ fix-induced:** `svgExport.ts:270-283` — ДРУГА незалежна
  routing-ділянка, що існує з-ПЕРЕД r1 (власний `layoutStaffCanvas`/`buildStaffEdgeSegments`/
  `memberBoxesByDept`). `resolveStaffRouting` як render-метод її не покривав → export під v2 був би
  напів-мігрований (групування є, routing/маркерів нема) → ламає інваріант «one builder canvas+matrix+
  export» (`svgExport.ts:243`, `visualEdgeBox.ts:91`). → **виправлено:** `resolveStaffRouting` зроблено
  СПІЛЬНОЮ standalone-функцією (не метод рендера), яку кличуть ОБИДВА споживачі; export збігається з
  live-render by construction. + guard-after-await явно (Q4 non-blocking). ✅ вкладено.
- **Класифікація (чому НЕ ескалація-тривога):** рев'ювер (незалежний) довів — це той самий routing-
  placement КЛАС, але **НЕ наслідок r3-фіксу** (svgExport передує всім раундам), r3-фікс КОРЕКТНО прибрав
  корінь у render-path, шов C здоровий, **редизайн не потрібен**. Моя підстава для ескалації («шов хибний»)
  спростована; це completeness-прогалина одного споживача. Інваріант кодбази (shared builder) **диктує**
  disposition (export мусить збігатися) — не відкритий продуктовий вибір, тож усунено без блокуючого
  питання власнику, лише з прозорою нотою.
- **Вердикт r4:** BLOCKED. Єдина відкрита умова — svgExport disposition (виправлено: спільний
  оркестратор). Код НЕ починаємо до re-GATE r5 PASS.

**Раунд 5 (re-GATE вирішальний, свіжий контекст, gate-reviewer Opus 4.8) — 🟢 PASS.** Задача 1 (спільний
оркестратор): render-path (`renderStaffCanvas` async:600, вставка між :643 і :665 реальна) і svgExport
(`buildDiagramSvg` one-shot async:164, усі входи в scope :242-281) — ОБИДВА можуть кликати спільну
standalone-функцію; epoch лише в render-path (svgExport one-shot — асиметрія коректна). Задача 2 (ПОВНИЙ
SWEEP усіх routing-callerів): **усього 2 ШПС routing-decision sites, ОБИДВА задекларовані й уніфіковані;
ТРЕТЬОЇ ділянки НЕМА.** Поза scope (назвіно явно): `matrixLayout.ts:125` (орг-діаграма), `spineBusEdges`
(серіалізація, не рішення), probe (0 production-callers). Escalation-клаузу r3 НЕ тригернуто — жодна нота
не класу «routing-placement over different geometry».
- Non-blocking → вкладено в дизайн: **N1** дім функції = `render/staffRouterV2.ts` (не `layout/`, інакше
  layout→render import) — §Шов; **N2** сигнатура несе grouping-входи + «повертає, caller присвоює» — §Шов;
  **N3** нейтральний co-caller `matrixLayout` — §Поза межами.
- **Вердикт r5:** 🟢 PASS. Шов повний по всьому SDK; `markedCrossings` = фактичні перетини BY CONSTRUCTION
  однаково для live-render і export. **Код можна починати** (codex exec за design-v3, N1-N3 враховано).

## Закрито в grilling
- **Scope route-only vs layout (B2-adjacent):** закрито власником 2026-10-21 — варіант **C** (обмежене
  групування + route-only; залишок → §12). Підстава — перевірено на коді: реальні дані = tree mode без
  authored-координат, рамки перекриваються, чистий route-only недосяжний.

## Імплементаційна корекція (пост-GATE, зріз 3)
🔴 **Верифікована правка claim #2 (знайдено гейтом зрізу 3, не змінює вердикт PASS).** §Рішення п.1
стверджував «WASM/ploeg зберігає вхідний порядок сиблінгів». **Неточно.** Перевірено емпірично (гейт
`staffDeptGrouping.test.ts`: вхід `[z,root,a]`, обидва діти `root` → `a.x=32` ліворуч, `z.x=188`
праворуч) + у джерелі: `packages/core/src/ploeg_layout.rs:48` `for child in node.children.iter().rev()` —
ploeg розкладає дітей у **ЗВОРОТНОМУ** порядку. `hierarchy.rs` children-Vec зберігає вхідний порядок, але
x-координата йде `.rev()`.
- **Що лишилось правдою:** канал інжекції §10.1.4 **детермінований і реагує** на вхідний порядок членів
  (reverse входу → swap x) — ключова властивість, від якої залежить досяжність §10.1.4=0. Guarantee в силі.
- **Що виправити у споживача (зріз 4, `resolveStaffRouting` K-loop):** x-порядок = **РЕВЕРС** вхідного
  порядку сиблінгів. Щоб член сів лівіше за сусіда, подати його **ПІЗНІШЕ** у вхідному масиві членів.
  Reorder-сорт оркестратора мусить це інвертувати (або міряти фактичний вихід у K-loop — він так чи так міряє).
- **Зріз 3 (`staffDeptGrouping`) НЕ компенсує** інверсію: прокидає вхідний порядок як є (компенсація на
  кожному рівні сиблінгів фрагільна; чесніше експонувати сиру детерміновану поведінку + задокументувати).

## Амендмент A (пост-GATE, зріз 4) — grouping переїжджає з render у layout
🟢 **МІНІ-GATE PASS** (gate-reviewer, свіжий контекст Opus 4.8, 2026-10-21; усі заяви звірено повним читанням
коду; 0 blocking). 3 осі чисті: (1) canvasLayout офсетить layoutStaffOrgBlock-вихід по ярусах адитивно й
агностично (:75-79/:108-112/:163-169) → grouping тече всім ярусам; (2) one-builder збережено — contourSceneInputs
(:36-49) суто з node-боксів, routing відбудовує deptFrames без grouping-стану; (3) caveat зафіксований,
pinExternalManagers агностичний (post-step), інверсія §10.1.4 лише під (i). Нова діра routing-placement НЕ
вводиться. Нота імплементатору (НЕ блокер, успадковано з базового п.2): deptFrames з сирих node-боксів vs
edge-боксы зсунуті `visualPersonEdgeBox` — frame має pad, членство gated на memberIds (не геометрія); амендмент
цього не змінює. Рішення власника 2026-10-21 («A, але спершу міні-GATE») — умова виконана, код A дозволено.
Два критики незалежно CONCUR (Cass rev APPROVE, Cass 1 host CONCUR; `slice4-seam-analysis.md`). Амендмент
коригує §Шов НА РІВНІ РОЗМІЩЕННЯ grouping (не routing); §12-routing-seam r3/r4/r5 чинний.

**Що міняється проти §Шов вище:** оригінал клав dept-**grouping** усередину render-side
`resolveStaffRouting` (повертає positionNodes, caller присвоює). Імплементація зрізу 4 виявила конфлікт:
`groupStaffByDepartment` (зріз 3) дає ЛОКАЛЬНІ координати блоку, а `layoutStaffCanvas` офсетить КІЛЬКА
орг-блоків ПО ЯРУСАХ (tier1 leadership / tier2 повний штат / tier3 child-картки+expanded; кожен —
окремий `layoutStaffOrgBlock` з власним офсетом, `canvasLayout.ts:71/102/155`) + orgCards +
`pinExternalManagers`. Render-side заміна `canvas.positionNodes` згубила б ярусні офсети або дублювала б
усю multi-tier математику.

**Новий шов (варіант A):**
1. **Grouping → усередину `layoutStaffOrgBlock` (layout, tree-режим, за прапором).** Коли прапор
   активний і режим tree з реальними департаментами → `layoutStaffOrgBlock` кличе `groupStaffByDepartment`
   (зріз 3) і повертає розкладку з роз'єднаними dept-регіонами в ЛОКАЛЬНИХ координатах блоку.
   `layoutStaffCanvas` офсетить цей блок по ярусу як будь-який інший → **grouping тече всім ярусам (1/2/3)
   даром**; orgCards/tiers/external-pins/cross-tier edges незмінні. Обидва споживачі (`DiagramRenderer:631`,
   `svgExport:194`) кличуть `layoutStaffCanvas` → згруповані positionNodes отримують без спільного
   grouping-коду.
   🔴 **Caveat Cass rev (зашити ЗАРАЗ, інакше блокер пізніше):** grouping-гілка `layoutStaffOrgBlock`
   приймає **reorder-hint** (порядок членів) і є **re-callable з K-loop** із самого початку — навіть якщо
   під сценарієм (ii) не вживається. Інакше відкриття (i) = переробка шва, а не твік гейта. Import
   render→layout дозволений (цей файл §Шов:101), layering не ламається.
2. **`resolveStaffRouting` (render) = ROUTING-only** (спільна standalone, кличуть render:789 + export:270 —
   інваріант «one builder» ЗБЕРЕЖЕНО, навіть зміцнено: спільний код менший). Над УЖЕ-згрупованими
   `canvas.positionNodes`: будує `deptFrames` з **canonical `contourSceneInputs(positionNodes, positionById)`
   → memberBoxesByDept** (`contourInputs.ts:29-61` — суто з node-боксів, БЕЗ grouping-internal стану;
   докблок :26-27: спільне джерело matrix+export) + `unionBoxes` (loose/NO_DEPARTMENT_ID — без рамки),
   маршрутизує `buildStaffEdgeSegments` з frames (зріз 2), §12 K-loop + marking, повертає
   `{routedSegments, markedCrossings}`. paint/export read-only споживають.
   **Мінор (Cass rev):** власний `memberBoxesByDept` зрізу 3 (`staffDeptGrouping.ts:15,104`) дублює canonical
   contourSceneInputs — routing бере contourSceneInputs; grouping-власний лишається до рішення (i)/(ii)
   (під ii прибрати).
3. **K-loop (i)/(ii) — окремий RED-гейт (не блокер A-vs-B; обидва критики згодні):** (ii) залишкові
   крос-dept перетини мінімізуються вибором routing-lane над ФІКСОВАНОЮ grouping-розкладкою (grouping
   одноразове) — старт тут; (i) якщо (ii) не досягає §10.1.4=0 на ручному гейті → K-loop re-invoke'ає
   grouping через reorder-hint (layout re-call), кожна ітерація перебудовує edge-boxes над НОВИМИ
   positionNodes перед re-score. Інверсія §10.1.4 (ploeg_layout.rs:48) релевантна лише під (i).

**Чому A, а не B (render-side як оригінал):** A домінує B під обома K-сценаріями — A re-invoke'ає ЄДИНИЙ
layout-builder з reorder-hint (одна копія ярусної математики), B мусив би реплікувати ярусні офсети/orgCards
у render (дві копії) АБО лишити tier-1/3 негрупованими (Cass 1: multi-tier РЕАЛЬНИЙ, виміряно). Host→dg
контракт інваріантний до A (Cass 1, host-авторитет): вхід tree-mode ідентичний, read-back — per-position
world усіх ярусів, orgCards/grouping host-невидимі.
