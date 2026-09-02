# Критика `dg` — зведення чотирьох незалежних оглядів

**Базис:** `b2vv/dg@805efee` (`main`), 17 169 рядків non-test.
**Метод:** чотири агенти з різними лінзами (AI-slop, дірки в логіці, зайва складність,
непокриті edge cases), кожен читав код незалежно. Нижче — дедупліковане зведення.
**Статус:** усі чотири огляди завершені.
**Remediation:** [T77](../archive/tasks-2026-09-02.md) (M01–M11) · гілка `cursor/t77-critique-remediation-babc`

## Scorecard (2026-08-24)

| ID | Статус | Коміт |
|----|--------|-------|
| §1.1 C1 compute-then-ignore | ✅ M01 Option B | `d1db4a2` |
| §1.2 layout.rs dead | ✅ M09 deleted | — |
| §1.3 pipeline no consumers | ✅ M09 deleted | — |
| A1 dup-id wasm trap | won't-fix (wasm boundary) | — |
| A2 recursive walks | won't-fix (node count bounded) | — |
| A3 worker error/messageerror | ✅ M02 | `97c502d` |
| A4 PixiHost destroy-during-create | ✅ M03 | `97c502d` |
| A5 self-parent reportLine | ✅ skip self-loops | — |
| A6 appendData duplicate | ✅ M04 merge-by-id | `97c502d` |
| A7 expandToDepth BFS seen | ✅ M11 | `8788908` |
| A8 fractional matrix index | ✅ M11 + N1 persist floor | `8788908` |
| A9 smooth_iterations OOM | ✅ M11 clamp 8 + test | `8788908` |
| A10 drag grab-offset | ✅ M05 | `97c502d` |
| A11 snap wrong pitch | ✅ M05 snapWorldToCell | `97c502d` |
| A12 expand-nonroot wipes forest | ✅ M06 revealOrgPath | `97c502d` |
| A13 print() fail | ✅ throws + unit test | — |
| A14 placeOrgAtMatrixCell no-op | won't-fix (returns patched array) | — |
| §3 collapsed definition split | ✅ M10 isOrgCollapsed + tests | `8241d12` |
| §3 search NFC | ✅ M10 fold + tests | `8241d12` |
| §3 export 8-byte PNG | ✅ M07 seam + test | `8788908` |
| §3 export placeholder / blank PDF | ✅ M10 throw ExportError | — |
| §3 SVG org-only / multi-org | ✅ M10 org layout branch | — |
| §3 NaN layout metrics | ✅ M10 is_finite guards | — |
| §3 shiftPositionBlock false positives | ✅ M10 report shifted ids only | — |
| §3 promote multi-id | ✅ M10 typed `kind:id` | — |
| §3 fillet invert | ✅ M10 `r·tan(φ/2)` + octagon test | — |
| §3 hanging parentOrgId | ✅ throw Unknown parentOrgId | — |
| §4 layout.rs siblings >= | ✅ M07 upper-bound + layout fix | `8788908` |
| §4 G6 flood assertion | ✅ M07 strengthened | `8788908` |
| §4 pngExport jsdom-sniff | ✅ M07 DI seam | `8788908` |
| §5 validateOrgHierarchy O(n²) | ✅ M08 TS+Rust byId once | `8788908` |
| §5 search sort-all hits | ✅ M08 early-exit + top-k | `8788908` |
| §6 dead code | ✅ M09 purge (`layout.rs`, pipeline, wasm extras) | — |

**Що я перевірив особисто** (не з чужих слів): відкинутий результат контуру, подвійне
масштабування в `layout.rs`, викидання регіонів у `contour.rs:544`, мертвий гард у
`subtree.ts:22`, `scale` без жодного читача, 8-байтовий PNG і його зелений тест, дві
суперечливі дефініції `collapsed`, асиметрія падіння на безголовій організації, відсутність
`error`-слухача у worker-мості, поріг drag'у (R1), інвертована формула фаски (R3).

**Розбіжність між оглядами, вирішена читанням.** Один огляд назвав `core/src/layout.rs`
«faithful implementation», інший знайшов у ньому подвійне масштабування. Правий другий:
`first_walk:128` кладе в `prelim` **пікселі** (`prelim + sep()`, де `sep() = node_width + gap`),
`second_walk:154` їх лише переносить, а `collect_nodes:294` множить на той самий крок ще раз.

---

## 1. Головне: три найдорожчі підсистеми не підключені

Це не окремі баги, а один патерн — і він пояснює, чому решта дефектів так довго жила.

### 1.1 Rust-контур обчислюється й викидається

`render/DiagramRenderer.ts:413` — `applyContourResults(_results, morph)`. Параметр не
читається; фарбування бере `buildPaintRingsByDept()`, чисто TS-шлях. Три виклики
(`:520` перший рендер, `:530` відновлення drag, `:541` прев'ю drag) роблять
`await session.compute(...)` — раунд-тріп у worker і WASM — заради значення, яке ігнорують.

У всій директорії `render/` тип `DeptContourResult` є рівно тричі: імпорт, сигнатура
обчислювача, ігнорований параметр.

**Знайдено двома агентами незалежно** — один читав сигнатури, другий будував граф досяжності
викликів. Наслідок: 1168 рядків `contour.rs`, правила G1–G8, власний словник у `CONTEXT.md`
і десяток тікетів (T07, T14, T40, T41, T43, T46, T47, T49, T50) не малюють канвас.

Другий споживач, `svgExport.ts:272`, — гілка `else if`, недосяжна на практиці: `:60-64`
падає на `data.positions[0]?.organizationId`, тож коли позиції є, виграє staff-гілка з
TS-шляхом.

### 1.2 `layout.rs` недосяжний

473 рядки Reingold–Tilford з нитками. `org_layout.rs:2` використовує
`compute_ploeg_layered_layout` (зовнішній крейт `tidy_tree`). `layout.rs` доступний лише через
`wasm_compute_layout` → worker-ключ `computeLayout`, який **ніхто ніколи не постить**. Те саме
для `buildFromFlat` і `wasm_tree_stats` (останній не має жодної JS-згадки).

### 1.3 `worker/pipeline.ts` — фреймворк стратегій без користувачів

`createWorkerPipeline` викликається лише з `createContourPipeline`, а той — лише з власного
тесту. Метод `.step()` не має жодного виклику; `runSync` кидає для будь-якого конвеєра,
зібраного через `stepKey`. Два режими взаємовиключні й живуть в одному класі.

> **Наслідок для пріоритетів:** важкі дефекти, знайдені в §1.1 і §1.2, треба переоцінити.
> Викидання всіх регіонів контуру крім найбільшого (`contour.rs:544`) і проковтування оточеної
> чужої клітинки б'ють лише по SVG-експорту. Подвійне масштабування в `layout.rs:288`
> (сиблінги розлітаються на 240× — заміряно x=24 і x=57624) не б'є ні по чому. Це не робить їх
> неважливими — це робить їх **дешевими**, бо код або видаляється, або лагодиться без ризику.

---

## 1.4 Наслідок для двох «критичних» знахідок

Огляди зійшлися ще на одному: **намальований контур — це не магнетизм, а звичайний AABB**
навколо карток департаменту (`contourButtonGroup.ts:45`). Тобто на канвасі департаментський
блоб просто охоплює прямокутник із усіма своїми картками — і поглинає чужі картки, що
опинились усередині. Правила G5/G6/G7, notch і far-side wall, які `SPEC.md` позначає ✅, на
екрані не існують у жодному вигляді.

---

## 2. Аварії

| # | Що | Де | Симптом |
|---|---|---|---|
| A1 | Дублікат id, що утворює цикл батьківства | `core/hierarchy.rs:20-26` | нескінченна рекурсія → `unreachable`-trap у wasm; інстанс модуля непридатний, не `Err` |
| A2 | Усі обходи рекурсивні, стеля ~1500–1800 | `layout.rs`, `ploeg_layout.rs`, `hierarchy.rs`, `lib.rs` | глибокий ланцюг організацій кладе модуль |
| A3 | Немає `error`/`messageerror` слухача | `worker/bridge.ts:26-51` | 404 на чанк воркера або CSP → застосунок «висить» рівно **120 с**, потім тихо працює |
| A4 | `destroy()` під час `create()` | `render/PixiHost.ts:36-42` | StrictMode/зміна маршруту → витік WebGL-контексту; після 8–16 циклів канвас чорніє |
| A5 | Один самопосилковий `reportLine` | `orgBlockLayout.ts:53` → `org_tree.rs:36` | `validate_org_hierarchy` відкидає **будь-який** цикл → порожнє полотно |
| A6 | `appendData` не дедуплікує | `index.ts:848`, `mergePartial:1379` | повторно надісланий чанк → `Duplicate organization id` → діаграма зникає |
| A7 | `expandToDepth(Infinity)` | `positionExpand.ts:84` | єдиний BFS у файлі без `seen` → вкладка вішається на циклічному графі |
| A8 | Дробові координати матриці | `matrixGrid.ts:124` | `grid[1.5]` → `TypeError` зсередини `render()` |
| A9 | `smooth_iterations` без межі | `contour.rs:561` | 18 ітерацій = 1.5M точок / 30 МБ рядка; ~24 = OOM-abort |
| A10 | **Звичайний клік по картці комітить переміщення посади** | `DiagramRenderer.ts:614` | `nx = local.x - width/2` відкидає grab-offset, і поріг `> 4` порівнює вже пересунуту точку з початковою. Взяти картку за 60 px від центру, смикнути на 1 px → `moved = true` → `movePersonToCell`. Drag не покритий жодним тестом |
| A11 | **Snap drag'у рахує не той крок** | `DiagramRenderer.ts:639` | `snapToGrid(..., config.cellWidth)`, тоді як розкладка ставить картки на `refCellWidth + gap` плюс origin ярусу. Для `row ≥ 2` картка після «підняти й покласти на місце» стрибає вниз. Правильний крок рахується **на 100 рядків вище**, у трансформі контуру |
| A12 | Розкриття будь-якої не-кореневої організації стирає решту діаграми | `rowTreeLayout.ts:24`, `orgMode.ts:39` | перевірено виконанням |
| A13 | `print()` не може відкрити вікно | `exportDiagram.ts:86` | — |
| A14 | `placeOrgAtMatrixCell` — no-op за дефолтної форми матриці, але рапортує успіх | `matrixGrid.ts:109`, `index.ts:785` | — |

---

## 3. Тихі неправди — гірші за аварії

Аварія помітна. Ці — ні.

- **`node_width = NaN` повертає `Ok`** з `width = -Infinity` і шляхами `"M NaN 96"`
  (`lib.rs:44`, `layout.rs:328`). `JSON.stringify` робить із них `null`, браузер відкидає шлях,
  користувач бачить порожнечу. Поруч, `contour.rs:598`, гард `is_finite()` **є** — прийом
  відомий, просто не застосований.
- **Експорт вигадує успіх.** `pngExport.ts:43` повертає `new Blob([PNG_SIG])` — 8 байтів.
  `extractPngFromPixi` малює літеральний текст `'Export placeholder'`. PDF без Pixi-застосунку
  дає суцільну сіру сторінку.
- **Діаграма лише з організацій експортується порожньою** — обидві гілки `svgExport.ts`
  гейтяться на позиціях, а організації малюються тільки всередині staff-гілки.
- **Кілька організацій — експортується одна.** `currentOrgId` за замовчуванням `undefined`.
- **`shiftPositionBlock` рапортує посади, яких не рухав** (`positionMove.ts:74`) — і хост
  персистить ці переміщення через `onLayoutChange`.
- **Висячий `parentOrgId`**: Rust мовчки приймає (`org_tree.rs:24`), TS мовчки викидає **цілу
  гілку** (`rowTreeLayout.ts:30`), а `orgBlockLayout.ts:62` заклеює симптом шимом
  «Defensive: re-parent orphans». Причина лишається у двох місцях, лікують у третьому.
- **Дві дефініції «згорнутого»**: `orgMode.ts:5` — `collapsed !== false`; `siblingOrgGroups.ts:41`
  — `collapsed === true`. `flatToDiagram` не виставляє поле взагалі → matrix-режим правильний,
  а пунктирні рамки сиблінгів зникають усі до одної.
- **Одне виділення промотує три id** (`promoteMath.ts:56`): `id`, `positionId`, `personId` **і**
  `organizationId`. `nodeBoxes` тримає той самий бокс під двома ключами, тож на одному місці
  стають дві однакові HTML-картки, а Pixi-вигляд організації ховається. `promoteMath.test.ts:39`
  закріплює цей список як правильний.
- **Формула фаски інвертована** (`contourFillet.ts:86`): `radius / tanHalf` замість
  `radius * tanHalf`. При θ=90° обидві збігаються — тому всі прямокутні тести зелені. На
  восьмикутнику зріз 24.1 замість 4.1: кути зрізані, дуга не дотична до жодного ребра.
- **Пошук не нормалізує NFC** (`searchIndex.ts:190`). Українські **й** і **ї** мають
  прекомпоновану й декомпоновану форми — ім'я, збережене декомпозовано, не знаходиться
  прекомпонованим запитом. Тихий порожній результат.

---

## 4. Тести, які не можуть впасти

- **`export.test.ts:67`** «success: png» асертить `instanceof Blob` і `type === 'image/png'`.
  Під jsdom код бере гілку фолбеку, тож тест **весь час зеленіє на восьми байтах**. `size` не
  перевіряється ніде. `extractPngFromPixi`/`canvasToPngBlob`/`pngBlobToPdfBlob` — нуль тестів.
- **`contour.rs:1150`** `g6_implicit_foreign_blocks_flood` подає рівно той вхід, на якому
  контур губить половину департаменту, і асертить `!rs.is_empty()`.
- **`layout.rs:415`** `tidy_tree_siblings_do_not_overlap` — асерт `>=`, який розрив у 240×
  задовольняє **тим краще, чим він більший**. Тест не здатен упіймати цю помилку в принципі.
- **`incremental.test.ts:45`** «success: moving one dept only recomputes that dept»
  **закріплює баг як правильну поведінку**: фінгерпринт департаменту не враховує чужі клітинки,
  хоча саме вони визначають notch і bbox. Тест вимагає, щоб сусід лишався зі старим контуром.
- **`worker-bridge.test.ts:47`** асертить, що рядок, який мок повернув трьома рядками вище,
  починається на `M` і закінчується на `Z`.
- **`e2e/mockups.spec.ts:51`** має бейзлайни лише для `-linux` при `maxDiffPixelRatio: 0.04`
  (≈46 000 пікселів). На macOS сюїт пише свіжі бейзлайни й проходить вакуумно.
- **Жодного `wasm_bindgen_test`** попри підключену dev-залежність — уся межа JS↔wasm не
  покрита: десеріалізація, `Option<f64>`, усі рядки помилок.
- **`pngExport.ts:7`** розгалужує **продакшн-код** на `navigator.userAgent.includes('jsdom')`.
  Тест-раннер-сніфер у бібліотеці — ознака, що тести підганяли під код.

---

## 5. Один баг, продубльований при портуванні

`validate_org_hierarchy` квадратичний **в обох мовах**: обидві реалізації перебудовують мапу id
на кожен виклик і викликаються раз на організацію.

| | 1 000 | 4 000 | 8 000 |
|---|---|---|---|
| TS `orgTree.ts:19` | 41 мс | 637 мс | **2.98 с** |
| Rust `org_tree.rs:36` | 18.8 мс | 333 мс | **1.26 с** (×2–3 у wasm) |

І це на **кожному** рендері, а рендер тригериться навіть кліком по вузлу. Рекламовані
репозиторієм 100k організацій — близько 8 хвилин у TS-гілці.

Поруч — пошук: `searchIndex.ts:199` сортує **всі** збіги перед `slice(0, limit)`, тож запит з
однієї літери на 100k дає `localeCompare`-сортування ~100k елементів на кожне натискання. А
коли символ відсутній у `byChar` — тобто збігів **немає гарантовано** — код замість негайного
`[]` сканує весь індекс.

---

## 6. Що можна видалити

| Що | Рядків | Лишається |
|---|---|---|
| Контурний конвеєр (§1.1): `incremental`, `worker-bridge`, `bridge`-compute, `contour.rs`, обробники, транзитні тести | ≈2 300 | `contourCluster` + `contourPolish` + `paintMagneticGroups` ≈ 200 |
| `layout.rs` + `wasm_compute_layout` + `wasm_tree_stats` (§1.2) | ≈580 | `computeOrgRowTreeLayout` |
| `contourClearance.ts` — живі лише 12 рядків типів | ≈270 | два типи переїжджають у `contourButtonGroup` |
| `mapArrayFacade` — 4 входи, 1 шлях, 2 виклики | ≈300 | один `mapFlatRowsInPool` |
| `matrixGrid` bounded-половина + `placeOrgAtMatrixCell` + `reorderOrg` (нуль викликів) | ≈250 | `assignMatrixCells(orgs,{cols})` ≈15 рядків |
| `worker/pipeline.ts` (§1.3) | ≈170 | нічого — споживачів немає |
| `contourMorph`: resample + O(n²) пошук ротації для **осе-вирівняних прямокутників** | ≈90 | твін чотирьох чисел |
| Два саморобні RAF-твінери з ін'єкцією годинника | ≈80 | один `tween()` на Pixi `Ticker` |
| `searchIndex.byChar` — подвоює індекс, звужує по одному символу | ≈50 | лінійний `indexOf` |
| Форвардний шар `PixiHost` (8 однорядкових проксі) | ≈50 | `readonly viewport` |
| Опції, які ніхто не варіює: `staffCoordMode`, `PersonCardLayout 'auto'`, `PromoteMode`, `scale`, `scope:'viewport'`, `testAnchors`, `corridorCells`, `dashedGridFrame` | ≈150 | значення, що реально вживається |
| `layoutX/layoutY/layoutCoords`, `layoutCells`, `contour`, `NodeVisualKind` — нуль писачів | ≈40 | `gridCell` |
| `mappers`: `runMapper`/`composeMappers`/`identityMapper`/`MapperContext` | ≈30 | `DataMapper`, `DiagramMappers` |
| Мертві експорти (8 символів) + 3 публічні методи без споживачів | ≈35 | — |

**Разом ≈4 400 рядків — близько чверті кодової бази.**

---

## 6.1 Два корені, а не двадцять багів

Останній огляд назвав те, що зшиває половину списку:

- **Три місця незалежно виводять трансформ сітки і не збігаються** — `coords.ts:57` (крок
  `refCell + gap`), `DiagramRenderer:961` (голий `cellWidth`), `positionMove.ts:15` (snap). Це
  корінь A11 і половини координатних дефектів. Лікується одним спільним хелпером.
- **Чотири місця ключують мапи сутностей сирим рядком** через організації, посади й людей —
  `nodeBoxes`, `nodeViews`, `nodeTestId`, `contextMenuPayload`. Це корінь R4, колізії двох посад
  однієї людини й зникнення DOM-якоря. Лікується типізованим ключем `kind:id`.

---

## 7. Порядок

1. **Вирішити долю §1.1.** Або підключити `_results`, або видалити конвеєр. Поки код робить
   ні те, ні інше, платить за обидва. Це рішення розблоковує половину таблиці §6.
2. **A3, A4, A6** — аварії з найгіршим продакшн-симптомом (двохвилинний фриз, чорний канвас,
   зникла діаграма) і найдешевшим фіксом.
3. **Тести з §4** — доки вони зелені на зіпсованому виході, будь-який фікс недоказовий.
4. **§5 (квадратичність)** — одна правка на дві мови: підняти `by_id` з циклу.
5. **§6** — видалення, після 1.
6. **Тихі неправди §3** — валідація на межі: `is_finite`, NFC, дедуп у `appendData`.

---

## 8. Чого ці огляди не знають

- `node_modules` не встановлені, wasm не зібраний — жоден агент не прогнав реальний сюїт.
  Усі заміри (2.98 с, 124 486 аргументів, глибина 1800, 30 МБ рядка) зроблені на транскрипціях
  і окремих probe-збірках, не на справжніх модулях.
- Внутрішнє наповнення `contour.rs` за межами `flood_inside`/G6/G7 — `chaikin`,
  `apply_prefer_notch`, трасування циклів — прочитане частково.
- `render/` вузлові файли (`PersonNode` 876, `OrganizationNode` 596) читалися переважно як
  докази викликів, не суцільно.
- Playwright-специфікації переглянуті за назвами.
**Корисні негативи — перевірено й чисто, не переаудитувати:** межі LOD-ярусів
(`lod.ts:21`) вичерпні й неперетинні; `devicePixelRatio` застосовується рівно один раз;
`contourMorph`, `fitContain`, `svgPath`, `staffEdgeArrows`, `interaction/selection.ts`,
`worker/poolSizing.ts` і збірка xref-таблиці PDF перевірені проти конкретних гіпотез і чисті;
`Viewport` — єдине місце з повним життєвим циклом слухачів; `doubleTap` покритий обома межами.
