model: claude-opus-4-8

# GATE 2 review — subordinate-counts (A) + node-sugar accessor (B)

ДАЛІ: прочитав spec.md (12 AC) + plan.md. Тепер звіряю підозри автора проти коду:
setData commit-вікно, appendData, getData docblock, типи DiagramReportLine/DiagramPosition,
стори selection/viewState. Потім три лінзи (plan-critique, plan-defense, конституція).

## ФАКТИ (звірка підозр автора проти коду)

- **setData commit-вікно** (OrgHierarchyDiagram.ts:1302-1307): `next = await mapConfig`(1302) → epoch-check(1303) → `index = await searchService.buildForScale`(1304) → epoch-check(1305) → `this.data = next`(1307). Вставка `computeSubordinateCounts` між 1305 і 1307 — СИНХРОННА, без await. Підтверджено. ✔
- **getData docblock ~7.6мс/4000** (1278) + `structuredClone(this.data)` (1283) — підтверджено. ✔
- **appendData** (1352): epoch читається, НЕ інкрементиться (1353); `merged = mergePartial(...)`(1367) дає ПОВНІ positions+reportLines (mergeData.ts:25-35); `this.data = merged`(1374). Recompute на `merged` перед 1374 — синхронний, epoch-сумісний. ✔ АЛЕ план (plan.md:54) лишає hedge «якщо дорого — відкласти» → це і є stale-шлях, якого боявся автор. O(V+E) вже визнано дешевим → hedge безпідставний.
- **DiagramReportLine** (data/types.ts:181-191) НЕ має organizationId — лише fromId/toId/kind/payload. Cross-org guard мусить дивитись org через positions-map (DiagramPosition.organizationId обовʼязковий, :119). Здійсненно сигнатурою (positions, reportLines). ✔
- **Футер-гейт** (orgCardChrome.ts:14): `childrenCount !== undefined || allDescendantCount !== undefined` — VALUE-check, не key-presence. Отже лист: достатньо значення `undefined` (видаляти ключ не обовʼязково). AC1/AC5/AC6 несуперечливі: SDK завжди рахує; для листа результат = undefined, що КЛОБЕРИТЬ host-число. plan.md:36 явно «видалити поля (undefined)». ✔ — але plan.md:29 «лише не-листи в Map; лист лишиться undefined» неявно припускає host не слав; клобер host-числа на листі тримається ТІЛЬКИ на :36. Wiring мусить пройтись по ВСІХ позиціях і очистити листи, не лише застосувати Map.
- **getState / expanded**: канонічний предикат у коді — `isPositionExpanded(pos, set)` = `pos.expanded===true || set.has(id)` (positionExpand.ts:35-42). План рахує expanded ЛИШЕ з set (plan.md:46). seedExpandedPositionsFromData (754-772) при setData reconcile-ить data-прапор у set (current-org: `expanded!==false`; інші org: `expanded===true`, лише якщо hasAdminChildren). Тому ПІСЛЯ setData set-only ≈ isPositionExpanded. Розбіжність лишається для `expanded===true` без дітей (не в set, але isPositionExpanded=true) — кутовий. Реюз `isPositionExpanded` зняв би ризик. Non-blocking.
- **getState / collapsed «має дітей»**: існує `positionHasAdminChildren(id, positions, reports)` (positionExpand.ts:24-33) + після A буде childrenCount. План не згадав реюз цих. Non-blocking (reuse-first miss).
- **getState / hovered**: viewState.highlightedNode — `string | null` (ViewStateStore.ts:11), лише id без kind; getState звірятиме `=== ref.id` (не розрізняє kind). Non-blocking.
- **getNode** — імені немає в коді (без колізії); `NodeRef`/`sameNodeRef` уже публічні (index.ts:206,238). Новий публічний метод → мусить у docs/USAGE.md (facadeSurface gate) — AC12 покриває. ✔

## ЛІНЗА 1 — plan-critique (4 лінзи)

**AI-slop:** немає. Усі твердження заземлені file:line; reuse-таблиця конкретна; «~7.6мс/4000», «commit-вікно :1307-1329», «core чистий шар» — усі верифіковані проти коду. Placement (core/ як логіка) підтверджено: core/*.ts не імпортує render/wasm/pixi (лише docblock-проза про чистоту).

**Логічні прогалини:**
- [BLOCKING] appendData: план додає код у appendData (side-effects §, plan:52-54 «перерахувати counts і в appendData»), АЛЕ (а) лишає hedge «якщо дорого — відкласти» — нерозвʼязана розвилка в плані; (б) у таблиці Acceptance (S1-S9) НЕМАЄ жодного сценарію на appendom-перерахунок. Це і є stale-шлях, якого боявся автор, і він не покритий тестом. Порушує tests-first (work/TDD.md, увесь репо).
- [non-blocking] Клобер листа тримається лише на plan:36 («видалити поля undefined»), тоді як plan:29 («лише не-листи в Map») неявно припускає, що host не слав число. Wiring мусить пройтись по ВСІХ позиціях і очистити листи, не лише застосувати Map — інакше host-число на листі виживе й зламає AC5.
- [non-blocking] getState.expanded рахується лише з set (plan:46), а канон сцени — `isPositionExpanded` = `expanded===true || set.has` (positionExpand.ts:35). Після setData seed reconcile-ить, тож збіг ≈ є; розбіжність лише для `expanded===true` без дітей.

**Зайва складність:**
- [non-blocking] cross-org guard захищає by-construction-інваріант (AC2/AC4: ребра within-org за побудовою). Прийнятно (AC8 вимагає не падати на невідомому org), але простіше звести до «обидва кінці в positions-map», ніж явне порівняння org.
- [non-blocking] Reuse-first miss: вже існують `adminChildrenMap`/`positionHasAdminChildren`/`isPositionExpanded` (positionExpand.ts) — adminChildrenMap уже скіпає self-loop і missing-id (рядки 15-16). computeSubordinateCounts і getState мають їх перевикористати (KISS), план їх не згадав.

**Непокриті edge-cases:**
- [non-blocking] getNode для kind='person'/'organization': getState.{expanded,collapsed} семантично невизначені (сценарії S7/S8 лише position). Треба зафіксувати: person → expanded/collapsed=false.
- [non-blocking] getState для ORG: план бере expanded ← staffExpandedOrgIds, але docblock 296-309 каже, що намальовані tier-3 org-картки живуть окремо в lastDrawnStaffOrgIds — AC10 «узгоджено зі сценою» під ризиком для org. Зафіксувати джерело.
- [non-blocking] getNode подвійний null (getNode→null vs getData→null) — уточнити в tasks.

## ЛІНЗА 2 — plan-defense (5 питань) — усі закриті

1. **Malformed input:** cycle/self-loop/missing-id/no-org → visited-set (plan:27) + guard (plan:31) + AC8. adminChildrenMap-патерн уже скіпає self-loop і missing-id. Закрито, з нотаткою перевикористати скіп. ✔
2. **Залежність впала:** computeSubordinateCounts pure, без I/O; B на порожніх сторах → усе false / null. ✔
3. **Race / повторний виклик:** setData epoch-guard (1303/1305) + синхронний commit верифіковано; appendData epoch read-only + синхронний recompute; getNode — синхронне читання цілісного знімка this.data (setData замінює знімок атомарно). ✔
4. **Порожні/межові:** empty positions → empty Map; single head без дітей → undefined (S2); org без head не впливає (counts по roots, не по head). ✔
5. **Rollback:** additive + одна вставка; revert коміту; без міграції даних (plan §Rollback). Вікно подвійного джерела закрите порядком (plan:60: host дропає legacy лише після зеленого SDK). ✔

Жодного питання без відповіді з посиланням на план.

## ЛІНЗА 3 — Конституція (.claude/standards.md)

- **Тести перед кодом (work/TDD.md, увесь репо):** S1-S9 unit до коду ✔ — АЛЕ appendData-шлях без сценарію = порушення (див. BLOCKING вище).
- **KISS>GoF:** pure-функція + additive метод, без патернів ✔ (reuse-miss послаблює, не ламає).
- **Публічний API = docs/USAGE.md:** getNode — новий публічний метод → facadeSurface.mjs зловить; мусить у USAGE.md того ж коміту, інакше baseline 7→8 (red). AC7/AC12/S9 покривають ✔. USAGE.md зараз НЕ згадує childrenCount/allDescendantCount взагалі (grep=0) → немає застарілого твердження для виправлення, лише додати. ✔
- **Межа WASM↔TS:** counts = граф-логіка → TS core/, геометрія лишається в Rust ✔. Дублювання з Rust row-tree немає (те — геометрія).
- **Pocock лише TS:** весь дифф TS ✔.

## ВЕРДИКТ: RED

Блокує рівно одна знахідка:

**[BLOCKING] appendData — додається код без тесту + нерозвʼязаний hedge.**
- Місце: plan.md §Side effects (рядки 52-54) + таблиця Acceptance (S1-S9, рядки 72-80).
- Проблема: план комітить перерахунок counts у appendData (OrgHierarchyDiagram.ts:1352), але (а) лишає «якщо дорого — відкласти» як невирішену розвилку, (б) жоден S-сценарій не покриває appendData → counts свіжі. Tests-first порушено для реально доданого шляху; це саме stale-шлях, якого боявся автор.
- Найменший фікс: прибрати hedge (O(V+E), вже визнано дешевим) і додати сценарій S10 «appendData з новим підлеглим → counts перераховані, лист→не-лист переходить з undefined на число» (unit); АБО явно винести appendData-перерахунок з scope і задокументувати обмеження stale. Поки відкрито — гейт червоний.

Non-blocking (не тримають гейт, усунути в tasks/plan): клобер-листа wiring по ВСІХ позиціях; реюз adminChildrenMap/positionHasAdminChildren/isPositionExpanded; getState джерело для org (staffExpandedOrgIds vs lastDrawnStaffOrgIds) + person semantics; cross-org guard спростити; getNode подвійний null.

Усі 4 лінзи повернулись; усі 5 питань plan-defense закриті; інших порушень конституції немає. Гейт червоний ТІЛЬКИ через один blocking-пункт (малий фікс).

## RE-CHECK (координатор закрив blocking) — ФІНАЛ

Перечитав plan.md оновлення:
- **§Side effects (plan.md:52-56):** hedge «якщо дорого — відкласти» ЗНЯТО; appendData ЗАВЖДИ перераховує counts на `merged` (повні positions+reportLines, mergeData.ts:25-35) ПЕРЕД commit `this.data=merged` (:1374), синхронно, epoch лише читається. Звірено з кодом — коректно. ✔
- **S10 (plan.md:83):** «appendData з новим підлеглим → counts перераховані; лист→не-лист undefined→число», unit, AC1/AC5. Покриває раніше-непокритий шлях. ✔
- **§GATE 2 закриття (plan.md:85-102):** усі 5 non-blocking розвʼязані коректно:
  1. клобер листа по ВСІХ позиціях (явне видалення полів для листів, не покладатись на «host не слав») ✔
  2. reuse adminChildrenMap/positionHasAdminChildren/isPositionExpanded ✔
  3. getState: position ← isPositionExpanded+positionHasAdminChildren; org tier-3 ← lastDrawnStaffOrgIds (НЕ staffExpandedOrgIds — збігається з docblock 296-309); person=false; +покриття org/person у S8/AC10 ✔
  4. cross-org guard = обидва кінці в positions-map ✔
  5. getNode→null для невідомого ref ✔

Нових blocking не внесено. Єдина дрібниця (не-гейт): Констит-чек (plan.md:105) досі пише «S1–S8», не згадує S10 — косметичне відставання, не блокує.

## ВЕРДИКТ: GREEN

Єдиний blocking (appendData tests-first) закрито: hedge знято + S10 додано. Усі 4 лінзи повернулись, усі 5 питань plan-defense закриті, конституція чиста, усі 5 non-blocking адресовані в плані. Відкритих blocking-знахідок немає. Гейт зелений.
