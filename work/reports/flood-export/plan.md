# plan — `cell-flood` в експорті

**Дата:** 2026-08-26 · **Гілка:** `cursor/flood-export-svg` · **Спека:** [`spec.md`](./spec.md)
**Дерево:** окремий worktree `~/projects/dg-flood-export` — у `~/projects/dg` паралельно працює інша сесія.

## Розміщення (за `.claude/standards.md` §Розміщення)

| Що | Куди | Чому саме там |
|---|---|---|
| Вибір рушія для SVG + збір входів flood | `packages/sdk/src/export/svgExport.ts` | експорт — `packages/sdk`; геометрія не змінюється, змінюється **джерело** кілець |
| Діагностика «чим малювали й чому не тим» | `packages/sdk/src/export/exportDiagram.ts` | там уже живе `reportSvgEngineMismatch` |
| Нічого в `packages/core` | — | Rust не чіпаємо: flood уже вміє все потрібне |

## Reuse-first

**Переюзуємо (нового коду не пишемо):**

| Механізм | Файл | Роль у плані |
|---|---|---|
| `computeFloodContours` | `render/contour/floodContourEngine.ts` | сам flood, поблочно по org, з мапінгом кілець на бокси карток |
| `contourSceneInputs` | `render/contour/contourInputs.ts` | входи + `memberBoxesByDept`; **вже викликається в обох гілках** svgExport |
| `resolveContourWorldTransform` | `render/contour/contourWorldTransform.ts` | pitch/origin для cell-space → world |
| `ExportOptions.onDiagnostic` | `export/types.ts` | канал повідомлень назовні; всередину його ще треба прокинути (крок 1) |
| `corridorCellsForFlood`, `contourButtonGroupMargin` | `render/contour/` | склад `magnet` і `cards` — беруться дослівно як у `ContourPainter` |

**Нове (мінімум):**

1. `resolveExportContourRings(...)` у `svgExport.ts` — одна функція, що вирішує «flood чи
   button-group» і повертає кільця + діагностику. Обидві контурні гілки (staff, grid) кличуть її.
2. `CHANGELOG.md` у корені + версія `0.2.0` у `packages/sdk/package.json`.

**Чому наявне не підійшло:** нічого не переписуємо — `paintMagneticGroups` лишається дефолтом,
`computeFloodContours` уже інкапсулює поблочний прохід. Бракує рівно одного: **вибору** між ними
в експорті. Це не новий шар, це `if` у місці, де його забули.

## Кроки

1. **Канал діагностик наскрізь** (передумова кроків 2–3, без неї їм нізвідки брати дані):
   `SvgExportInput` отримує `onDiagnostic?: (m: string) => void`, `buildDiagramSvg` кличе його,
   `exportDiagram` прокидає туди `options.onDiagnostic`. Сьогодні `buildDiagramSvg` повертає лише
   `Promise<string>` — каналу немає взагалі.
2. **`resolveExportContourRings`** — одна функція, яка інкапсулює **і вибір рушія, і виклик
   малювальника, і фолбек**, і яку кличуть обидві контурні гілки; вона ж поглинає ~30 рядків,
   що зараз дубльовані між staff і grid (`personCounts`, `deptIds`, виклик painter'а, збірка `d`).
   Входи flood беруться **дослівно як у `ContourPainter.paint`**, інакше геометрія розійдеться
   з екраном навіть при успішному flood:
   - `magnet`: `paddingCells: 0`, `corridorCells: corridorCellsForFlood(config.corridorCells ?? DEFAULT_CORRIDOR_CELLS)`,
     `smoothIterations: 0`, `magnetRadius: resolveMagnetRadius(config.magnetRadius)`, `cellWidth/Height` з `config`;
   - `transform`: `resolveContourWorldTransform(canvas.positionNodes, positionById, config.cellWidth, config.cellHeight, pitchX, pitchY)`,
     де `pitchX = staffMerged.refCellWidth + staffMerged.horizontalGap` (і аналогічно Y) — **зі
     `staffMerged`, а не з `DEFAULT_STAFF_LAYOUT_OPTIONS`**, інакше кастомні gap'и хоста ламають збіг;
   - `cards`: `cardWidth/Height` — ті самі `staffMerged.nodeWidth/nodeHeight`, що годують
     `layoutStaffCanvas` (а **не** `PERSON_CARD_WIDTH` із grid-гілки), `insetX/Y = (config.cellWidth − cardWidth)/2`,
     `padding = contourButtonGroupMargin(config.paddingCells ?? 0, DEPT_STROKE_W)`;
   - `orgByPosition`, `memberBoxes`, `personCounts`, `minContourMembers` — з уже наявних у гілці значень.
3. **Grid-гілка**: при `'cell-flood'` шар відділів лишається **порожнім** + один рядок діагностики
   «flood потребує cell-transform, якого на сітці немає — так само й на канвасі».
   ⚠️ Це **уточнює рішення GATE 1 №3**: там було написано «лишається button-group», але перевірка
   коду показала, що канвас у цій сцені не малює button-group — він не малює **нічого**
   (`contourWorld` ставиться лише в `renderStaffCanvas`, `ContourPainter.loadFloodRings` без
   трансформи віддає порожньо + діагностику). Дзеркалити означає теж нічого не малювати.
4. **`exportDiagram`**: `reportSvgEngineMismatch` більше не спрацьовує від самого факту
   `cell-flood`; назовні йдуть **реальні** причини, які повернули кроки 2–3.
5. **Документи**: `docs/USAGE.md` §6/§10 — прибрати «SVG завжди button-group», описати поведінку
   й деградацію; `T80` — розділ «Експорт бачить лише button-group» переписати на фактичний стан;
   `work/CTO-RESEARCH.md` — ризик №1 закрити.
6. **Версія + CHANGELOG** (рішення GATE 1 №4).

### Семантика часткової відмови (BLOCKING від лінзи edge cases)

`computeFloodContours` ловить помилку **всередині** циклу по org-блоках, тож можливий стан
«кільця для блоку 1 є, блок 2 впав». Канвас у цьому разі малює те, що встигло, і **не підставляє**
button-group для блоку, що впав. Тому:

- **SVG дзеркалить канвас**: скільки блоків дав flood — стільки й у файлі; блок, що впав, лишається
  без контуру; причина йде в `onDiagnostic`.
- **Фолбеку на button-group немає взагалі.** Рішення продукту (2026-08-26): коли flood не дав
  нічого — шар відділів у SVG **порожній**, як і на екрані, а `onDiagnostic` каже чому.
  Підстановка іншого рушія показала б у файлі те, чого користувач не бачив, — саме та хвороба,
  яку ця тема лікує.
- **Правило одним рядком:** SVG **ніколи** не малює рушієм, якого не використав канвас.
- Порожні кільця з **порожніми** діагностиками — легітимний B3 (`minContourMembers` відсік усе):
  там немає ні заміни, ні повідомлення.

### Межі, які план свідомо не чіпає (plan-defense, 2026-08-26)

- **Невідоме значення `contourEngine`.** Вибір рушія в `resolveExportContourRings` — строга
  рівність `=== 'cell-flood'`, як у `ContourPainter.paint` (`ContourPainter.ts:304`). Будь-що
  інше (включно з рядком поза union) тихо йде в button-group без діагностики — так само, як на
  канвасі. Це усуває наявну асиметрію: сьогоднішній `reportSvgEngineMismatch` перевіряє
  `!== 'button-group'`, тож для такого значення вже зараз хибно репортував би flood-розходження,
  якого канвас не робив.
- **Валідність посилань** (`departmentId`, якого немає в `departments`; `subtreeRootId`, якого
  немає в `organizations`). Не чіпається цим планом: `contourDepartmentId` ніколи не звіряє
  `departmentId` з таблицею `departments` (це просто рядок-ключ угруповання), а
  `filterDiagramSubtree` на неіснуючий корінь уже сьогодні віддає порожні
  `positions`/`organizations` без падіння. Обидва рушії поводяться однаково — розходження між
  екраном і файлом не з'являється, тож новий код тут нічого не додає й не ламає.
- **WASM «підвис» (проміс ніколи не resolve).** Ні `computeFloodContours`, ні `ContourPainter` не
  мають timeout — обидва йдуть через прямий `contour/bridge.ts`, а не через
  `contour/worker-bridge.ts` (де `timeoutMs: 30_000` є, але тут не задіяний). Export успадковує
  цей самий ризик 1-в-1 із канвасом; додавання timeout — окрема тема (як і перф-бюджет вище), не
  цей план.
- **Гонка й повторний виклик.** `buildDiagramSvg`/`resolveExportContourRings` — чисті функції від
  знімку `ctx.data`/`ctx.renderConfig`, захопленого в локальні змінні на вході `exportDiagram`
  (не залежать від подальшої мутації чи знищення діаграми). `computeFloodContours` створює нову
  мапу кілець на кожен виклик — спільного мутабельного стану між паралельними `export()` немає,
  крім ідемпотентного `wasm`/`wasmPromise` у `bridge.ts` (memoization, безпечний під конкурентним
  `await` в однопотоковому JS). Два одночасні `export()`, export під час рендеру, знищення
  діаграми під час export — кожен виклик тримає власний знімок і не інтерферує з іншим.
- **Дублікати `gridCell`, максимум відділів, найглибше піддерево.** Властивість самого
  `computeFloodContours`/`contour.rs`, який план переюзує без змін — не тестується сьогодні ні на
  канвасі, ні в T80. За mirroring-принципом («SVG не малює тим, чим не малював canvas») будь-яка
  поведінка тут повторюється 1-в-1 у файлі; новим розходженням це не є, тож поза скоупом цього
  плану (кандидат в агенду для T80/`contour.rs`, не для цієї теми).

## Сайд-ефекти

- **Швидкість SVG-експорту** для `cell-flood`: додається WASM-прохід на кожен org-блок. Скільки
  це коштує — **не міряно** (ні тут, ні деінде: перф SDK не виміряний узагалі), тож числа не наводжу.
- **PNG/PDF** не зачіпаються (фреймбуфер).
- **`print()`** іде через ту саму гілку → отримує flood автоматично; окремих змін не треба.
- **A2 перевіряє фікстура H2, знята ДО зміни коду.** Наявні тести асертять підрядки
  (`contains path d=`), а не побайтову рівність, тож їхня зеленість A2 **не доводить**; знята після
  рефакторингу фікстура була б циркулярною.

## План міграції

Споживачів немає (git-залежність, хост ще не підключений), тож міграція — це кроки 5–6:
`CHANGELOG.md` фіксує зміну поведінки, `docs/USAGE.md` втрачає застереження. Хостам на дефолтному
рушії робити нічого — вихід не змінюється (A2/H2).

## Rollback

Одна точка відкату: `resolveExportContourRings` завжди повертає button-group — або revert коміту,
або `contourEngine:'button-group'` у конфізі хоста. Незворотного немає: даних не мігруємо, формат
файлу не чіпаємо.

## Конституція (`.claude/standards.md` §Конституція)

- [x] **Тести перед кодом** — кроки 1–4 мають failing-тест до реалізації (див. приймальні сценарії).
- [x] **KISS → SOLID → …** — один `if` у наявному місці, без нового шару; патерн не вигадується.
- [x] **GoF лише за ≥2–3 повтореннями** — не застосовуємо.
- [x] **Межа WASM ↔ TS** — контракт уже описаний (`FloodContourInput`); власник памʼяті не
      змінюється, кільця повертаються як plain-обʼєкти.
- [x] **Публічний API не змінюється мовчки** — крок 5 (USAGE) і крок 6 (CHANGELOG) у тому ж PR.
- [x] **Pocock — тільки TS** — уся зміна в TS.

## Приймальні сценарії

Три групи — happy path, межі, відмови. Результат кожного рядка сформульований так, щоб двоє
людей однаково сказали, збігся він чи ні.

| # | Сценарій | Передумова | Дія користувача | Очікуваний спостережуваний результат | Чим перевіряється |
|---|---|---|---|---|---|
| **H1** | Flood доїжджає до SVG | staff-сцена, `contourEngine:'cell-flood'` | `export({format:'svg'})` | у SVG рівно стільки `<path data-dept>`, скільки кілець дав `computeFloodContours` для цієї ж сцени, і кожен `d` побудований саме з них (точна рівність) | unit `packages/sdk/src/export/export.test.ts` |
| **H2** | Дефолт не змінився | та сама сцена, `contourEngine` не задано | `export({format:'svg'})` | рядок SVG **побайтово** дорівнює тому, що функція повертала до зміни (зафіксований у тесті) | unit `export.test.ts` |
| **H3** | Кнопка в демо | таб «Staff · Flood», `?e2e=1` | клік `#export-svg` | завантажений файл містить `<path data-dept` у кількості > 0, і статус показує `export` | e2e `e2e/integration-paths.spec.ts` |
| **B1** | Сцена без відділів | посади без `departmentId` | `export({format:'svg'})` | у SVG є `<g id="departments">` без жодного `<path data-dept>`; помилки немає | unit `export.test.ts` |
| **B2** | Один відділ, одна посада | 1 посада з `gridCell`, `minContourMembers:1`, `cell-flood` | `export({format:'svg'})` | рівно один `<path data-dept="…">` | unit `export.test.ts` |
| **B3** | `minContourMembers` відсікає | 1 посада у відділі, `minContourMembers:2`, `cell-flood` | `export({format:'svg'})` | жодного `<path data-dept>`; діагностики про заміну рушія **немає** (це не відмова, а налаштування) | unit `export.test.ts` |
| **B4** | Піддерево | `scope:'subtree'`, корінь із 1 з 3 відділів, `cell-flood` | `export({format:'svg', scope:'subtree', subtreeRootId})` | `data-dept` присутні **лише** для відділів піддерева | unit `export.test.ts` |
| **F1** | WASM недоступний | `cell-flood`, flood-лоадер кидає для **всіх** блоків | `export({format:'svg'})` | SVG повертається; `<g id="departments">` є, але **жодного** `<path data-dept>`; `onDiagnostic` отримав рівно одне повідомлення з причиною | unit `export.test.ts` |
| **F5** | Частковий flood | 2 org-блоки, другий кидає | `export({format:'svg'})` | у SVG лишаються контури блоків, що встигли; блоки **після** невдалого не рахуються (як і на канвасі — це та сама функція); `onDiagnostic` називає org-блок і причину | unit `export.test.ts` |
| **F2** | Сітка без staff-фокуса | сцена лише з `gridCell`, без `staffCurrentOrgId`, `cell-flood` | `export({format:'svg'})` | жодного `<path data-dept>` + одне повідомлення, що flood недоступний для сітки так само, як на канвасі | unit `export.test.ts` |
| **F3** | Зайвих попереджень немає | дефолтний рушій | `export({format:'svg'})` | `onDiagnostic` не викликано жодного разу | unit `export.test.ts` |
| **F4** | Порожній результат flood | `cell-flood`, 0 кілець **і** непорожні діагностики | `export({format:'svg'})` | шар відділів порожній + повідомлення з причиною; мовчки порожньо не буває | unit `export.test.ts` |
| **B5** | Піддерево без посад | `scope:'subtree'`, корінь без штату | `export({format:'svg', scope:'subtree'})` | малюється org-hierarchy-гілка; шару відділів немає, `contourEngine` не застосовується, `onDiagnostic` мовчить (це інша гілка рендера, а не відмова рушія) | unit `export.test.ts` |
| **M1** | Око: SVG проти екрана | таб «Staff · Flood» | експортувати SVG і відкрити поруч із канвасом | контури в файлі повторюють контури на екрані (та сама C-подібна форма навколо чужої картки) | **вручну** — 1 ручний рядок |

**Ручних рядків: 1** (M1). Решта 13 — автоматичні: 12 unit + 1 e2e. H4 (друк) прибрано як
тавтологію: `print()` буквально викликає `export({format:'svg'})`, тож рядок не міг би впасти
незалежно від H1.

> **Виправлено після рев'ю (2026-08-26).** Spec-вісь показала, що цей підрахунок був брехнею:
> F5 не мав тесту взагалі, хоча рахувався серед автоматичних, а діагностика не називала блок,
> як вимагає рядок. Тест написано (`partial flood keeps what worked`), діагностику виправлено
> (`floodContourEngine.ts` тепер друкує org-блок і причину). Пастка в самому тесті: міст кличе
> `computeAllContours` (camelCase) — підміна `compute_all_contours` мовчки не спрацьовувала, і
> тест «проходив», нічого не перевіряючи; спіймано перевіркою `expect(calls).toBeGreaterThan(1)`.

Кожен таск нижче посилається на номери рядків, які він закриває.

## Захист (plan-defense)

| # | Питання | Закрито рядком | Вердикт |
|---|---|---|---|
| 1 | Кривий інпут (посада без `gridCell`, `departmentId` не в `departments`, `contourEngine` невідоме, `subtreeRootId` немає) | `§Межі, які план свідомо не чіпає` п.1-2; `B1/B3` | закрито |
| 2 | Відмова залежності (WASM throw / hang, воркер недоступний) | `F1`/`F5` (throw); `§Межі, які план свідомо не чіпає` п.3 (hang — поза скоупом, бо канвас так само незахищений, той самий прямий `bridge.ts`) | закрито |
| 3 | Гонка й повторний виклик (два експорти, export під час рендеру, знищення діаграми) | `§Межі, які план свідомо не чіпає` п.4 (чисті функції від знімку + ідемпотентний WASM-лоадер + однопотоковий JS) | закрито |
| 4 | Порожні та граничні дані (0/1/макс. відділів, дублікати `gridCell`, найглибше піддерево) | `B1-B5`; `§Межі, які план свідомо не чіпає` п.5 (дублікати/макс/найглибше — поза скоупом, властивість `contour.rs`, не тестована ніде) | закрито |
| 5 | Rollback | `§Rollback` | закрито |

**Дірок: 0.** Гейт зелений.

Правки, внесені під час захисту (2026-08-26): додано підрозділ «Межі, які план свідомо не чіпає»
після «Семантики часткової відмови» — п'ять пунктів: точний критерій вибору рушія (`===
'cell-flood'`, виправляє асиметрію з наявним `reportSvgEngineMismatch`), валідність посилань
(не чіпається, успадкована поведінка), WASM hang (звужено як позаскоуповий, спільний із канвасом
ризик), обґрунтування безгонковості (чисті функції + ідемпотентний лоадер), і явне звуження
скоупу для дублікатів/максимумів/найглибшого піддерева (властивість `contour.rs`, не цього плану).
