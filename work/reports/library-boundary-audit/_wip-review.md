# WIP — Аудит межі відповідальності: що МУСИТЬ бути в SDK, а живе в demo/host

**Старт:** 2026-11-05 · гілка `main` · запит власника
**Рамка (власник):** «Ти — бібліотека. Host-логіка — Pixi-кліпінг (culling) ТА події
update/remove/add нод — мусить жити в SDK, не в demo/host. Переглянути T-*.»
**Yardstick:** Б2-інваріант (геометрія/layout/логіка→ядро; назовні лише презентація) +
пам'ять `scope-by-desired-behavior-not-current-impl` («поведінки demo/host → в бібліотеку»).

ДАЛІ: заземлити два названі обов'язки в код; класифікувати T-* за «де лягає поведінка: sdk vs demo».

---

## ФАКТ — стан хоста (було питання)
- Власник: **хост `cassiopeia-admin-ui` УЖЕ реально споживає `@org-hierarchy/sdk`** (через симлінк
  `node_modules/@org-hierarchy/sdk -> ../../packages/sdk`). → Брифінг §5 / `ADR-0034` «0 імпортів,
  лишаємось на GoJS» = **ЗАСТАРІЛО**, оновити (частина завдання).
- Хост на диску: `/Users/strelia/projects/cassiopeia/cassiopeia-admin-ui`. Інтеграція йде «слайсами»
  (`reports/dg-integration/`, slice5/slice6 gates). Host-таски мають власну нумерацію t100–t198.

## ПИТАННЯ — cass-13
- Власник: «Refer to cass-13 — які таски вже інтегровані». **На диску cass-13 НЕМА** (ні в dg, ні в
  cassiopeia, ні в гілках/тегах/доках). Імовірно YouTrack CASS-13. → потрібен вміст від власника,
  щоб позначити «вже закрито хост-боком = поза скоупом ре-флагу».

## ФАКТ — обов'язок 1: Pixi-кліпінг (culling) — ✅ В БІБЛІОТЕЦІ (зроблено правильно)
- `lazy-render-viewport` (гілка `feat/viewport-culling-gpu`, 2026-11-04): `DiagramRenderer.cullToViewport`,
  `resetCull`, `getCullStats`, `PixiHost.requestPaint`-cull, `export()` resetCull. Усе в `packages/sdk`.
  Публічного API не міняли (авто-поріг). → межа ОК, нічого переносити.

## ФАКТ — обов'язок 2: події collapse/expand (remove/add видимості нод) — ❌ У DEMO/HOST, НЕ В SDK
- GitHub issue **#96** (b2vv/dg, 2026-11-03): на mockup-шляху (`staffAlphaMockup:true`) collapse
  **не прунить піддерева в бібліотеці**. `computeViaMockup`→`buildStaffMockupInput`
  (`packages/sdk/src/render/staffLiveGeometry.ts`) бере ВСІ positions, ігнорує `expandedPositionIds`.
- Rust/TS-шлях прунить у бібліотеці (`buildStaffLayoutInput`→`collapseVisiblePositions`→
  `visiblePositions`), mockup — єдиний виняток.
- Демо компенсує host-боком: `staffVisibleData` у `packages/demo/src/app/StaffChromeBackdrop.ts`
  (кандидат на перенесення в SDK). Хост через симлінк **нічого не отримує** — collapse не працює.
- Issue вже пропонує Варіант A (default-expanded + collapsed-set у SDK) / B (default-collapsed).
  → ПІДТВЕРДЖЕНИЙ приклад саме того болю, що описав власник.

ДАЛІ: класифікувати staff-серію T124–T129 + DEV-прапори RenderConfig (OFF-за-замовчуванням = хост
не отримує поведінку) на предмет «поведінка застрягла в demo».

---

## ФАКТ — класифікація (дві РІЗНІ природи проблеми, не плутати)

### Клас 1 — ЛОГІКА живе в demo/host (справжнє порушення межі → ПЕРЕНЕСТИ в SDK)
- `packages/demo/src/app/StaffChromeBackdrop.ts:48 staffVisibleData` — прунінг видимості (issue #96).
- `packages/demo/src/scenarios/flatOrgs.ts:89 toggleOrgExpanded`, `:98 collapseAllOrgs` — мутація
  expand/collapse нод (= «події add/remove нод», що власник назвав) живе у demo-сценарії.
- mockup-шлях `buildStaffMockupInput` (`staffLiveGeometry.ts`) ігнорує `expandedPositionIds` (#96).
- (кандидат) `packages/demo/src/app/viewportWindow.ts:69 resolveWindowRange` — віконна логіка.

### Клас 2 — ЛОГІКА в SDK, але за DEV-прапором default=OFF (не порушення межі, а СЕМАНТИКА ДОСТАВКИ)
Усі staff-прапори `RenderConfig` дефолт **false** (`packages/sdk/src/render/types.ts:533-538`):
`staffUseAstar`, `staffTreeBlockLayout`, `staffAlphaMockup`, `staffDeptGrouping`.
→ Хост, інтегрувавши SDK, **НЕ отримує** A*/tree-block/dept-grouping/alpha, поки сам не виставить
прапор. «Фіча» існує в бібліотеці, але недоступна за дефолтом; частина прапорів — DEV (нестабільні).
Це корінь ілюзії «demo вміє, бо це бібліотека» — поведінку вмикає ЛИШЕ demo-таб.

## ФАКТ — мапа на T-*
| T-* | Обов'язок | Де лягло | Вердикт |
|---|---|---|---|
| culling (lazy-render-viewport) | Pixi-кліпінг | SDK | ✅ межа ОК |
| T129 alpha-mockup + #96 | collapse/prune нод | **demo/host** | ❌ Клас 1 — перенести |
| T128 A*-роутинг | лінії | SDK за `staffUseAstar:false` | ⚠️ Клас 2 — доставка |
| T126 staff→Rust | геометрія | SDK (Rust) за прапорами | ⚠️ Клас 2 |
| T127/a/b | зони/обгортки | DRAFT, не лягло | — поза ре-флагом |
| T124/T125 | валід./chrome | SDK | ✅ |
| T106/T115/T119 | фасад/host-шов | SDK (вже про межу) | ➡️ уже boundary-aware |

РІШЕННЯ: вердикт = (1) перенести Клас-1 логіку в SDK (канон issue #96 Варіант A); (2) Клас-2 —
окреме продуктове рішення про публічні дефолти/стабільність прапорів; (3) оновити брифінг §5
(хост споживає SDK); (4) cass-13 потрібен від власника, щоб відсікти вже-інтегроване.

---

## ФАКТ — пре-рід boundary-тасок (поки чекаю cass-13)
- **T115 ✅ закрито** — повністю зібране з ВІДПОВІДЕЙ хоста: `work/reports/host-integration/questions.md`
  (хост перелічив, що йому треба від SDK — ключовий ресурс для повного аудиту). Рішення: гейт
  середовища належить хосту, SDK лише документує (ADR-0001). Шов `resolveTestId` лишено бо споживач = хост.
- **T106 🟡 / T119 🟡** — про РОЗМІР фасаду (1664/1139 рядків), не про demo→library leakage. Дотичні, але
  НЕ ядро запиту власника (події нод + culling). У повному аудиті — другорядні.
- → Ядро аудиту = staff/mockup/interaction вісь (T128/T129/#96), не поділ фасаду.
- РЕСУРС на потім: `work/reports/host-integration/questions.md` — що хост реально просив у SDK.

ДАЛІ (після відповіді cass-13): повний ре-флаг T-*; відсікти вже-інтегроване; вердикт Клас1/Клас2 по кожній.

---

## ФАКТ — cass-13 (жива сесія хоста) + ВЕРИФІКАЦІЯ в коді. ПІДСУМОК.

### ⛔ Не ре-флагати (інтегровано хостом, cass-13 Q1 + git):
subordinate-counts (#8, закрито 2026-11-05, parity-гейт зелений), контекстне меню (openContextMenu),
selection/expand/reveal/focus/theme/viewport, reparent (onLayoutChange→position-reparent),
геометрія оверлеїв (getStaffChromeGeometry/fitStaffChrome/listPromoteBoxes), test-anchor overlay (T115).

### ✅ Вже полагоджено в бібліотеці — мій початковий «Клас 1» переважно ЗАКРИТО:
- **#96 прунінг collapse/expand** — DONE на `main` (коміти `8819327`, `2229437`; ship-report
  `mockup-expand-prune/report.md`). Прунінг БЕЗУМОВНИЙ у SDK (`visiblePositions`, гейт знято глобально),
  alpha/mockup шлях шанує collapse, USAGE оновлено. Rust/TS теж прунять.
  - **Хвости (housekeeping, НЕ ре-скоуп):** (1) issue #96 досі OPEN → закрити; (2) demo `staffVisibleData`
    тепер надлишковий, ще кличеться App.ts:429,709 → прибрати (план #96 Варіант A «демо згодом знімає»).
- **Culling** — коректно в SDK (`cullToViewport`); хост свого не має. Нічого не робити.

### 🔴 СПРАВЖНІ лишені порушення межі (верифіковано в коді):
1. **Подієвий шов near-картки (ГОЛОВНЕ, cass-13 Q3).** SDK емітить node-події ЛИШЕ для Pixi
   (`personInteractions.ts:150` pointertap→onNodeClick; `personCardContent.ts:222` шеврон;
   `cardContextMenu.ts:13` ПКМ). Для HTML near-картки (хост малює за Б2) SDK дає лише геометрію
   (`listPromoteBoxes`, `nodeCanvasPoint`) — **подієвого шва НЕМА**. Хост у `make-dg-sdk-factory.ts:387`
   вручну роутить click→onNodeClick / шеврон→togglePositionExpand / конектор→onLinkClick / ПКМ→openContextMenu
   + транслює canvasX/Y (баг, що cass-13 лагодив сьогодні, make-dg-sdk-factory.ts:435). Це ДУБЛЮЄ Pixi-логіку.
   → НОВА таска. Фікс шанує Б2: презентація лишається хосту, а **маршрутизація події→дія + координати**
   переходять у SDK (напр. `bindPromoteSlotEvents(el, nodeRef)` або event-helper). Це і є «події нод у бібліотеці».
2. **Контракт ключа `position:<guid>` ↔ голий guid (cass-13 Q3).** SDK експортує `nodeEntityKey`/
   `parseNodeEntityKey` (core/nodeKey.ts, index.ts:108), АЛЕ бокси префіксовані, а DiagramData/колбеки —
   голі → хост тримає `toBareKey`/`toSdkKey`. → мала таска: стабілізувати контракт ключа (бриф п.5).

### 🟡 Клас 2 (в SDK за DEV-прапором OFF) — продуктове рішення, вже в роадмапі:
staff-прапори (`staffUseAstar`/`staffAlphaMockup`/…, types.ts:533-538 default false). Дефолти/стабільність
= роадмап A0–A3 (вже трековано). Не окрема знахідка аудиту.

### ⏸️ НЕ будувати зараз (хоче власник, але хост не споживає → спекулятивно):
Атомарні node update/remove/add API. cass-13 Q2: хост шле лише setData-знімок, мутації реплеїть сам
(стек жестів, ADR-0067 `use-positions-editing.ts`). → роадмап-матеріал, не поточна протікання. Озвучити
напругу: бажання власника vs поточна реальність хоста (snapshot, не атомарні події).

### Брифінг: §5 / ADR-0034 «0 імпортів / лишаємось на GoJS» = ЗАСТАРІЛО → оновити (хост споживає SDK).

### МЕТА-УРОК: таски НЕ були системно застарілі на межі. Головний ризик був — Я ледь не ре-флагнув
зроблене (#96). Верифікація + крос-звірка з cass-13 це спіймали. Межа переважно здорова; лишились два
конкретні шви (near-card events, key-contract).

---

## П.2 — ключі `position:<guid>` vs сирий id (дослідження 2026-11-05, лише читання)

ФАКТ (SDK):
- Префікс — внутрішній захист SDK від колізій id між сутностями: `nodeEntityKey(kind,id)` = `kind:id`
  (`packages/sdk/src/core/nodeKey.ts`, коментар «so person and position ids never collide»).
- **Вхід поблажливий:** `SceneRegistry.getBox` (`render/SceneRegistry.ts:59-71`) приймає і `position:<id>`,
  і сирий id (фолбек position→organization→person). На ньому стоять `nodeCanvasPoint`/`nodeCenter`/`focusNode`;
  `setFoundFocus` теж документовано як «typed або bare» (`docs/USAGE.md:1327-1328`).
- **Вихід типізований:** `listPromoteBoxes()`/`listNodeBoxes()` віддають ключі `kind:id`.
- `DiagramData` і колбеки (`NodeRef`) — сирі id (GUID продукту).
→ Контракт асиметричний: «на вхід — будь-що, на вихід — typed». Це не баг ядра, а незадокументована асиметрія.

ФАКТ (хост):
- `toBareKey`/`toSdkKey` (`use-positions-diagram.ts:163-170`) живуть **лише в DEV/E2E тест-шві `__orgHierarchy`**
  (коміт `5229d6c75`: зберегти успадкований від GoJS e2e-контракт ~15 тестів). Продукт поза DEV не зачеплено.
- `toSdkKey` **уже зайвий**: `nodeCenter` приймає сирий id через фолбек `getBox`.
- `toBareKey` потрібен лише тому, що `listPromoteBoxes` віддає typed-ключ; його заміняє публічний
  `parseNodeEntityKey(key)?.id` (експортований з `index.ts:108-109`).

ВИСНОВОК: окрема SDK-таска не потрібна. Найменша дія: (а) задокументувати в `USAGE.md` асиметрію
(вихід списків — typed `kind:id`; вхід — typed або сирий id); (б) хост: прибрати `toSdkKey`, `toBareKey` →
`parseNodeEntityKey`. Твердження власника «голий GUID не використовуємо» узгоджується: префікс — артефакт SDK,
а в даних продукту id і так є GUID.

---

## П.1 — ЗРОБЛЕНО 2026-11-05 (гілка `chore/library-boundary-housekeeping`, НЕ закомічено)

ФАКТ: SDK не вмів розкривати згорнутих посад-предків (перевірено всі кандидати: revealPath=лише org,
focusNode, expandToDepth=за глибиною, collapsePositionSubtree, search). Діра досяжна в хості без кліку
(рольовий дефолт head-only для керуючих/підпорядкованих ярусів).
РІШЕННЯ (owner «First now»): `revealPath` розкриває org-шлях + усіх згорнутих адмін-предків цілі одним кадром,
обхід `maxExpandedPositions`, повний відкат, події після кадру. Новий хелпер `adminAncestorIds` (positionExpand.ts).
Демо переведено на SDK: прибрано `staffCollapsed`, `staffVisibleData`, `staffAdminAncestors`, `rerenderStaffAlpha`,
`toggleStaffCollapse`, `refitStaffAlpha`; шеврон картки читає `getStaffExpandedPositionIds()`.
Код: Codex (`codex exec`), журнал `_impl-reveal-position-path.md`. Рев'ю: Claude — повернув видалені
коментарі-обґрунтування в revealPath.
ФАКТ (гейти, прогнав сам): SDK 1335/0 (2 skip), demo 132/0 (1 skip), typecheck, lint, check:docs зелені.
Мутаційна перевірка: без фіксу нові тести 5/7 FAIL.
ФАКТ: брифінг — оновлення №5б + рядок ~492; AGENTS.md — рядок про хоста. Issue #96 закрито з коментарем.
ФАКТ: SDK перезібрано (`npm run build`), dist містить фікс; лінк хоста → dg/packages/sdk. cass-13 повідомлено.
ФАКТ: Codex пробував записати checkpoint у зовнішнє сховище — автоперевірка відхилила, обходу не було; дозволу не даю.

ПИТАННЯ до власника:
- Демо втратила власний плавний refit камери після collapse (`refitStaffAlpha`); тепер лише SDK `panToNode`.
  Якщо refit бажаний — він має жити в SDK (хост теж його не має), не в демо.
- Наявна розбіжність: SDK `revealPath` ВИДІЛЯЄ вузол (через `focusNode`), а порт хоста обіцяє reveal без зміни
  виділення (`dg-tree-diagram.engine.ts:347`). Рішення по API: reveal без виділення в SDK чи хост відновлює сам.
- Слабкість тестів (не блокує): перевіряють expand-стан, не наявність бокса цілі в сцені.
