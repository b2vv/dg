# CTO research — Org Hierarchy SDK (`b2vv/dg`)

**Дата:** 2026-09-04
**Базис:** `main` @ `901f9aa` (після T98/T92 — автофолбек рушія)

⚠️ **Базис переписано 2026-09-05, і причина варта запису.** Тут стояв `613acb8` — коміт, який
**перестав існувати**: PR #78 злився через `rebase`, і той переписав усі SHA гілки. Локально гейт
свіжості проходив (старі об'єкти ще лежали в клоні), у CI впав на чистому клоні:
«базис не знайдено в історії». Отже **гейт свіжості зчеплений зі стратегією мержу** — будь-який
SHA, записаний у документі репо, переживе `merge`, але не переживе `rebase`/`squash`. Записувати
слід той SHA, який справді опиниться в `main` **після** злиття.
**Призначення:** єдиний брифінг перед будь-якою імплементацією. Це не тікет і не ADR.

Кожна теза нижче веде в первинне джерело (код, workflow, `work/tasks/`, `docs/`). Якщо джерело і цей файл розходяться — править джерело, не цей кеш.

**Що змінилось із `ece03e4`:** 12 комітів. Один змістовний зріз — **T98 варіант 1**, і разом із ним **закрито T92**, який до того був єдиною задачею, заблокованою на доступі до чужого заліза. Спосіб закриття важливіший за факт: число з машини замовника не здобули, а **зробили непотрібним** — воно існувало, щоб обрати поріг, а реалізований механізм порогів не має взагалі. Дизайн пережив ампутацію на GATE 2: перша редакція мала пробу продуктивності, чотири лінзи критики дали по ній п'ять blocking, і проба знята — вона ламалась саме на популяції, заради якої додавалась (див. архітектурний факт №2). Решта 11 комітів — документація й артефакти циклу: перезібрана `work/AGENDA.md`, виправлений маніфест про Rust CI, повний `spec-flow`-набір у `work/reports/auto-software-fallback/`. Розділи 1, 2, 6, 7, 9 перезібрані; 3, 4, 5 без релевантних змін.

**Що змінилось із `806c843` (попередній перезбір, лишено для сліду):** 23 коміти — під сам поріг гейта свіжості (25), звідси й цей перезбір. Найважче за силою: `computeOrgRowTreeLayout` на глибокому вході не просто кидає виняток — за ~4 500 глибини він **безповоротно вбиває весь WASM-модуль**, разом з непов'язаним `computeAllContours` (T102 блок А закрито, блок Б — спец написана). Черга задач стиснута 117→20 файлів (архів як покажчики, `T79` довелось повертати — воно ще живе в `SPEC.md`/`REQUIREMENTS.md`). Структурний аудит дав чотири нові задачі (T103–T106) і три вже закриті знахідки (deep-copy `getData`, типізована валідація `isDiagramData`, epoch-гвардія в `renderPositionGrid`). Контурний рендер під запит «перенести в WASM для швидкості» виміряно й **не** перенесено — 14,0 → 5,1 мс лишились у TS (T107). Інфра отримала другий машинний гейт (`Docs freshness`, п'ять пасток вимірювання документовано в T107/spec). Розділи 1, 2, 4, 6, 7, 8 перезібрані нижче; 3 і 5 без релевантних змін.

---

## Вердикт на один екран

**Продукт** — embeddable browser SDK організаційних і штатних діаграм: host дає дані в пам'ять, SDK розкладає й малює Pixi-полотно, експортує SVG/PNG/PDF. Заміна прод-діаграми на GoJS у host-репо. ([`docs/REQUIREMENTS.md`](../docs/REQUIREMENTS.md) §0–§1; [T71](./tasks/T71-gojs-to-dg-migration-plan.md))

**Стан:** живого P0 немає. Від попереднього базису закрито **T98** (автофолбек рушія) і разом із ним **T92** — остання задача, що стояла на доступі до чужого заліза. Черга далі — **суміш**: агент-реді структурний борг (T101, T102 блок Б, T103–T106) і продуктові рішення (T80 — який рушій контуру лишається; T56 — звірений із кодом, чекає вибору продукту). Рекомендований наступний хід агенди — **T104** (транзакційність мутацій), бо він одним ходом закриває коректність, дірку у власному порозі репо й названий борг ([`work/AGENDA.md`](./AGENDA.md)).

**Архітектурний факт №1 — сцена більше не малює себе сама.** `autoStart: false`, спільного ticker'а немає, і **кожен** шлях, що рухає пікселі, зобов'язаний попросити `requestPaint` ([`render/PixiHost.ts:229-231`](../packages/sdk/src/render/PixiHost.ts), T84). Наслідок для будь-якої нової фічі: намалював у обхід — картинка не оновиться, і жоден тест на дані цього не помітить. Драг картки просить фарбу явно ([`render/personInteractions.ts`](../packages/sdk/src/render/personInteractions.ts)).

**Архітектурний факт №2 — `renderer: 'auto'` більше не пасивний, і його мовчання значуще.** Полотно піднімається на WebGL або Canvas2D, вибір видно назовні (`getRendererKind()`), і під софтверним GL Canvas2D свідомо кращий (T83). **Змінилось 2026-09-04 (T98):** `'auto'` тепер сам читає `UNMASKED_RENDERER_WEBGL` через тимчасовий від'єднаний контекст і йде на Canvas2D, якщо ім'я містить відомий програмний растеризатор ([`render/detectSoftwareRenderer.ts`](../packages/sdk/src/render/detectSoftwareRenderer.ts)).

Дві речі, які агент зрозуміє неправильно, якщо не сказати:

1. **Список маркерів — це дефолт для всіх хостів.** Дописати рядок туди означає змінити поведінку `'auto'` глобально, і зворотний бік помилки несиметричний: хибне спрацювання забирає WebGL у справного GPU. Тому невпізнане ім'я — **не** слабке «апаратний», а «поточна поведінка байт у байт»; гілки «не знаю → здогад» у дизайні немає навмисно.
2. **Проби продуктивності тут немає і не має бути** без нової причини. Перша редакція T98 її мала; `plan-critique` дав п'ять blocking, і вирішальним був не код, а популяція: рядок рушія маскують саме privacy-браузери (Firefox `resistFingerprinting`, Brave, WebKit), і в них же `performance.now()` загрублений до ≥16,67 мс — тобто вимір ламався рівно там, де мав рятувати ([`reports/auto-software-fallback/spec.md`](./reports/auto-software-fallback/spec.md) §«Історія рішення»).

CI ганяє окрему пробіжку з `SOFTWARE_GL=1`, бо гілка Canvas2D існує лише там, де браузер відмовляє в контексті ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

**Архітектурний факт №3 — «1M посад» це вікно, і воно живе в демо, не в SDK.** Арифметика вікна — [`packages/demo/src/app/viewportWindow.ts`](../packages/demo/src/app/viewportWindow.ts); SDK лише повідомляє хосту, що видима область змінилась (`onViewportChange`, `settled`), і приймає новий зріз через `setData`. Тобто вікно — **патерн хоста**, який SDK уможливлює, а не вміє сам.

**Архітектурний факт №4 — один зрив глибини вбиває WASM на весь процес, не лише той виклик.** Понад ~4 500 глибини `computeOrgRowTreeLayout` кидає `RuntimeError: memory access out of bounds`, і після цього мертвий **весь** інстанс WASM — включно з непов'язаним `computeAllContours` — до перезавантаження сторінки; задокументований `resetContourWasmForTests()` модуль не рятує, бо `initContourWasm` тримає один інстанс на процес ([`contour/bridge.ts`](../packages/sdk/src/contour/bridge.ts)). Гвардія на 2 500 (`MAX_ROW_TREE_DEPTH`, [`layout/rowTreeLayout.ts`](../packages/sdk/src/layout/rowTreeLayout.ts)) рахує глибину **до** входу в WASM і відхиляє типізовано — блок А закритий T102. Наслідок для будь-якого коду, що чіпає WASM-межу: не покладайся на відновність між тестами в одному процесі; один діагностичний зонд «а що як задеп" може отруїти решту сюїти. ([spec](./reports/row-tree-depth/spec.md) §1)

---

## Що попередній перезбір спростував (2026-09-01)

Списком, бо ці твердження жили в файлі як факти й керували рішеннями. Цей перезбір (2026-09-03)
не знайшов у файлі аналогічних самосуперечностей — 806c843→ece03e4 додало нове знання (WASM
poisoning, T107), а не спростувало старе. Лишено як історію й приклад «урок для наступного», не
як актуальний список.

| Було написано | Насправді | Доказ |
|---|---|---|
| «`export/` рушія не знає: SVG завжди малює `paintMagneticGroups`… canvas ≠ export» — і це був **архітектурний факт №1 на першому екрані** | Експорт читає рушій і бере той самий, що канвас. Файл суперечив сам собі: §2.4 і §6 казали «закрито 2026-08-26», а шапка — ні | [`export/svgExport.ts:85`](../packages/sdk/src/export/svgExport.ts) |
| §4.2 + §8 правило 7: «WASM pkg gitignored; свіжий clone без `build:wasm` не проганяє contour-тести» | pkg **у git** з 2026-08-25, рішення TD05 перевернуте — бібліотеку віддають як git-залежність | `git ls-files packages/sdk/src/wasm/pkg` · [`.gitignore:23`](../.gitignore) · [TD05](./tech-debt/TD05-wasm-pkg-in-repo.md) |
| §5: «Нульовий діф до базису — таблиця чинна» | Змінився тестовий раннер, компілятор, збірка SDK і з'явився лінтер | `git diff e02bc2f..HEAD -- package.json packages/sdk/package.json` |
| §3: «Тести: Vitest+jsdom» | **rstest** (`@rstest/core`) | [`packages/sdk/package.json`](../packages/sdk/package.json) |
| §4.4: «живий беклог — `work/tasks/`» | Карта брехала про себе: T83 (15 комітів), T84 (4), T88 (39 + ship-report) стояли «🔵 не почато». Виправлено в самих задачах 2026-09-01 | `work/tasks/T83…`, `T84…`, `T88…` |

**Урок для наступного перезбору:** розходження було не там, де файл сумнівався, а там, де він **стверджував найупевненіше** — на першому екрані. Шапку треба перечитувати проти коду першою, а не останньою.

---

## 1. Продукт

### 1.1 Формат і масштаб

| Питання | Відповідь | Джерело |
|---------|-----------|---------|
| Формат | npm embed SDK, не SaaS | REQUIREMENTS §0 Q1 |
| Dataset | ~50k org, ~2M persons **адресуються** | REQUIREMENTS §1 |
| На екрані | viewport + LOD; повний raster 2M заборонений | REQUIREMENTS §1, §9 |
| Логіка | клієнт (browser) | REQUIREMENTS §0 Q3 |
| Дані | in-memory + DataMapper; HTTP не в SDK | REQUIREMENTS §4.9 |
| Worker | так; Service Worker / offline — ні | REQUIREMENTS §0 Q9–Q10, §9 |
| Експорт | SVG, PNG, PDF, print | REQUIREMENTS §0 Q7 |
| Bundler demo | Rsbuild | REQUIREMENTS §0 Q8 |

Доведене в demo — **вікна, а не повні набори**: 100k org (400 намальованих, [`scenarios/scaleOrgs.ts`](../packages/demo/src/scenarios/scaleOrgs.ts), T48) і 1M посад на трьох ярусах ([`scenarios/scaleStaff.ts`](../packages/demo/src/scenarios/scaleStaff.ts), [T81](./archive/tasks-2026-09-02.md)). Обидва таби друкують «вікно N з M» і чесно кажуть, коли шуканого немає у вікні (T81 §Чесність).

### 1.2 Два сімейства діаграм

Один `DiagramData`, два layout engines і два візуальні контракти. Зміна focus org / сімейства скидає session. ([SPEC §2.2.2](./SPEC.md))

**Організації** — усі collapsed → **matrix** (sparse grid, TS); ≥1 expanded → **row-tree** (Ploeg WASM `computeOrgRowTreeLayout`). Перемикач `detectOrgMode` / `isOrgCollapsed` ([`layout/orgMode.ts`](../packages/sdk/src/layout/orgMode.ts)).

**Штатка — три яруси** (поточна org завжди в ярусі 2). Per-org coords: matrix / tree / **hybrid anchors** (default). Drill = `focusStaffOrg`; expand-in-place = `toggleStaffOrgExpand` (T20). ([SPEC §2.2](./SPEC.md))

**Початковий стан — не «як прислав хост», а обчислений** (T97). `initialExpand` розкриває рівно мінімум: наш корінь і його предків, решта закрита; `revealNodeId` веде глибоке посилання в ціль **до першого кадру**, а не після. Зображення вантажаться **за розкриттям**, не за датасетом — закрита гілка не просить ні символів організацій, ні фотографій людей ([`data/initialExpand.ts`](../packages/sdk/src/data/initialExpand.ts), `render/mediaByExpansion.contract.test.ts`).

**Координата посади має два різні статуси, і від цього залежить жест.** Авторська (`gridCell` — дані хоста) → драг **пересуває**. Обчислена розкладкою → драг **переприв'язує** до іншого керівника, бо писати `gridCell` у картку, чию позицію рахує розкладка, означало б тихо перетворити результат на дані. Режим читається з `StaffNodeBox.role`, який розкладка проставляє сама (T91).

### 1.3 Модель даних (канон SDK ≠ чернетка REQUIREMENTS)

Канон: [`data/types.ts`](../packages/sdk/src/data/types.ts) `DiagramData`.

| У REQUIREMENTS §3 | У коді |
|-------------------|--------|
| `Position.assignments[]` (many-to-many) | `DiagramPosition.personId?` — одне призначення |
| окремий HTTP API | немає клієнта; host `setData` |
| `Group` з emblem | `DiagramGroup` caption-only; `emblemUrl` deprecated на користь org `entityType: 'group'` |

Посада має **три** способи сказати «де картка»: `gridCell`, `layoutX`/`layoutY`, `layoutCoords` — шар drift (CRITIQUE §3). **Відділ необов'язковий**: посада без `departmentId` вважається чужою для будь-якого контуру, а не «порожнім місцем» — `contourDepartmentId` + `NO_DEPARTMENT_ID` у [`data/types.ts`](../packages/sdk/src/data/types.ts) (T79).

### 1.4 Інтеграція host

```
Host fetch → DataMapper? → OrgHierarchyDiagram.create(el, { data, mappers, callbacks })
```

Публічні входи: `.` / `./react` / `./worker` / `./mappers`. React — **optional peer**; Pixi — runtime dep SDK ([`packages/sdk/package.json`](../packages/sdk/package.json)). Persist drag/layout — лише `onLayoutChange`, SDK не пише на бекенд (REQUIREMENTS §8). Cutover GoJS у **цьому** репо закритий ([PARITY §3](./tasks/PARITY-gojs-to-dg.md)).

### 1.5 Глосарій

Терміни: [`CONTEXT.md`](../CONTEXT.md). Не казати blob hull / gravity / org tree view / zoom level (alone). ADRs немає: `docs/adr/` не створено.

---

## 2. Кодова база й seams

### 2.1 Пакети

```
packages/core/     Rust crate org-hierarchy-core → WASM (cdylib+rlib)
packages/sdk/      @org-hierarchy/sdk 0.1.0 — публічний API
packages/demo/     @org-hierarchy/demo private — Rsbuild QA
archive/           legacy-ts, legacy-web-rspack (TD02 closed)
e2e/               Playwright проти preview demo (15 spec-файлів)
```

Workspaces npm: лише sdk + demo; core збирається `npm run build:wasm` (кореневий `package.json`). SDK — версія **0.2.0**, і він **справді збирається як бібліотека**: `tsc && copy-wasm && check-package`, де останній крок перевіряє, що кожен згаданий у `package.json` файл реально їде в пакет.

У SDK **141 модуль + 117 тестових файлів**; зелена база — **852 sdk + 108 demo** unit, **73 e2e**.

**Два e2e-стенди сховані за `HARNESS=1`** — `t87-motion` і `t88-window-cost`. Це не тести, а вимірювачі: вони не кажуть «зламано», вони кажуть «стільки коштує». `testIgnore` **сильніший за шлях у командному рядку**, тож без прапорця `playwright test e2e/t88-…` мовчки знайде нуль тестів ([`playwright.config.ts:14-17`](../playwright.config.ts)).

### 2.2 Runtime шари (після T82)

```
Host
  OrgHierarchyDiagram            фасад — packages/sdk/src/OrgHierarchyDiagram.ts
                                 (index.ts = тільки барель публічного API)
    DataStore / SelectionStore / ViewStateStore     state/
    SearchIndexService           interaction/  індекс: sync | worker | merge чанка
    ContextMenuController        interaction/  побудова меню + диспетч дії
    nodeRefs / nodeKey           interaction/  data → NodeRef, типізовані ключі
    mergeData                    data/         merge/dedupe для appendData
    MediaService + nodeMedia     media/        Pixi-текстури, refcount
    PixiHost → Viewport → DiagramRenderer
      LayerManager               порядок шарів
      SceneRegistry              бокси / view / promote останнього рендеру
      ContourPainter             render/contour/ сесія контурів, рушій, morph
      PersonInteractions         клік/dblclick/меню/drag картки посади
      bindOrgCardInteractions    те саме для org-картки (один бінд на обидві сцени)
      personCardContent          розкладка тексту в картці (4 варіанти)
    export/                      SVG (перебудова шляхів) · PNG/PDF з Pixi framebuffer
  optional @org-hierarchy/sdk/react   (меню, promote, test anchors)
```

Життєвий цикл фасаду: `create` → `setData`/`appendData` → `render()` (coalesce) → `destroy`. Selection іде `repaintSelection` без rebuild (T75).

**Додалось із базису** (усе — правки наявних модулів, нових директорій майже немає):

| Що | Де | Навіщо |
|----|----|--------|
| `requestPaint` / `onNeedsPaint` | `render/PixiHost.ts`, `DiagramRenderer` | T84: нічого не малюється саме по собі |
| `getRendererKind()` | фасад + `PixiHost` | T83: назвати рушій, а не вгадувати |
| Вибір рушія ↔ драйвер | [`render/detectSoftwareRenderer.ts`](../packages/sdk/src/render/detectSoftwareRenderer.ts) → `resolveRendererPreference` | **єдине** місце в `packages/sdk`, що бере GL-контекст напряму (решта — Pixi). Інжектований читач рядка, мемоїзований на сторінку; у барель **не** експортовано |
| `promoteMath` / `promoteTypes` | `render/` | T87: near-visible як **LOD-гейт**, не продюсер id |
| `initialExpand` | `data/initialExpand.ts` | T97: розкрити дерево до мінімуму **до першого кадру** |
| `positionReparent` | `interaction/` | T91: переприв'язка + перевірка циклу (перша для `reportLines`) |
| `DropTargetIndex` | `render/dropTargetIndex.ts` | T91: ціль під курсором за O(1) |
| `externalManagers` | `layout/staff/` | T91: керівник з іншої організації як пін над блоком |
| `WorkerChannel` | `worker/` | канал на діаграму, не на модуль |
| `layers.dragPreview` | `render/LayerManager.ts` | окремий шар, бо `repaintSelection` чистить `overlay` цілком |
| `MAX_ROW_TREE_DEPTH` guard | `layout/rowTreeLayout.ts` | T102 блок А: 2 500, рахує до WASM-виклику, `OrgHierarchyError` типізовано |
| `getData()` deep copy | `OrgHierarchyDiagram.ts` | structure audit: жива посилання дозволяла desync стану поза `render()` |
| `isDiagramData` array-guard | `data/mergeData.ts` | structure audit: `{organizations: null, …}` більше не проходить як валідні дані |
| epoch-гвардія `renderPositionGrid` | `render/DiagramRenderer.ts` | structure audit: новіший рендер більше не переживається старішим підвислим await |
| `buildBoxIndex` / bucket-index карток | `render/contour/paintMagneticGroups.ts`, `contourCluster.ts` | T107: ring читає сусідів із bucket, а не фільтрує всю сцену |

**Нові канали до хоста** ([`callbacks.ts`](../packages/sdk/src/callbacks.ts)): `onViewportChange` (з `settled` — один виклик після зупинки камери), `searchBeyondWindow` (хост шукає поза вікном), `onRenderFailed` (**окремо** від `onLayoutDiagnostics`: діагностика пояснює намальовану сцену, цей канал каже, що сцени немає), `onInitialExpand`, `onPositionExpandChange`.

**`LayoutPatch` виріс** до п'яти типів; `position-reparent` несе і старого, і нового керівника, щоб хост міг застосувати зміну без діфа й відкотити її.

**Правило шарів після T82:** `data/` → `contour/`, `layout/` → `render/` → `state/` + фасад. Єдина навмисна залежність «назовні» — `state/ViewStateStore` читає типи LOD/теми з `render/` (view state сидить **над** рендерером). ([T82](./archive/tasks-2026-09-02.md))

### 2.3 WASM: що живе

Після T77-M09 немає `layout.rs`, `wasm_compute_layout`, `wasm_build_from_flat`, `wasm_tree_stats` ([`packages/core/src/lib.rs`](../packages/core/src/lib.rs)).

| JS export | Роль | Хто кличе |
|-----------|------|-----------|
| `computeOrgRowTreeLayout` | Ploeg row-tree | org layout + staff tree blocks |
| `computeDeptContour` / `computeAllContours` | G1–G7 flood | public API, тести, **і канвас, коли `contourEngine: 'cell-flood'`** |

Pipeline у `contour.rs`: cluster → flood → G5 notch → G6 far-side → G7 peel → orthogonal trace → Chaikin. G8 (morph під drag) — SDK.

### 2.4 Три шляхи контуру (читати обов'язково)

| Шлях | Геометрія | Де |
|------|-----------|-----|
| **Canvas, default** | union-find Manhattan ≤ `magnetRadius` + padded AABB ring, **мінус виїмки під чужі картки (G2/M2)** | [`render/contour/paintMagneticGroups.ts`](../packages/sdk/src/render/contour/paintMagneticGroups.ts) + [`contourNotch.ts`](../packages/sdk/src/render/contour/contourNotch.ts) (T79) |
| **Canvas, `cell-flood`** | Rust polyomino flood G1–G8 **по кожному org-блоку окремо**, кільця мапляться на бокси карток | [`floodContourEngine.ts`](../packages/sdk/src/render/contour/floodContourEngine.ts) + [`floodRingCards.ts`](../packages/sdk/src/render/contour/floodRingCards.ts) (T80) |
| **SVG export** | той самий рушій, що й канвас (`resolveExportContourRings`); flood не зміг — шар порожній + діагностика | [`export/svgExport.ts`](../packages/sdk/src/export/svgExport.ts) |

`gridCell` у flood — **локальна для org-блоку**, тому flood ганяється поблочно і кожен блок мапиться своїм origin; один спільний flood наклав би ярус 1 на ярус 2 (T80). Коридор G2 — `RenderConfig.corridorCells` (default 0.5 клітини, [`render/contour/contourCorridor.ts`](../packages/sdk/src/render/contour/contourCorridor.ts)), і flood, який нічого не намалював, зобов'язаний сказати чому через `getLayoutDiagnostics()`.

Рішення T77-M01 Option B лишається чинним для default-рушія: renderer **не** робить WASM round-trip для `button-group`; `cell-flood` бере його свідомо, за прапорцем.

**T107 (2026-09-03) перевірив запит «перенести button-group у WASM для швидкості» вимірюванням, а не портом.** При 80 відділах / 4 000 місцях 66% кадру йшло не на геометрію (`polishContourRings` — 10%), а на `allBoxes.filter(...)`, що копіювало майже всю сцену на кожне кільце. Портувати копіювання масиву в Rust додало б лише серіалізацію через WASM-межу щокадру й `await` у paint-шляху — тобто скасувало б рішення B. Замість порту: bucket-індекс карток + кластеризація по клітинах, у TS, синхронно — 14,0 → 5,1 мс (медіана з 9, A/B на одному стенді); кластеризація 40 000 місць 2 378 → 43 мс. Стеля `40 000 місць / 300 мс` перевірена на **зламаній** (квадратичній) версії теж — перша стеля «20 000/1000мс» проходила на 646 мс зламаного коду, тобто нічого не ловила ([T107](./tasks/T107-magnetic-contour-cost.md)).

### 2.5 Demo

**14 табів** ([`app/tabs.ts`](../packages/demo/src/app/tabs.ts)): Variant B (канон магнетизму QA), Staff tree, Orgs · Figma/GoJS, Staff · Figma / Magnetic / Flood / GoJS, Staff · 1M, **Staff · Brigade**, Flat orgs, 100k orgs, Mapper, Worker. Конфіг табу — чиста функція [`app/tabConfigs.ts`](../packages/demo/src/app/tabConfigs.ts); ознаки табу (`family`, `contourControls`, `orgTree`, `reloadsOnContourSlider`) — таблиця `TAB_META`; фікстури — [`scenarios/mockups.ts`](../packages/demo/src/scenarios/mockups.ts) (барель). `?e2e=1` → `window.__demoE2e` ([`app/e2eBridge.ts`](../packages/demo/src/app/e2eBridge.ts)) + DOM anchors. Alias SDK на **source**, не `dist`.

**Демо-фікстури цивільні навмисно** — сторінка публічна (GitHub Pages), військових назв з Figma в них немає ([MOCKUP-styles-review](./archive/tasks-2026-09-02.md) правило 1).

**Два стенди на штатці роблять різну роботу, і плутати їх дорого:**

| Таб | Форма | Для чого |
|-----|-------|----------|
| `Staff · 1M` | 1 000 000 адрес, вікно ≤ 4000 посад, дерево з розгалуженням 8 | **хард-тест**: вікно, пошук по мільйону, вартість перебудови |
| `Staff · Brigade` | 84 посади, штаб-структура, змішані ешелони | **форма продукту**: саме на ній вимірюють фази рендера |

Чому це в брифінгу: три умовні задачі оптимізації були відкриті за числом **1,5 с**, знятим із `Staff · 1M`, і закриті за **9,5–12,7 мс** на `Brigade` — різниця була не в обсязі, а в **формі зв'язків** (зірка проти дерева). Вердикт по продуктивності, знятий не з тієї фікстури, коштував би зміни публічного API рендера ([звіт T88](./reports/viewport-window/report.md) §15, §17, §19; [T96](./archive/tasks-2026-09-02.md)).

**Вікно за камерою — патерн хоста.** `app/viewportWindow.ts`: `resolveWindowRange` (чиста арифметика) + `RebuildScheduler`, який серіалізує перебудови промісним хвостом, **не** прапорцем «зайнято». SDK у цьому не бере участі, крім `onViewportChange` і `setData`.

---

## 3. Патерни (як тут пишуть)

Обов'язкові політики: [`work/TDD.md`](./TDD.md) (Red-Green-Refactor, success **і** failure), [`work/CODING_STANDARDS.md`](./CODING_STANDARDS.md) (KISS > SOLID; без `enum`/`any`; `satisfies`; `assertNever` на discriminated union; функції ≤ ~40 рядків; Law of Demeter). Zod у стандартах згаданий як межа валідації — **у залежностях немає**.

**У репо з'явився лінтер** — `oxlint --max-warnings 0` (+ `oxfmt`), і він у CI. До цього кожне питання про іменування, `any` чи мертвий імпорт трималось на людському рев'ю; тепер частина стандартів виконувана, і **її не треба перевіряти очима на рев'ю** ([T85](./archive/tasks-2026-09-02.md), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

| Патерн | Де | Правило |
|--------|----|---------|
| Facade | `OrgHierarchyDiagram.ts` | один зовнішній seam; `index.ts` — лише барель |
| Service | `SearchIndexService`, `ContextMenuController`, `ContourPainter`, `PersonInteractions` | стан + рішення в одному місці, назовні — deps-обʼєкт, не діаграма |
| Stores | `state/*` (T76) | selection/view живі; DataStore — snapshot |
| Registry | `render/SceneRegistry.ts` | що на екрані: бокси, view, promote |
| Mapper | `mappers/`, `flatRowsToDiagram` | host raw → `DiagramData` |
| Bridge | `contour/bridge.ts`, `wasm/layoutBridge.ts`, `worker/bridge.ts` | WASM/worker за typed messages |
| Pool | `WorkerPool`, `mapFlatRowsInPool`, texture refcount | bounded concurrency |
| Coalesce | `renderCoalesce.ts` | один in-flight render |
| Optional React | callbacks + `subscribePromoteSync` | ядро без React |
| Прапорець рушія | `RenderConfig.contourEngine` | новий вигляд контуру = новий рушій за прапорцем, не третє кільце в старому |

Тести: **rstest** + jsdom (мігровано з vitest), eager WASM з `src/wasm/pkg` у setup. Контракт жестів: [`NODE-interactions-contract.md`](./tasks/NODE-interactions-contract.md). Playwright — Chromium-only smoke, плюс друга пробіжка під `SOFTWARE_GL=1`. E2e **немає** на export і mapper; по promote і мульти-виділенню вони з'явились (`promote-near`, `t67-multiselect-manual`), по переприв'язці посад — контрактні тести й ручна проходка, e2e немає.

---

## 4. Інфра й доставка

### 4.1 CI / Pages

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): **чотири** джоби (`rust` cargo fmt + clippy + test; `sdk` wasm-pack + lint + typecheck + rstest; `e2e` Playwright; `Docs freshness` — новий).

⚠️ **`rust` більше не «лише cargo test».** З `21d3560` (2026-09-02) джоба також ганяє `cargo fmt --check` і `cargo clippy --all-targets -- -D warnings`; дерево на той момент устигло розійтись із `rustfmt` і несло 14 clippy-знахідок. `rustfmt.toml`/`clippy.toml` як не було, так і немає — це дефолтні конфіги, не документований стандарт, — але твердження «CI по Rust іде лише cargo test» (було й у `.claude/standards.md`, і в `AGENTS.md`) з цього дня неправдиве; обидва виправлені цим перезбором.

**Новий CI-гейт — `Docs freshness`** (`npm run check:docs`, [`scripts/check-docs.mjs`](../scripts/check-docs.mjs), доданий `ece03e4`). Ловить три речі: (1) биті відносні `.md`-лінки — архівація 2026-09-02 лишила 25 таких; (2) публічний метод `OrgHierarchyDiagram` поза `docs/USAGE.md` — поріг пайплайна визначає публічний API саме через цей файл, тож метод поза ним для нього не існує; **21** метод зафіксовано як борг-baseline у `scripts/check-docs.mjs` (може лише зменшуватись, три з них — мутатори з T104); (3) цей файл (`work/CTO-RESEARCH.md`) не старший за `HEAD` більш ніж на **25 комітів** — межа з шапки цього самого файлу, перевірена `git rev-list --count`. Чого гейт **не** ловить — чи твердження в доці досі правдиве: `T56` десять днів заявляв контур на WASM після того, як WASM звідти прибрали, і жоден лінк-чекер цього не бачить.

Три речі, яких не було на базисі `806c843`:

- **Друга пробіжка e2e з `SOFTWARE_GL=1`** — гілка вибору рушія існує лише там, де браузер відмовляє у WebGL-контексті, який довелося б емулювати. Звичайний раннер контекст дає, тож без цієї пробіжки найважливіша для T83 гілка не виконується **ніколи**.
- **Вивантаження `playwright-actual` при падінні.** Візуальні бейзлайни неможливо зняти ніде, крім цього раннера: локальний контейнер малює однаково сам із собою і **інакше** за раннер. Тому при падінні його власні `-actual.png` — єдине правильне джерело нових бейзлайнів, і вони мусять покинути машину.
- **Два нові workflow:** [`post-deploy.yml`](../.github/workflows/post-deploy.yml) — димові сценарії проти **живого** Pages (тільки там видно застряглий бандл, зламаний шлях `/dg/` і реальні обсяги), і [`ai-review.yml`](../.github/workflows/ai-review.yml) — два незалежні рев'юери на PR, які не бачать знахідок одне одного. Node **22**, Rust **stable** + `wasm32-unknown-unknown`, **немає** `rust-toolchain.toml` — тобто версія rustc не зафіксована ні в CI, ні локально. Практика: на rustc 1.79 `npm run build:wasm` падав, вимагаючи ≥ 1.86; робоча машина зараз на 1.98 (`rustc --version`, 2026-08-25). wasm-pack ставиться `curl … | sh` — непіннований інсталер. Кожен job збирає WASM окремо (немає artifact sharing).

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml): `DEMO_BASE_PATH=/dg/` → `https://b2vv.github.io/dg/`. Репо публічне, демо live; README про це й каже (виправлено 2026-09-02, було «after the repo is public» / «License Private / TBD»).

### 4.2 WASM pkg (TD05)

**Рішення перевернуте 2026-08-25: pkg тепер у git.** `packages/sdk/src/wasm/pkg/` — 5 закомічених файлів; [`.gitignore:23`](../.gitignore) каже це прямо. Build-on-demand був правильний, поки єдиним споживачем був цей монорепо; щойно бібліотеку почали віддавати назовні як **git-залежність**, він перестав працювати — у споживача немає ні Rust, ні wasm-pack.

**Наслідок:** свіжий clone проганяє contour-тести **без** `npm run build:wasm`. Після правки Rust — перезібрати й **закомітити** pkg. ([TD05](./tech-debt/TD05-wasm-pkg-in-repo.md))

### 4.3 Локальний тулінг агента

[`.mcp.json`](../.mcp.json) + [`.claude/`](../.claude) — code-review-graph (CRG): граф символів і тестів, хуки `PostToolUse` на `Edit|Write|Bash` ([`.claude/settings.json`](../.claude/settings.json)), скіли `explore-codebase` / `debug-issue` / `refactor-safely` / `review-changes`. Дані графа в `.code-review-graph/` — **gitignored**, тобто у кожного агента свій індекс. Персональні нотатки (`CLAUDE.local.md`) ігноруються — правило в `.gitignore` закомічене після інциденту, коли `git add -A` затягнув файл у historію (виправлено переписуванням `main`).

### 4.4 Трекер

GitHub Issues на `b2vv/dg` **порожні**; живий беклог — `work/tasks/` + `work/tech-debt/`.

⚠️ **Але й він дрейфує.** На 2026-09-01 три задачі стояли «🔵 не почато», маючи коміти в `main`: T83 (15), T84 (4), T88 (39 + повний ship-report). Виправлено під час цього перезбору. Практичне правило: **статус у заголовку задачі — не доказ**; `git log --grep="(T88"` дешевший і чесніший.

**Черга стиснута 2026-09-02: 117 файлів → 20 живих**, 97 архівовано як покажчики ([`work/archive/tasks-2026-09-02.md`](./archive/tasks-2026-09-02.md)). Критерій архівації, виправлений на власній помилці того самого дня: **закрите й архівне — не синоніми**. `T79` архівували як «✅ done», але `work/SPEC.md` і `docs/REQUIREMENTS.md` досі цитують його як пояснення геометрії G2/M2 — довелось повертати з рядком «**Не архівувати**». Правило тепер: закрите **і** ніхто не спирається. Живі 20 файлів: `T56`, `T61`, `T67`, `T70`, `T71`, `T79`, `T80`, `T90`, `T92`, `T98`, `T101`–`T107`, плюс `PARITY-gojs-to-dg.md` і `NODE-interactions-contract.md`.

[`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md) переписано 2026-09-02: беклог живе в `work/`, GitHub Issues лишаються порожні. Гілки агентів: `cursor/<name>-<suffix>`.

**Пакування підтягнулось, publish — ні.** `license: "UNLICENSED"` проставлено, wasm їде в `dist` (`copy-wasm.mjs`), а `check-package.mjs` перевіряє, що пакет не посилається на файли, яких не відвантажує — приклад із коментаря: шлях воркера всередині рядка переживає `tsc` недоторканим, бандлер його резолвить, а споживач `dist` отримує 404 і **мовчки** лишається без воркера. Чого досі немає: semver-процесу, changelog, release workflow, LICENSE-файлу.

---

## 5. Залежності

**Змінились із базису** — попередня редакція казала «нульовий діф», і це вже неправда.

| Шар | Пакет | Навіщо |
|-----|--------|--------|
| Render | `pixi.js` ^8.19 (lock 8.19.0) | WebGL **або Canvas2D** (T83) |
| Peers | `react`/`react-dom` ≥18 optional | меню, promote, anchors |
| Build | `@rsbuild/core` ^1.2 — **лише демо**; SDK збирається `tsc` | sdk lib + demo |
| Test | **rstest** (`@rstest/core` ^0.11), jsdom, Playwright ^1.55 (lock 1.62) | unit + e2e |
| Lint | **oxlint** ^1.74, **oxfmt** ^0.65 | перший лінтер у репо |
| Компілятор | **TypeScript ^7.0** (було ^5.6) | |
| Граф | `ttsc` / `@ttsc/graph` ^0.28 | інструмент агента, не рантайм |
| WASM | wasm-bindgen 0.2, serde-wasm-bindgen 0.6, tidy-tree 0.1, tinyset pin 0.4.10 | Ploeg + contour |
| PDF | **немає jspdf** | мінімальний RGB PDF у `pdfExport.ts` |
| Node | `engines: >=20` | |

Видалений `createWorkerPipeline` більше не рекламується ніде в актуальних документах (звірено 2026-09-02); згадки лишились тільки в історичних задачах — T02, T77-M09, CRITIQUE — де вони й доречні.

---

## 6. Ризики (за силою)

### P1 — чесність картинки й експорту

| # | Суть | Джерело |
|---|------|---------|
| 1 | ~~`cell-flood` не доходить до експорту~~ — **закрито 2026-08-26**: SVG рахує flood тими самими входами, що й канвас; коли рушій не може відпрацювати, шар порожній + причина в `onDiagnostic`. Правило: SVG ніколи не малює рушієм, якого не використав канвас | `export/svgExport.ts`, [T80](./tasks/T80-contour-engines-ba-demo.md), [цикл](./reports/flood-export/) |
| 2 | ~~Візуальні бейзлайни застаріли~~ — **закрито 2026-08-25**: усі 5 знімків перезняті в контейнері `playwright:v1.62.1-noble` під `linux/amd64` (як CI), галерея `node-compare` теж; повторний прогін без `--update-snapshots` дав 16/16 | [MOCKUP-styles-review §Перегенеровано](./archive/tasks-2026-09-02.md) |
| 3 | ~~Shared module-level воркери~~ — **закрито 2026-08-26**: `worker/WorkerChannel.ts`, кожна діаграма має власний канал і звільняє його на `destroy()`; модульні `configure*` лишились для прямих викликів | `worker/WorkerChannel.ts`, `render/twoDiagrams.contract.test.ts` |
| 4 | Promote-HTML не входить у SVG/PNG/PDF | `react/createReactPromoteOverlay.ts` |
| 5 | Немає e2e на **export / mapper**. По D&D і promote e2e з'явились (`t67-multiselect-manual`, `promote-near`), по D&D переприв'язки — контрактні тести + ручна проходка, e2e немає | `e2e/` |
| 6 | **Вердикт продуктивності, знятий не з тієї фікстури.** Три задачі були відкриті за 1,5 с на `Staff · 1M` і закриті за 9,5–12,7 мс на `Brigade`: різниця в **формі зв'язків**, не в обсязі. Перед оптимізацією — звірити форму фікстури з продуктом | [звіт T88](./reports/viewport-window/report.md) §15–§19 |
| 7 | **Крос-орг пін може подвоїтись:** якщо зовнішній керівник належить організації, яка сама намальована на полотні, та сама посада з'явиться двічі — карткою свого блоку і піном над нашим | [T91 звіт](./reports/link-magnetism/report.md) §6 |
| 8 | Гілка Canvas2D живе лише під `SOFTWARE_GL=1`; звичайний раннер її не виконує. Прибрати цю пробіжку = перестати перевіряти T83, не помітивши цього | `.github/workflows/ci.yml` |
| 9 | **Список маркерів програмних рушіїв старіє, і мовчки.** Растеризатор, якого в ньому немає, лишиться на WebGL і на ~8 fps — без жодного сигналу. Ціна навмисно однобічна (невпізнане не демотується), але «не спрацювало» тут виглядає точно як «усе гаразд» | [`render/detectSoftwareRenderer.ts`](../packages/sdk/src/render/detectSoftwareRenderer.ts) |
| 10 | **«GPU не демотовано» перевірено на ОДНІЙ машині** (Apple M2 Max, ручний крок). Стенд бігає в headless Chromium на SwiftShader і про апаратний GPU відповісти не може в принципі — тож кожна правка списку вимагає повторити ручну перевірку | [звіт](./reports/auto-software-fallback/report.md) §2.1 |
| 11 | **Приймальний критерій A2 не виконаний до кінця:** на програмному стеку `auto` дає canvas у 4 з 4 гілок, але «0 кадрів > 33 мс» тримається не в кожному порядку прогону (1 і 6 із 57). Гіпотеза — незвільнений пробний контекст на SwiftShader; експеримент названий, не виконаний | [звіт](./reports/auto-software-fallback/report.md) §2 |
| 12 | **Юніт-перф-тести чутливі до паралельного навантаження.** `paintMagneticGroupsCost` падає під навантаженням і проходить без нього. T101 описує цей клас як **e2e**-проблему; він ширший — заторкує юніти, де про паралельність ніхто не думав | [T101](./tasks/T101-e2e-flakes-only-local.md), [звіт](./reports/auto-software-fallback/report.md) §4 |

### Документаційний drift (агенти брешуть самі собі)

**Закрито 2026-09-02** — усі названі розходження виправлені в самих документах, а не тут.

| Документ | Що було | Стан |
|----------|---------|------|
| SPEC §2.1 | matrix layout «planned» | ✅ реалізовано в TS, так і написано |
| SPEC §5.1 / §8.2 | promote «v1.x, після стабільної v1» | ✅ зроблено (T26 + T87); експорт його не містить — сказано |
| SPEC §7 | не знав про переприв'язку, вікно, `onRenderFailed`, початкове розкриття | ✅ додано, плюс §8.3 «додано після v1» |
| SPEC §12 | «Vitest (додати)» | ✅ rstest, Playwright, `HARNESS=1`, oxlint, typecheck |
| REQUIREMENTS §4.6 | описував **один** спосіб малювання контуру | ✅ врізка про два рушії за прапорцем |
| REQUIREMENTS §4.10 | чернетка з чотирьох колбеків | ✅ канон із `callbacks.ts`, шість типів `LayoutPatch`, «хто застосовує зміну» |
| REQUIREMENTS §5 | «Pixi.js WebGL», Rsbuild як збірка SDK | ✅ WebGL **або** Canvas2D, ticker вимкнено, SDK на `tsc` |
| TECH_STACK | «future Pixi», один рушій контуру, немає тестів/лінтера | ✅ перезібрано |
| CONTEXT | глосарій без термінів шести фіч | ✅ +9 термінів (paint request, viewport window, seat drag mode, re-parent, external manager pin…) |
| issue-tracker.md | «issues live on GitHub» — а їх нуль | ✅ переписано: беклог у `work/`, і статус у заголовку задачі — не доказ |
| CODING_STANDARDS | Zod «на межі» — пакета немає | ✅ названо, чим межа тримається насправді; плюс врізка, що частину правил тепер перевіряє машина |
| README | License Private / TBD; демо «after the repo is public» | ✅ `UNLICENSED`, демо live |

**Що з цього варте пам'яті:** документи розійшлися не тому, що ніхто не писав — а тому, що
писали **звіти про зміни**, а не правили твердження, які ці зміни спростували. Звіт додається,
твердження лишається. Тому правило §8.14 нижче.

### Масштаб і WASM

- 2M persons / 50k org — вимога, не виміряний e2e. 100k/1M таби — **вікна**, і кажуть це вголос.
- **Row-tree глибина: підтримано 2 500, зривається за ~2 900, і зрив понад ~4 500 вбиває весь WASM-модуль назавжди** (не лише той виклик) — див. Архітектурний факт №4. Гвардія (блок А, T102) закрита. **Блок Б** (підняти 2 500 вище, зняти квадратичну вартість — зараз ×3,7 на подвоєння обсягу, ~18с екстраполяція на 50k) чекає `spec-flow`: дві рекурсії в ланцюжку **не наші** (крейт `tidy_tree`, рекурсивний `Drop` `HierarchyNode`) і можуть виявитись справжньою стелею — тест B2 має йти **першим**, не останнім ([spec](./reports/row-tree-depth/spec.md) §5).
- Dual validate org (TS + Rust) на row-tree — два SoT.
- `validateOrgHierarchy` тримає 20k-глибину і 20k сиблінгів < 500 ms ([`layout/orgTreeValidatePerf.test.ts`](../packages/sdk/src/layout/orgTreeValidatePerf.test.ts), T77-M08).

### Структурний аудит — три знахідки закриті, чотири лишились задачами

`work/reports/structure-audit/report.md` дав п'ять знахідок; T80 уже мав задачу. Інші чотири
2026-09-02 отримали власні файли (`04c9a9e`), три — **вже виправлені** тим самим циклом (`ec1e75a`):

| # | Суть | Стан | Джерело |
|---|------|------|---------|
| — | `getData()` віддавав живий об'єкт — мутація ззовні розходила стан із рендером, пошуком, колбеками без жодного сигналу | ✅ закрито: deep copy | `OrgHierarchyDiagram.ts`, `getDataSnapshot.contract.test.ts` |
| — | `isDiagramData` пропускав `{organizations: null, …}` — падало пізніше й деінде | ✅ закрито: колекції мусять бути масивами | `data/mergeData.ts` |
| — | `renderPositionGrid` чекав paint контуру без epoch-перевірки — новіший рендер міг очистити шари під час підвислого await старішого | ✅ закрито: та сама гвардія, що вже мали staff/org-шляхи | `render/DiagramRenderer.ts` |
| T103 | `setData` не «виграє останній запит»: жодна зі стадій мапінгу/нормалізації/перебудови індексу не має epoch; `SearchIndexService.rebuildForScale` привласнює той проміс, що завершився останнім, не найновіший | 🔵 не почато, High | `SearchIndexService.ts:44-53` |
| T104 | Мутація, рендер і колбек хоста — не одна транзакція; `movePersonToCell`/`shiftBlock` не відкочують узагалі, `reparentPosition` відкочує дані, але колбек уже пішов | 🔵 не почато, High | `OrgHierarchyDiagram.ts:1552,1581,1599` |
| T105 | Кореневий барель віддає `resetContourWasmForTests`/`setContourWasmLoaderForTests` — процес-wide перемикач як частина споживацького інтерфейсу — **вище порога пайплайна** (публічний API) | 🔵 не почато, Medium | `index.ts:53-54` |
| T106 | Два файли тримають майже все: `OrgHierarchyDiagram.ts` 1 664 рядки, `DiagramRenderer.ts` 1 139, поруч із тонкими `DataStore`/`ViewStateStore` | 🔵 не почато, Medium | — |

### T101 — e2e-флаки, невидимі CI за конструкцією, не за ретраями

`playwright.config.ts`: `workers: process.env.CI ? 1 : undefined`. Локально Playwright бере
половину ядер (тут 6 із 12) — саме тому `Staff · 1M` конкурує за CPU з іншими воркерами й дві
перевірки в `staff-1m.spec.ts` час від часу впираються в 30-секундний таймаут. У CI один воркер
означає умова **фізично не відтворюється**: не «ретраї маскують», а гонки просто немає. Наслідок
— розробник бачить червоне там, де CI каже зелене, і привчається списувати локальний прогін на
флак; справжня регресія в цих тестах піде тим самим шляхом. Гіпотеза (не підтверджена)
записана в [T101](./tasks/T101-e2e-flakes-only-local.md).

### Поставка й продукт

- Немає semver/changelog/LICENSE/publish; host cutover поза репо.
- ~~**T92 заблоковано на числі з заліза замовника**~~ — **закрито 2026-09-04**, і не числом: воно було потрібне, щоб обрати поріг, а реалізований механізм порогів не має. Єдина задача, що стояла на чужому доступі, знята з черги ([T92](./tasks/T92-software-render-pan-cost.md) §«Чим закрито»).
- **T80 чекає рішення BA** — оновлено 2026-09-03 реальними числами: button-group лишається
  синхронним при 5,1 мс (T107), «пишеться двічі» — це два рушії, не подвоєна геометрія (SVG і
  канвас уже single-sourced). C-подібні контури досі дає лише `cell-flood` — жодна оптимізація
  button-group їх не додасть; це продуктовий вибір, не вибір реалізатора.
- **T56 звірено з кодом 2026-09-03** ([§19](./tasks/T56-gojs-feature-inventory.md)): 7 пунктів
  каталогу стояли «не взято», хоча вже зроблені (vacant styling, relink, block move, shift/ctrl
  multi-select, bulk actions, custom menu, audit hook) — продукт міг обрати їх удруге. 5 — наполовину
  (морф контуру без морфу позицій вузлів, rollback є для двох мутаторів з чотирьох, і т.д.). Два
  описи (C3, H3) брехали **десять днів**: писали «WASM blob» / «worker contour + layout WASM» уже
  після того, як рішення B прибрало контур із WASM-шляху. Далі — вибір продукту, чек-бокси не
  чіпані.
- [T61](./tasks/T61-group-recursion-tier3.md) (рекурсія груп ярусу 3) — ⛔ заблокована макетом.

---

## 7. Що закрито vs що відкрито

**Закрито (не переробляти без нової вимоги):** фази 1–4 REQUIREMENTS; Pixi LOD/camera/tween; org matrix + row-tree + spine-bus; staff 3-tier + expand-in-place + position expand; search (top-k, біграми, інкрементний append); export API; React menu/promote; Pages; T74 media; T75/T76 stores; **T77 M01–M11 повністю** (acceptance проставлені з доказами 2026-08-25); **T78 P0+P1**; T79 G2/M2; T80 два рушії; T81 1M-таб; T82 розбивка модулів; T33 чек-ліст переведено в `e2e/demo-audit.spec.ts`.

**Додано з базису:** **T83** (вибір рушія + фолбек на Canvas2D), **T84** (paint on demand), **T87** (promote near-visible), **T88** (вікно за камерою + пошук по мільйону), **T91** (переприв'язка посад), **T94** (резерв смуги під підпис зони), **T96** (тир-2 як ієрархія: ×2,6 на тій самій вкладці), **T97** (початковий стан діаграми), **T102 блок А** (row-tree більше не вбиває WASM-модуль, підтримана глибина 2 500), **T107** (контурний рендер у TS 14,0→5,1 мс; WASM-порт вимірюванням відхилено), три швидкі знахідки структурного аудиту (deep-copy `getData`, масив-гвардія `isDiagramData`, epoch у `renderPositionGrid`), Rust CI baseline (`cargo fmt --check` + `cargo clippy -D warnings`, було лише `cargo test`), гейт `Docs freshness`, **T98 варіант 1** (`auto` сам сідає на Canvas2D за іменем рушія; `docs/USAGE.md` переписаний, бо старий текст радив на `'auto'` не покладатись).

**Закрито **без** імплементації — і це теж результат:** **T89** (culling) і **T93** (відступ ієрархії) закриті перевіркою, **T90** (плавність драгу) — гіпотезу **виміряно й спростовано**. Не переробляти, не прочитавши, чому саме.

**Відкрито, порядок:**

1. **Рішення BA по рушію контуру** (T80) — brief оновлено 2026-09-03 реальними числами (5,1 мс, два рушії ≠ подвоєна геометрія); після рішення прибрати непотрібний шлях або описати обидва як продуктову опцію.
2. ~~**`cell-flood` в експорті**~~ — ✅ **закрито**: `export/svgExport.ts:85` читає рушій. Попередня редакція цього файлу цього не знала й тримала пункт відкритим.
3. ~~**Linux-бейзлайни**~~ — зроблено 2026-08-25; відтоді ще двічі перезнімались із артефакта CI (`b58d0cd`, `649c9b8`). Рецепт: **не** локальний контейнер, а `playwright-actual` із раннера.
4. ~~**Документи**~~ — ✅ **закрито 2026-09-02**, див. таблицю в §6.
5. ~~**T85**~~ — ✅ **закрито 2026-09-02**: 14 правил увімкнено, 27 лишились вимкненими, і жодне вже не стоїть як борг.
6. ~~**T92**~~ — ✅ **закрито 2026-09-04.** Не числом: критерій «число з цільового заліза» **знято**, бо існував заради порогу, якого в реалізованому дизайні немає. Лишається в `work/tasks/` до окремого архівного свіпу — попередній свіп лишив тринадцять мертвих лінків.
7. ~~**T98**~~ — ✅ **закрито 2026-09-04**, варіант 1. `auto` впізнає програмний растеризатор за іменем і йде на Canvas2D: **canvas у 4 з 4** заміряних гілок проти `webgl` на 7–10 fps до зміни. ⚠️ Один критерій не зелений — «0 кадрів > 33 мс» тримається не в кожному порядку прогону; записано як ризик 11.
8. **T102 блок Б** — підняти 2 500 і зняти квадратичну вартість. Спершу тест B2 (дві рекурсії не наші: `tidy_tree`, `Drop` `HierarchyNode`) — інакше можна витратити цикл на форк крейта, не знаючи, чи він і є стелею.
9. **T101 / T103–T106** — агент-реді, нічого не блокує. T101 і T103/T104 мають конкретну гіпотезу/сценарій відмови (`tdd` підходить одразу); T105 вище порога пайплайна (публічний API) — `spec-flow`, не інлайн-план.
10. **21 публічний метод поза `docs/USAGE.md`** — названо, не закрито; borderline baseline у `scripts/check-docs.mjs`, три з них — мутатори T104.
11. **T61** після макета; **T67 Phase 2** marquee — product go; **T56** звірено з кодом 2026-09-03, далі вибір продукту (чек-бокси).
12. Host: прибрати GoJS.

GitHub issue tracker не використовувати як карту, поки він порожній — брати `work/tasks/`.

---

## 8. Правила для наступної імплементації

1. Прочитати цей файл + тікет, який чіпаєш. Контур/export/org-tree → ще [T78](./archive/tasks-2026-09-02.md), [T79](./tasks/T79-g2-m2-paint-notch.md), [T80](./tasks/T80-contour-engines-ba-demo.md) і [CRITIQUE-9352d52](./tech-debt/CRITIQUE-dg_9352d52.md).
2. Словник з `CONTEXT.md`. Новий термін — `/domain-modeling`, не синонім зі avoid-списку.
3. TDD: failing success **і** failure до production. Баг на канвасі — цілити `paintMagneticGroups` / member boxes / `ContourPainter`, а не `computeAllContours`.
4. **Третій вигляд контуру — це третій рушій за прапорцем**, а не правка кільця в наявному. Обидва наявні шляхи мають тести; який лишиться — вирішує BA.
5. Змінюєш вигляд контуру — перевір **обидва** виходи: канвас і `export/svgExport.ts`. Вони **зведені** (`resolveExportContourRings`), і завдання — не розвести їх знову.
6. **Не** воскрешати `layout.rs` / `createWorkerPipeline`. Живий layout WASM = Ploeg `computeOrgRowTreeLayout`.
7. Після Rust — `npm run build:wasm` (rustc ≥ 1.86) **і закомітити `pkg`**: він у git з 2026-08-25, бо бібліотеку віддають як git-залежність (TD05).
8. Демо-фікстури лишаються цивільними — сторінка публічна.
9. Не публікувати npm і не обіцяти 2M render.
10. **Намалював — попроси фарбу.** Ticker вимкнено: без `requestPaint` картинка не оновиться, і жоден тест на дані цього не спіймає (T84).
11. **Міряєш продуктивність — спершу звір форму фікстури з продуктом.** `Staff · 1M` — хард-тест, `Staff · Brigade` — форма продукту. Число з першої не є вердиктом для другої (T88 §15–§19).
12. **Статус у заголовку задачі — не доказ.** Перевіряй `git log --grep="(T88"`, а не емодзі.
13. Перед `playwright test e2e/t8*-…` — `HARNESS=1`, інакше `testIgnore` мовчки знайде нуль тестів.
14. **Закрив фічу — знайди твердження, які вона спростувала.** Звіт про зміну не скасовує речення
    в SPEC / REQUIREMENTS / CONTEXT, яке тепер неправдиве. Дрифт 2026-09-02 накопичився саме так.
15. `npm run typecheck`, **не** `tsc -p packages/sdk/tsconfig.json`: штатний іде через
    `tsconfig.check.json` і бачить тести. T91 залишив його червоним саме через цю різницю.
16. **Перш ніж називати різницю — зміряй розкид самого стенда на незміненому коді.** Рядок 26
    T88 півтора тижня стояв проваленим за «+11%», тоді як власний шум стенда — 28% край-у-край
    (n = 14). Бюджет, вужчий за шум інструмента, не є вердиктом ні в який бік
    ([звіт T88](./reports/viewport-window/report.md) §9.4).
17. **Два дерева — один порт.** `playwright.config.ts` піднімає прев'ю на 4173 із
    `reuseExistingServer`; порівнюючи гілки через `git worktree`, звільняй порт між прогонами,
    інакше одне дерево мовчки зміряє бандл іншого.
18. **Стелю перевіряй на зламаній реалізації, перш ніж їй довіряти.** «20 000 місць < 1 000 мс»
    пройшла на квадратичному коді, який мала ловити (646 мс на тому розмірі). Прогони обидва боки.
19. **Зелений вимір може міряти не те.** `isOrgCollapsed()` дефолтить у `collapsed`, тож перший
    зонд глибини «5 000: ok, 4 мс» насправді розклав **один** вузол. Assert на `nodes.length`,
    ніколи на «не впало».
20. **Один зрив WASM труїть увесь процес, не той виклик.** Понад ~4 500 глибини
    `computeOrgRowTreeLayout` убиває модуль назавжди, і непов'язані WASM-фічі падають разом.
    Таблицю переходів міряй **по одному переходу на чистий процес**, не послідовно.
21. **Wall-clock ratio флакає в паралельній сюїті.** Round-robin sampling не рятує — рахуй
    роботу (ітерації/операції), не час (`paintMagneticGroupsCost.test.ts`).
22. **A/B на одному стенді не доказ.** Один прогін T107 читався як 6×; чесний A/B, медіана з 9 —
    2,7×.
23. **Перш ніж писати «повільно» в код чи коментар — перевір, чи не зайняте CPU чужим процесом**
    (`pgrep -fl playwright`, порт 4173). Дві «повільні» проходки цієї сесії виявились чужим
    `playwright --ui`.
24. **Grep-хіт — не доказ фічі.** Кожна теза парності в T56 читалась у реалізації; два описи
    (C3, H3) брехали десять днів попри те, що назви функцій формально збігались.
25. **Архівувати можна закрите й нічим не використане — не просто закрите.** `T79` довелось
    повертати з архіву, бо `SPEC.md`/`REQUIREMENTS.md` досі на нього посилаються.
26. **Перед push — `npm run check:docs`.** Це і CI-гейт (`Docs freshness`); дешевше дізнатись
    локально за секунду, ніж після круглого рейсу CI.

27. **Кругова блокада — це не блокада, а невиявлене припущення.** T98 чекав числа з T92, T92 чекав
    рішення з T98, і так стояло два дні. Розв'язалось не новим фактом, а розрізненням: число було
    потрібне для **тонкого** порогу, а завдання вимагало лише «чи це взагалі GPU». Коли дві задачі
    чекають одна одну — шукай, яке саме питання вважається спільним, і чи справді воно спільне.

28. **Дефолт для всіх хостів вимагає несиметричної ціни помилки.** Будь-яка евристика, що міняє
    поведінку за замовчуванням, мусить мати напрямок відмови, у якому «не спрацювало» коштує
    менше за «спрацювало не там». У T98 це дало правило «невпізнане = поточна поведінка», і воно
    ж зробило список маркерів некритичним.

29. **Вимір, який ламається на цільовій популяції, гірший за відсутність виміру.** Пробу
    продуктивності зняли не тому, що вона складна, а тому, що `performance.now()` загрублений
    саме в браузерах, які маскують рядок рушія. Перед тим як міряти — спитай, **чи вміє цільове
    середовище бути виміряним**.

30. **Дві осі рев'ю, що незалежно знайшли одне й те саме, — найсильніший сигнал, який дає рев'ю.**
    У T98 Standards і Spec обидві вказали на затерту діагностику. Знахідка, яку бачить лише одна
    вісь, потребує перевірки; знахідку, яку бачать обидві, можна брати в роботу одразу.

31. **`npx rstest run` запускати з `packages/sdk`, не з кореня.** З кореня інакше резолвиться
    конфіг і приходять хибні падіння — у цій сесії це коштувало одного «регресія!», якої не було.

32. **Юніт-перф-тести брешуть під паралельним навантаженням.** `paintMagneticGroupsCost` падає,
    коли поруч працює сабагент, і проходить, коли ні. Перш ніж лагодити перф-падіння — перевір
    його **окремим** прогоном.

---

## 9. Індекс джерел

| Що шукаєш | Де |
|-----------|-----|
| Вимоги, G-правила, фази | `docs/REQUIREMENTS.md` |
| Стек (кеш, місцями stale) | `docs/TECH_STACK.md` |
| Алгоритми / API | `work/SPEC.md` |
| Глосарій | `CONTEXT.md` |
| Задачі / борг | `work/README.md`, `work/tasks/`, `work/tech-debt/` |
| Критика post-T77 і її закриття | `work/tech-debt/CRITIQUE-dg_9352d52.md`, `work/archive/tasks-2026-09-02.md` |
| Два рушії контуру | `work/tasks/T80-contour-engines-ba-demo.md` |
| Розбивка модулів | `work/archive/tasks-2026-09-02.md` |
| Фасад | `packages/sdk/src/OrgHierarchyDiagram.ts` (публічний барель — `index.ts`) |
| Paint контуру | `packages/sdk/src/render/contour/` (`paintMagneticGroups.ts`, `ContourPainter.ts`, `floodContourEngine.ts`) |
| WASM contour / row-tree | `packages/core/src/contour.rs`, `ploeg_layout.rs`, `org_layout.rs` |
| CI | `.github/workflows/ci.yml` |
| Demo | `packages/demo/` (`app/tabs.ts`, `app/tabConfigs.ts`, `scenarios/mockups.ts`) |
| Вікно за камерою (арифметика + планувальник) | `packages/demo/src/app/viewportWindow.ts`, звіт `work/reports/viewport-window/` |
| Переприв'язка посад | `packages/sdk/src/interaction/positionReparent.ts`, звіт `work/reports/link-magnetism/` |
| Початкове розкриття | `packages/sdk/src/data/initialExpand.ts` |
| Paint on demand | `packages/sdk/src/render/PixiHost.ts` (`autoStart: false`, `requestPaint`) |
| Вибір рушія | `packages/sdk/src/render/PixiHost.ts` (`getRendererKind`, `resolveRendererPreference`), `e2e/renderer-choice.spec.ts` |
| Впізнавання програмного рушія | `packages/sdk/src/render/detectSoftwareRenderer.ts`; чому без проби — [`reports/auto-software-fallback/spec.md`](./reports/auto-software-fallback/spec.md) §«Історія рішення» |
| Числа «canvas vs програмний webgl» | [`reports/auto-software-fallback/report.md`](./reports/auto-software-fallback/report.md) §2, стенд `npm run measure:renderer` |
| Стенди-вимірювачі (за `HARNESS=1`) | `e2e/t87-motion.spec.ts`, `e2e/t88-window-cost.spec.ts` |
| Row-tree глибина: числа й метод | `work/reports/row-tree-depth/spec.md` |
| Контурний рендер, T107 (5 пасток вимірювання) | `work/tasks/T107-magnetic-contour-cost.md` |
| Структурний аудит — джерело T103–T106 | `work/reports/structure-audit/report.md` |
| Архів задач (117→20, правило архівації) | `work/archive/tasks-2026-09-02.md`, `work/archive/README.md` |
| Docs freshness гейт | `scripts/check-docs.mjs` |
| Мірник стандартів (що є гейтом, чого нема) | `.claude/standards.md` |
| Наступний хід, ранжовано | `work/AGENDA.md` (⚠️ станом на 2026-09-02 — переприв'язана до T101 і старих 806c843; перезбери `cto-agenda`, не бери як є) |
