claude-opus-4-8

# GATE v3 review — ШПС-роутер (варіант C)

ДАЛІ: прочитати design-v3.md, spec.md, design-v2.md; потім звірити code-заяви на реальних файлах (staffEdgeGeometry.ts, DiagramRenderer.ts, contourInputs.ts, orgBlockLayout.ts, canvasLayout.ts, staffZoneBounds.ts). Далі — plan-critique і plan-defense.

## ФАКТ — staffEdgeGeometry.ts (повне читання)
- `classifyStaffEdgeRoute` — рядок 293. ✅ v3-заява вірна.
- `blocked()` — рядок 316; ID-skip ЛИШЕ `box.id === from.id || box.id === to.id` (рядок 334). ✅ Пропускає тільки ендпоінти; рамок/memberIds логіки НЕМА — v3 мусить її ДОДАТИ (v3 §2 це визнає).
- `polylineHitsBoxInterior` — рядок 221. ✅; `segmentHitsBoxInterior` — рядок 199. ✅
- `forced`-fallback — рядки 380-381: `return { via: 'forced', points: alt }` БЕЗ isClean/blocked. ✅ v3-заява вірна.
- 🔴 УВАГА: класифікатор має ЛИШЕ 2 around-кандидати (`aroundTopPolyline`/`aroundLeftPolyline`, рядки 89/103, pad=16). Це прості L-детури відносно ДВОХ ендпоінтів — НЕ коридорна маршрутизація. Якщо around теж `blocked` → `forced` (крізь перешкоду, без перевірки). Spec §3.3/§5.4 вимагав корид/track-алокатор + порти deptBottom→deptTop; v3 §2 їх ВИКИНУВ і покладається на цей generic around. Питання досяжності §3.2 на 3+ рамках — нижче.

## ФАКТ — DiagramRenderer / contourInputs / orgBlockLayout / staffZoneBounds
- `paintStaffFrameAndEdges` — рядок 769. ✅ Але memberBoxesByDept там НЕ рахується; воно в `paintStaffDepartments` (721) через `contourSceneInputs`. v3 §2 мусить дотягнути memberBoxesByDept у paintStaffFrameAndEdges (той самий renderer, cheap) — не хибно, але шов-деталь не описана.
- `contourSceneInputs` → `memberBoxesByDept: Map<string, {positionId,x,y,w,h}[]>` (contourInputs.ts:29). ✅ Ключ = `contourDepartmentId(position)`, ВКЛЮЧНО з no-department bucket (рядок 39-49). → deptFrames з усіх ключів включать РАМКУ для loose-bucket — треба виняток (питання loose-bucket у defense).
- `orgBlockLayout.ts` ПОВНІСТЮ: 3 режими tree(322)/matrix(335)/hybrid(356). `departmentId` НЕ вживається ніде для розміщення — placement через WASM row-tree + adminParentMap + organizationId. ✅ ЦЕНТРАЛЬНА заява v3 ПРАВДИВА.
- `layoutConnectedTree`(44)/`layoutTreeBlock`(147) — примітиви. ✅ АЛЕ: `layoutConnectedTree` = WASM (`computeOrgRowTreeLayoutWasm`:71), потребує rootId; крос-dept parent re-parent'иться на rootId (65-69). Порядок сиблінгів контролює WASM — НЕ видно, як v3 інжектить «порядок успадковує джерел-керівників» (ключ §10.1.4). Mechanism-gap.
- 🔴 v3 §1 реюзить WASM-примітив → суперечить design-v2 §2 «0 WASM». «WASM недоступний» у defense: і legacy, і v2 на WASM → не НОВИЙ failure mode, але v3 цього не каже.
- `unionBoxes` — staffZoneBounds.ts:151. ✅

## ФАКТ — canvasLayout.ts + contourDepartmentId
- `layoutStaffOrgBlock` викликається 3× : tier1 (leadership subset) :71, tier2 (full current org) :102, tier3 (expanded child) :155. ✅ v3 «~71/102/155» точно.
- deptFrames у paintStaffFrameAndEdges беруться з FINAL positionNodes (post-offset cursorY/originX) через contourSceneInputs(canvas.positionNodes) → ті самі координати, що й edgeBoxes. Коорд-mismatch немає. ✅
- `contourDepartmentId` (data/types.ts:247-250) = `departmentId || NO_DEPARTMENT_ID` ('\u0000no-department', :244). → memberBoxesByDept МАЄ loose-bucket ключ. deptFrames мусять виключити NO_DEPARTMENT_ID (інакше loose-посади дістають рамку, і не-члени мусили б її огинати). v3 §2 цього явно не каже.

## ЦЕНТРАЛЬНА НАПРУГА (route-only над групуванням → §3.2 / §10.1.4=0)
- Групування §1 (placeBlocks «без overlap») → disjoint dept-AABB ДОСЯЖНЕ (примітиви packSideColumn/packFloatingAwayFromAnchors роблять overlap-ejection). Тобто «недостатнє для роз'єднаних рамок» — НЕ справджується; disjoint рамки досяжні. ✅
- АЛЕ §3.2 «не-члени огинають чужі рамки» НЕ гарантовано: класифікатор лише ВІДХИЛЯЄ direct/around-кандидати, що б'ють рамку; `forced` (380-381) повертає маршрут БЕЗ перевірки → може йти КРІЗЬ чужу рамку. На disjoint, але side-by-side depts (placeBlocks «зліва-направо за order») крос-dept ребро між двома sibling-depts з третьою між ними → around-drop КЛІПИТЬ рамку → forced-через-рамку досяжне на реальних tree-даних.
- 🔴 §12-драбина v3 ловить ЛИШЕ edge-edge перетини («міждеп-ребра перетинаються»). Frame-penetration (forced крізь чужу рамку, БЕЗ перетину іншого ребра) НЕ детектується й НЕ маркується → ТИХЕ порушення §3.2. Це суперечить і §3.2-обіцянці v3, і правилу spec «тихого прийняття немає».
- 🔴 v3 ВИКИНУВ spec §3.3/§5.4 (коридор/track-алокатор + порти deptBottom→deptTop) — саме той механізм, що робив §3.2 робастним у GATE-PASS spec — і підмінив generic 2-кандидатним around, НЕ позначивши це як відхилення від GATE-PASS spec. Decision-transparency gap + completeness gap.

## plan-critique — 4 лінзи (запущено 4 / повернулось 4)
Примітка: я — свіжий незалежний рев'ювер; чотири лінзи прогнав як чотири окремі читання в межах цього чистого контексту (окремих сабагентів не плодив — заборона дублю рев'юерів + одна робоча нота). Код звірено на файлах вище.

### [AI-slop] — повернулась
- Чисто в основному: §Рішення спирається на реальні примітиви (layoutConnectedTree, polylineHitsBoxInterior, unionBoxes, memberBoxesByDept) — не вигадані. 
- NON-BLOCKING: §12 «монотонна міра, стоп ≤K» успадковано зі spec, але у v3 застосовується до механізму (around-класифікатор), який K-проходів релаксації НЕ має — класифікатор одноразовий (direct→around→forced). Де K-прохідна релаксація живе у v3-шві — не сказано. Церемонія spec-а, не прив'язана до v3-механізму.

### [Логічні діри] — повернулась
- BLOCKING L1: §3.2 «не-члени огинають чужі рамки» НЕ випливає з механізму §2. blocked() лише відхиляє кандидати; forced (staffEdgeGeometry.ts:380-381) повертає маршрут крізь перешкоду БЕЗ перевірки. Розрив «додали рамки в obstacles» → «тому не-члени огинають». Насправді: «або огинають, або forced-крізь-рамку тихо».
- BLOCKING L2: §10.1.4=0 «порядок у бенді успадковує порядок джерел-керівників» не має шва: reused layoutConnectedTree делегує порядок сиблінгів WASM row-tree (orgBlockLayout.ts:71), і v3 не показує, як інжектить цей порядок. Обіцянка «=0 групуванням» без механізму інжекції порядку = гіпотеза, не конструктив.
- NON-BLOCKING L3: §12-драбина говорить про edge-edge перетини, а §3.2 — про frame-penetration; v3 змішує їх під одним «залишком», хоча детектор перетинів рамку-cut не ловить.

### [Надлишкова складність] — повернулась
- Чисто/позитив: C справді менший за B — реюз layoutConnectedTree + legacy fallback замість дублю WASM row-tree. Це reuse-first, правильно.
- NON-BLOCKING C1: окремий модуль staffDeptGrouping.ts + per-edge deptFrames — виправдані. Але «deptFrames = unionBoxes(memberBoxesByDept[deptId])» для ВСІХ ключів включно NO_DEPARTMENT_ID — зайва рамка навколо loose-bucket; треба фільтр (інакше не-члени огинають фіктивну рамку «без департаменту»).

### [Edge cases] — повернулась
- BLOCKING E1: loose-bucket (NO_DEPARTMENT_ID) дістає рамку-перешкоду — §Поза межами й §2 не виключають її. На реальних даних частина посад без departmentId → фіктивна рамка спотворює роутинг.
- NON-BLOCKING E2: 0/1 посада — покрито §Форма перевірки (компонентні). ✅
- NON-BLOCKING E3: цикл parentId / dangling / self-parent / невідомий deptId / прихований dept — у spec §5.1 розписано, але v3 про валідацію входу МОВЧИТЬ (лише «inOrg позиції мають departmentId»). Делегування до spec не зафіксовано — діра переносу зі spec у v3.
- NON-BLOCKING E4: департамент без членів → unionBoxes поверне null (staffZoneBounds.ts:155) → рамка не будується; це ОК, але v3 не каже.

Підсумок plan-critique: blocking відкрито = 3 (L1, L2, E1). non-blocking = 6.

## plan-defense — 5 питань (кожна відповідь мусить вказати рядок design-v3)
Пишу таблицю в СВІЙ робочий файл (не редагую design-v3 — я рев'ювер). Де v3 не вказує рядка — дірка.

| # | Питання | Закрито рядком design-v3 | Вердикт |
|---|---|---|---|
| 1 | Кривий інпут (цикл parentId / невідомий deptId / 0-1 посада / loose-bucket) | §1 «bucket(positions by departmentId; null→loose)» + §Форма перевірки «0/1 посада» частково; цикл/невідомий deptId/self-parent — НЕ згадані (у spec §5.1 є, у v3 ні) | **ДІРКА** (валідація входу не перенесена зі spec; loose-bucket як рамка не виключений — див. E1) |
| 2 | Відмова залежності (WASM row-tree недоступний) | §Рішення крок 4 «будь-який збій v2 → fallback на legacy». АЛЕ legacy теж на WASM (layoutConnectedTree:71) → fallback не рятує від WASM-down; v3 не каже, що WASM-down = не НОВИЙ mode | частково закрито (fallback є), але причина/межа не названа — NON-BLOCKING |
| 3 | Гонка / re-entrancy (setData під час arrangement) | НЕМА рядка. v3 §Рішення крок 4 «фарба/highlight/rollback — без змін проти spec §6-8», але epoch-guard зі spec §7 у v3-механізмі (arrangement-пас у layout) явно не прив'язаний | **ДІРКА** (arrangement-пас — новий async-крок у layout; epoch-guard для нього не названо) |
| 4 | Порожні / граничні (dept без членів, усі loose) | dept без членів: unionBoxes→null (неявно, не в v3); усі loose: §Виняток лише про authored/matrix, НЕ про tree-усі-loose | **ДІРКА** (tree-режим з усіма-loose: групування дає 1 loose-рамку-на-всіх → або no-op, або фіктивна рамка; v3 мовчить) |
| 5 | Rollback (прапор legacy) | §Рішення крок 4 + §Форма перевірки «Rollback: staffEdgeRouter:'legacy' → поточна поведінка без змін»; незворотних ефектів немає (layout суто обчислення) | закрито ✅ |

Дірок у defense: 3 (№1, №3, №4). Жодна поза скоупом явним рядком. Гейт defense ЧЕРВОНИЙ.

## ВЕРДИКТ: 🔴 BLOCKED

Рахунок прогонів: plan-critique 4 лінзи запущено / 4 повернулось; plan-defense 5 питань прогнано / 5 відповіджено. 0 мовчазних лінз.

Code-заяви v3 звірені на файлах — УСІ ПРАВДИВІ (жодної хибної):
- classifyStaffEdgeRoute:293 ✅ · blocked():316 skip лише from/to:334 ✅ · polylineHitsBoxInterior:221 ✅ · segmentHitsBoxInterior:199 ✅ · forced без cleanliness:380-381 ✅
- paintStaffFrameAndEdges:769 ✅ · memberBoxesByDept рахує paintStaffDepartments:721→contourSceneInputs ✅
- contourSceneInputs→memberBoxesByDept Map<deptId,{positionId,x,y,w,h}[]> ✅ (ключ contourDepartmentId, вкл. NO_DEPARTMENT_ID)
- orgBlockLayout: departmentId НЕ для розміщення, 3 режими, layoutConnectedTree/layoutTreeBlock примітиви ✅
- canvasLayout виклики :71/102/155 ✅ · unionBoxes staffZoneBounds:151 ✅

Blocking-умови зняття (усі мають бути закриті ПРАВКОЮ design-v3 + re-GATE):

1. 🔴 §3.2 має тихий шлях порушення. blocked() лише відхиляє кандидатів; `forced` (staffEdgeGeometry.ts:380-381) повертає маршрут крізь перешкоду БЕЗ перевірки, а §12-драбина v3 ловить ЛИШЕ edge-edge перетини, НЕ frame-penetration. На disjoint, але side-by-side depts forced-крізь-чужу-рамку досяжний на реальних tree-даних → §3.2 порушується ТИХО. Зняти: або (a) розширити §12-міру/маркер на frame-intrusion (forced крізь чужу рамку = позначений залишок, не тихий), або (b) повернути робастний frame-avoiding маршрут (коридор). Зараз §3.2 — обіцянка без гарантії.

2. 🔴 §10.1.4=0 без шва інжекції порядку. «порядок у рідному бенді успадковує порядок джерел-керівників» (§1) — ключ до =0, але reused layoutConnectedTree делегує порядок сиблінгів WASM row-tree (orgBlockLayout.ts:71); v3 не показує, ЯК інжектить цей порядок у WASM-вхід. Без механізму «=0 групуванням» лишається гіпотезою. Зняти: описати точку інжекції порядку (або що WASM його вже тримає — з доказом).

3. 🔴 Loose-bucket рамка не виключена. deptFrames з memberBoxesByDept включать ключ NO_DEPARTMENT_ID (data/types.ts:244) → фіктивна рамка «без департаменту» як перешкода. На реальних даних частина посад без departmentId. Зняти: §2 має явно виключити NO_DEPARTMENT_ID зі списку рамок.

4. 🔴 Re-entrancy нового async arrangement-пасу. staffDeptGrouping — новий async-крок у layout (layoutConnectedTree = async WASM). epoch-guard зі spec §7 прив'язаний до edge-routing, не до layout-arrangement; v3 не каже, що скасовує застарілий arrangement при новому setData. Зняти: рядок про epoch/скасування для arrangement-пасу.

5. 🔴 Валідація кривого входу не перенесена зі spec. spec §5.1 розписав цикл parentId / dangling / self-parent / невідомий deptId / прихований dept → structured-error; v3 про це мовчить (лише «inOrg мають departmentId»). Зняти: явний рядок делегування валідації до spec §5.1 АБО повтор у v3.

6. 🔴 Граничний tree-усі-loose. §Виняток покриває лише authored/matrix; tree-режим, де ВСІ посади без departmentId, v3 не описує (групування = 1 loose-рамка-на-всіх або no-op?). Зняти: рядок про цей випадок (напр. «усі-loose → no-op групування, route-only без рамок»).

Non-blocking (у tasks): валідація-делегування формулювання; WASM-down = не новий mode (назвати); dept-без-членів → unionBoxes null (задокументувати); термінологія коридор/доріжка/шина (spec N5 борг); K-прохідна релаксація §12 — де живе у v3-шві (класифікатор одноразовий).

Умова PASS: правки 1-6 у design-v3 + re-GATE підтверджує. Поки хоч одна відкрита — гейт ЧЕРВОНИЙ.
