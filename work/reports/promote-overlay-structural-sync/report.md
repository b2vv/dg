# report — promote-overlay: camera vs structural resync

**Гілка:** `fix/promote-overlay-structural-sync` · **Дата:** 2026-11-04 · Дельта від [`plan.md`](./plan.md).
spec-flow повний цикл: spec → GATE 1 (grilling) → plan → GATE 2 (critique+defense) → tasks → TDD → code-review. Обидва гейти PASS.

## 1. Що зроблено

Реалізовано рівно за планом (§Дизайн зміни, §Повний перелік точок правки) — один тегований канал
`PromoteSyncReason`, диспетчер в overlay. Збіги з планом стисло:
- `promoteMath.ts` — `export type PromoteSyncReason = 'camera' | 'structural'` + JSDoc.
- `OrgHierarchyDiagram.ts` — `notifyPromoteSync(reason = 'structural')`, `Set<(reason)=>void>`, публічний `subscribePromoteSync(listener:(reason)=>void)`; тег `'camera'` лише на viewport-шляху (рядок 467 після зсуву), решта (selection/resize/afterRender/repaintSelection) — дефолт `'structural'`.
- `createReactPromoteOverlay.ts` — диспетчер `structural → sync()` / `camera → onCameraChange()`; local iface оновлено; re-export типу.
- барелі `index.ts`/`react/index.ts`/`render/index.ts` — експорт `PromoteSyncReason` (N3).
- `docs/USAGE.md` — речення про негайний structural-ресинк.

**Відхилення від плану:**
- **Тип розміщено в `promoteMath.ts`, не в `OrgHierarchyDiagram.ts`** (як припускав план §Placement).
  Причина: overlay навмисно не імпортує sdk-index (циклічний імпорт, коментар `createReactPromoteOverlay.ts:37`),
  а `promoteMath.ts` він уже імпортує. Єдине джерело там, re-export для публічної поверхні.
- **3 наявні тести довелося правити** (`listener()` → `listener('camera')` + тип). План цього не передбачав:
  виявилось, що TS НЕ присвоює `(reason)=>void` до `()=>void` («too few arguments»), тож reason зробили
  обов'язковим, а не опціональним — панорамні симуляції в тестах стали явними `'camera'`. Деталь, не ризик.
- **+2 тести після code-review** (див. §2, §6): AC4 double-call і AC1 far-межа — закриття прогалин, не зміна коду.

Дифф: **9 файлів, +271/−15**.

## 2. Tested scenarios (acceptance-таблиця з планом + факт/вердикт)

| # | Сценарій | Очікуване | Факт | Вердикт |
|---|---|---|---|---|
| 1 | far-перехід ресинк негайно | synchronous rebuild без settleMs | `createReactPromoteOverlay.test.ts` «structural: rebuilds synchronously» зелений | ✅ matched |
| 2 | expand нові screenRect негайно | rebuild без settleMs | транзитивно (той самий afterRender-шлях, що setData — тест 3); прямого it немає | ✅ matched (транзитивно) |
| 3 | tagging expand→structural, pan→camera | правильний reason | `promoteSyncReason.contract.test.ts`: pan→camera, setData→structural | ✅ matched |
| 4 | double-call на far-кадрі | structural sync негайно; settle скасовано | «camera then structural in one frame» зелений (після огляду) | ✅ matched |
| 5 | resize негайно | structural-шлях | транзитивно (дефолт structural); прямого it немає | ✅ matched (транзитивно) |
| 6 | дефолт reason=structural | 'structural' | підтверджено tagging-тестом (setData/afterRender дефолт) | ✅ matched |
| 7 | пан НЕ негайний (анти-регрес) | не synchronous; catch-up; settle | «camera: does NOT rebuild synchronously» зелений | ✅ matched |
| 8 | пан не частішає rebuild | catch-up, не rebuild на кожен кадр | наявний `describe('deferred recompute')` + тест 7 | ✅ matched (транзитивно) |
| 9 | публічна поверхня незмінна | ()=>void присвоювані; опції ті самі | `npm run typecheck` зелений (sdk+types+demo) | ✅ matched |
| AC1-прямий | зум через far-межу → structural | 'structural' емітиться на LOD-рендері | «zooming across the far boundary» зелений (після огляду) | ✅ matched |

**«Не перевірено»: 0 рядків.** Прямий браузер-repro у :4000 НЕ виконано (auth заблокований) — але жоден рядок
не покладався на нього; усе доведено детермінованими юніт/контракт-тестами.

## 3. Non-obvious findings

- **Корінь обох багів — один** (sync-race), не два окремі. `afterRender` (`OrgHierarchyDiagram.ts:1002`) кличе
  `notifyPromoteSync` після КОЖНОГО рендеру, а overlay мав ЄДИНИЙ вхід `onCameraChange` з 150 мс-settle
  (`createReactPromoteOverlay.ts:479`). Структурна зміна йшла camera-шляхом → ghost/порожнє вікно.
- **mid-Pixi «підкладки» (3-тє спостереження власника) — pre-T129 залишок, не fallback.** `PersonNode` не має
  окремої mid-гілки: на mid малює повну картку, на far — лише крапку (`PersonNode.ts:365-372,490`). T129 чіпав
  тільки `promoteMath.ts`. Деталі — `_research-mid-pixi.md`.
- **`maxPromoted=40` у host НЕ існує.** Початкова премиса (стеля 40 → over-cap канал) хибна: ні host, ні demo
  не ставлять `maxPromoted` (research §B; USAGE.md «без стелі»). Над-cap mid-Pixi у ШПС не трапляється.
- **TS-асиметрія:** `(reason)=>void` НЕ присвоюваний `()=>void` — зробило reason обов'язковим і зачепило 3 наявні тести.
- **Реальний expand після structural ще емітить 'camera'** (`panToNode(animate:true)`) — не баг (`sync()` уже
  відпрацював зі свіжими boxes, `cancelSettle` всередині), але contract-тест цього interleave не відтворює (spec-review, ризик низький).

## 4. Screenshots

Не застосовно для коду, але **симптом видимий** — власник надав: відео зуму (far-скелет) + expand (ghost) і
скрін з обведеними mid-підкладками. Before = ці артефакти; after БРАУЗЕРОМ не знято (auth :4000 заблокований).
Поведінка «after» доведена тестами, не піксельно. Post-deploy браузер-перевірка — за Cass-1 проти нового dist.

## 5. User-flow walkthrough

Виконано **детермінованими тестами**, не вручну (браузер заблокований auth):
1. Користувач ШПС віддаляє діаграму до far → картки мають перейти в Pixi far-марки без порожнього вікна.
   Доведено: LOD-рендер емітить `'structural'` (тест «zooming across the far boundary») → overlay синкає негайно
   («structural: rebuilds synchronously») → `setPromotedNodeIds([])` у тому ж кадрі → Pixi far-марки видимі.
2. Користувач у edit-mode згортає→розгортає вузол → діти мають з'явитись одразу на правильних позиціях.
   Доведено: `togglePositionExpand` → afterRender → `'structural'` → негайний rebuild на нові screenRect
   (той самий шлях, що setData, тест 3).
3. Користувач тягне полотно → плавний рух без ривків і без rebuild на кожен кадр.
   Доведено: pan → `'camera'` → відкладено до settle («camera: does NOT rebuild synchronously»).

## 6. Risks and limitations

- **Браузер-валідація в :4000 не виконана** (auth заблокований в обох Claude-керованих браузерах). Рішення власника —
  шлях B (пропустити скрін, фікс детермінований). Залишковий ризик: інтеграційна поведінка не бачена оком; знято
  post-deploy-перевіркою Cass-1 проти нового dist.
- **Code-review (2 осі):** Standards — 0 порушень; Spec — PASS, **жодного BLOCKER**. Дві non-blocking тест-прогалини
  (AC4 double-call, AC1 far-межа) **закрито** тестами в цій же гілці. Non-blocking нюанс (camera-after-structural
  interleave реального expand не тестується) — записано, не гейтить.
- **mid-Pixi (3-тє спостереження) — поза скоупом за рішенням власника.** Залишковий не-transition рендер видимий
  лише при рідкісних slot-error; окремий low-pri таск + продуктове рішення (варіант: far-марка на mid під прапором,
  T129-консистентно). Не борг цього фіксу — debt названо в `_research-mid-pixi.md`.
- **Брифінг `CTO-RESEARCH.md` відстає на 21/25 комітів** — коміт цієї гілки наблизить до межі; стежити.
- **Поведінкова зміна ширша за 3 user-сценарії:** selection/resize/repaintSelection тепер синкаються негайно
  (було 150 мс) — явне рішення GATE 1 (дефолт structural), покращення відгуку, не creep.

## Post-deploy
<!-- залишено для post-deploy-check -->
