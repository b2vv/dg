# plan.md — 1-B GPU viewport culling

Topic: `lazy-render-viewport` · гілка `feat/viewport-culling-gpu` · spec: `spec.md`
Research: `research.md` §5. Gate 1 decisions: OQ1 авто-поріг, OQ2 DIY renderable, OQ3 margin ~0.5 екрана.

## Суть

Перед кожним paint (render-on-demand) позначати `renderable=false` на node-view'ах, чиї
world-bounds (×camera) не перетинають екран + margin. Повторюється на кожен paint → природно
ре-cull «на viewport-dirty», бо paint і буває лише на зміні (AC3). Без зміни CPU-rebuild-моделі
(ось 1-A поза скоупом).

## Placement (маніфест §Розміщення)

Усе в `packages/sdk` (Pixi-рендер): `DiagramRenderer`, `PixiHost`, `promoteMath` (reuse).
Жодного Rust/WASM, жодного worker-контракту. **Публічного API не додаємо** (OQ1 = авто-поріг без
тумблера) → `docs/USAGE.md` **не змінюється**, AC6 знято. Межа не зсувається → формально нижче
порога пайплайна; цикл ведемо з R6-міркувань (критик + незалежне рев'ю), що зафіксовано.

## Reuse-first

**Reuse (не писати заново):**
- `worldBoxToScreen(box, viewport)` — `promoteMath.ts:47` — world AABB → screen rect через камеру.
- `screenRectInView(rect, screen, pad)` — `promoteMath.ts:231` — перетин screen-rect з екраном+pad.
- `WorldBox`/`ScreenRect`/`ViewportTransform` типи — `promoteMath.ts`, `Viewport.ts`.
- `PixiHost.getViewport()` → `ViewportTransform` (`PixiHost.ts:195`); `requestPaint` (`:269`).
- `scene.listViews()` → `{key, view, baselineAlpha}`; `scene.getBox(key)` → world box
  (використовує `DiagramRenderer`: `:532`, `:569`).

**New:**
- `DiagramRenderer.cullToViewport(viewport, screen)` — ітерує node-view'и, мапить box→screen,
  `view.renderable = screenRectInView(rect, screen, pad)`; `pad = 0.5 * max(screen.w, screen.h)`
  (OQ3). Веде `this.lastCullStats = { drawn, culled }`.
- Авто-поріг (OQ1): early-out — якщо к-ть node-view'ів < `CULL_MIN_NODES`, **нічого не культивуємо**
  і ставимо всім `renderable = true` (щоб вимкнення порога не лишило когось прихованим).
- Виклик у `PixiHost.requestPaint()` **перед** `app.render()`: `renderer.cullToViewport(viewport, screen)`.
- `DiagramRenderer.resetCull()` — виставляє `renderable=true` **усім node-view'ам** (ніколи не
  чіпає `visible`); для export-шляху (див. §Export interaction). Також гілка early-out
  (к-ть < порога) викликає саме його.
- `getCullStats()` на `DiagramRenderer` — seam для поведінкового тесту (AC1). Повертає
  `{ drawn, culled, passes }` — `passes` = лічильник інвокацій `cullToViewport` (закриває N2 для
  AC3: тест бачить, що ре-cull стався на зміні камери, а не окремою петлею). Не публічний
  (`OrgHierarchyDiagram`/`docs/USAGE` не чіпаємо; тест імпортує `DiagramRenderer` напряму). Барель
  не експортує нічого на `*ForTests` (гейт `barrelSurface.mjs`).

### Defensive (Q1, N3 — закриває Gate 2 defense-gap)
- **Q1 (malformed box):** якщо для view немає боксу, або бокс має NaN/∞ — `renderable` лишається
  `true` (НІКОЛИ не ховаємо вузол через відсутній/битий бокс). Зараз тригер недосяжний (кожен
  node-view має парний box: persons `PersonInteractions.bind:148`→rememberBox, orgs rememberBox),
  але рядок-захист обов'язковий.
- **N3 (no-throw в rAF):** `cullToViewport` **гарантовано не кидає** — вона всередині
  `requestAnimationFrame`; throw там з'їв би весь paint (чорний кадр). Невалідний бокс → **явне
  `view.renderable = true`** і перейти до наступного.
- **🔴 NB1 (Gate 2 ре-вердикт, обов'язково для імплементера):** у гілці невалідного боксу писати
  **`view.renderable = true` ЯВНО, НЕ `continue`**. `continue` лишив би stale `renderable=false`
  з попереднього paint (культивнуто в paint N → бокс став NaN у N+1 → вузол лишився б схований) —
  це сам Q1-фейл. Кожен прохід `cullToViewport` мусить виставити `renderable` явно для КОЖНОГО
  node-view (true або false), ніколи не лишати попереднє значення.

**Чому наявне не підійшло як є:** `screenRectInView` досі обслуговував лише DOM-оверлеї
(promote/anchor); тут та сама математика, але новий шлях — застосування до Pixi-node-view'ів
у paint-петлі. Сам хелпер переюзаний без змін.

### Поріг `CULL_MIN_NODES` — обґрунтування
Pixi: culling може коштувати більше за виграш на малих сценах. React Flow (community): <100 —
default, 100–500 — вмикати viewport culling. Беремо **консервативно `CULL_MIN_NODES = 300`**
(нижня-середина смуги) — нижче нього iteration-cost не окупається. Значення — **стартове, до
валідації в `npm run measure`** (OQ5); змінюється однією константою.

### Margin pad = 0.5·екран при zoom-out (N5 — зафіксовано, НЕ дефект)
`screenRectInView` тестує у screen-space; `pad = 0.5·max(screen)` — у пікселях екрана. При
сильному **zoom-out** ефективний world-margin = `pad/scale` стає величезним → майже нічого не
культивується, `culled≈0`. Це **очікувана й коректна** поведінка (zoom-out = все дерево на
екрані; acceptance #5 саме цього й чекає), а **не баг, який треба «виправити»**. Ціль фічі —
**zoom-in** pan, де `pad/scale` малий і виграш реальний. Рядок тут, щоб ніхто потім не прийняв
це за регресію.

## Рівень графа (OQ4) та інваріанти

- Культивуємо **лише node-view'и** (картки/сіти) з `scene.listViews()` — головний GPU-кошт.
- **Edges НЕ культивуємо** (`layers.edges`: `StaffEdgesView`/`OrgEdgesView` — великі контейнери,
  їх bounds перетинають екран майже завжди; відсікання одного кінця зникло б хибно). Лишаємо як є.
- **Тільки `renderable`, ніколи `visible`.** Promote ставить `view.visible=false` (`SceneRegistry.ts:122`);
  `renderable` ортогональний — culling не може «показати» промоутнутий вузол (Pixi пропускає, якщо
  `visible` АБО `renderable` false). Promote-інваріант цілий (AC5, сценарій 3).
- Після повного `render()` → `applyPromoteVisibility()` (`:490`) виставляє `visible`; paint-cull
  потім виставляє `renderable`. Порядок незалежний.

## Export interaction (B1 — закриває Gate 2 blocker)

Растровий export (`pngExport.ts:72` `extract.canvas(app.stage)`, через PNG і PDF) **респектує
`renderable=false`** і **не ре-рендерить** перед extract. `renderable`-прапорці персистять між
paint'ами (у цьому суть culling). ⇒ без фіксу: після culling-pan експорт вийшов би без off-screen
вузлів (сьогодні PNG/PDF = **усе дерево**, бо extract бере весь `app.stage`, попри `scope:'viewport'`).

**Фікс — тим самим прецедентом, що вже є для promote** (`OrgHierarchyDiagram.export():2322-2348`
знімає `setPromotedNodeIds([])` на час кадру, бо extract не малює `visible=false`): у `export()`,
перед `runExportNow`, викликати `this.renderer?.resetCull()` (усім node-view `renderable=true`).
Відновлювати не треба — наступний paint ре-культивує; екранний кадр extract не перемальовує
(`autoStart:false`, extract малює у власну текстуру — той самий архітектурний факт, що робить
promote-зняття безпечним). `resetCull` чіпає **лише `renderable`**, тож promote-зняття й cull-reset
ортогональні й не конфліктують.

## Side effects

- Додає O(node-views) ітерацію на **кожен paint**. Paint — on-demand (не щокадрова rAF-петля
  без причини), тож коштує лише на реальних змінах. Early-out (< порога) знімає кошт на малих
  сценах. Порядок той самий, що й наявні render-цикли — прийнятно.
- Motion-blur (свіжо змерджений velocity-blur): filter застосований на рівні шару/stage, не
  per-node → `renderable` окремих node-view'ів його не «обрізає». **Перевірити тестом** (AC5,
  сценарій 4): blur на pan лишається, culled-вузли не ламають межі філтра.
- `getCullStats()` read-only; між paint'ами перезаписується (не кумулятивний) — не живе довше
  за paint, що його породив.

## Migration plan

Міграції стану/даних немає — суто поведінка рендеру, внутрішня. Нема зміни публічного контракту,
worker-контракту, WASM↔TS. Хости нічого не міняють. Увімкнення — автоматичне за порогом.

## Rollback

- Поведінковий rollback без revert: `CULL_MIN_NODES = Infinity` → culling ніколи не вмикається,
  усі `renderable=true` (early-out гілка). Одна константа.
- Повний rollback: прибрати виклик `cullToViewport` у `requestPaint` → стара поведінка (все
  renderable). Зміна адитивна, revert одного коміту.

## Acceptance scenarios

Три групи (happy / boundaries / failures). «Observable» = зовні спостережно: `getCullStats()`
(unit-seam, рахує роботу — не годинник), `renderable`-стан view, або візуальний паритет (e2e/manual).

| # | Scenario | Precondition | User action | Expected observable result | Verification |
|---|---|---|---|---|---|
| **Happy** |
| 1 | Zoom-in pan культивує off-screen | Сцена ≥300 node-view; камера наближена так, що частина вузлів поза екраном+margin | Pan полотном | `getCullStats().culled > 0`; кожен view з `renderable===false` має world-box, що НЕ перетинає screen+pad; кожен видимий лишається `renderable===true` | unit `DiagramRenderer.cull.test.ts` |
| 2 | Візуальний паритет у вьюпорті | Сцена ≥300; zoom-in | Pan | Те, що в межах екран+margin, намальовано повністю — скріншот не відрізняється від baseline (без culling) у видимій області | e2e `viewport-culling.spec.ts` (screenshot) |
| 3 | Ре-cull на зміні камери | Сцена ≥300; зроблено paint (passes==1) | Другий pan (нова камера) + paint | `getCullStats().passes === 2` (ре-cull стався в paint, не окремою петлею) і набір culled відповідає новій камері | unit `DiagramRenderer.cull.test.ts` |
| **Boundaries** |
| 4 | Early-out: мала сцена | Сцена < `CULL_MIN_NODES` (напр. 50 view) | Будь-який pan | `getCullStats().culled === 0` і **всі** view `renderable===true` (culling не вмикається) | unit |
| 5 | Fit-to-whole: все у вьюпорті | Сцена ≥300; `fitView` вмістив усе дерево | — (без pan) | `getCullStats().culled === 0`; усі `renderable===true` (нічого не поза екраном+margin) | unit |
| 6 | Margin проти popping на краю | Сцена ≥300; вузол рівно за краєм екрана, але в межах margin (pad=0.5·екран) | Малий pan до краю | Той вузол лишається `renderable===true` (у межах pad) — не «вискакує» | unit |
| 7 | Edges не культивуються | Сцена ≥300; едж тягнеться від off-screen кінця до on-screen | Pan так, що один кінець поза екраном | `layers.edges` та його дочірні edge-view **ніколи** не отримують `renderable===false` | unit |
| **Failures / інваріанти** |
| 8 | Promote: прихований лишається прихованим | Сцена ≥300; вузол promoted (`view.visible===false`, DOM-картка показана) | Pan так, що вузол повертається у вьюпорт | Culling може виставити `renderable===true`, але `view.visible` лишається `false` — Pixi його не малює; DOM-картка на місці | unit + manual (DOM-картка видима) |
| 9 | Motion-blur на pan цілий | Сцена ≥300; velocity motion-blur default on | Швидкий pan | Blur-ефект присутній на видимих вузлах; culled-вузли не ламають межі філтра (немає артефактів/throw) | e2e `viewport-culling.spec.ts` + manual |
| 10 | Повторний paint без зміни камери | Сцена ≥300; камера стоїть | Другий `requestPaint` без руху | `getCullStats()` ідемпотентний (той самий набір culled); жоден раніше видимий не «блимнув» hidden | unit |
| 11 | **Export після culling-pan містить усе** (B1) | Сцена ≥300; zoom-in pan, частину culled (`culled>0`) | PNG/PDF export | Перед extract `resetCull()` виставив **усім** node-view `renderable===true` → експортоване зображення містить усе дерево (не підмножину вьюпорта); `visible=false` промоутнутих не чіпається | unit `export.test.ts` (spy: усі renderable true перед extract) + manual (PNG з off-screen вузлами) |
| 12 | **Битий/відсутній box не ховає** (Q1) | Сцена ≥300; штучний view без боксу або з NaN-боксом | Pan з culling | Цей view лишається `renderable===true`; `cullToViewport` не кидає (no-throw) | unit |

**Манульних рядків:** 3 часткових (№8 DOM-картка, №9 візуальний blur, №11 PNG з off-screen
вузлами) — лишаються в звіті як ручні кроки; решта автоматизована (unit/e2e).

## Tasks

(у `tasks.md` після Gate 2)
