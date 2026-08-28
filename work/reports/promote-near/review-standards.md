# Code review — вісь «стандарти» (гілка cursor/promote-near-dom, fc1ca88...HEAD)

_WIP: дописується інкрементально._

## 1. `packages/sdk/src/react/createReactPromoteOverlay.ts`

### Жорсткі порушення (документований стандарт)

1. **Осиротілий JSDoc — коментар проти коду.** `CODING_STANDARDS.md` §1 «Comments — пояснюють
   *чому*»; `.claude/standards.md` «Чого гейти НЕ ловлять: коментарі проти коду».
   У `PromoteOverlayDiagram` два блоки JSDoc стоять підряд, і перший (про
   `listPromoteBoxes`: «Node geometry with no data resolution… 2.1 ms vs 0.005 ms») фізично
   прикріплений до `getScreenSize()`, бо TS бере лише останній блок перед декларацією.
   `listPromoteBoxes()` лишився без доку, а `getScreenSize` — з чужим.

2. **Розмір `sync`.** §1 «Small functions — ціль ≤ ~40 рядків body». Тіло `sync` ~65 рядків і
   робить шість різних речей: скидання transform, вибір ids, sticky, резолв кандидатів,
   застосування cap, hide-в-Pixi + render. Машина це не ловить (`max-lines*` вимкнено —
   `standards.md` явно каже, що це лишилось на людині).

3. **Декларація всередині блоку імпортів.** §1 Clean Code / читабельність: `export interface
   PromoteBox {…}` вставлено **між** двома `import`-ами (`from '../render/promoteTypes.js'` і
   `from './...promoteMath'`). Компілюється, але розриває шапку файлу.

### Судження (запахи)

- **Mysterious Name + Duplicated Code — нормалізація `max`.** Одна й та сама «правда» про
  `maxPromoted` розповзлась на три місця:
  ```ts
  if (max != null && Number.isFinite(max) && Math.floor(max) === 0 && max >= 0) return [];
  const rest = max == null || !Number.isFinite(max) || max < 0 ? undefined : Math.max(0, Math.floor(max) - 1);
  ```
  плюс третя копія всередині `pickNearestToCenter`. `Math.floor(max) === 0 && max >= 0` —
  це «max ∈ [0,1)», і прочитати це з коду неможливо. Одна функція `normalizeCap(max)` →
  `number | undefined` прибрала б усі три. Ім'я `cappedAroundSticky` теж не каже, що
  sticky **займає** слот, а не додається понад cap — це доводиться читати з коментаря.

- **Data Clumps / Primitive Obsession — `{ width, height }`.** Анонімний
  `screen: { width: number; height: number }` подорожує через `visibleIds`,
  `cappedAroundSticky`, `pickNearestToCenter`, `getScreenSize`. У модулі вже є іменований
  `ScreenRect` — іменованого `ScreenSize` немає, і тип дублюється інлайном у кожній сигнатурі.

- **Data Clumps — `PromoteBox` vs `PromoteCandidate.world`.** `PromoteBox` наново перелічує
  `x/y/width/height` замість того, щоб скласти identity + наявний world-box тип, який
  `worldBoxToScreen` уже приймає.

- **Middle Man — `OverlayState`.** `const state: OverlayState = { slots: capped };` і одразу
  `slots: state.slots`. Обгортка на одне поле, що нічого не додає.

- **Message Chain (§1 Law of Demeter).**
  `active.closest('[data-promote-slot]')?.getAttribute('data-promote-slot') ?? null` — обхід
  DOM у три ланки прямо в `focusedSlotId`.

## 2. `promoteMath.ts` / `promoteTypes.ts`

### Жорсткі порушення

4. **DRY §4 «одна правда знання» — політика cap у двох модулях.**
   `pickNearestToCenter` документує й реалізує політику («не фінітне або від'ємне → без стелі,
   `0` → нічого, дробове → вниз»), а `cappedAroundSticky` в overlay реалізує **ту саму**
   політику наново, іншим виразом (`Math.floor(max) === 0 && max >= 0`). Дві копії одного
   знання, які розійдуться при першій же правці.

5. **Коментар проти коду — одиниці `PromoteChrome`.**
   `promoteTypes.ts`: «Frame geometry … in **screen** px», але `PromoteOverlayDiagram.getPromoteChrome`
   документований як «in **world** units — the overlay scales it», і `scaleChrome` множить на
   `viewport.scale`. Один тип носить дві різні системи координат, а його власний док стверджує
   лише одну. (`standards.md` — «коментарі проти коду»; §1b Primitive Obsession/branded types
   були б тут прямою відповіддю.)

### Судження

- **Repeated Switches по `PromoteMode`.** Дискримінант розбирається двічі й по-різному:
  ```ts
  if (mode === 'off' || mode === 'near-visible' || !selection) return [];   // promoteMath
  ...
  mode === 'near-visible' ? (nearVisibleGateOpen(lod) ? visibleIds(...) : []) : resolvePromoteIds({...})  // overlay
  ```
  П'ятий режим доведеться додавати у двох файлах (Shotgun Surgery). §1b «Exhaustiveness:
  switch по discriminated union → `assertNever`» тут не застосовано — новий режим тихо
  провалиться в гілку `resolvePromoteIds` і поверне порожньо.

- **Middle Man — `nearVisibleGateOpen(lod)`.** Публічний експорт SDK на тіло `lod === 'near'`,
  делегує все й нічого не додає, крім імені. Тримається лише коментарем.

- **Data Clumps (продовження) — `screen: { width: number; height: number }`** тепер і в
  публічній сигнатурі `pickNearestToCenter`.

## 3. `OrgHierarchyDiagram.ts` / `PixiHost.ts`

### Жорсткі порушення

6. **Осиротілі JSDoc — це системна помилка гілки, не одиничний огріх.** Той самий механізм
   ще двічі, і цього разу зі **втратою наявної документації**:
   - `OrgHierarchyDiagram.ts:1008+` — три блоки JSDoc підряд перед `getPromoteChrome`.
     Старий док «World boxes + resolved node payloads for promote overlay» писався для
     `listPromoteCandidates`, а новий метод вклинився між ними; тепер
     `listPromoteCandidates` і `listPromoteBoxes` без доку, а `getPromoteChrome` — з трьома
     чужими.
   - `PixiHost.ts:176+` — док «Coalescing matters because a drag fires far more often…»
     писався для `requestPaint()`; між ним і методом вставлено `setOnResize`. Тепер він
     стосується `setOnResize`, який нічого не коалесує.

   Разом із п.1 це три випадки в одній гілці. `CODING_STANDARDS.md` §7 Boy Scout Rule
   («кожен PR лишає модуль чистішим») + §1 Comments.

7. **DRY §4 — четверта копія union'а видів вузла.** `interaction/types.ts:1` уже експортує
   `export type NodeKind = 'organization' | 'person' | 'position'`. Диф додає ще дві копії
   інлайном: `getPromoteChrome(kind: 'organization' | 'person' | 'position')` і
   `PromoteBox.kind`. Причому `createReactPromoteOverlay.ts` **уже імпортує** з того самого
   модуля (`type NodeRef`). §4: «Спільні типи … не copy-paste вручну». Це ж і Primitive
   Obsession з базового набору.

### Судження

- **Feature Envy / Duplicated Code — `getPromoteChrome`.**
  ```ts
  const style = kind === 'organization' ? this.nodeTheme.organization : this.nodeTheme.person;
  ...
  if (kind === 'organization') { const org = this.nodeTheme.organization; ... }
  ```
  `org` — це той самий `style` у гілці, де він уже звужений; тема читається двічі. І сам метод
  — це знання про те, з чого складається рамка вузла, витягнуте з рендерерів вузлів
  (`PersonNode.ts` бере `style.borderRadius` сам) у фасад. Зміниться рамка в рендерері —
  промоут-картка розійдеться, і компілятор промовчить.

- **God-class росте (§3, прямо названий антипатерн).** `OrgHierarchyDiagram.ts` — 1186 рядків,
  диф додає ще три методи (`getPromoteChrome`, `getScreenSize`, `listPromoteBoxes`), два з яких —
  чистий прокид (`this.host?.getScreenSize() ?? …`, `this.renderer?.listNodeBoxes() ?? []`).
  **Middle Man** у фасаді; стандарт вимагає «виносити use-case методи в application-сервіси».

- **Fail fast (§1) — тихі нулі.** `getScreenSize()` без host повертає `{0,0}`, overlay ховає це
  через `measured.width || 1`. Немає ні throw, ні Result — рівно той «тихий wrong layout»,
  який §1 забороняє; екран 1×1 px відкине всі картки й виглядатиме як «фіча не працює».

## 4. `packages/demo/src/app/App.ts`

### Судження

- **Duplicated Code — `DemoContentModesCard` переписує `DefaultPromoteCard`.** Уся коробка
  картки (`position:absolute`, `left/top/width/height`, `boxSizing`, `borderRadius`,
  `border: ${chrome.borderWidth}px solid var(--border,#cbd5e1)`, `background`, `overflow`,
  `pointerEvents`) продубльована з SDK-компонента слово в слово, лише щоб замінити `padding`
  і вміст. Це сигнал, що `DefaultPromoteCard` не має шва для стилю, а не що демо особливе:
  «одна правда знання» (§4) про геометрію промоут-картки тепер у двох пакетах.

- **Primitive Obsession — магічні рядки `entityType`.** `'promo-cover'` / `'promo-contain'`
  живуть як голі літерали в `mockupStaff.ts` і зіставляються літералом у `App.ts`
  (`kind === 'promo-contain'`). Немає ні `as const`-об'єкта, ні union'а — §1b прямо радить
  `as const` + derived union замість голих значень; помилка в літералі мовчки дасть `cover`.

- **Duplicated Code — розбір query-параметра.** `promoteMode` копіює форму сусіднього
  `rendererParam` (`typeof window … new URLSearchParams(window.location.search).get(…)`).
  Другий випадок — уже достатньо для одного `readParam(name)`.

## 5. Тести

### Позитив (щоб не загубилось)

`work/TDD.md` / Конституція «success **і** failure» виконано буквально: кожен новий `it`
названий `success:` / `failure:` і обидві половини присутні (`promoteMath.test.ts` — 133 нових
рядки, `createReactPromoteOverlay.test.ts` — 878). E2E покриває acceptance-рядки поіменно.

### Судження

- **Duplicated Code — п'ять паралельних фабрик фейкової діаграми.**
  `createReactPromoteOverlay.test.ts:11` уже має `makeDiagram(overrides: Partial<PromoteOverlayDiagram>)`
  — рівно ту точку розширення, яка тут потрібна. Нові describe-блоки її ігнорують і будують
  повну діаграму з нуля: `makeSceneDiagram():154`, `makeMovableDiagram():432`,
  `makeRowDiagram():539`, `makeCameraDiagram():737`, `makeChromeDiagram():931`. Плюс
  **`function mountEl()` продубльовано шість разів** (199, 319, 474, 588, 795, 968) однаковим
  тілом. §4 DRY: «одна правда знання».

- **`!` і подвійний `as` (§1b «Уникати `as` / `!` — assertion лише на межі з обґрунтуванням»).**
  `promoteMath.test.ts`: `const t = viewportCatchUpTransform(from, to)!;`
  `createReactPromoteOverlay.test.ts:610`:
  `(diagram.setPromotedNodeIds as ReturnType<typeof rstest.fn>).mock.calls.at(-1)?.[0] as string[]`
  — два приведення в одному виразі.

- **`viewportCatchUpTransform` повертає `ViewportTransform`, хоча це не в'юпорт, а дельта.**
  Тип абсолютної камери перевикористано для відносної корекції; тести це видно фіксують
  (`toEqual({ x: 0, y: 0, scale: 1 })` для «без змін» — камера зі scale 1 в origin означає
  зовсім інше). Mysterious Name на рівні типу.

- **`e2e/promote-near.spec.ts` — нові бридж-обгортки не в тому домі.** `e2e/demoBridge.ts:1`
  прямо заявляє себе як «Playwright wrappers — bridge methods must run inside the browser».
  Спека натомість тримає `setZoom` (рядки 24-32) і доступ до `setViewport` (рядки ~78-84)
  інлайном, кожен зі своїм ad-hoc `window as unknown as {...}` типом. Divergent Change:
  наступна спека, якій потрібен `setZoom`, скопіює його втретє.

- **Непослідовний fail-fast у сусідніх рядках тієї ж спеки.** `setZoom` кидає при відсутності
  методу (`throw new Error('__demoE2e.setZoom missing …')`), а пан — ні:
  ```ts
  bridge?.setViewport?.({ x: -20_000 });
  ```
  Якщо бридж не має `setViewport`, крок «відпанувати картки за екран» мовчки не станеться, і
  тест row 5 перевірятиме порожню зміну. §1 «Fail fast … не тихий wrong».

- **Магічне `waitForTimeout(400)` проти `settleMs = 150`.** Два незалежні числа в двох пакетах,
  зв'язані лише усно («past the overlay's settle debounce»). Зміна дефолту `settleMs` тихо
  зробить e2e флакі. (Сам `waitForTimeout` — усталений ідіом репо, `demo-audit.spec.ts` та ін.,
  тож у докір не ставлю; ставлю розв'язану пару констант.)

## 6. Документи (за змістом)

### Жорстке порушення

8. **Конституція `.claude/standards.md`: «Публічний API SDK (`docs/USAGE.md`) не змінюється
   мовчки: зміна сигнатури = зміна доку».** Диф додає в публічний surface
   (`packages/sdk/src/index.ts`) і **не документує в `docs/USAGE.md`**:
   - `ReactPromoteOverlay.setMaxPromoted` (`createReactPromoteOverlay.ts:115`) — новий метод
     публічного інтерфейсу, у USAGE.md його немає взагалі (`grep` порожній);
   - `nearVisibleGateOpen`, `pickNearestToCenter`, `viewportCatchUpTransform` — три нові
     експорти з `index.ts:119+`;
   - `type NodeWorldBox` (`render/index.ts`), `PromoteBox`.

   Секція «Режим `'near-visible'`» документує `shouldPromote`, `maxPromoted`, `settleMs`,
   `onSlotError`, `chrome` — тобто автор доку **знав** про зміну API і зупинився на половині.

### Судження

- `docs/USAGE.md`: «Картки піднімаються в HTML на LOD `near` (**зум ≥ 1.2**)» — код каже
  `lod === 'near'`, а поріг конфігурований (`viewState.lodThresholds`); та сама гілка в
  `e2e/promote-near.spec.ts:10-13` явно пише, що мокап-таби переозначують `midMax` на 0.5.
  Число 1.2 подане як правило, хоча це дефолт. Не брехня, але доку варто сказати «за дефолтних
  порогів».
- `work/reports/promote-near/report.md` §2.3/§2.4 — числа (`0.005–0.01` мс проти `2.1` мс,
  ≈9 fps) збігаються з тим, на що посилаються JSDoc'и в коді. Протиріч код↔звіт не знайшов.
- `work/tasks/T88…T92` — усі п'ять мають явний **Статус** і **Підставу** з посиланням, що
  прямо вимагає `.claude/standards.md` («у dg немає окремої теки „в роботі" — статус у
  T-файлі має бути явним»). Тут усе за мірником.
- `work/prompts/cloud-design-restyle.md` (+176) — тека `work/prompts/` не описана в таблиці
  «Артефакти» / «Життєвий цикл задачі» `.claude/standards.md`. До фічі `promote-near`
  відношення не має; шум у дифі, не порушення.

## 7. Окремо: чи `sync()` — це вже Long Function / Divergent Change?

**Так, за мірником цього репо — жорстке порушення, не судження.** Підстави, по порядку:

1. **Число.** `createReactPromoteOverlay.ts:329` — тіло `sync` **73 рядки**.
   `work/CODING_STANDARDS.md` §1: «Small functions — одна функція, одна дія; **ціль ≤ ~40
   рядків body**». Перевищення майже вдвічі. Це не той поріг, який можна списати на «~».
2. **Машина цього не ловить, і репо про це знає.** `.claude/standards.md`, «Чого гейти НЕ
   ловлять»: «З того, що лишилось на людині: **розмір функцій (`max-lines*` вимкнено)**».
   Тобто пункт свідомо делеговано рев'ю — мовчати про нього не можна.
3. **Кількість причин змінюватись.** Сім кроків, і кожен має **власне** джерело зміни:
   гейт по режиму (новий `PromoteMode`) → геометричний фільтр (правила видимості) → sticky
   focus (політика фокусу) → резолв кандидатів (контракт діаграми) → `shouldPromote` (host API)
   → стеля (політика cap) → `setPromotedNodeIds` + `root.render` (порядок side effects).
   §3 SOLID/S у формулюванні репо: «**один файл — одна причина змінюватись**»; тут одна
   *функція* має сім. Це Divergent Change у чистому вигляді.
4. **Ціна вже матеріалізувалась.** Найтонше рішення гілки — «ховати в Pixi **після** cap, а не
   до» — довелось пояснювати п'ятирядковим коментарем усередині `sync`, бо з коду порядок не
   читається. Коментар, що компенсує довжину функції, — це і є симптом.

**Що я НЕ ставлю в докір.** KISS з §0 виграє в SOLID «на ранньому етапі», і розбивати `sync`
на сім класів було б гірше. Мінімальний хід, який знімає і §1, і Divergent Change, — витягнути
три чисті кроки, які вже й так не мають side effects (`resolveIds(viewport, screen)`,
`buildSlots(ids, viewport, sticky)`, `applyCap(slots, sticky, screen)`), і лишити в `sync`
самі side effects: скидання transform, `setPromotedNodeIds`, `render`. Це ~20 рядків і одна
причина змінюватись — і рівно та межа, яку §1 називає «side effects лише на краю».

---

## Зведення

**Жорсткі порушення (документований стандарт) — 8:**

| # | Де | Правило |
|---|---|---|
| 1 | `createReactPromoteOverlay.ts:47-57` | §1 Comments — осиротілий JSDoc |
| 2 | `createReactPromoteOverlay.ts:329` (73 рядки) | §1 Small functions ≤ ~40 |
| 3 | `createReactPromoteOverlay.ts:15` | §1 Clean Code — `interface` між імпортами |
| 4 | `promoteMath.ts:132` ↔ `createReactPromoteOverlay.ts:206` | §4 DRY — політика cap двічі |
| 5 | `promoteTypes.ts:4-14` vs `OrgHierarchyDiagram.ts:1022` | коментар проти коду — world vs screen |
| 6 | `OrgHierarchyDiagram.ts:1011-1024`, `PixiHost.ts:176-191` | §1 Comments + §7 Boy Scout — втрачені доки `listPromoteCandidates` і `requestPaint` |
| 7 | `OrgHierarchyDiagram.ts:1025`, `createReactPromoteOverlay.ts:17` | §4 DRY — 3-тя і 4-та копії `NodeKind` |
| 8 | `docs/USAGE.md` | Конституція — `setMaxPromoted` + 3 експорти не задокументовані |

**Суджень (запахи):** ~14, найважчі — Divergent Change у `sync()`, Duplicated Code у демо-картці
й у тестових фабриках, Data Clumps `{width,height}`, Primitive Obsession на `entityType`.

**Що НЕ порушено:** TDD (success+failure скрізь, іменовано), Dependency Rule (нове знання про
геометрію не тягне Pixi в domain), відсутність `enum`/`any`, явні return types на публічних
експортах, статуси в T-задачах.
