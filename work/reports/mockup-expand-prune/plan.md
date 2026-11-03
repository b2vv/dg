# plan.md — issue #96: always-on prune + рольова default-policy (Варіант Y)

**Spec:** `work/reports/mockup-expand-prune/spec.md` (GATE 1 пройдено, OQ1/OQ6 розв'язані owner).
**Принцип reuse:** reuse-first (ponytail). Жодної другої (collapsed-set) моделі. Код лише після **GATE 2 + owner-go**.
**Owner-принцип (наскрізний):** поведінка належить БІБЛІОТЕЦІ, не demo/host. #96 переносить у SDK: прунінг
(collapse), zoom-кламп — те, що demo/host робили самі. Demo перестає дублювати логіку шару.

> **Статус:** РЕАЛІЗОВАНО (2026-11-03). GATE 2 повторний PASS. Усі W1-W7 + прод-фікс `commitDataChange`.
> SDK 1272/0, Demo 135/0, Rust 220/0, typecheck 0, check:docs ✅. Lint — лише передіснуючі TD07. Деталі —
> `report.md`.

---

## 0. Серцевина (напруга, яку план знімає)

- Сьогодні поточна org показує **повне дерево** через **гейт=false** (`buildStaffLayoutInput.ts:217-219`:
  `collapse=false → positions = data.positions`, прунінгу нема взагалі), а **не** через expand-set.
- Знявши гейт (always-on prune), з **порожнім** expand-set `visiblePositions` дасть поточній org **head-only**
  — **регресія** (поточна має бути повна за контрактом).
- Модель — **expanded-set, дефолт-collapsed** (`positionExpand.ts`: не-expanded вузол ховає дітей). Контракт
  хоче поточна=дефолт-expanded. Примирення без інверсної моделі й без нового стану → **рольово-свідомий seed на
  наявному три-стані `p.expanded`** (undefined/true/false, §2.1): поточна org `expanded !== false` → expanded;
  яруси 1/3 `expanded === true` → expanded (інакше head-only). Toggle пише `p.expanded` (setPositionExpandedFlag),
  тож MERGE і rollback виходять самі собою.

## 1. Reuse inventory (що вже є — НЕ переписувати)

| Потрібне | Є (path:line) |
|---|---|
| BFS-прунінг від голови | `visiblePositions` (positionExpand.ts:48-79) |
| expanded-перевірка | `isPositionExpanded` (positionExpand.ts:34-41) |
| admin-діти/батьки | `adminChildrenMap` (positionExpand.ts:5), `adminParentMap` (resolveHead.ts:5) |
| tree-шлях прунінг tiers | `collapseVisiblePositions` (buildStaffLayoutInput.ts:158-186) |
| ярус1 стеля (керівний склад depth-1) | `leadershipOf` (buildStaffLayoutInput.ts:97-106) |
| toggle-стан | `staffExpandedPositionIds` (ViewStateStore), `togglePositionExpand` (OrgHierarchyDiagram.ts:1324) |
| детач-корені (seed) | `detachedRootIds` (resolveHead.ts:37) |
| expand-set → layout | OrgHierarchyDiagram.ts:862,2267 → `options.expandedPositionIds` |
| **seed set із даних** | `seedExpandedPositionsFromData` (OHD:676-681) — **модифікуємо (B1)**; кличеться з `create`(:405), `setData`(:1211), `drawOrRestore`/rollback(:740) |
| **toggle пише три-стан** | `setPositionExpandedFlag` (OHD:683-692) — пише `p.expanded` + мутує set |
| шеврон-UI | `showExpand` (DiagramRenderer.ts:869) — **модифікуємо (B3)** |
| zoom-кламп | Viewport minScale (Viewport.ts:65,84,183), діаграмний clamp (OHD:1936-1937) — **піднімаємо 0.36 (B2)** |
| depth-expand (резерв) | `expandIdsForDepth` (positionExpand.ts:85) — якщо знадобиться shallow-default |

## 2. Design (рекомендований)

### 2.1 Рольово-свідомий seed на ТРИ-СТАНІ `p.expanded` (фікс B1 GATE 2)
**Напруга:** поточна org дефолт-expanded, яруси 1/3 дефолт-collapsed — асиметрія напрямів. Наявний
`seedExpandedPositionsFromData` (OHD:676-681) робить `.clear()` + reseed лише з `p.expanded===true` (дефолт
collapsed для ВСІХ). Для рольового контракту робимо його **рольово-свідомим на наявному три-стані**
`p.expanded` (undefined / true / false):
```
for p of data.positions:
  якщо p.organizationId === currentOrgId:        // ярус 2 поточна
     add(p.id)  якщо p.expanded !== false         // undefined|true → expanded; явний false → collapsed
  інакше:                                          // яруси 1/3 (керуюча/підпорядковані)
     add(p.id)  якщо p.expanded === true           // дефолт collapsed (head-only)
```
> **NB2 (GATE 2, тест-зобовʼязання W1):** «ручний collapse лишається» — ЛИШЕ якщо оновлені дані несуть
> `p.expanded=false`; свіжі дані з `undefined` на тій посаді РОЗГОРНУТЬ її (дзеркало наявної expand-поведінки,
> напрям перевернувся). W1-тест має покрити ОБИДВА кейси (update з false → лишається collapsed; update з
> undefined → expanded). Звірено з owner-інтентом MERGE (нове видно; явний стан зберігається в даних).

**Чому це фіксить B1 повністю** (без нового стану / збереження prev-set):
- **Рольовий дефолт:** current-org посади без флага (undefined) → expanded (ярус2=all); сусідні → collapsed.
- **MERGE (OC1) «безкоштовний»:** нова current-org посада приходить із `expanded=undefined` → expanded;
  ручний collapse лишив `expanded=false` (пише `setPositionExpandedFlag` :687) → лишається згорнутим. Не треба
  зберігати попередній current-org set.
- **rollback (drawOrRestore :738-740) lossless:** reseed з флагів `lastDrawnData` зберігає і expands, і
  collapses (бо `setPositionExpandedFlag` матеріалізує стан у `p.expanded` на `this.data`). role-default-all НЕ
  ре-інʼєктується поверх ручного collapse (бо той = `false`).
- **setData (:1209-1211):** `this.data=next` перед seed — ОК, бо новий seed читає три-стан `next`, prev-set не
  потрібен.
- **НЕ інверсна модель:** той самий `p.expanded` флаг + той самий `staffExpandedPositionIds`, що вже є;
  `visiblePositions`/`isPositionExpanded` не чіпаємо. Змінюється лише правило заповнення set за роллю org.
*Відкинуто (моя ж попередня чернетка):* «матеріалізувати all + зберігати prev current-org set» — зайвий стан,
ламає rollback; три-стан простіший і reuse-first.

### 2.3 Зняти гейт глобально (OQ3) — ВСІ читачі (фікс B3 GATE 2)
`collapseUnexpandedPositions` прибрати як вмикач. **Повний список читачів (звірено, не «мабуть»):**
- `buildStaffLayoutInput.ts:213-219`: завжди `collapseVisiblePositions(...)` (прибрати гілку `collapse ?`);
  reports-фільтр (:224-228) теж стає безумовним.
- `DiagramRenderer.ts:853` `collapsePositions = ...===true` + **:869** `showExpand = collapsePositions &&
  kids>0 && onPositionExpandToggle`. **B3:** механічне `collapsePositions→false` прибрало б шеврон → toggle
  мертвий → ламає AC2/BC4. **Правильна заміна:** `showExpand = kids.length > 0 && !!onPositionExpandToggle`
  (прибрати гейт-терм, лишити kids+handler).
- `types.ts` публічний тип (поле) + `DEFAULT_STAFF_LAYOUT_OPTIONS` (:84) + **doc :158** (N4) — прибрати.
- `orgBlockLayout.ts:379` — звірити й зняти.
- demo `tabConfigs.ts` (staff-tree:213, staff-brigade:344, +239/394) — прибрати прапор (§4).
**Hard-remove** (owner «глобально зняти гейт»): поле зникає з публічного типу. Міграція — §5.

### 2.4 Alpha/mockup-шлях шанує collapse поточної org (ядро #96)
`buildStaffMockupInput` (staffLiveGeometry.ts:327) + `computeViaMockup` (:366):
- прокинути `staffExpandedPositionIds` (вже рольово-засіяний, той самий source, що tree-шлях — OHD:862,2267)
  у `buildStaffMockupInput`;
- прунити `inOrg` через `visiblePositions(data.positions, data.reportLines, currentOrgId, expandedIds)`
  **перед** map (:342) — та сама функція, що tree-шлях; reports відфільтрувати за visibleIds (як
  buildStaffLayoutInput.ts:223-228).
- Alpha однооргівський → рольовий дефолт = all поточної → візуально повне дерево як сьогодні, але toggle
  тепер ховає піддерева (AC1, AC2).
- **N1 (guard):** `visiblePositions`→`resolveStaffHead` КИДАЄ при !=1 isHead / !=1 parentless
  (resolveHead.ts:54-69). На alpha раніше рендерилось без цього → латентний throw для хостів (cass). Додати
  guard: якщо head нерозв'язний — не прунити (повернути `inOrg` як є), дзеркало інертної гілки
  `collapseVisiblePositions:173-176.`

### 2.5 Multi-org фікстура (OQ4)
Нова test/demo-фікстура: поточна org + керуюча (parentOrgId) + 1-2 підпорядковані (child). Для unit-тестів
контракту (ярус1/3 head-only, ярус2 all) на tree-шляху. Форма (розширити mock3 чи окрема) — на GATE 2;
рекомендація: **окрема тестова фікстура** (не чіпати mock3 alpha-таб, щоб не плодити регресій).

### 2.6 Глобальний library zoom-кламп 0.36 (фікс B2 GATE 2; owner «zoom глобально»)
**Принцип (owner):** поведінка належить БІБЛІОТЕЦІ, не demo. Нижню межу zoom-fit піднімаємо з 0.15 до **0.36**
у бібліотеці глобально, а не в demo-alpha-конфігу.
- Поточний Viewport min-scale дефолт — `Viewport.ts:25` (`DEFAULT_MIN_SCALE`, діапазон ~0.15–4 у doc OHD:1936-1937);
  Viewport клампить fit (Viewport.ts:84,183,411,419); `staffChromeGeometry.minScale` дефолт 0.55 (:221).
- **Чому B2 закривається:** контракт `current=all` не міняється; великий staff (brigade 11 депів) повно
  розгортається, але staff-fit не впаде нижче 0.36 → читабельно (скрол замість zoom-out-to-0.15).
- **NB1 РОЗВ'ЯЗАНО (owner 2026-11-03): УНІВЕРСАЛЬНО org+staff.** floor 0.36 = `DEFAULT_MIN_SCALE` (Viewport.ts:25),
  спільний для всіх діаграм. Owner свідомо прийняв наслідок (org-overview ~50k не вміститься повністю нижче 0.36
  — скрол замість fit). Рев'юерське застереження NB1 перекрите owner-рішенням. Реалізація: підняти
  `DEFAULT_MIN_SCALE` 0.15→0.36 (звірити точне поточне значення у Viewport.ts:25).
- **Demo:** прибрати будь-яке host-боку zoom-лімітування на ШПС (переїхало в бібліотеку — owner-принцип).

## 3. Work items (порядок, tdd)

1. **W1:** рольово-свідомий `seedExpandedPositionsFromData` (три-стан, §2.1) + unit-тести: поточна undefined→
   expanded, явний false→collapsed; яруси1/3 undefined→collapsed, true→expanded; детач-корені; MERGE (нова
   посада→expanded, збережений collapse); rollback-reseed lossless.
2. **W2:** зняти гейт — ВСІ читачі (§2.3): buildStaffLayoutInput, DiagramRenderer `showExpand` (B3), types(+doc),
   orgBlockLayout + оновити тести, що залежали від гейта.
3. **W3:** alpha-шлях прунінг (buildStaffMockupInput + computeViaMockup) + N1 head-guard + тести AC1/AC2.
4. **W4:** універсальний zoom-кламп 0.36 (§2.6, `DEFAULT_MIN_SCALE` Viewport.ts:25, owner: org+staff) + тест
   (fit не нижче 0.36) + прибрати demo-боку zoom-ліміт. Переглянути наявні тести, що фіксували 0.15-floor.
5. **W5:** multi-org фікстура + контрактні тести AC3.
6. **W6:** `docs/USAGE.md` — прибрати `collapseUnexpandedPositions`, описати рольовий дефолт + zoom-кламп;
   `check:docs` зелений.
7. **W7:** міграція demo-табів (§5) + візуальна перевірка (brigade full-expand + clamp 0.36 читабельний).

## 4. Side-effects (звірено)

- **staff-brigade** (tabConfigs.ts:344) — гейт `true` БЕЗ expand-set навмисно («stops at section chiefs; full →
  zoom 0.15», коментар :341-343). Після зняття гейта + рольового дефолту `ярус2=all` поточна org **розгорнеться
  повністю** (не «вид не змінюється» — попереднє твердження було ХИБНЕ, B2). **Читабельність рятує глобальний
  zoom-кламп 0.36** (§2.6): fit не впаде до 0.15. Міграція: прибрати прапор, прийняти full-expand+clamp.
- **staff-tree** (tabConfigs.ts:213) — так само гейт `true`; перевірити, чи його поточна org не стане
  задовеликою (той самий clamp рятує). Прибрати прапор.
- **staff-alpha** (tabConfigs.ts:164) — гейт `false` → сьогодні повне дерево. Після зміни: рольовий seed
  (поточна=all) → **візуально те саме**, toggle запрацює. Регресії виду нема (AC-sanity).
- Демо host-prune `staffVisibleData` (StaffChromeBackdrop.ts:48) — стає зайвим (бібліотека тепер прунить сама,
  owner-принцип «правки в бібліотеці»). Його зняття — природний наслідок (мета cass); **чи в цьому PR, чи
  наступним — OC2 на GATE 2** (не блокує фікс, але owner-принцип тягне до зняття).

## 5. Migration

- Публічний тип: `collapseUnexpandedPositions` **видаляється** (breaking). Консьюмери, що ставили `true` →
  поведінка тепер дефолтна (нічого робити). Консьюмери, що покладалися на `false`=повне-дерево-всіх-orgs →
  отримають рольовий дефолт (поточна full, сусідні head-only) — **свідомий breaking**, owner схвалив.
- `docs/USAGE.md`: видалити згадки гейта, додати секцію рольового дефолту + поведінку `togglePositionExpand`
  на всіх шляхах. (check:docs facadeSurface — `togglePositionExpand` уже документований; нових публічних
  методів нема.)

## 6. Rollback

- Зміни у staff-layout + render + positionExpand + Viewport (zoom-кламп) + DiagramRenderer (showExpand).
  Revert гілки `fix/96-mockup-expand-prune` повертає гейт, стару alpha-поведінку й старий zoom-floor. Нема
  міграцій даних/persist. Rust `packages/core` **не чіпається** (Y) → нема WASM-ребілду в rollback.

## 7. Test plan (tdd, red-first)

- unit: рольово-свідомий seed три-стан + MERGE + rollback-lossless (W1); зняття гейта + showExpand (W2);
  alpha prune AC1/AC2 + N1 head-guard (W3); zoom-кламп 0.36 (W4); multi-org контракт AC3 (W5).
- регресія: наявні `buildStaffLayoutInput.test.ts`, staff-layout golden — переглянути: тести, що фіксували
  gated-поведінку (gate=true), тепер = дефолт; тести на gate=false повне-дерево-всіх-orgs зміняться (рольовий).
- `npm run test:rust` — без змін (Rust не чіпаємо), прогнати для певності.

## 8. Open choices → GATE 2

**Owner-закриті (не переглядати):** OC1 MERGE (→ три-стан seed §2.1); B2 контракт current=all + global zoom
0.36; гейт global hard-remove; рольовий контракт §2.2.

**Відкрите на GATE 2:**
- OC2: форма multi-org фікстури (розширити mock3 vs окрема) — рекомендація: окрема.
- OC3: детач-корені (T65) у поточній org при дефолт-expanded — звірити, що не дублюються (reviewer: seed=all
  надмножина detachedRootIds — ок, але перевірити на three-state).
- OC4: точний knob zoom-клампа (DEFAULT_MIN_SCALE library-global vs staff-fit minScale) — §2.6; чи 0.36
  глобально не зашкодить org-діаграмі.
- OC5: зняти demo `staffVisibleData` host-prune у ЦЬОМУ PR чи наступним (owner-принцип «правки в бібліотеці»
  тягне до зняття; не блокує фікс).
- OC6: N3 — `staffCurrentOrgId` може бути null на момент seed → fallback `inferStaffCurrentOrgId` (звірити ім'я).
