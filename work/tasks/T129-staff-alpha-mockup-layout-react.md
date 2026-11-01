# T129 — staff alpha: окрема Rust-версія layout (порт мокапа) + near-view React на компонентах v3

**Пріоритет:** P2 · **Статус:** 🟡 L1 (калькуляція) ВИКОНАНО+GREEN · L2 (React-компоненти) BLOCKED на опис власника ·
**Під парасолькою:** [T126](T126-staff-layout-anchors-spacing-into-rust.md)
**Гілка:** `feat/t126-staff-rust-geometry` (та сама; один активний writer).

## Мандат (рішення власника 2026-11-01)
«Alpha / швидкий старт». Дослівні рішення власника:
1. **Окрема версія Rust-бібліотеки** під це, «будемо відходити від неї» (= база, від якої розвиваємось).
   Не ретрофіт у `staff_layout.rs`.
2. **Рівень 1 (калькуляція):** взяти **їхній алгоритм розрахунків** — `~/Downloads/mock3/shps-links.js`
   `layout()` (дворівневий tidy-tree). Підтверджено власником: «а це не розрахунок хіба?» — так, це розрахунок.
3. **Рівень 2 (React):** з мокапу **v3** (`ШПС картка v3.html`) **добрати компоненти, яких нам бракує**.
4. **Позиціонування за x/y** (абсолютне, з координат L1), НЕ CSS-tree.
5. Межі 4 рівнів (рішення власника раніше): 1 калькуляція · 2 React-шаблон/SVG · 3 Pixi · 4 оркестратор
   (задокументовано в CONTEXT.md + ADR 0002 + [[r6-critic-and-review-each-step]]).

## Scope / non-goals
- **IN:** нова Rust-ліба layout (порт `layout()`); near-view React на x/y-координатах; компоненти з v3.
- **OUT:** роутинг ліній (це T128, власний A* — НЕ чіпати); зміни в `staff_layout.rs`; `multiSourceParentEval`;
  зберігаємо картку 300 / clamp 3.

## Еталон layout (факти з `shps-links.js`, переказ — третій-сторонній код не цитується)
Дворівневий tidy-tree. Gap-формули з pad/lane (ev=парне округлення), при pad=8/lane=8:
SG=32 (сиблінг), **LV=56** (внутр-рівень), DP=30 (внутр side/bottom padding), DPt=58 (внутр top=HD34+24),
BG=44 (гориз між-блок), **BV=96** (верт між-блок). CW=236/CH=118/HD=34 (мокап; DG передає seat 300×112).
LV≠BV розчеплені. Singleton (no-dept посада) = окремий блок, між-блок через BV.

## Компонентна модель рівня 2 (опис власника, ІНКРЕМЕНТАЛЬНО — triває)
### «Організація» — ОДИН базовий компонент, 3 варіанти за ярусом:
1. Керуюча (tier 1) = база **+ фон** (v3 `.porg`: смугастий bg, dashed-рамка, лейбл, summary `.xcard`).
2. Поточна (tier 2) = база **+ чіп** (v3 `.org.cur` + бейдж «Поточна організація»).
3. Підпорядковані (tier 3) = **бази** (плейн).
### Пошук посад (добрати з v3):
стилі `.sbar/.sin/.sl` + підсвітка `mark`; чіп «Знайдено» (`.card.found`); поведінка діаграми при
знайденій посаді (розгорнути предків, затемнити інші, outline+pulse, скрол у центр — v3 `focusCard`).
### Картка посади = з **v3** (`.card`: аватар/посада/виконавець/футер-лічильник/toggle/`.pop`-попап).
### Деп-картка/рамка = з **v3** (`.dept` суцільна + `.dn` залита шапка, left-align, radius).
### Розміщення = **нова alpha-вкладка** демо (не заміна mock3).
### Додаткова фіча на React-layout (рішення власника): **при наведенні на посаду — показати з'єднання
### + затемнити решту** (поведінка `.hl` з мокапу ліній: `.card.rel` яскраві, інші `opacity`;
### ребра наведеної `.ln.on`). Моє припущення (підтвердити): лінії для alpha — прості конектори
### (орто/пряме parent↔child з x/y + reportLines), НЕ A* (роутинг = T128).

---

## Pre-code checkpoint (Factory `pre-code-checkpoint.md`)
| Поле | Зміст |
|---|---|
| **Scope/acceptance** | IN/OUT вище. Acceptance L1: ноди/рамки у x/y за алгоритмом мокапа, LV≠BV, детермінізм, гейти green. Acceptance L2: ОЧІКУЄ (компоненти не повні). Non-goal: routing. |
| **Grilling/рішення** | Рішення власника — 5 пунктів мандату + x/y + компонентна модель орги/пошуку (дослівно вище). **Моє припущення (не рішення власника):** L1 = ALIGN існуючого Rust-патерну новим модулем, а не літеральний rewrite — підтверджено ділом (порт у новому модулі). Відкрито: склад card/dept-компонентів, вкладка vs заміна. |
| **Dependencies/writers** | Root `/Users/strelia/projects/dg`, гілка `feat/t126-staff-rust-geometry`, base `main`. Один writer (ця сесія). Дерево dirty — див. нижче. Фонові шели (dev server bp7syyzq7, personDrag bbcj13ztr, ngrok b8a4gwzms) — чужі процеси, не чіпати. |
| **Scoped impact** | L1 ізольований: новий модуль `staff_mockup_layout.rs` + `pub use` + wasm-обгортка; `staff_layout.rs` НЕ змінено (попередній декаплінг відкочено — ламав `tests/multi_source_parent.rs`). SDK: `layoutBridge.ts`, `contour/bridge.ts`, тест-мок. |
| **Planning review** | Повний spec-flow/критик НЕ проганявся (alpha/швидкий старт, обсяг власником заданий прямо). **R6 (критик+незалежне рев'ю) по L1 ЩЕ НЕ зроблено** — потрібне перед «done». Поточний статус L1 = «реалізовано, незалежна перевірка неповна». |
| **Readiness** | **L1: реалізовано+гейти green, R6-рев'ю PENDING. L2: BLOCKED** на детальний опис компонентів власником. |

## Tree state / зроблене (L1)
Додано: `packages/core/src/staff_mockup_layout.rs` (порт + 4 unit-тести), `lib.rs` (mod/use/wasm `computeStaffMockupLayout`),
`types.rs` (5 типів у `export_rust_types`), згенеровано `sdk/.../generated/rust-types.ts`, `sdk/.../pkg/*` (build:wasm),
`sdk/src/contour/bridge.ts` (+сигнатура), `sdk/src/wasm/layoutBridge.ts` (`computeStaffMockupLayoutWasm` + ре-експорт),
`sdk/.../staffGeometryBridge.test.ts` (стаб у мок). Жива нота: `work/reports/staff-link-routing-astar/_alpha-react-css-nearview.md`.

## Checks (факти)
- `cargo test --all-features` → 234 + 8 passed, 0 failed.
- `cargo test staff_mockup_layout` → 4 passed (place+frame, LV=118+56, BV=118+96, determinism).
- `npm run build:wasm` → OK (binding у glue).
- `npm run typecheck` → OK (exit 0).
- SDK bridge-тест (`staffGeometryBridge.test.ts`) — прогін у процесі на момент запису.

## Архітектура L2 — ЧЕРЕЗ ОРКЕСТРАТОР (поправка власника)
Власник: «ця вкладка має працювати через оркестратор, який і буде перемикати pixi та реакт layout».
ВІДХИЛЕНО мій попередній план standalone-demo-view (монтування React повз SDK у `App.reload()`) —
архітектурно невірно.

Правильно:
- Вкладка `staff-alpha` → `OrgHierarchyConfig` з прапором (як усі вкладки) → `OrgHierarchyDiagram.create`
  → оркестратор `DiagramRenderer` (`render/DiagramRenderer.ts`).
- Оркестратор для прапора бере рівень 1 = **mockup-калькуляцію** (`computeStaffMockupLayoutWasm`) замість
  звичайного `computeStaffLiveGeometry` (`renderStaffCanvas:642`).
- Наявний LOD-перемикач оркестратора: **far/mid → Pixi**, **near → React-layout** (promote-поверхня,
  v3-компоненти). Той самий Pixi↔React switch, що вже є для near-promote.
- Демо має React 19; SDK near-React = `createReactPromoteOverlay`. Дані: reuse `buildMock3ShpsData()`.

## 🔴 Рішення, які потрібні ПЕРЕД кодом (planning-gate):
1. **Чи рівень-1 mockup-координати живлять ОБИДВІ поверхні** (far/mid Pixi + near React), чи alpha —
   near-only на цьому етапі? `StaffMockupResult{nodes,frames}` простіший за `StaffGeometryResult`
   (без zones/edges/routes/orgCards) — щоб far/mid Pixi малював alpha-сцену, координати треба
   адаптувати у форму, яку їдять наявні Pixi-поверхні, АБО alpha поки near-only.
2. **near React-поверхня = адаптувати наявний `createReactPromoteOverlay` під v3-компоненти, чи нова
   near-поверхня?** (власник: «добрати компоненти з v3»).

### Слайси L2 (після gate):
1. Прапор у config + `DemoTab`/TAB_META/index.html; оркестратор-гілка вибору mockup-калькуляції.
2. Адаптер mockup-coords → форма споживачів поверхонь.
3. near React-поверхня на v3-компонентах (картка/деп/орга-база+варіанти).
4. Прості конектори parent↔child (НЕ A*). 5. Hover: з'єднання+затемнення. 6. Пошук v3. 7. R6.

## ВИКОНАНО — глобальна LOD-правка Pixi(far)/React(mid+near)
Рішення власника (2026-11-01, AskUserQuestion): **глобально в коді**. React-поверхня (promote)
покриває **mid+near**, Pixi — лише **far**. Змінено `render/promoteMath.ts`:
- `nearVisibleGateOpen(lod)`: `=== 'near'` → `!== 'far'` (band = detail = mid+near).
- `resolvePromoteIds` near-selection: `lod !== 'near'` → `lod === 'far'`.
- Назви режимів (`near-*`) лишено для стабільності API; коментарі оновлено.
Когерентність перевірено: той самий resolved-ids-шлях (`setPromotedNodeIds`, overlay:408 →
`DiagramRenderer.setPromotedIds`:294) керує і показом React, і хованням Pixi → без подвійного
рендера на mid. Оновлено тести: `promoteMath.test.ts` (gate mid→true, near-selection mid promote),
`createReactPromoteOverlay.test.ts` (демоут-межа mid→far у 2 тестах).
**Свідомий наслідок (non-blocking):** Pixi-драг seat (`personInteractions.ts:192`) лишається near-only
— на mid показується React-картка, але Pixi-драг-гейт не розширено (окремий concern).
**Статус перевірки:** vitest у середовищі стартує дуже повільно; прогони у фоні, результат PENDING.
R6 (критик+незалежне рев'ю) по цій глобальній зміні — НАЛЕЖНИЙ (змінено навмисну спільну доктрину).

## ВИКОНАНО — core-вертикаль alpha-вкладки через оркестратор (лише mockup-калк)
- `render/types.ts`: прапор `staffAlphaMockup` (+default false).
- `render/staffLiveGeometry.ts`: гілка `computeViaMockup` ПЕРЕД useRust/useTs — кличе ЛИШЕ
  `computeStaffMockupLayoutWasm`, мапить nodes→`canvas.positionNodes` (деп-рамки/promote-картки
  поверхні виводять самі з нод). Старий Rust/TS калк на цьому шляху не викликається.
- `app/tabs.ts`, `app/tabConfigs.ts`, `index.html`: вкладка `staff-alpha` (reuse mock3-дані,
  `staffAlphaMockup:true`, `departmentStyle:'card'`, zoneChrome off).
- `staffGeometry.golden.test.ts`: `staff-alpha` виключено з golden-покриття (обходить стару калк).

Гейти (факти): rust 234+8 · SDK rstest **1231 passed/0 failed** · demo **108/0** · typecheck exit0 · build:wasm OK.
**Виправлення процесу:** раннер — `rstest run`, НЕ vitest (мої vitest-прогони залипали — зупинено).

## Наступні слайси (L2 візуал/фічі) — НЕ зроблено
1. v3-компоненти (картка/деп/орга-база+варіанти) замість дефолтної promote-картки + Pixi-far.
2. Прості конектори parent↔child (НЕ A*). 3. Hover: з'єднання+затемнення. 4. Пошук v3.
5. R6 (критик+незалежне рев'ю) по L1 + глобальній LOD-зміні + alpha-вертикалі — перед «done».
