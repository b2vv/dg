# MASTER HANDOFF — сесія 2026-11-04 (детально, для холодного resume)

> Мета цього файлу: наступна сесія (можливо з чистим контекстом) піднімає все **без повторних
> пояснень**. Пояснено «методом каченя» — ніби читач не знає передісторії. Дубль цього файлу —
> у вольті `1 - Notes/Sessions/2026-11-04 MASTER HANDOFF …`.

---

## 0. TL;DR — resume за 1 хвилину
- **Зроблено й у `main` (запушено):** фіча **1-B GPU viewport culling** (повний SDD-цикл) + фікс
  прееснуючого lint на main.
- **На паузі (гілка `feat/sdk-viewport-virtualization`, НЕ запушено):** нова підсистема
  **viewport-virtualization у SDK** — лише research-артефакти, коду нема. Власник сказав «пауза + handoff».
- **Два відкриті рішення власника:** (1) який трек веде наступна сесія — **(A)** viewport-virtualization
  vs **(B)** ШПС edit-parity (від Cass-1); (2) по edit-parity drag уже вирішено (беклог).
- **Паралельна сесія Cass-1** робить ШПС edit-parity GoJS→dg на хості `cassiopeia-admin-ui`;
  маршрутизувала сюди 4 dg-side запити (див. §7).

---

## 1. Арка сесії (що відбувалось і ЧОМУ)
1. Сесія почалась із «Next task: lazy render diagram outside viewport. Research web».
2. Веб-ресерч + заземлення показали: у репо **нема React-layout-шару** (все TS/Pixi); «lazy render»
   розбивається на осі: **1-B** (GPU paint culling), **1-A** (CPU build-skip), ось-2 (DOM pooling),
   + spatial index (велике дерево). Деталі — `work/reports/lazy-render-viewport/research.md`.
3. Власник обрав **1-B перше**. Проведено повний SDD-цикл, змержено в main, запушено (§3).
4. Перейшли до **1-A**. Вимір показав: demo вже вікнує (staff T88 <4200 нод, org getScaleWindowStart),
   тож render() ніколи не отримує велике дерево → я написав вердикт «1-A = YAGNI».
5. **Поправка власника:** «ці механізми мають бути в бібліотеці, а не в демо». → вердикт перевернуто:
   вікнування в demo = **прогалина SDK**, яку треба закрити. Напрям став: перенести вікнування в SDK.
6. Рішення по контракту: «host дає повні дані, SDK вікнує сам»; «узагальнити staff-модель»; «spliceData»
   (бо нібито ШПС edit add/edit/delete вже в спеці).
7. **cto-research** (звірка з первинними джерелами) виявив, що частина цих premises **не підтверджена**,
   а owner-spec у **вольті** каже інше (§5). Знайшов також суперечність із моєю памʼяттю (§8).
8. Під час паузи надійшли cross-session від **Cass-1** (§7) — ШПС edit-parity активний трек.
9. Власник: **пауза + handoff**. Цей файл — результат.

---

## 2. Git-стан (ТОЧНО)
- Гілка зараз: **`feat/sdk-viewport-virtualization`** (на ній лежать research-артефакти 1-A/virtualization).
- **`main`** (запушено в `origin`, `b2vv/dg`), останні релевантні коміти:
  - `8ced990` feat(sdk): GPU viewport culling off-screen нод перед paint (ось 1-B) — ФІЧА.
  - `effe63f` Merge feat/viewport-culling-gpu (--no-ff).
  - `05ed93c` fix(lint): прееснуючі oxlint-помилки на main (staffLiveGeometry arrow-wrap; dg29-*.mjs sort-vars).
  - `4335f31` docs(report): зафіксувати AC2-паритет, e2e, lint-фікс.
  - `425cb80` docs(decision): 1-A YAGNI (ПОТІМ переглянуто) — історичний.
  - `5475d08` docs(decision): ПЕРЕГЛЯД — virtualization у SDK.
  - **Усе вище запушено** (origin/main == main, 0/0).
- Гілка `feat/viewport-culling-gpu` (1-B) — змержена в main, можна видалити.
- Гілка `feat/sdk-viewport-virtualization` — останній коміт `docs(research): viewport-virtualization —
  пауза…`; **НЕ запушена** (навмисно, бо лише research).
- Видалено worktree `.claude/worktrees/dg-archive-factory-api-e359fb` (була аномалія, суперечила «без worktree»).

---

## 3. ФІЧА 1-B — GPU viewport culling (ЗАВЕРШЕНО, merged, pushed)
**Що це:** на pan у межах LOD сцена не перебудовується, але `app.render()` щокадру малював увесь
stage на GPU включно з off-screen вузлами. Додано culling GPU-сабміту.
**Код (усе в `packages/sdk/src`):**
- `render/DiagramRenderer.ts`: `CULL_MIN_NODES=300` (поріг авто-вмикання); `cullToViewport(viewport, screen)`
  — перед кожним paint виставляє `renderable` кожному node-view за перетином world-box(×камера) з
  екраном+margin (`pad=0.5·max(екран)`); early-out <300 → `resetCull()`; **no-throw** (битий/NaN box
  → ЯВНЕ `renderable=true`, не continue — це критично, NB1). `resetCull()` — усім renderable=true,
  НІКОЛИ не чіпає `visible`. `getCullStats():CullStats` = `{drawn,culled,passes}` (seam для тестів).
- `render/PixiHost.ts`: у `requestPaint` rAF — `cullToViewport(getViewport(), getScreenSize())` ПЕРЕД `app.render()`.
- `OrgHierarchyDiagram.ts` `export()`: `resetCull()` перед `runExportNow` (B1: raster-export `extract.canvas`
  респектує renderable без ре-рендеру → без reset PNG/PDF втратили б off-screen вузли; той самий
  прецедент, що знімає promote).
**Тести (зелені):** `DiagramRenderer.cull.test.ts` (21), `PixiHost.test.ts`, `export.test.ts`,
`e2e/viewport-culling.spec.ts` (2 passed у реальному браузері). typecheck 0, `npm test -w @org-hierarchy/sdk` 1316 passed.
**Інваріанти:** edges НЕ культивуються (не в `scene.listViews()`); тільки `renderable`, не `visible`
(promote-інваріант); re-cull на кожен paint = «на viewport-dirty» (paint on-demand).
**AC2 пиксель-паритет — ДОВЕДЕНО** (one-off): бейзлайн із `CULL_MIN_NODES=Infinity` (culling off) vs
culling-білд → passed 2%. throwaway-spec прибрано. **Не постійний CI-гейт.**
**Публічного API / `docs/USAGE.md` НЕ змінено** (авто-поріг без тумблера).
**Повний звіт:** `work/reports/lazy-render-viewport/report.md`; research `…/research.md §5`.

---

## 4. ПІДСИСТЕМА viewport-virtualization у SDK (ПАУЗА)
**Напрям (owner):** перенести вікнування/віртуалізацію з demo у SDK. Контракт-рішення власника:
**host дає повні дані, SDK вікнує сам**; **узагальнити staff-модель**.
**Що в demo зараз (кандидати на перенесення, `_grounding.md`):**
- Staff: `packages/demo/src/app/viewportWindow.ts` — `resolveWindowRange`(camera→range+reserve+maxSeats),
  `rebaseViewport`, `RebuildScheduler`. Камера-driven, in-place `setData`. Константи App.ts:
  `STAFF_RESERVE_SCREENS=1`, `STAFF_WINDOW_MAX_SEATS=4000`, `STAFF_REBUILD_QUIET_MS=120`. Pinned-ancestors
  (`scaleStaff.ts currentTier:368-426`) для edge-completeness.
- Org: `packages/demo/src/scenarios/scaleOrgs.ts` — `resolveScaleWindowStart` (проста центровка),
  через повний `reload()`, лише на клік/пошук (не камера-driven).
**SDK-контракт:** `setData` = повна заміна (rebuild index + render + гасить selection);
**`appendData` ВЖЕ Є** (ADD/UPDATE delta через `mergePartial`, patch-wins, index merge без rebuild,
`OrgHierarchyDiagram.ts:1352-1377`) — але **без DELETE** і все одно повний `render()`. `spliceData` НЕ існує.
**Статус:** лише research-артефакти; коду нема.

---

## 5. OWNER-SPEC З ВОЛЬТА (авторитетне; `_vault-spec.md`, 6 нот прочитано)
- ✅ **Вікнування В SDK — ухвалено** (нота «спліт на 4 міні-бібліотеки» §17-18): рендер **#2 (власний
  тонкий DOM)** під оркестратором **#4** малює **viewport + буфер ¼ viewport з 4 боків** (ребра теж),
  re-window на pan/zoom; LOD-вісь = **zoom-scale** (не к-сть нод), поріг **T — ВИМІРЯТИ**.
- 🔴 **Спростовано (зняти зі скоупу virtualization):** spliceData/incremental-delta/DELETE (ніде);
  «інкрементальний ре-лейаут піддерева» **явно ХИБНИЙ** → канон **ОДИН WASM на все дерево ЗАВЖДИ**
  (Reingold-Tilford жене ширину до кореня); `patchNodeSize` кешує лише **розміри**, не геометрію;
  віконність — **лише про те, що МАЛЮЄТЬСЯ, не що рахується**.
- **Архітектура-канон (4 міні-ліби, hexagonal):** #1 `dg-tidy` (layout/WASM) · **#2 DOM-рендер — ТУТ
  віртуалізація** · #3 Pixi-рендер · #4 оркестратор (камера, LOD-switch, store-commit = ЄДИНА мутація)
  + `core` (domain/ports/logic: viewport-culling, drop-pipeline — усе pure).
- **Інваріант SDK-шва:** уся геометрія/layout/логіка — в ядрі; назовні лише презентація+стилі; host
  дає розміри карток входом і читає геометрію; API **простіший за GoJS**, immutable-дані входом.
- Суміжне (#96): бібліотека ВОЛОДІЄ collapse/prune; always-on prune; `node.toggle()/expanded()` сахар.

---

## 6. ⚠️ НЕРОЗВʼЯЗАНА МОДЕЛЬНА НАПРУГА (головне для наступної сесії)
- **demo** вікнує **ДАНІ** (`setData` слайсом → WASM розкладає лише вікно) — бо 1M не порахувати whole-tree.
- **owner-spec вольту** вікнує **МАЛЮНОК** (рахувати все дерево, малювати visible+буфер).
- Це **різні моделі**; на дуже великому дереві конфліктують (ціле 1M не порахуєш whole-tree).
  **Поріг T (zoom-scale)** — точка розв'язки: до T — React DOM #2 (draw-window), за T (zoom-out) → Pixi #3.
- Перф WASM-межі на 1M-вікнах **не виміряно** (`T126:61 Q-2`, орієнтир ≤50мс/500 посад);
  setData на slide вікна ≈ **1.5с** (`work/reports/viewport-window/report.md:436,510`) — вартість WASM-розкладки.
- **Наступний крок:** cto-research проти канону «4 міні-ліби», розвʼязати data-window vs draw-window + T,
  ПОТІМ spec-flow на draw-windowing у SDK (рендер #2). spliceData/incremental — поза скоупом, доки
  власник не заспецить окремо.

---

## 7. ТРЕК ШПС EDIT-PARITY (Cass-1) — окремий активний workstream
**Хто:** сесія **Cass-1** на хості `cassiopeia-admin-ui`, гілка `b2w/queue/springs/spring-13/4311-shps-diagram-palette`.
Замінює GoJS на dg, спершу таб ШПС. Адреса для SendMessage: `uds:/tmp/cc-socks/46617.sock`.
Її звіт/handoff: `reports/dg-positions-edit-parity/` (у репо cassiopeia-admin-ui, НЕ в dg).
**Стан ШПС на dg (Cass-1 верифікувала живим):** контекстне меню вузла через test-anchor overlay
(`createTestAnchorOverlay`, DEV-gated); ключі `position:<guid>` транслює `__orgHierarchy`; тест
«меню кореня дає ПІДЛЕГЛУ» зелений. Коміти хоста: 34e11907c, 5229d6c75, 2d71fea23, e55fd8a7a.
**4 dg-side запити + статус:**
- **#1 drag-перенесення:** РІШЕННЯ ВЛАСНИКА (через Cass-1) — **drag на dg → БЕКЛОГ; SDK-опцію вимкнення
  drag НЕ додавати.** (На GoJS drag свідомо вимкнено, коміт 02e6587a4; reparent — через меню «Перенести».)
  Факт: dg МАЄ активний pointer-drag reparent (`personInteractions.ts:236-268` → `onPersonReparent` →
  `reparentPosition`) + seat-move drag. Рішення = лишити як є, нічого не робити. ⚠️ звірити з власником прямо.
- **#2 лічильники підлеглих:** РІШЕННЯ ВЛАСНИКА — **рахує dg/SDK** (не хост). SDK має віддавати
  `childrenCount`/`allDescendantCount` у `DiagramData`; на хості `subordinateCounts` null
  (`dg-tree-diagram.engine.ts:383`). Прив'язка `positions-subordinate-count-card-sidebar-parity`:
  картка і сайдбар — однакові числа. → dg-side робота на цьому треку.
- **#3 блоки/контейнери (slice 7):** `containerKeyOf=null`, block-container e2e пропущені. Окреме
  обговорення з Cass-1 (вона напише / я звʼяжусь, коли на треку).
- **#4 гейт взаємодій під час збереження:** dg не має приймати reparent/меню, коли хост ставить
  `editingInteractive=false` (**ADR-0067**). Відкрито.
**Моя позиція до Cass-1:** відповів фактами; рішень власника не ухвалював сам; хост не чіпав; код SDK
під ці пункти не починав (бо не сиквенснутий на трек).

---

## 8. ⚠️ СУПЕРЕЧНОСТІ ПАМʼЯТІ (звірити з власником)
- Памʼять `staff-edit-mode-and-incremental-geometry` (owner 2026-10-30) каже: ШПС має live edit-mode
  (add/edit/delete, reparent з дітьми, крос-деп head→child лінії) **+ інкрементальну Rust-геометрію з
  кешем незмінних нод**. Анотовано 2026-11-04:
  - ✅ edit-mode **підтверджено активним** (Cass-1).
  - 🔴 «інкрементальна геометрія/кеш незмінних» **СУПЕРЕЧИТЬ** свіжішому вольт-канону (whole-tree WASM
    завжди). Ця частина, схоже, **застаріла** — НЕ діяти на неї, доки власник не підтвердить.
- Памʼять `codex-exec-for-code-writing` (оновлено): код пише **Codex прямим `codex exec` із Bash
  самому, НІКОЛИ через сабагент** `codex:codex-rescue` (той упав на Sonnet-safeguard). Claude рев'юнить.

---

## 9. ВІДКРИТІ РІШЕННЯ ВЛАСНИКА (чекають)
1. **Який трек веде наступна сесія:** (A) viewport-virtualization research (draw-windowing у SDK,
   почати з cto-research + розвʼязати модельну напругу §6) vs (B) ШПС edit-parity (почати з
   `reports/dg-positions-edit-parity/` Cass-1, пункти #2/#4).
2. **Підтвердити напряму** peer-relayed рішення: drag→беклог (#1), subordinate-counts у SDK (#2).
3. (Якщо A) розвʼязати data-window vs draw-window + поріг T.

---

## 10. КАРТА АРТЕФАКТІВ
- `work/reports/lazy-render-viewport/` — фіча 1-B: `research.md` (§5 заземлення render-шляху),
  `report.md` (фінальний звіт), `spec.md`, `plan.md`, `tasks.md`, `_wip-research.md`.
- `work/reports/lazy-render-cpu-build-skip/` — ця підсистема: `spec.md` (з ⛳ вольт-звіркою нагорі),
  `research.md` (feature-briefing, §7 вольт), `_grounding.md` (demo-механізми), `_research-sources.md`
  (репо-спека/Rust/seam), `_vault-spec.md` (owner-spec вольту дослівно), **цей `_HANDOFF.md`**.
- Вольт `diagram-hierarchy`: `1 - Notes/Sessions/2026-11-04 HANDOFF — viewport-virtualization…` (+3 корекції)
  і дубль цього майстер-handoff.

---

## 11. КЛЮЧОВІ КОД-ПОСИЛАННЯ (щоб не шукати заново)
- Рендер-петля: `PixiHost.requestPaint:269` (rAF, `app.render()` on-demand, autoStart:false),
  `getViewport:195`, `getScreenSize:192`, `readonly renderer:133`.
- `DiagramRenderer.render:446` (повний clear+rebuild: `scene.clear/layers.clear:465-466`); цикли нод
  :863/:920/:1009; `cullToViewport`/`resetCull`/`getCullStats` (додані 1-B); `applyPromoteVisibility:490`.
- World↔screen: `promoteMath.ts worldBoxToScreen:47`, `screenRectInView:231`.
- Drag/reparent: `render/personInteractions.ts:230-268` (pointer-drag, reparent+seat-move),
  `DiagramRenderer.drawDropPreview:624`, `dropTargetIndex.ts:24`, `OrgHierarchyDiagram.reparentPosition:2132`.
- Дані: `setData:1290-1330`, `appendData:1352-1377`, `mergeData.ts mergePartial:25`, `export():2322`.
- LOD-тригер render: `OrgHierarchyDiagram.onViewportTransform:668-677` (render ЛИШЕ на LOD-crossing).
- WASM-seam: `wasm/layoutBridge.ts computeStaffGeometryWasm:84`, `generated/rust-types.ts StaffLayoutInput:98`.
- Demo-вікно: `viewportWindow.ts`, `scaleStaff.ts`, `scaleOrgs.ts`, оркестрація `App.ts:1088-1231`.

---

## 12. РОБОЧІ НОРМИ ЦІЄЇ СЕСІЇ (підтверджені/вивчені)
- **Код пише Codex** прямим `codex exec --approve-for-me --skip-git-repo-check - < prompt.md` (НЕ сабагент,
  НЕ `--worktree`). Claude — спека/план/тести-контракт + незалежне рев'ю.
- **Не вірити чужому «зелено»:** прогнати тести самому, але **правильним середовищем**
  (`npm test -w @org-hierarchy/sdk`, НЕ прямий `npx rstest` — падає `document is not defined` повз jsdom-конфіг).
- **Без pipe у тест-прогонах** (`| tail` ховає падіння й exit code).
- **Без worktree** — працювати в гілках.
- **Commit msg із backticks — через `-F` файл**, не `-m` (zsh їсть лапки).
- **spec-flow gates** — незалежний `gate-reviewer` (Opus 4.8); R6 = критик + рев'ю кожного кроку.
- **e2e в цій пісочниці біжить** (preview :4173 піднявся в звичайному Bash; у codex-сабпроцесі падав EPERM).
  Вимкнення пісочниці (`dangerouslyDisableSandbox`) **відхиляється класифікатором** — не обходити.

---

## 13. РЕКОМЕНДОВАНИЙ ПЕРШИЙ ХІД НАСТУПНОЇ СЕСІЇ
Якщо власник обере **(A)**: `cto-research` вузько на «4 міні-ліби + draw-window vs data-window + поріг T»
(джерела: `_vault-spec.md`, `_grounding.md`, `viewportWindow.ts`), ПОТІМ spec-flow на draw-windowing #2.
Якщо **(B)**: прочитати `reports/dg-positions-edit-parity/` (хост-репо через Cass-1), почати з #2
(childrenCount/allDescendantCount у `DiagramData` + card↔sidebar parity) — найчистіший, з прив'язкою.
