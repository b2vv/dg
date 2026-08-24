# CTO research — Org Hierarchy SDK (`b2vv/dg`)

**Дата:** 2026-08-24  
**Базис:** `origin/main` @ `a5eb0f6` (після #62 / T78 critique)  
**Призначення:** єдиний брифінг перед будь-якою імплементацією. Це не тікет і не ADR.

Кожна теза нижче веде в первинне джерело (код, workflow, `work/tasks/`, `docs/`). Якщо джерело і цей файл розходяться — править джерело, не цей кеш.

---

## Вердикт на один екран

**Продукт** — embeddable browser SDK організаційних і штатних діаграм: host дає дані в пам’ять, SDK розкладає й малює Pixi-полотно, експортує SVG/PNG/PDF. Заміна прод-діаграми на GoJS у host-репо. ([`docs/REQUIREMENTS.md`](../docs/REQUIREMENTS.md) §0–§1; [`work/tasks/T71-gojs-to-dg-migration-plan.md`](./tasks/T71-gojs-to-dg-migration-plan.md))

**Стан:** чекбокси v1 у REQUIREMENTS §7 і cutover-черга GoJS→dg **закриті**. Живий P0-епік — **[T78](./tasks/T78-post-t77-critique.md)** (повторна критика після T77). Не починати фічі з [T56](./tasks/T56-gojs-feature-inventory.md) / [T61](./tasks/T61-group-recursion-tier3.md), поки T78 P0 не зелений — інакше малюєте на роз’їханому контурі, лісі орг і експорті.

**Архітектурний факт №1:** на канвасі dept-контур — **TS button-group** (`paintMagneticGroups`), не Rust flood з `contour.rs`. WASM G5–G7 лишився для SVG-grid гілки, public API і тестів. Це свідоме рішення T77-M01 Option B, **недочищене**. ([`T77-M01`](./tasks/T77-M01-contour-wire-or-delete.md); [`CRITIQUE-dg_9352d52.md`](./tech-debt/CRITIQUE-dg_9352d52.md) C1–C3)

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

Доведене в demo: **100k org address space, 400 намальованих** (вікно), не 2M persons і не 50k одночасних Pixi-нод. ([`packages/demo/src/scenarios/scaleOrgs.ts`](../packages/demo/src/scenarios/scaleOrgs.ts); T48)

### 1.2 Два сімейства діаграм

Один `DiagramData`, два layout engines і два візуальні контракти. Зміна focus org / сімейства скидає session. ([`work/SPEC.md`](./SPEC.md) §2.2.2)

**Організації**

- Усі collapsed → **matrix** (sparse grid, TS).
- ≥1 expanded → **row-tree** (Ploeg WASM `computeOrgRowTreeLayout`).
- Перемикач: `detectOrgMode` / `isOrgCollapsed` (`collapsed !== false`). ([`packages/sdk/src/layout/orgMode.ts`](../packages/sdk/src/layout/orgMode.ts))

**Штатка — три яруси** (поточна org завжди в ярусі 2): керуюча → focus staff → підлеглі картки. Per-org coords: matrix / tree / **hybrid anchors** (default). Drill = `focusStaffOrg`; expand-in-place = `toggleStaffOrgExpand` (T20). ([SPEC §2.2](./SPEC.md))

### 1.3 Модель даних (канон SDK ≠ чернетка REQUIREMENTS)

Канон: [`packages/sdk/src/data/types.ts`](../packages/sdk/src/data/types.ts) `DiagramData`.

| У REQUIREMENTS §3 | У коді |
|-------------------|--------|
| `Position.assignments: PositionAssignment[]` (many-to-many person↔seat) | `DiagramPosition.personId?: string` — одне призначення |
| окремий HTTP API | немає клієнта; host `setData` |
| `Group` як сутність з emblem | `DiagramGroup` caption-only; `emblemUrl` deprecated (Q29) на користь org `entityType: 'group'` |

Посада має **три** способи сказати «де картка»: `gridCell`, `layoutX`/`layoutY`, `layoutCoords`. T78 називає це шаром drift. ([CRITIQUE-dg_9352d52 §3](./tech-debt/CRITIQUE-dg_9352d52.md))

GoJS-поля на org/position (`filledCount`, `periodStart`, `isKeyPosition`, `pending`, …) — ціна parity T70, не v1 REQUIREMENTS.

### 1.4 Інтеграція host

```
Host fetch → DataMapper? → OrgHierarchyDiagram.create(el, { data, mappers, callbacks })
```

Публічні входи: `.` / `./react` / `./worker` / `./mappers`. React — **optional peer**. Pixi — runtime dep SDK. ([`packages/sdk/package.json`](../packages/sdk/package.json))

Persist drag/layout — лише `onLayoutChange`; SDK не пише на бекенд. ([REQUIREMENTS §8](../docs/REQUIREMENTS.md); SPEC §10)

Cutover GoJS у **цьому** репо закритий; видалити `gojs-diagram` у host — зовні. ([PARITY §3](./tasks/PARITY-gojs-to-dg.md))

### 1.5 Глосарій

Терміни: [`CONTEXT.md`](../CONTEXT.md). Не казати blob hull / gravity / org tree view / zoom level (alone). ADRs немає: `docs/adr/` не створено (ліниво, [`docs/agents/domain.md`](../docs/agents/domain.md)).

---

## 2. Кодова база

### 2.1 Пакети

```
packages/core/     Rust crate org-hierarchy-core → WASM (cdylib+rlib)
packages/sdk/      @org-hierarchy/sdk 0.1.0 — публічний API
packages/demo/     @org-hierarchy/demo private — Rsbuild QA
archive/           legacy-ts, legacy-web-rspack (TD02 closed)
e2e/               Playwright проти preview demo
```

Workspaces npm: лише sdk + demo. Core збирається `npm run build:wasm` (`wasm-pack --target web --out-dir ../sdk/src/wasm/pkg`). ([кореневий `package.json`](../package.json))

Орієнтовний обсяг (без `pkg/` / `target/` / тестів у підсумку core): SDK `src` ~24k LOC TS, core `src` ~2.2k LOC Rust після видалення `layout.rs`, demo ~2.8k. ~80 Vitest файлів у SDK, 8 e2e spec.

### 2.2 Runtime шари

```
Host
  OrgHierarchyDiagram          фасад (packages/sdk/src/index.ts)
    DataStore / SelectionStore / ViewStateStore
    mappers → DiagramData
    WorkerPool? + contour/search workers
    MediaService → Pixi textures
    PixiHost → Viewport → DiagramRenderer
      staff: canvasLayout + PersonNode + StaffEdges + zone chrome + paintContours
      org:   matrixLayout | computeOrgRowTreeLayout + OrganizationNode + OrgEdges
    export/ (SVG path rebuild; PNG/PDF з Pixi framebuffer)
  optional @org-hierarchy/sdk/react  (меню, promote, test anchors)
```

Життєвий цикл фасаду: `create` → `setData`/`appendData` → `render()` (coalesce) → `destroy`. Selection йде `repaintSelection` без rebuild (T75). ([`packages/sdk/src/index.ts`](../packages/sdk/src/index.ts); [`render/renderCoalesce.ts`](../packages/sdk/src/render/renderCoalesce.ts))

### 2.3 WASM: що живе

Після T77-M09 **немає** `layout.rs`, `wasm_compute_layout`, `wasm_build_from_flat`, `wasm_tree_stats`. ([`T77-M09`](./tasks/T77-M09-dead-code-purge.md); [`packages/core/src/lib.rs`](../packages/core/src/lib.rs))

| JS export | Роль | Хто кличе |
|-----------|------|-----------|
| `computeOrgRowTreeLayout` | Ploeg/`tidy-tree` row-tree | org layout + staff tree blocks |
| `computeDeptContour` / `computeAllContours` | G1–G7 magnetism | public API, **SVG grid**, tests; **не** Pixi paint |

Contour pipeline в Rust (`contour.rs`): cluster → flood → G5 notch → G6 far-side → G7 peel → orthogonal trace → Chaikin. G8 (morph під drag) — SDK, не Rust. ([`packages/core/src/contour.rs`](../packages/core/src/contour.rs); CONTEXT «Contour morph»)

### 2.4 Два контури (читати обов’язково)

| Шлях | Алгоритм | Де |
|------|----------|-----|
| **Canvas (живе)** | union-find Manhattan ≤ `magnetRadius` + padded AABB ring (`contourButtonGroup` / `polishContourRing`) | [`paintMagneticGroups.ts`](../packages/sdk/src/render/paintMagneticGroups.ts); [`DiagramRenderer.paintContours`](../packages/sdk/src/render/DiagramRenderer.ts) `void options.computeContours` |
| **Rust (інший продукт)** | polyomino flood + G5–G7 | `contour.rs`; [`svgExport.ts`](../packages/sdk/src/export/svgExport.ts) гілка `positions.some(gridCell)` без staff |
| **Staff SVG** | той самий TS, що canvas | `svgExport.ts` → `paintMagneticGroups` |

Наслідок: REQUIREMENTS/SPEC/CONTEXT описують G5–G7 як те, що **видно**. На екрані notch/far-side/peel **немає** (T78 L8). Variant B Vitest часто асертить `computeAllContours`, не paint (T78 T3).

M01 Option B: «не compute-then-ignore в renderer» — формально `void computeContours`, але фасад досі збирає incremental computer і передає його в render (T78 C1). [`T77-M01`](./tasks/T77-M01-contour-wire-or-delete.md) acceptance «SPEC узгоджений з екраном» — **незакритий**.

### 2.5 Demo

Таби: Variant B (канон магнетизму QA), Staff tree, Orgs/Staff Figma і GoJS mockups, Flat orgs, 100k, Mapper (pooled `flatRowsToPipeline`), Worker bench. `?e2e=1` → `window.__demoE2e` + DOM anchors. Alias SDK на **source**, не `dist`. ([`packages/demo/rsbuild.config.ts`](../packages/demo/rsbuild.config.ts); [`packages/demo/src/app/App.ts`](../packages/demo/src/app/App.ts))

---

## 3. Патерни (як тут пишуть)

Обов’язкові політики: [`work/TDD.md`](./TDD.md) (Red-Green-Refactor, success **і** failure), [`work/CODING_STANDARDS.md`](./CODING_STANDARDS.md) (KISS > SOLID на ранньому етапі; Pocock: без `enum`/`any`, `satisfies`, explicit return на public SDK API). Zod у стандартах згаданий як межа валідації — **у залежностях немає**.

| Патерн | Де | Правило |
|--------|----|---------|
| Facade | `OrgHierarchyDiagram` | один зовнішній seam для host |
| Stores | `state/*` (T76) | selection/view живі; DataStore — snapshot даних |
| Mapper | `mappers/`, `flatRowsToDiagram` | host raw → `DiagramData` |
| Bridge | `contour/bridge.ts`, `wasm/layoutBridge.ts`, `worker/bridge.ts` | WASM/worker за typed messages |
| Pool | `WorkerPool`, `mapFlatRowsInPool`, texture refcount | bounded concurrency |
| Coalesce | `renderCoalesce.ts` | один in-flight render |
| Optional React | callbacks + `subscribePromoteSync` | ядро без React |
| Deprecate / Option B | contour compute лишається public, paint ігнорує | не wire WASM у Pixi без продуктового рішення |

Тести: Vitest+jsdom, eager WASM з `src/wasm/pkg` у setup. Контракт жестів: [`NODE-interactions-contract.md`](./tasks/NODE-interactions-contract.md) + `nodeInteractions.contract.test.ts`. Playwright — Chromium-only smoke (tabs, 100k search window, context menu, multi-select); **немає** e2e на export/D&D/mapper/promote.

---

## 4. Інфра

### 4.1 CI / Pages

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): три джоби (`rust` cargo test; `sdk` wasm-pack + typecheck + vitest; `e2e` Playwright). Тригери: `main`/`master`/`cursor/**` і всі PR. Node **22**, Rust **stable** + `wasm32-unknown-unknown`. **Немає** `rust-toolchain.toml`.

wasm-pack ставиться `curl … | sh` — непіннований інсталер (supply-chain). Кожен job і Pages окремо збирає WASM (немає artifact sharing).

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml): `DEMO_BASE_PATH=/dg/` → `https://b2vv.github.io/dg/`. Репо **публічне** (`gh repo view isPrivate: false`); README досі каже «after the repo is public» / License Private TBD. ([`README.md`](../README.md); T25)

### 4.2 WASM pkg (TD05)

Прийнято **build-on-demand**: `packages/sdk/src/wasm/pkg/` gitignored. Свіжий clone без `npm run build:wasm` не проганяє SDK contour тести. Consumers без Rust не можуть зібрати. ([`TD05`](./tech-debt/TD05-wasm-pkg-in-repo.md))

### 4.3 Трекер

GitHub Issues на `b2vv/dg`: **порожньо**. Лейбли triage (`needs-triage`, `ready-for-agent`, …) існують. Живий беклог — `work/tasks/` + `work/tech-debt/`. [`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md) каже «issues live on GitHub» — **дрифт**.

Гілки агентів: `cursor/<name>-<suffix>` ([`CONTRIBUTING.md`](../CONTRIBUTING.md)).

npm publish: не готово — немає LICENSE, SDK `files: ["dist"]` без wasm-артефакта, немає release workflow, версія `0.1.0`.

---

## 5. Залежності

| Шар | Пакет | Навіщо |
|-----|--------|--------|
| Render | `pixi.js` ^8.19 (lock 8.19.0) | WebGL canvas |
| Peers | `react`/`react-dom` ≥18 optional | меню, promote, anchors |
| Build | `@rsbuild/core` ^1.2 (lock 1.7.x) | sdk lib + demo |
| Test | vitest, jsdom, Playwright ^1.55 (lock 1.62) | unit + e2e |
| WASM | wasm-bindgen 0.2, serde-wasm-bindgen 0.6, tidy-tree 0.1, tinyset pin 0.4.10 | Ploeg + contour |
| PDF | **немає jspdf** | мінімальний RGB PDF у `pdfExport.ts` |
| Node | `engines: >=20` | |

`pipeline` worker API видалено в M09. `TECH_STACK.md` і REQUIREMENTS §4.9 досі рекламують `createWorkerPipeline` — **дрифт**. Three.js лише в `archive/legacy-web-rspack` (поза v1).

---

## 6. Ризики (за силою)

### P0 — ламає пікселі / layout / експорт (черга T78)

Джерело: [`CRITIQUE-dg_9352d52.md`](./tech-debt/CRITIQUE-dg_9352d52.md) + [`T78`](./tasks/T78-post-t77-critique.md). Перевірено в дереві `a5eb0f6`:

| ID | Суть | Код |
|----|------|-----|
| C2 | Flat/grid `paintContours` без `contourMemberBoxesByDept` → порожній wash | `DiagramRenderer.ts` після staff `return` (~1073) |
| L1 | Drag origin з **першого** `gridCell` на всі staff-яруси | `contourWorldTransform` / `dragGrid` у `renderStaff` |
| L2 | Hybrid floating siblings в одну `(x,y)`; eject лише vs anchors | `layout/staff/orgBlockLayout.ts` |
| L3 | Row-tree малює **один** expanded root | `findExpandedRootId` + `computeOrgLayout` (`rowTreeLayout.ts:104`) |
| L4 | `export()` бере `viewState.staffCurrentOrgId`, canvas — `inferStaffCurrentOrgId` | `index.ts:1420` vs `DiagramRenderer.ts:768` |
| C3 | SVG grid = Rust `computeAllContours`, canvas = TS rings | `svgExport.ts:327` |
| L9 | PNG без Pixi = `fillRect` 800×600 «успіх»; PDF у тому ж файлі кидає | `exportDiagram.ts:50–65` vs `:69–72` |
| T3 | Variant B тести на мертвий WASM path | `variantBMagnetRadius.test.ts` et al. |
| T4 | `magnetRadius: NaN`: JS splinter vs Rust mega-blob | paint `?? 1.5`; `contour.rs` non-finite → `f32::MAX` |

### P1 — продукт / чесність

- C1: мертвий `computeContours` wiring на hot path.
- L5 vacant click не селектить; L6 drag preview не рухає AABB; L7 `placeOrgAtMatrixCell` eject/`inMatrix`.
- L8: AABB blob ковтає чужі картки (G5–G7 не на фарбі) — **або** wire Rust, **або** задокументувати відхід. Не імпровізувати третій алгоритм.
- T1 `e2e/node-compare` без `expect`; T2 cycle-тест = `Array.isArray`.
- Shared module-level contour/search workers — кілька діаграм на сторінці ділять `configure*`.
- Promote HTML не входить у SVG/PNG/PDF (`createReactPromoteOverlay`).

### Документаційний drift (агенти брешуть самі собі)

| Документ | Що застаріло |
|----------|----------------|
| SPEC §2.1 | row-tree описаний як `layout.rs` Reingold–Tilford; matrix «planned». Насправді Ploeg + TS matrix. `layout.rs` видалено |
| SPEC §3.2 / §3.5 | псевдокод без явного G7; малює «WASM path → Pixi» |
| SPEC §8.2 / §11 | promote overlay «не v1» / backlog — T26 вже ✅ |
| SPEC §9 | приклад `contour.path → Pixi DepartmentBlob` — не canvas path |
| REQUIREMENTS §4.6 paint | «завжди button-group» (ближче до правди) vs §4.6.1 WASM walk як канон екрану |
| TECH_STACK | `createWorkerPipeline`; «dept tetris pack» як live hull |
| CONTEXT | G-правила як видима поведінка |
| T77-M01 | follow-up «узгодити SPEC» відкритий |
| PARITY §4 | «діра showSymbol stretch» після T70 ✅ |
| README License | Private/TBD при public repo |
| issue-tracker.md | GitHub Issues як SoT — issues порожні |
| CODING_STANDARDS | Zod на межі — пакета немає |

### Масштаб і WASM

- 2M persons / 50k org — вимога, не виміряний e2e. Search worker + 100k window — дизайн, не доказ.
- WASM stack/panic на глибоких деревах / циклах: A1/A2 в T77 won't-fix (межа wasm; node count bounded). Hanging `parentOrgId` уже reject (#61).
- Dual validate org (TS + Rust) на row-tree — два SoT.

### Поставка

- Немає semver/changelog/LICENSE/publish.
- Host cutover поза репо.
- T61 (рекурсія груп у ярусі 3) blocked на Figma; **не** ціна міграції. ([T61](./tasks/T61-group-recursion-tier3.md))
- T56 — каталог GoJS фіч без product selection (minimap, undo, drag-reparent org, tooltips, iframe postMessage, …).

---

## 7. Що закрито vs що відкрито

**Закрито (не переробляти без нової вимоги):** фази 1–4 REQUIREMENTS; Pixi LOD/camera/tween; org matrix+row-tree+spine-bus; staff 3-tier + expand-in-place + position expand; search worker; export API (з дірками T78); React menu/promote; Pages workflow; T74 media; T75/T76 stores; T77 M01–M11 аварії (worker errors, destroy-during-create, append dedupe, drag grab-offset, expand forest wipe, lying PNG stub, search O(n²), hanging parent, fillet invert, typed promote keys).

**Відкрито, порядок:**

1. **T78 P0** — пікселі, ліс орг, hybrid overlap, canvas=export, чесні тести.
2. **T78 P1** — дочистити Option B (delete wiring **або** свідомо wire); vacant select; preview boxes.
3. **Документи** — SPEC/CONTEXT/TECH_STACK під фактичний paint (M01 follow-up).
4. **T61** після макета; **T67 Phase 2** marquee — product go.
5. **T56** — тільки після checkbox selection замовником.
6. Host: прибрати GoJS.

GitHub issue tracker не використовувати як карту, поки він порожній — брати `work/tasks/`.

---

## 8. Правила для наступної імплементації

1. Прочитати цей файл + тікет, який чіпаєш. Контур/export/org-tree → ще T78 і CRITIQUE-9352d52.
2. Словник з `CONTEXT.md`. Новий термін — `/domain-modeling`, не синонім зі avoid-списку.
3. TDD: failing success **і** failure до production. Не асертити `computeAllContours`, якщо баг на canvas — цілити `paintMagneticGroups` / member boxes (T78 T3).
4. **Не** підключати Rust contour у Pixi «по дорозі». Рішення M01 = B. Зміна = продуктове (wire G5–G7 **або** вичистити WASM з hot path і чесно описати AABB). Третє кільце — заборонено.
5. **Не** воскрешати `layout.rs` / WorkerPipeline / `createWorkerPipeline`. Живий layout WASM = Ploeg `computeOrgRowTreeLayout`.
6. `findExpandedRootId` ×1 — відомий P0 (L3), не «так задумано» для multi-root (T65).
7. Після Rust — `npm run build:wasm`. Без pkg SDK тести не стартують (TD05).
8. Не публікувати npm і не обіцяти 2M render.

---

## 9. Індекс джерел

| Що шукаєш | Де |
|-----------|-----|
| Вимоги, G-правила, фази | `docs/REQUIREMENTS.md` |
| Стек (кеш, місцями stale) | `docs/TECH_STACK.md` |
| Алгоритми / API | `work/SPEC.md` |
| Глосарій | `CONTEXT.md` |
| Задачі / борг | `work/README.md`, `work/tasks/`, `work/tech-debt/` |
| Живий P0 | `work/tasks/T78-post-t77-critique.md` |
| Критика post-T77 | `work/tech-debt/CRITIQUE-dg_9352d52.md` |
| Parity GoJS | `work/tasks/PARITY-gojs-to-dg.md`, T71 |
| Фасад | `packages/sdk/src/index.ts` |
| Paint контуру | `packages/sdk/src/render/paintMagneticGroups.ts`, `DiagramRenderer.ts` |
| WASM contour | `packages/core/src/contour.rs` |
| WASM row-tree | `packages/core/src/ploeg_layout.rs`, `org_layout.rs` |
| CI | `.github/workflows/ci.yml` |
| Demo | `packages/demo/` |
