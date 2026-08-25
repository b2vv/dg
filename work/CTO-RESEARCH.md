# CTO research — Org Hierarchy SDK (`b2vv/dg`)

**Дата:** 2026-08-25  
**Базис:** `origin/main` @ `e02bc2f` (після T79–T82 і двох осей рев'ю)  
**Призначення:** єдиний брифінг перед будь-якою імплементацією. Це не тікет і не ADR.

Кожна теза нижче веде в первинне джерело (код, workflow, `work/tasks/`, `docs/`). Якщо джерело і цей файл розходяться — править джерело, не цей кеш.

**Що змінилось із `a5eb0f6`:** 45 комітів. Зачепили продукт (три нові демо-таби), seams (повна розбивка модулів T82), інфру (CRG), ризики (T78 P0+P1 закриті). Розділи 1–4 і 6–9 перезібрані; залежності (розділ 5) і CI не змінювались — `package.json` / lock / `Cargo.toml` / `.github/` мають нульовий діф до базису.

---

## Вердикт на один екран

**Продукт** — embeddable browser SDK організаційних і штатних діаграм: host дає дані в пам'ять, SDK розкладає й малює Pixi-полотно, експортує SVG/PNG/PDF. Заміна прод-діаграми на GoJS у host-репо. ([`docs/REQUIREMENTS.md`](../docs/REQUIREMENTS.md) §0–§1; [T71](./tasks/T71-gojs-to-dg-migration-plan.md))

**Стан:** живого P0 **немає** — [T78](./tasks/T78-post-t77-critique.md) закритий цілком («🟢 P0 done · P1 done»). Після нього зроблено: G2/M2 на фарбі ([T79](./tasks/T79-g2-m2-paint-notch.md)), другий рушій контуру для вибору BA ([T80](./tasks/T80-contour-engines-ba-demo.md)), таб на 1M посад ([T81](./tasks/T81-staff-1m-scale-tab.md)), розбивка коду по модулях ([T82](./tasks/T82-module-split.md)). Черга далі — **продуктові рішення, не код**: вибір рушія контуру (BA), макет для T61, чек-лист T56.

**Архітектурний факт №1:** контур на канвасі тепер має **два рушії** за прапорцем `RenderConfig.contourEngine` (default `'button-group'`, [`render/types.ts:412`](../packages/sdk/src/render/types.ts)). `'cell-flood'` **справді** тягне Rust-flood через `computeAllContours` по кожному org-блоку ([`render/contour/floodContourEngine.ts:90`](../packages/sdk/src/render/contour/floodContourEngine.ts)) — стара теза «WASM не на paint-шляху» більше не універсальна. **Але `export/` рушія не знає**: SVG завжди малює `paintMagneticGroups` ([`export/svgExport.ts:196,331`](../packages/sdk/src/export/svgExport.ts), у `export/` немає жодної згадки `contourEngine`). Тобто діаграма з `cell-flood` експортується button-group-кільцями — canvas ≠ export, і це ніде не задокументовано.

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

Доведене в demo — **вікна, а не повні набори**: 100k org (400 намальованих, [`scenarios/scaleOrgs.ts`](../packages/demo/src/scenarios/scaleOrgs.ts), T48) і 1M посад на трьох ярусах ([`scenarios/scaleStaff.ts`](../packages/demo/src/scenarios/scaleStaff.ts), [T81](./tasks/T81-staff-1m-scale-tab.md)). Обидва таби друкують «вікно N з M» і чесно кажуть, коли шуканого немає у вікні (T81 §Чесність).

### 1.2 Два сімейства діаграм

Один `DiagramData`, два layout engines і два візуальні контракти. Зміна focus org / сімейства скидає session. ([SPEC §2.2.2](./SPEC.md))

**Організації** — усі collapsed → **matrix** (sparse grid, TS); ≥1 expanded → **row-tree** (Ploeg WASM `computeOrgRowTreeLayout`). Перемикач `detectOrgMode` / `isOrgCollapsed` ([`layout/orgMode.ts`](../packages/sdk/src/layout/orgMode.ts)).

**Штатка — три яруси** (поточна org завжди в ярусі 2). Per-org coords: matrix / tree / **hybrid anchors** (default). Drill = `focusStaffOrg`; expand-in-place = `toggleStaffOrgExpand` (T20). ([SPEC §2.2](./SPEC.md))

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
e2e/               Playwright проти preview demo (9 spec-файлів)
```

Workspaces npm: лише sdk + demo; core збирається `npm run build:wasm` (кореневий `package.json`). У SDK **136 модулів + 105 тестових файлів**; зелена база — 662 sdk + 61 demo unit, 35 e2e (без скріншотних).

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

**Правило шарів після T82:** `data/` → `contour/`, `layout/` → `render/` → `state/` + фасад. Єдина навмисна залежність «назовні» — `state/ViewStateStore` читає типи LOD/теми з `render/` (view state сидить **над** рендерером). ([T82](./tasks/T82-module-split.md))

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
| **SVG export** | завжди button-group, рушія не читає | [`export/svgExport.ts`](../packages/sdk/src/export/svgExport.ts) |

`gridCell` у flood — **локальна для org-блоку**, тому flood ганяється поблочно і кожен блок мапиться своїм origin; один спільний flood наклав би ярус 1 на ярус 2 (T80). Коридор G2 — `RenderConfig.corridorCells` (default 0.5 клітини, [`render/contour/contourCorridor.ts`](../packages/sdk/src/render/contour/contourCorridor.ts)), і flood, який нічого не намалював, зобов'язаний сказати чому через `getLayoutDiagnostics()`.

Рішення T77-M01 Option B лишається чинним для default-рушія: renderer **не** робить WASM round-trip для `button-group`; `cell-flood` бере його свідомо, за прапорцем.

### 2.5 Demo

13 табів ([`app/tabs.ts`](../packages/demo/src/app/tabs.ts)): Variant B (канон магнетизму QA), Staff tree, Orgs · Figma/GoJS, Staff · Figma / Magnetic / Flood / GoJS, Staff · 1M, Flat orgs, 100k orgs, Mapper, Worker. Конфіг табу — чиста функція [`app/tabConfigs.ts`](../packages/demo/src/app/tabConfigs.ts); ознаки табу (`family`, `contourControls`, `orgTree`, `reloadsOnContourSlider`) — таблиця `TAB_META`; фікстури — [`scenarios/mockups.ts`](../packages/demo/src/scenarios/mockups.ts) (барель). `?e2e=1` → `window.__demoE2e` ([`app/e2eBridge.ts`](../packages/demo/src/app/e2eBridge.ts)) + DOM anchors. Alias SDK на **source**, не `dist`.

**Демо-фікстури цивільні навмисно** — сторінка публічна (GitHub Pages), військових назв з Figma в них немає ([MOCKUP-styles-review](./tasks/MOCKUP-styles-review.md) правило 1).

---

## 3. Патерни (як тут пишуть)

Обов'язкові політики: [`work/TDD.md`](./TDD.md) (Red-Green-Refactor, success **і** failure), [`work/CODING_STANDARDS.md`](./CODING_STANDARDS.md) (KISS > SOLID; без `enum`/`any`; `satisfies`; `assertNever` на discriminated union; функції ≤ ~40 рядків; Law of Demeter). Zod у стандартах згаданий як межа валідації — **у залежностях немає**.

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

Тести: Vitest+jsdom, eager WASM з `src/wasm/pkg` у setup. Контракт жестів: [`NODE-interactions-contract.md`](./tasks/NODE-interactions-contract.md). Playwright — Chromium-only smoke; **немає** e2e на export / D&D / mapper / promote.

---

## 4. Інфра й доставка

### 4.1 CI / Pages

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): три джоби (`rust` cargo test; `sdk` wasm-pack + typecheck + vitest; `e2e` Playwright). Node **22**, Rust **stable** + `wasm32-unknown-unknown`, **немає** `rust-toolchain.toml` — тобто версія rustc не зафіксована ні в CI, ні локально. Практика: на rustc 1.79 `npm run build:wasm` падав, вимагаючи ≥ 1.86; робоча машина зараз на 1.98 (`rustc --version`, 2026-08-25). wasm-pack ставиться `curl … | sh` — непіннований інсталер. Кожен job збирає WASM окремо (немає artifact sharing).

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml): `DEMO_BASE_PATH=/dg/` → `https://b2vv.github.io/dg/`. Репо публічне; README досі каже «after the repo is public» / License Private TBD.

### 4.2 WASM pkg (TD05)

Build-on-demand: `packages/sdk/src/wasm/pkg/` gitignored. Свіжий clone без `npm run build:wasm` не проганяє contour-тести SDK. ([TD05](./tech-debt/TD05-wasm-pkg-in-repo.md))

### 4.3 Локальний тулінг агента (новий із базису)

[`.mcp.json`](../.mcp.json) + [`.claude/`](../.claude) — code-review-graph (CRG): граф символів і тестів, хуки `PostToolUse` на `Edit|Write|Bash` ([`.claude/settings.json`](../.claude/settings.json)), скіли `explore-codebase` / `debug-issue` / `refactor-safely` / `review-changes`. Дані графа в `.code-review-graph/` — **gitignored**, тобто у кожного агента свій індекс. Персональні нотатки (`CLAUDE.local.md`) ігноруються — правило в `.gitignore` закомічене після інциденту, коли `git add -A` затягнув файл у historію (виправлено переписуванням `main`).

### 4.4 Трекер

GitHub Issues на `b2vv/dg` **порожні**; живий беклог — `work/tasks/` + `work/tech-debt/`. [`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md) каже «issues live on GitHub» — **дрифт**. Гілки агентів: `cursor/<name>-<suffix>`. npm publish не готовий: немає LICENSE, `files: ["dist"]` без wasm-артефакта, немає release workflow.

---

## 5. Залежності

Нульовий діф до базису — таблиця чинна.

| Шар | Пакет | Навіщо |
|-----|--------|--------|
| Render | `pixi.js` ^8.19 (lock 8.19.0) | WebGL canvas |
| Peers | `react`/`react-dom` ≥18 optional | меню, promote, anchors |
| Build | `@rsbuild/core` ^1.2 (lock 1.7.x) | sdk lib + demo |
| Test | vitest, jsdom, Playwright ^1.55 (lock 1.62) | unit + e2e |
| WASM | wasm-bindgen 0.2, serde-wasm-bindgen 0.6, tidy-tree 0.1, tinyset pin 0.4.10 | Ploeg + contour |
| PDF | **немає jspdf** | мінімальний RGB PDF у `pdfExport.ts` |
| Node | `engines: >=20` | |

`TECH_STACK.md` і REQUIREMENTS §4.9 досі рекламують видалений `createWorkerPipeline` — **дрифт**.

---

## 6. Ризики (за силою)

### P1 — чесність картинки й експорту

| # | Суть | Джерело |
|---|------|---------|
| 1 | **`cell-flood` не доходить до експорту**: SVG завжди button-group, `export/` не читає `contourEngine`; T80 про експорт мовчить | `export/svgExport.ts`, [T80](./tasks/T80-contour-engines-ba-demo.md) |
| 2 | **Візуальні бейзлайни застаріли**: 5 знімків `e2e/mockups.spec.ts-snapshots/` + галерея `work/tasks/node-compare/` треба перегенерувати **на Linux**; поки цього нема — жодна візуальна зміна не перевірена картинкою (остання така: фаза пунктиру на кутах вакантної картки) | [MOCKUP-styles-review §Відкладено](./tasks/MOCKUP-styles-review.md) |
| 3 | Shared module-level contour/search воркери — кілька діаграм на сторінці ділять `configure*` | `contour/worker-bridge.ts`, `interaction/searchWorker.ts` |
| 4 | Promote-HTML не входить у SVG/PNG/PDF | `react/createReactPromoteOverlay.ts` |
| 5 | Немає e2e на export / D&D / mapper / promote | `e2e/` |

### Документаційний drift (агенти брешуть самі собі)

`docs/REQUIREMENTS.md`, `docs/TECH_STACK.md`, `work/SPEC.md` **не мінялись** із базису, тому весь список чинний і поповнився двома рушіями:

| Документ | Що застаріло |
|----------|----------------|
| SPEC §2.1 | row-tree як `layout.rs` Reingold–Tilford; matrix «planned». Насправді Ploeg + TS matrix; `layout.rs` видалено |
| SPEC §3.2 / §3.5 / §9 | псевдокод «WASM path → Pixi» без прапорця рушія |
| SPEC §8.2 / §11 | promote overlay «не v1» — T26 ✅ |
| REQUIREMENTS §4.6 / §4.6.1 | описує один спосіб малювання; тепер їх два за `contourEngine`, а G2/M2 з'явилось на фарбі (T79) |
| TECH_STACK | `createWorkerPipeline`; «dept tetris pack» як live hull |
| CONTEXT | G-правила як видима поведінка (частково правда лише з T79/T80) |
| issue-tracker.md | GitHub Issues як SoT — issues порожні |
| CODING_STANDARDS | Zod на межі — пакета немає |
| README | License Private/TBD при публічному репо |

### Масштаб і WASM

- 2M persons / 50k org — вимога, не виміряний e2e. 100k/1M таби — **вікна**, і кажуть це вголос.
- WASM stack/panic на глибоких деревах: A1/A2 в T77 won't-fix (межа wasm; node count bounded).
- Dual validate org (TS + Rust) на row-tree — два SoT.
- `validateOrgHierarchy` тримає 20k-глибину і 20k сиблінгів < 500 ms ([`layout/orgTreeValidatePerf.test.ts`](../packages/sdk/src/layout/orgTreeValidatePerf.test.ts), T77-M08).

### Поставка й продукт

- Немає semver/changelog/LICENSE/publish; host cutover поза репо.
- **T80 чекає рішення BA** — який рушій лишається в продукті; поки живуть обидва.
- [T61](./tasks/T61-group-recursion-tier3.md) (рекурсія груп ярусу 3) — ⛔ заблокована макетом; [T56](./tasks/T56-gojs-feature-inventory.md) — чек-лист, який ставить продукт, не агент.

---

## 7. Що закрито vs що відкрито

**Закрито (не переробляти без нової вимоги):** фази 1–4 REQUIREMENTS; Pixi LOD/camera/tween; org matrix + row-tree + spine-bus; staff 3-tier + expand-in-place + position expand; search (top-k, біграми, інкрементний append); export API; React menu/promote; Pages; T74 media; T75/T76 stores; **T77 M01–M11 повністю** (acceptance проставлені з доказами 2026-08-25); **T78 P0+P1**; T79 G2/M2; T80 два рушії; T81 1M-таб; T82 розбивка модулів; T33 чек-ліст переведено в `e2e/demo-audit.spec.ts`.

**Відкрито, порядок:**

1. **Рішення BA по рушію контуру** (T80) — після нього прибрати непотрібний шлях або описати обидва як продуктову опцію.
2. **`cell-flood` в експорті** — або рушій читається в `export/`, або в T80 і SPEC чесно написано, що експорт завжди button-group.
3. **Linux-бейзлайни** — перегенерувати знімки й галерею; доти візуальні зміни не підтверджені.
4. **Документи** — SPEC/CONTEXT/TECH_STACK/REQUIREMENTS під фактичний paint із двома рушіями.
5. **T61** після макета; **T67 Phase 2** marquee — product go; **T56** після вибору замовника.
6. Host: прибрати GoJS.

GitHub issue tracker не використовувати як карту, поки він порожній — брати `work/tasks/`.

---

## 8. Правила для наступної імплементації

1. Прочитати цей файл + тікет, який чіпаєш. Контур/export/org-tree → ще [T78](./tasks/T78-post-t77-critique.md), [T79](./tasks/T79-g2-m2-paint-notch.md), [T80](./tasks/T80-contour-engines-ba-demo.md) і [CRITIQUE-9352d52](./tech-debt/CRITIQUE-dg_9352d52.md).
2. Словник з `CONTEXT.md`. Новий термін — `/domain-modeling`, не синонім зі avoid-списку.
3. TDD: failing success **і** failure до production. Баг на канвасі — цілити `paintMagneticGroups` / member boxes / `ContourPainter`, а не `computeAllContours`.
4. **Третій вигляд контуру — це третій рушій за прапорцем**, а не правка кільця в наявному. Обидва наявні шляхи мають тести; який лишиться — вирішує BA.
5. Змінюєш вигляд контуру — перевір **обидва** виходи: канвас і `export/svgExport.ts`. Вони вже розходяться на `cell-flood`.
6. **Не** воскрешати `layout.rs` / `createWorkerPipeline`. Живий layout WASM = Ploeg `computeOrgRowTreeLayout`.
7. Після Rust — `npm run build:wasm` (rustc ≥ 1.86). Без `pkg` contour-тести SDK не стартують (TD05).
8. Демо-фікстури лишаються цивільними — сторінка публічна.
9. Не публікувати npm і не обіцяти 2M render.

---

## 9. Індекс джерел

| Що шукаєш | Де |
|-----------|-----|
| Вимоги, G-правила, фази | `docs/REQUIREMENTS.md` |
| Стек (кеш, місцями stale) | `docs/TECH_STACK.md` |
| Алгоритми / API | `work/SPEC.md` |
| Глосарій | `CONTEXT.md` |
| Задачі / борг | `work/README.md`, `work/tasks/`, `work/tech-debt/` |
| Критика post-T77 і її закриття | `work/tech-debt/CRITIQUE-dg_9352d52.md`, `work/tasks/T78-post-t77-critique.md` |
| Два рушії контуру | `work/tasks/T80-contour-engines-ba-demo.md` |
| Розбивка модулів | `work/tasks/T82-module-split.md` |
| Фасад | `packages/sdk/src/OrgHierarchyDiagram.ts` (публічний барель — `index.ts`) |
| Paint контуру | `packages/sdk/src/render/contour/` (`paintMagneticGroups.ts`, `ContourPainter.ts`, `floodContourEngine.ts`) |
| WASM contour / row-tree | `packages/core/src/contour.rs`, `ploeg_layout.rs`, `org_layout.rs` |
| CI | `.github/workflows/ci.yml` |
| Demo | `packages/demo/` (`app/tabs.ts`, `app/tabConfigs.ts`, `scenarios/mockups.ts`) |
