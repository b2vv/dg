# D3 — plan: transition-шар (зріз 1, staff-шлях)

**Статус:** ревізія 6 — **GATE 2 зелений** (неблокуючі з фінальних edges+gaps re-check внесено) · ревізія 5 (re-check edges: N1 LOD-правило, N2 abort відновлює) · ревізія 4 (plan-defense: 3 прогалини закрито) · ревізія 3 (re-check gaps: новий блокер React-ліній закрито) · ревізія 2 після plan-critique (6 блокерів закрито правками, див. `_gate2-critique.md`) · 2026-11-05 · гілка `feat/d3-transitions` @ `0752843`
**Spec:** [`spec.md`](./spec.md) (GATE 1 пройдено, рішення §7). **Факти:** `_helper-H1/H2/H3.md`.
**Маніфест:** `.claude/standards.md` — поріг спрацював; розміщення `packages/sdk` (Pixi-рендер); конституція нижче.

---

## 1. Архітектура (одне речення)

Новий чистий модуль `TransitionController` тримає **єдиний** між-рендерний стан за ключем `kind:id`;
рендер віддає йому **цільові** бокси з об'єкта `live` (вузька точка, H1 Q1), контролер повертає **поточний
кадр**, а Pixi-картки, React-оверлей і хром лише малюють цей кадр. Анімаційний цикл не перерендерює сцену —
рухає вже створені вигляди між рендерами (H1 Q2: вигляди знищуються щорендеру).

```
facade-операція з причиною (§5.1): 'animate' (дані/розгортання) | 'snap' (LOD, тема, resize, перший рендер)
render(reason)
  └─ DiagramRenderer.render(…, {transition: reason})
       ├─ reason='animate': ПЕРЕД clear — snapshot виглядів і **боксів** реєстру (`listViews`, `listBoxes`,
       │     `baselineAlphas`) за kind:id і контейнера ліній/хрому
       │     → detach у ghost-контейнер (без destroy)                                  [B1, B2]
       ├─ clear() як сьогодні (решта знищується)
       ├─ live = computeStaffLiveGeometry(...)                ← цілі (лінії вже прокладені Rust під ціль)
       ├─ controller.prepare(targetsFrom(live), reason)       ← diff enter/update/exit; цикл НЕ стартує [B4]
       │     перший рендер / reason='snap' / LOD ≠ LOD підтвердженого / N > ANIMATE_MAX_NODES
       │       → snapToTarget (0 кадрів) і прибрати ВСІХ ghost-ів, зокрема попереднього переходу
       │     на КОЖНОМУ проході: ключ, що повертається, поки його ghost ще згасає, поглинає цей ghost
       │       (один спрайт на ключ); ghost-и витісненого переходу прибираються
       ├─ нові вигляди в позиціях стартового кадру; ghost-вигляди — лише для exit-ключів, решта detached → destroy
       ├─ старий контейнер ліній → ghost (fade out); нові лінії alpha 0 до settle
       ├─ хром: прямокутні рамки/картки відділів/зони (React АБО Pixi) — як бокси `frame:<id>`   [B5]
       └─ blob-контури відділів (дефолтний `departmentStyle`, многокутники) — стадуються як лінії:
             згасають на час руху, на settle — нові (рішення агента, re-check edges; не «як бокси»)
             Стосується лише Pixi-шляху (far / без backdrop): на шляху React-хрому near/mid Pixi-відділи не
             малюються, прямокутні рамки відділів малює backdrop хоста — вони йдуть як бокси.
facade: кадр підтверджено (lastDrawnData === next)  → renderer.startTransition()          [B4]
facade: прохід відмовив (виняток)                  → renderer.abortTransition()           [B4]
         (повертає відокремлені вигляди й знімок реєстру = останній підтверджений кадр; 0 кадрів)
tick (rAF, лише поки !settled; пейнт — наявний renderer.onNeedsPaint, без правок PixiHost)
  ├─ controller.advance(now) → frame
  ├─ apply(frame): картки (у т.ч. приховані промоутом), ghost-и, Pixi-хром перемальовується з frame-боксів
  ├─ onTransitionFrame → facade.notifyPromoteSync('transition') → оверлей рухає картки CSS-трансформом,
  │     backdrop отримує інтерпольовані рамки; тест-якорі 'transition' ігнорують (віддають цілі, Q6)
  │     React-хром: під час руху `getStaffChromeGeometry()` віддає рамки з кадру і **`lines: []`** (лінії
  │     сховані — хост нічого не міняє, косих/відірваних ліній нема); на settle — нові лінії; опційне
  │     адитивне поле `linesOpacity` для fade, яке хост може читати (GATE 2 re-check gaps)
  └─ culling: «звідки ∪ куди» для живих ключів; для ghost — їхній frame-бокс
settle (природний спокій або cap 750 мс) / settleNow() (миттєво, для експорту)
  ├─ прибрати ghosts · нові лінії fade in (settleNow — одразу видимі) · promote sync('structural')
  └─ нуль кадрів далі (0 cost idle)
```

## 2. Reuse-first

| Що | Перевикористовуємо | Нове | Чому наявне не підійшло |
|---|---|---|---|
| Годинник | **форма** тріо `{now, requestFrame, cancelFrame}` (`Viewport.ts:18-24`, `contourMorph.ts:122-131`) | тип `FrameClock` модуля transition | імпортувати нічого (H2 Q1); `Viewport`/`contourMorph` **не** переводимо — поза скоупом |
| Пейнт | `PixiHost.requestPaint` (один rAF, cull→render, `PixiHost.ts:269-281`) | — | контролер просто кличе його щокадру (H2 Q2) |
| Easing | `easeOutCubic` (`Viewport.ts`) | — | для Tween-сиблінга (opacity) |
| Reduced motion | `matchMedia('(prefers-reduced-motion: reduce)')` як у `resolveMotionBlur` (`OrgHierarchyDiagram.ts:2544`) | `resolveAnimate` | та сама форма, інший результат |
| Опція конфігу | прецедент `staffRefitOnToggle ?? false` (`:497`) | `animate` | opt-in OFF, A3 |
| Тести часу | ручний rAF/інжект годинника (`Viewport.test.ts:139-157`, `PixiHost.test.ts:110-113`) | — | детермінований крок кадрів (H2 Q5) |
| Spring / diff / привиди | — | `animators.ts`, `TransitionController.ts`, ghost-шар | у коді нема жодного твіна вузлів (H1 Q5) |

## 3. Контракт типів (спільний для всіх кодерів — змінюється лише через координатора)

Файл `packages/sdk/src/render/transition/types.ts` (створює T-A, решта імпортують):

```ts
export interface FrameClock { now(): number; requestFrame(cb: (t: number) => void): number; cancelFrame(id: number): void }

/** advance(dt) за фіксований крок; settled — спокій за порогом (|Δ|<ε, |v|<ε), не за часом. */
export interface Animator { readonly value: number; readonly settled: boolean;
  retarget(target: number): void; snap(value?: number): void; advance(dtSeconds: number): void }

export type AnimatePreset = 'smooth' | 'snappy' | 'gentle' | 'instant';
export type AnimateOption = boolean | AnimatePreset
  | { duration: number; bounce?: number }               // перцептивна форма (s, 0..1)
  | { stiffness: number; damping: number; mass?: number }; // фізична форма
/** Нормалізований результат; null = анімації нема (off, 'instant', reduced motion). */
export interface ResolvedAnimate { stiffness: number; damping: number; mass: number; fadeMs: number }

export type TransitionPhase = 'entering' | 'updating' | 'exiting' | 'idle';
export interface TargetBox { key: string; x: number; y: number; w: number; h: number }
export interface FrameBox extends TargetBox { scale: number; opacity: number; phase: TransitionPhase }
export type TransitionFrame = ReadonlyMap<string, FrameBox>;
```

Константи (`transition/constants.ts`, T-A): `FIXED_DT = 1/60`, `MAX_STEPS_PER_FRAME = 6`, `EPS_POS = 0.5` px,
`EPS_VEL = 1` px/s, `ENTER_SCALE_FROM = 0.9`, `SETTLE_CAP_MS = 750` (F6), пресети F7,
`ANIMATE_MAX_NODES = 2000` (рішення агента, GATE 2 edges: понад це — snap; тюнити виміром #31).

## 4. Нарізка на задачі (неперетинні файли; коміти й важкі гейти — лише координатор)

| ID | Хвиля | Файли (ексклюзивно) | Що | Залежить від | Рядки приймання (§10) |
|---|---|---|---|---|---|
| **T-A** | 1 | `render/transition/types.ts`, `constants.ts`, `animators.ts`, `resolveAnimate.ts` + `*.test.ts` | `SpringAnimator` (retarget зберігає швидкість), `TweenAnimator`, мапа перцептивна→фізика, пресети, `resolveAnimate(option, reducedMotion)` | — | #9, #13, #14, #15, #25 |
| **T-B** | 1 ∥ T-A | `render/transition/TransitionController.ts` + test | diff за `kind:id` (enter/update/exit), канали (x,y spring · scale spring на enter · opacity tween · w/h snap), fixed-timestep акумулятор із клампом, settle + cap, `frame()`, `cancel()`/`snapToTarget()`, `onFrame`/`onSettle`, нуль змін = нуль анімації | контракт §3 (не код T-A: тести B кладуть мінімальний фейк `Animator`) | #2, #3, #4, #11, #12, #13, #18, #24, #35, #36 |
| **T-C** | 2 | `render/DiagramRenderer.ts`, `render/LayerManager.ts`, `render/SceneRegistry.ts`, `render/personInteractions.ts` + tests | володіє екземпляром контролера (`configureTransition(resolved)`); `render(…, {transition})`; snapshot+detach виглядів **до** `clear()` → ghosts для exit (B1); ghost-контейнер старих ліній (B2); `prepare` без старту, `startTransition()`/`abortTransition()` (B4); стадування ліній; хром як бокси **на обох шляхах** — React-геометрія (рамки з кадру, `lines: []` під час руху, нові на settle) і Pixi-перемальовування (B5); culling з ghost-боксами; `settleNow()` = `snapToTarget` + застосувати + показати нові лінії + прибрати ghosts; `onDragStart` → `snapToTarget` (B6); пейнт через `onNeedsPaint` | T-A, T-B | #1, #2–#7, #10, #11, #16, #18–#20, #22, #27–#30, #33–#39 |
| **T-D** | 2 ∥ T-C | `react/createReactPromoteOverlay.ts`, `react/createTestAnchorOverlay.ts`, `render/promoteMath.ts` (лише `PromoteSyncReason`) + tests | сигнал `'transition'`: картки рухаються CSS-трансформом за кадром без React-перерендеру; backdrop отримує інтерпольовану геометрію хрому; на settle — повний `structural`; лінії React-хрому сховані під час руху й показані на settle (#33); тест-якорі `'transition'` ігнорують (Q6); монтування/демонтаж оверлея посеред переходу (#29) | контракт §3 + §5 | #7, #8, #29, #33, #40 |
| **T-E** | 2 ∥ T-C, T-D | `OrgHierarchyDiagram.ts`, `docs/USAGE.md` + tests | `animate` у конфігу, `resolveAnimate` у `create()`, `renderer.configureTransition`; **причина рендеру** на кожному виклику (§5.1, B3); `startTransition` після підтвердженого кадру, `abortTransition` при відмові/витісненні (B4); `export()` → `settleNow()` перед растром; T131: при `animate` без `prepare-camera` (Q7); `getTransitionFrame()` для оверлея; `notifyPromoteSync('transition')`; USAGE: `animate`, `AnimateOption`, reduced-motion лише при створенні, сигнал `'transition'` (попередження для власних слухачів), **`getStaffChromeGeometry()`: `lines: []` під час руху й нове поле `linesOpacity`**, контракт «`staffReactChrome` = змонтований backdrop» | T-A, T-B; API T-C/T-D за §5 | #1, #10, #14, #16, #17, #19–#24, #27, #28, #32, #34, #37, #40 |

**Паралельність:** хвиля 1 — T-A ∥ T-B (2 кодери). Хвиля 2 — T-C ∥ T-D ∥ T-E (3 кодери) після злиття хвилі 1.
Кожен кодер ганяє **лише свої** тест-файли; повний `npm test`, root `typecheck`, `build` — координатор, по черзі.

## 5. Шви між задачами хвилі 2 (фіксуються тут, щоб кодери не чекали одне одного)

### 5.1 Причина рендеру (B3) — вхідний шов фасад → рендерер
`type RenderReason = 'animate' | 'snap'`. Фасад передає її в `render(reason = 'snap')` → `renderNow` →
`renderer.render(…, { transition: reason })`. **'animate'** ставлять: `togglePositionExpand`, `revealPath`,
`expandToDepth`, `collapsePositionSubtree`, `setData`, `commitDataChange` (правки). **'snap'** — усе інше:
перший рендер, перетин LOD (`onViewportTransform`), `setTheme`, `setStyles`, resize. **Носій:** `render()`, `renderCoalesce.schedule()` і `drawOrRestore` параметрів не мають
(renderCoalesce.ts:17-18), тож причина — поле екземпляра `pendingReason`, яке OR-накопичує виклики одного проходу
і скидається на старті проходу; `drawOrRestore` теж його ставить. Коалесовані виклики:
якщо хоч один у проході — 'animate', прохід 'animate'; перетин LOD **посеред** переходу → 'snap' →
`snapToTarget` на нових LOD-цілях, 0 залишкових кадрів (#28).
**Правило LOD (сильніше за причину, re-check edges N1):** рендерер порівнює LOD поточного проходу з LOD
останнього підтвердженого кадру; якщо вони різні — прохід **snap**, навіть коли коалесер злив його з 'animate'
(toggle + перетин LOD в одному проході → 0 анімованих кадрів, #37). Причина 'animate' лише **дозволяє** анімацію,
а не змушує. ⚠️ Для кодера: «LOD підтвердженого кадру» — **окреме поле**, що оновлюється лише на підтвердженні;
`this.lastLod` не годиться — `render()` перезаписує його до `renderStaffCanvas` (`DiagramRenderer.ts:538`).
Поле `lastConfirmedLod` пишеться в кінці **кожного** успішного рендеру — і 'animate', і 'snap' — і читається
`prepare()` до оновлення (інакше після snap-зміни LOD перша законна анімація хибно придушиться).

### 5.2 Рендерер (T-C) → фасад (T-E)
- `configureTransition(resolved: ResolvedAnimate | null)` — `null` = контролера нема, старий шлях байт-у-байт.
- `startTransition()` — стартує цикл лише для підготовленого переходу; викликається **після** підтвердження кадру:
  для `drawOrRestore`/`commitDataChange` — `lastDrawnData === next`; для `expandToDepth`, `collapsePositionSubtree`,
  `setData` — успішне завершення `await render()` без винятку.
- `abortTransition()` — **відновлює** останній підтверджений кадр (re-check edges N2): прибирає частково збудовані
  вигляди відмовленого проходу, **повертає** відокремлені до `clear()` вигляди в їхні шари й відновлює знімок
  реєстру боксів (`SceneRegistry`); ghost-и згасання відмовленого проходу знищує; 0 кадрів. Лише на шляху `animate`;
  шлях без `animate` не змінюється (сьогодні виняток після `clear()` лишає сцену порожньою до наступного рендеру).
  Разом із боксами відновлюються **мапа виглядів і `baselineAlphas`** реєстру (від них залежать culling і promote).
  Після відновлення — **один** пейнт через `onNeedsPaint` (відмовлений рендер сам нічого не перемалює).
  Відновлений кадр — **статичний аварійний**: прив'язки взаємодії (`personInteractions.reset()` на вході рендеру,
  `DiagramRenderer.ts:522`) повертаються з наступним рендером.
  Викликається лише при **відмові** (виняток). Витіснений прохід повертається без винятку (DiagramRenderer.ts:545)
  і самовідновлюється: `prepare` наступного проходу перезаписує цілі — окремого детектора витіснення **не** робимо.
- `settleNow()` — **миттєво** в кінцевий стан (= `snapToTarget` + застосувати + нові лінії видимі + без ghosts).
  Відрізняється від `abortTransition()`: той повертає назад, цей доводить уперед.
- `getTransitionFrame(): TransitionFrame | null` — `null`, коли нічого не анімує (окремого `isTransitioning` нема).
- `onTransitionFrame` — колбек кадру (поруч з `onNeedsPaint`); фасад перетворює на `notifyPromoteSync('transition')`.

### 5.3 Фасад (T-E) → оверлей (T-D)
- `PromoteOverlayDiagram.getTransitionFrame?(): TransitionFrame | null` — необов'язковий; без нього оверлей як зараз.
- Сигнал `'transition'` додає **T-D** у `PromoteSyncReason`; надсилає лише T-E.
- Контракт: `staffReactChrome: true` має відповідати реально змонтованому backdrop. Якщо оверлей/backdrop
  демонтовано посеред руху — фасад викликає `settleNow()` (лінії не губляться, #40).

### 5.4 Ізоляція покадрового сигналу (plan-defense Q2)
Покадровий `'transition'` **не може зупинити цикл**: `notifyPromoteSync` сьогодні — голий цикл без `try/catch`
(`OrgHierarchyDiagram.ts:637-639`, на відміну від `callHostCallback` `:645-652`). T-E обгортає кожного підписника
для `'transition'` (виняток → одне попередження, наступні підписники й кадри йдуть далі); T-C додатково захищає
виклик `onTransitionFrame` у тіку. Перехід усе одно доходить до settle й прибирає привидів (#34).

## 6. Побічні ефекти

- **Публічна поверхня (minor):** `animate` у `OrgHierarchyConfig`; тип `AnimateOption` у барелі; новий
  `PromoteSyncReason` `'transition'` (адитивний). ⚠️ Він доходить до **всіх** підписників `subscribePromoteSync`
  щокадру: вбудований оверлей без спецобробки пустив би його в `onCameraChange` (debounce-rebuild,
  `createReactPromoteOverlay.ts:515-519`), тест-якорі — у rebuild DOM. Тому T-D обробляє його в обох; у USAGE —
  попередження для власних слухачів хоста (ігнорувати `'transition'` або обробляти дешево).
- **Поведінка без `animate`:** жодної — контролер не створюється (passthrough), рендер іде старим шляхом.
- **Перф:** анімаційні кадри лише рухають наявні вигляди (без rebuild); ghost-шар живе ≤ одного переходу і
  куллиться за frame-боксом; нуль кадрів після settle; понад `ANIMATE_MAX_NODES` — snap. Бюджет кадру не
  виміряно — вимір #31 (інформаційний, не гейт).
- **Невалідна геометрія** (NaN/Infinity, нульовий або від'ємний бокс) — **поза скоупом валідації** контролера:
  цілі споживаються як є, тобто поведінка = сьогоднішній шлях без `animate` (пряме `position.set`); `SETTLE_CAP_MS`
  обмежує будь-яку розбіжність spring, а `cullToViewport` уже має finite-guard (`DiagramRenderer.ts:469-486`).
  Причина: паритет із поточним шляхом + cap (plan-defense Q1).
- **Reduced motion** читається лише при створенні діаграми — як у `motionBlur` (`OrgHierarchyDiagram.ts:2538`);
  перемикання ОС посеред сесії не відстежується (рішення агента, задокументувати в USAGE; #32).
- **Хост:** нічого не змінюється, поки не передасть `animate`. `nodeCenter`/якорі/drop повертають кінцеві позиції
  (Q6) — e2e хоста стабільні.
- **dist:** спільний із хостом → збірка лише після «ок» cass-сесії.

## 7. План міграції

Адитивно, opt-in. Хост вмикає `animate: true` (або пресет), коли готовий. Демо — без змін (не ціль).
Org-діаграма підключиться другим зрізом через той самий контролер (вхід — `TargetBox` за `kind:id`, Q1).

## 8. Rollback

- **Рантайм:** `animate` не передано / `false` → старий шлях байт-у-байт (AC1, перевіряється golden).
- **Код:** один feature-набір у `render/transition/*` + точкові вставки за гілкою `if (controller)` у T-C/T-D/T-E;
  відкат = revert комітів хвиль 1–2 без зачіпання інших фіч.
- **Невдалий рендер посеред переходу:** контролер `cancel()` і повертається до останнього підтвердженого кадру
  (AC9).

## 9. Конституція (`.claude/standards.md`)

- Тести перед кодом — кожна задача: RED на success **і** failure, потім GREEN.
- KISS понад SOLID/GoF — жодного патерну без ≥2 споживачів; `Animator` має 2 реалізації (spring, tween) —
  інтерфейс виправданий.
- Межа WASM↔TS — **не змінюється** (лінії вже прокладені Rust для цілі; нового виклику WASM нема).
- Публічний API ↔ `docs/USAGE.md` — `animate`, `AnimateOption`, `'transition'`, нова семантика
  `getStaffChromeGeometry()` (`lines: []` під час руху, `linesOpacity`) документує T-E. **Перевірка конституції
  (координатор, 2026-11-05): PASS** після доповнення T-E цими пунктами (раніше бракувало документування зміни
  `getStaffChromeGeometry()` — публічний метод, який читає хост).
- Pocock — лише TS (тут лише TS).

## 10. Таблиця приймання (acceptance-spec)

«Видиме ззовні» для бібліотеки = те, що бачить хост: позиції/прозорість/масштаб карток на сцені, CSS-трансформ
HTML-карток, кількість запитаних кадрів (`requestAnimationFrame`), вміст експорту, значення публічних методів,
колбеки. Рівні перевірки: **unit** (чисті модулі, інжектований `FrameClock`), **integ** (повна діаграма в
rstest, rAF-спай із ручним кроком кадрів — прецедент `PixiHost.test.ts:110-113`), **manual** (стенд хоста).

### Основний шлях

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 1 | Без `animate` | `animate` не передано | будь-який рендер | позиції всіх карток збігаються з поточним кодом; після рендеру **0** додаткових rAF | integ + наявний golden | AC1 | T-E, T-C |
| 2 | Згортання — зникнення | `animate: true`, голова з 3 нащадками розгорнута | `togglePositionExpand(голова)` | у першому кадрі нащадки на старих місцях з opacity 1; opacity спадає монотонно; після settle нащадків на сцені **нема** | integ | AC4, AC3 | T-C, T-B |
| 3 | Згортання — рух решти | як #2, справа від голови є сусід | те саме | сусід стартує на старій позиції й зупиняється на позиції, ідентичній рендеру без `animate` (±0.5 px) | integ | AC4 | T-C, T-B |
| 4 | Розгортання — поява | `animate: true`, голова згорнута | `togglePositionExpand(голова)` | нові картки стартують на цільовій позиції з scale 0.9 і opacity 0, після settle — scale 1, opacity 1 | integ | AC3, AC4 | T-C, T-B |
| 5 | Лінії — стадування | як #2 | те саме | під час руху старі лінії згасають, нових не видно (alpha 0); після settle нові лінії видно | integ | AC7 | T-C |
| 6 | Лінії — еталон | як #5 | дочекатися settle | точки кожної лінії **ідентичні** точкам того ж рендеру без `animate` | integ | AC7 | T-C |
| 7 | Рамки хрому як бокси | `animate: true`, `staffReactChrome: true` | те саме | backdrop отримує на кожному кадрі бокси рамок відділів/org між старими й новими; після settle — рівно цільові | integ | AC5 | T-C, T-D |
| 8 | HTML-картки синхронні з Pixi | `animate: true`, near-зум, оверлей змонтовано | те саме | CSS-трансформ кожної HTML-картки = позиція Pixi-картки цього кадру (±0.5 px); React-перерендер карток на проміжних кадрах **не** відбувається | integ | AC5 | T-D |
| 9 | Форми й пресети | — | `animate: 'snappy'` vs `'gentle'`; `{duration:0.4,bounce:0.1}`; `{stiffness,damping}` | `'snappy'` доходить до settle швидше за `'gentle'`; `{0.4, 0.1}` дає той самий рух, що `true`; фізична форма приймається | unit | AC2 | T-A |
| 10 | Reveal у згорнутій гілці | `animate: true`, ціль у згорнутій гілці | `revealPath(ціль)` | гілка розкривається з анімацією (#4); після settle ціль на сцені, камера на ній | integ | AC4 | T-E, T-C |

### Межі

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 11 | Нуль змін | `animate: true` | `setData` з тим самим деревом | **0** анімаційних кадрів після рендеру | integ | AC4, AC6 | T-B, T-C |
| 12 | Перенацілення посеред руху | перехід з #3 на кадрі N | друга зміна на кадрі N | між кадрами N і N+1 позиція картки змінюється не більше, ніж за звичайний крок (нема стрибка) | unit | AC6 | T-B |
| 13 | Великий dt (фонова вкладка) | перехід триває | наступний кадр через 5 с | виконано ≤ 6 кроків; картки в кінцевих позиціях; жодного `NaN` | unit | AC6 | T-B |
| 13a | Одиночний ривок кадру | перехід триває < 750 мс | наступний кадр через 200 мс | виконано ≤ 6 кроків, залишок відкинуто; перехід **триває** (не стрибає в кінець), наступний кадр запитано; кінець — лише settle або cap | unit | AC6 | T-A1 (рішення власника 2026-11-05) |
| 14 | Reduced motion | `prefers-reduced-motion: reduce`, `animate: true` | згортання | перший кадр уже кінцевий; **0** анімаційних кадрів | unit + integ | AC8 | T-A, T-E |
| 15 | Пресет `'instant'` | `animate: 'instant'` | згортання | як #14 | unit | AC2 | T-A |
| 16 | Вартість у спокої | перехід завершено | чекати 1 с | `requestPaint`/rAF не викликається жодного разу | integ | AC6 | T-C, T-E |
| 17 | LOD / тема / resize | `animate: true` | перетин порогу LOD зумом; `setTheme`; resize | **0** анімаційних кадрів, картки на місцях | integ | Q5 | T-E |
| 18 | Безперервні зміни (cap) | `animate: true` | 20 змін кожні 100 мс | нові лінії з'являються не пізніше ніж через `SETTLE_CAP_MS` (750 мс) від початку | unit + integ | AC7 | T-B, T-C |

### Відмови

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 19 | Рендер відмовив посеред переходу | перехід триває, наступний рендер кидає | друга зміна | помилка доходить до хоста; на сцені лишається останній підтверджений кадр (відокремлені вигляди повернуто, `nodeCenter` дає його позиції; кадр статичний — взаємодія повертається з наступним рендером); анімаційних кадрів **0** | integ | AC9 | T-E, T-C |
| 20 | Експорт PNG під час руху | перехід триває | `export({format:'png'})` | файл = експорту після settle (у межах допуску пікселів) | integ | AC9 | T-E, T-C |
| 21 | `nodeCenter` / тест-якорі під час руху | перехід триває | `nodeCenter(id)`; читання якорів | повертають **кінцеві** позиції | integ | Q6 | T-E |
| 22 | Drag під час руху | перехід триває | pointerdown на картці | анімація миттєво в кінцевому стані; drag стартує з кінцевої позиції | integ | Q6 | T-E, T-C |
| 23 | Refit T131 разом з `animate` | `staffRefitOnToggle: true`, `animate: true` | згортання | сигнал `'prepare-camera'` **не** надсилається; після settle камера в цілі refit | integ | Q7 | T-E |
| 24 | `destroy()` під час руху | перехід триває | `destroy()` | далі **0** rAF, без винятків | integ | AC9 | T-E, T-B |
| 25 | Невалідний `animate` | — | `animate: {duration: -1}` або невідомий рядок | анімація вимкнена; одне попередження в консолі; діаграма працює | unit | AC2 | T-A |

### Ручний

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 26 | Вигляд переходу на стенді хоста | хост увімкнув `animate: true` (після «ок» cass-сесії на збірку) | згорнути/розгорнути гілку ШПС | рух плавний, без ривків і подвоєних карток; лінії зникають і з'являються вже прокладеними | **manual** (лишається в звіті) | AC5, AC7 | — |

### Додано після GATE 2 (plan-critique)

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 27 | Перший рендер не анімується | `animate: true` | `create()` | усі картки одразу в кінцевих позиціях, opacity 1; **0** анімаційних кадрів | integ | AC4 | T-E, T-C |
| 28 | LOD посеред переходу | перехід триває | зум перетинає поріг LOD | картки одразу на цілях нового LOD; далі **0** кадрів | integ | Q5 | T-E, T-C |
| 29 | Оверлей змонтовано/демонтовано посеред переходу | перехід триває | змонтувати / демонтувати оверлей | у жодному кадрі картка не видна двічі і не зникає: при демонтажі Pixi-картка видна в позиції кадру, при монтажі HTML-картка з'являється в позиції кадру | integ | AC5 | T-D, T-C |
| 30 | Pixi-хром (без React-backdrop і на далекому LOD) | `animate: true`, `staffReactChrome` не задано / far | згортання | прямокутні Pixi-рамки (картки відділів, рамка org, зони) рухаються як бокси разом із нодами; blob-контури й лінії стадуються як у #5; після settle — ідентично рендеру без `animate` | integ | Q3, AC5 | T-C |
| 31 | Вимір вартості кадру | 1000 рухомих карток | згортання/розгортання | час кадру анімації записано у звіт (інформаційно; перевищення 8 мс — сигнал знизити `ANIMATE_MAX_NODES`) | integ (вимір) | AC6 | T-C |
| 32 | Reduced motion змінено після створення | діаграму створено без reduced-motion | увімкнути reduced-motion в ОС | переходи **лишаються** анімованими (обмеження задокументоване в USAGE, як у `motionBlur`) | unit | AC8 | T-E |

Рядок #8 — спосіб спостереження уточнено: **DOM-елемент HTML-картки той самий** (ідентичність вузла) і
лічильник рендерів тестового компонента картки не росте на проміжних кадрах, а `style.transform` змінюється.

| 33 | Лінії React-хрому під час руху | `animate: true`, `staffReactChrome: true`, near-зум | згортання | на проміжних кадрах `getStaffChromeGeometry().lines` порожній, рамки — з кадру; після settle `lines` = лініям рендеру без `animate` | integ | Q3, AC7 | T-C, T-D |

### Додано після plan-defense

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Перевірка | AC | Задача |
|---|---|---|---|---|---|---|---|
| 34 | Підписник кидає посеред переходу | `animate: true`, власний `subscribePromoteSync`-слухач кидає на `'transition'` | згортання | перехід доходить до settle, привидів нема, далі **0** кадрів; одне попередження в консолі | integ | AC6, AC9 | T-E, T-C |
| 35 | 0 і 1 нода | `animate: true`, сцена з 0 / 1 видимою нодою | `setData` / toggle | порожній / один бокс; одразу кінцевий стан; далі **0** кадрів; без винятків | integ | AC4 | T-B, T-C |
| 36 | Зникають усі ноди | `animate: true` | `setData` з порожнім деревом | усі картки стають привидами й згасають; після settle сцена порожня; далі **0** кадрів | integ | AC4 | T-C, T-B |

| 37 | Toggle і перетин LOD в одному проході | `animate: true` | toggle й зум через поріг LOD до наступного кадру | одразу кінцеві позиції нового LOD; **0** анімованих кадрів | integ | Q5 | T-C, T-E |
| 38 | Snap-рендер посеред згасання привидів | перехід із привидами триває | `setTheme` | привидів на сцені нема; далі **0** кадрів | integ | AC4 | T-C |

| 39 | Швидке клацання toggle | `animate: true` | згорнути й знову розгорнути до settle | для кожного ключа на сцені **один** спрайт (без подвоєння привида й нової картки); після settle — жодного привида | integ | AC4 | T-C, T-B |
| 40 | Backdrop демонтовано посеред руху | `animate: true`, `staffReactChrome: true` | демонтувати оверлей до settle | перехід миттєво в кінцевому стані; лінії не зникають (Pixi або нова геометрія) | integ | AC5, AC7 | T-E, T-D |

**Підсумок:** 40 рядків — основний шлях 11, межі 17, відмови 11, ручний 1. Ручних лишається **1** (#26).
Рядок #25 — **рішення агента** (невалідна форма → вимкнено + попередження), винести на GATE 2.

## 11. Захист плану (plan-defense, незалежний рев'юер `gate-reviewer`, `_defense.md`)

| # | Питання | Закрито рядком | Вердикт |
|---|---|---|---|
| 1 | Невалідний вхід | §10 #25 (`animate`), §6 «Невалідна геометрія — поза скоупом валідації» | закрито (рев. 4) |
| 2 | Збій залежності | §10 #19, #13, #34; §1 abort; §5.2; **§5.4 ізоляція покадрового сигналу** | закрито (рев. 4) |
| 3 | Гонки й повтори | §10 #12, #20, #24; §5.1 (носій `pendingReason`); §5.2 | закрито |
| 4 | Порожні й граничні дані | §3 `ANIMATE_MAX_NODES`; §1 cap; §10 #18, **#35, #36** | закрито (рев. 4) |
| 5 | Відкат | §8 (opt-out рантайму, revert комітів, abort переходу); §6 — лише адитивна поверхня | закрито |

