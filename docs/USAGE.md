# Використання `@org-hierarchy/sdk`

Практичний гайд: як підключити, чим годувати, які ручки крутити й що воно поверне.
Це **не** специфікація (алгоритми — [`work/SPEC.md`](../work/SPEC.md)) і не вимоги
([`docs/REQUIREMENTS.md`](./REQUIREMENTS.md)). Тут — API, хелпери й приклади.

---

## 1. Що це і чого воно не робить

Embeddable browser SDK для організаційних і штатних діаграм: **host дає дані в пам'ять**,
SDK розкладає, малює на Pixi-канвасі й експортує.

Він **не** ходить у мережу, **не** знає вашого бекенду і **не** зберігає нічого сам.
Drag/expand повертаються вам через колбеки — записувати їх кудись ваша справа.

---

## 2. Встановлення й збірка

```bash
npm i @org-hierarchy/sdk
```

- `pixi.js` — рантайм-залежність SDK, ставиться автоматично.
- `react` / `react-dom` ≥ 18 — **optional peer**: потрібні лише для входу `@org-hierarchy/sdk/react`.
- Node ≥ 20.

**Розробка в цьому репо:** WASM-артефакт не лежить у git. Перед першим прогоном тестів або демо:

```bash
npm run build:wasm    # wasm-pack → packages/sdk/src/wasm/pkg (потрібен rustc ≥ 1.86)
```

Без нього contour-тести SDK не стартують ([TD05](../work/tech-debt/TD05-wasm-pkg-in-repo.md)).

Входи пакета: `.` (усе основне), `./react`, `./worker`, `./mappers`.

---

## 3. Мінімальний старт

```ts
import { OrgHierarchyDiagram, emptyDiagramData } from '@org-hierarchy/sdk';

const data = {
  ...emptyDiagramData(),
  organizations: [{ id: 'org1', name: 'Cedar Lake', groupIds: [] }],
  persons: [{ id: 'per1', fullName: 'Ada Byron' }],
  positions: [
    { id: 'pos1', organizationId: 'org1', title: 'Head', personId: 'per1', isHead: true },
    { id: 'pos2', organizationId: 'org1', title: 'Engineer' },       // вакансія: без personId
  ],
  reportLines: [{ fromId: 'pos1', toId: 'pos2', kind: 'admin' }],
};

const diagram = await OrgHierarchyDiagram.create(document.getElementById('canvas')!, {
  data,
  theme: 'auto',                 // 'light' | 'dark' | 'auto'
  staffCurrentOrgId: 'org1',     // без нього SDK вгадає головну org сам
});

// ...
diagram.destroy();               // обов'язково: звільняє Pixi, воркери й текстури
```

`emptyDiagramData()` дає всі обов'язкові порожні масиви — беріть його за основу, щоб не забути поле.

---

## 4. Дані

Канон — `DiagramData` у [`packages/sdk/src/data/types.ts`](../packages/sdk/src/data/types.ts):

| Поле | Що це |
|---|---|
| `organizations` | вузли орг-дерева (`parentOrgId`, `collapsed`, `groupIds`) |
| `groups` | підписи-групи над орг-картками |
| `departments` | відділи; саме за ними малюються контури |
| `persons` | люди (`fullName`, `photoUrl` / `media`) |
| `positions` | **посади** — головна сутність штатки |
| `reportLines` | звʼязки `admin` / `matrix` / `dotted` між посадами |
| `orgLinks` | звʼязки між організаціями (опційно) |

Три речі, на яких найчастіше спотикаються:

1. **Посада ≠ людина.** `DiagramPosition.personId` необовʼязковий: без нього це вакансія, і вона
   малюється інакше. Одна посада — одне призначення.
2. **`departmentId` необовʼязковий.** Посада без відділу вважається **чужою** для будь-якого
   контуру — вона не «порожнє місце», контур її обходить.
3. **Координати мають три способи** (`gridCell`, `layoutX`/`layoutY`, `layoutCoords`). Контури
   малюються **лише** для авторських `gridCell`; без них SDK скаже про це в діагностиці, а не
   намалює криве.

---

## 5. Мапери: ваші дані → `DiagramData`

Якщо у вас плаский список рядків — є готовий мапер:

```ts
import { OrgHierarchyDiagram, flatRowsToDiagram, type FlatDiagramRow } from '@org-hierarchy/sdk';

const rows: FlatDiagramRow[] = [
  { id: 'org1', kind: 'organization', label: 'Cedar Lake' },
  { id: 'pos1', kind: 'position', label: 'Head', organizationId: 'org1', personId: 'per1' },
  { id: 'per1', kind: 'person', label: 'Ada Byron' },
];

await OrgHierarchyDiagram.create(el, { data: rows, mappers: { toDiagram: flatRowsToDiagram } });
```

Свій мапер — той самий контракт:

```ts
const mappers = {
  toDiagram: async (raw: MyPayload) => toDiagramData(raw),   // обовʼязковий
  normalize: async (d) => d,                                  // опційний пост-крок
  append: async (chunk: MyChunk) => ({ positions: [...] }),   // для стрімінгу, див. §11
};
```

---

## 6. Конфігурація

Усе — другим аргументом `create()` (`OrgHierarchyConfig`):

| Ключ | Навіщо |
|---|---|
| `theme` | `'light' \| 'dark' \| 'auto'` |
| `styles` | часткове перевизначення `NodeTheme` (кольори, розміри карток, edge-стиль) |
| `render` | `RenderConfig`: `cellWidth/cellHeight`, `paddingCells`, `smoothIterations`, `magnetRadius`, `minContourMembers`, `corridorCells`, `departmentStyle`, **`contourEngine`**, `staffZoneChrome` |
| `staffLayout` | геометрія штатки: `nodeWidth/Height`, `refCellWidth/Height`, `horizontalGap`, `verticalGap`, `tierGap`, `margin`, `maxExpandedPositions` |
| `orgLayout` | геометрія орг-дерева + `orgEdgeStyle` |
| `staffCurrentOrgId` | яка org у центрі (ярус 2) |
| `useWorker`, `workerPoolSize`, `workerFactory` | воркери під contour/search/map |
| `lodThresholds` | межі far/mid/near |
| `renderer` | **`'auto'` (default) \| `'webgl'` \| `'canvas'`** — який рушій малює сцену (нижче) |
| `callbacks` | див. §9 |

### `renderer` — на чому малювати

Потрібне тим, хто ставить бібліотеку на машини **без GPU** (тонкі й нульові клієнти, RDP-сесії,
термінали). Там браузер віддає WebGL через програмну емуляцію, і важка сцена падає з ~120 до
одиниць кадрів на секунду; та сама сцена на Canvas2D лишається плавною. На машині з апаратним
GPU різниці між рушіями ми не виміряли.

| Значення | Що робить | Кому |
|---|---|---|
| `'auto'` (default) | пробує WebGL, потім Canvas2D, **і просить браузер відмовити** у WebGL, який довелося б емулювати | усім за замовчуванням |
| `'canvas'` | одразу Canvas2D, WebGL не пробується | **гарантія** для парку терміналів |
| `'webgl'` | прибиває WebGL; програмний контекст приймається | відтворити баг на конкретному рушії |

```ts
const diagram = await OrgHierarchyDiagram.create(el, { data, renderer: 'canvas' });
diagram.getRendererKind();   // 'webgl' | 'canvas' | null (null до монтування й після destroy)
```

🔴 **`'auto'` — best-effort, не обіцянка.** Рішення ухвалює браузер, і він непослідовний: той
самий Chromium відмовив у програмному WebGL на macOS (`--use-gl=swiftshader`) і **видав** його
в Linux-контейнері з тим же SwiftShader. Firefox без GPU відмовляє у WebGL узагалі — там фолбек
спрацьовує сам. Потрібна визначеність — ставте `'canvas'` явно.

⚠️ **`'webgl'` там, де WebGL недоступний, — це помилка, а не тихий фолбек.** `create()`
відхиляється з повідомленням, яке називає задане значення. Так і задумано: інакше значення не
годилося б для того єдиного, заради чого існує, — зафіксувати рушій.

⚠️ **Заблоковані драйвери теж поїдуть на канвас.** Якщо браузер вніс GPU у власний blacklist,
`'auto'` вважатиме WebGL непридатним. За нашими вимірами це не втрата швидкодії.

**`contourEngine`** — той самий контур двома різними геометріями:

- `'button-group'` (**default**) — TS: злиття сусідніх клітин відділу + AABB з виїмками під чужі картки;
- `'cell-flood'` — Rust flood поблочно (G1–G8).

**SVG малює тим самим рушієм, що й канвас.** PNG/PDF знімаються з живого канвасу, тож вірні за
будь-якого рушія. Якщо flood не може відпрацювати (немає авторських `gridCell`, WASM недоступний),
шар відділів у SVG лишається **порожнім — рівно як на екрані**, а причина йде в діагностику: SDK
ніколи не підставляє рушій, якого канвас не використав.

---

## 7. Два сімейства сцен

**Організації.** Усі `collapsed` → matrix (розріджена сітка). Хоч одна розгорнута → row-tree.
Перемикається саме даними, не прапорцем:

```ts
await diagram.expandOrg('org-5');     // розкриває і всіх предків
await diagram.collapseOrg('org-5');
await diagram.setOrgsCollapsed(['a', 'b'], true);   // масово, один рендер
await diagram.collapseAllOrgs();
diagram.getOrgMode();                 // 'matrix' | 'row-tree'
```

**Штатка — три яруси**: керуюча org → поточна (`staffCurrentOrgId`) → підлеглі картки.

```ts
await diagram.focusStaffOrg('org-42');        // drill: змінити ярус 2
await diagram.toggleStaffOrgExpand('org-7');  // розкрити картку ярусу 3 на місці
await diagram.togglePositionExpand('pos-9');  // піддерево посади
await diagram.expandToDepth({ depth: 2 });    // обходить maxExpandedPositions
await diagram.collapsePositionSubtree('pos-9');
```

---

## 8. Робота з вузлами

```ts
// пошук: підрядок по імені/посаді/назві org
const hits = await diagram.search('ada');     // SearchResult[] { node, label, score }

// фокус: розкрити шлях, вибрати, підвести камеру
await diagram.revealPath(hits[0].node.id);
await diagram.focusNode('pos-9');             // false, якщо id невідомий

// вибір
diagram.getSelection();                       // NodeRef | null
diagram.getSelections();                      // весь набір
await diagram.select({ kind: 'position', id: 'pos-9' });
await diagram.selectMany([...]);
await diagram.toggleSelection(ref);
await diagram.clearSelection();

// камера
diagram.fitView(48, { animate: true });
diagram.panTo(x, y);
diagram.zoomBy(1.25);
diagram.setZoom(1);
diagram.resetView();
diagram.getViewport();                        // { x, y, scale }
diagram.getLodLevel();                        // 'far' | 'mid' | 'near'
```

Жести на канвасі: `Ctrl`/`⌘` + колесо — зум, просто колесо — панорама, `Shift`/`⌘` + клік —
множинний вибір.

---

## 9. Колбеки

```ts
await OrgHierarchyDiagram.create(el, {
  data,
  callbacks: {
    onNodeClick: (node) => {},
    onNodeDoubleClick: (node) => {},
    onSelectionChange: (nodes) => {},
    onOrgModeChange: (mode) => {},              // 'matrix' | 'row-tree'
    onLayoutChange: (patch) => {},              // drag / reorder / expand — це ваш «зберегти»
    onPositionExpandChange: (state) => {},
    onDataMapped: ({ orgs, persons, positions, ms }) => {},
    onLayoutDiagnostics: (messages) => {},      // див. §12
    onViewportChange: (t, meta) => {},          // камера/ресайз — див. §11
    onContextMenu: (request) => request.items,  // повернути false → меню не показувати
    onContextMenuAction: (item, request) => {},
  },
});
```

`onLayoutChange` — єдиний канал персистентності. SDK нікуди не пише.

---

## 10. Експорт і друк

```ts
const svg  = await diagram.export({ format: 'svg', scope: 'full' });          // string
const png  = await diagram.export({ format: 'png', scale: 2 });               // Blob
const pdf  = await diagram.export({ format: 'pdf', scope: 'subtree', subtreeRootId: 'org-3' });
await diagram.print();                                                        // SVG → вікно друку
```

- `scope`: `'viewport' | 'full' | 'subtree'`.
- PNG/PDF беруться з Pixi-фреймбуфера → **потрібен змонтований канвас**; без нього кидається `ExportError`.
- SVG перебудовує шляхи заново, тож не залежить від того, що зараз у вʼюпорті.
- Чому картинка може виявитись не такою, як очікували, — через діагностику:

```ts
await diagram.export({ format: 'svg', onDiagnostic: (m) => console.warn(m) });
// без onDiagnostic те саме йде в console.warn — мовчки нічого не зникає
```

Сюди потрапляють лише **реальні** причини: сцена без cell-transform (сітка без staff-фокуса),
недоступний WASM, збій окремого org-блоку. Порожній шар через `minContourMembers` — не привід
для повідомлення: це налаштування, а не збій.

---

## 11. Великі дані

SDK адресує великі набори, але **не малює їх усі**. Робочий підхід — вікно:

```ts
// 1. початкові дані — лише те, що видно
const diagram = await OrgHierarchyDiagram.create(el, { data: firstWindow, workerPoolSize: 4 });

// 2. дозавантаження чанками; індекс пошуку доростає інкрементально
await diagram.appendData(nextChunk, { append: async (c) => mapChunk(c) });

// 3. повна заміна — коли вікно поїхало далеко
await diagram.setData(newWindow);
```

### Вікно, що їде за камерою

Щоб вікно рухалось саме, а не лише по явній дії, слухайте камеру:

```ts
callbacks: {
  onViewportChange(transform, { settled, reason }) {
    // Викликається не частіше разу на кадр, поки камера рухається, і ще раз —
    // з `settled: true` — коли вона зупинилась на `viewportSettleMs` (дефолт 150).
    if (!settled) return checkReserve(transform);   // запас закінчується?
    void diagram.setData(buildWindowAround(transform));
  },
}
```

`reason` розрізняє дві події, і це не косметика: `'resize'` приходить із **незміненою**
трансформою — змінилось лише те, скільки вміщається. Хост, який дивиться тільки на трансформу,
лишить голу смугу вздовж нового краю й ніколи її не заповнить.

- `appendData` дедуплікує за `id` (patch виграє) і **зливає** індекс пошуку замість перебудови;
  якщо чанк **оновлює** вже відому сутність — індекс перебудується, інакше лишився б дубль.
- `useWorker: true` (default у браузері) виносить contour і побудову індексу з main thread.
- `getWorkerPool()` віддає пул, якщо ви його замовили через `workerPoolSize`.
- Демо-таби `100k orgs` і `Staff · 1M` показують цю механіку разом із чесним підписом
  «вікно N з M».

---

## 12. Діагностика — SDK не мовчить

```ts
diagram.getLayoutDiagnostics();   // readonly string[] з останнього рендеру
```

Перший рядок списку — **рушій, який намалював сцену**: `Renderer: canvas (requested: auto)`.
Він присутній, доки діаграма змонтована (до `destroy()`), тож у цьому вікні список не буває
порожнім. Якщо ви показуєте діагностику як попередження, фільтруйте його за префіксом
`'Renderer: '` — префікс стабільний і є частиною контракту.
Це відповідь на «чому в мене картинка інша, ніж у колеги» без профайлера. Якщо хост передав
значення `renderer`, якого ми не знаємо, поруч буде рядок про те, що застосовано замість нього.

Далі — все, що інакше виглядало б як «нічого не намалювалось»: посади без `gridCell`
у blob-режимі, flood без cell-transform, пропущені expand'и. Те саме прилітає в
`onLayoutDiagnostics` після кожного рендеру — виводьте його хоч у консоль, це найдешевший спосіб
зрозуміти порожній екран.

---

## 13. React-хелпери (опційно)

```ts
import {
  createReactContextMenuHost, DefaultReactContextMenu,
  createReactPromoteOverlay, DefaultPromoteCard,
  createTestAnchorOverlay,
} from '@org-hierarchy/sdk/react';

const menu = createReactContextMenuHost({ diagram, mount: el, component: DefaultReactContextMenu });
const promote = createReactPromoteOverlay({ diagram, mount: el, mode: 'near-selection', component: DefaultPromoteCard });
const anchors = createTestAnchorOverlay({ diagram, mount: el, interactive: true });  // DOM-якорі для e2e

menu.close(); promote.dispose(); anchors.dispose();
```

Ядро працює без React — це надбудова, а не залежність.

⚠️ Promote-оверлей — це HTML **над** канвасом: у SVG/PNG/PDF він не потрапляє — **це стосується
й режиму `near-visible`**: піднята оболонка в растр не йде, у експорт потрапляє канвасна картка.

### Режим `'near-visible'` — підняти всі видимі картки

```ts
const promote = createReactPromoteOverlay({
  diagram,
  mount: el,
  mode: 'near-visible',
  component: MyCard,
  shouldPromote: (node) => node.ref.kind === 'position',  // необов'язково
  maxPromoted: 40,                                        // необов'язково
  settleMs: 150,                                          // необов'язково
  onSlotError: (id, err) => console.warn('картка впала', id, err),
});
```

**Межа — зум, а не кількість.** Картки піднімаються в HTML на LOD `near` (зум ≥ 1.2) і на
жодному іншому. Це навмисно **не** обмеження «не більше N карток»: на більшому екрані на тому
самому зумі їх видно більше, і це очікувана поведінка. Дефолт — **без стелі**.

| Опція | Дефолт | Що робить |
|---|---|---|
| `shouldPromote(node)` | усі кандидати | хост виключає ноду з підйому. Нода, для якої `false`, лишається **намальованою на канвасі** — порожньої оболонки в DOM не з'являється |
| `maxPromoted` | без стелі | стеля кількості; лишаються найближчі до **центру екрана** |
| `settleMs` | `150` | скільки камера має стояти, перш ніж позиції перерахуються. Під час руху шар їде **одним CSS-трансформом**, картки не перераховуються |
| `onSlotError(id, err)` | — | компонент картки кинув. Картку знято, нода **повернулась на канвас**; вона більше не піднімається до кінця життя оверлея |

**Позадіапазонний `maxPromoted`.** `0` — не піднімається жодна нода (усі лишаються канвасними).
Не скінченне число або від'ємне — **стеля знімається**, тобто поведінка дефолту. Дробове
округлюється вниз. Помилки хост не отримає: порожній шар важче діагностувати, ніж робочу фічу.

**Картка з фокусом не депромоутиться.** Якщо всередині піднятої картки стоїть фокус (інпут,
відкрите меню), вона лишається в DOM, навіть коли виїхала за екран, — інакше зникали б фокус
і незбережений ввід. Вона займає одне з місць `maxPromoted`, а не додаткове.

**Що діаграма віддає оверлею** (знадобиться, якщо пишете власний шар замість нашого):
`diagram.listPromoteBoxes()` — геометрія нод **без** резолву даних; `listPromoteCandidates(ids)` —
дані лише для названих; `getPromoteChrome(kind)` — рамка ноди у **світових** одиницях;
`getScreenSize()` — розмір поверхні з `ResizeObserver` діаграми (не читайте `clientWidth` на
кадрі); `getPromotedNodeIds()` — що зараз **не малює** Pixi.

**Слот несе геометрію ноди, яку заміщає** — `chrome.borderRadius`, `chrome.borderWidth`,
`chrome.paddingX/Y` (відступи є в організацій, у посад немає). Значення в **екранних** px,
уже помножені на поточний зум, тож картка збігається з канвасною на будь-якому масштабі.

**Змінити стелю в рантаймі** — `promote.setMaxPromoted(n)`; `undefined` знімає її.

**Один оверлей на діаграму.** Два `createReactPromoteOverlay` на одній діаграмі не
підтримуються: вони поділяють `setPromotedNodeIds`, і другий перезапише перший.

⚠️ **Зняття режиму помилки не дає.** Повернувши `mode` на `'near-selection'`, ви **не**
отримаєте попередження — поведінка тихо повернеться до підйому **виділеної** ноди. Якщо після
зміни режиму на екрані одна картка замість багатьох, це не збій.

---

## 14. Обмеження, про які краще знати заздалегідь

- **Кілька діаграм на сторінці — можна.** Кожна тримає власні воркери (пошук, пул) і звільняє їх
  на `destroy()`. Глобальні `configureContourWorker` / `configureSearchWorker` лишились для хостів,
  які кличуть модульні функції напряму, — але вони **процес-широкі**: якщо потрібна ізоляція,
  беріть `createContourWorkerClient()` / `createSearchWorkerClient()`.
- **Після `destroy()` діаграма мовчить**: `search()` повертає `[]`, повторний `destroy()` безпечний.
- **Немає HTTP-клієнта, персистентності й undo.**
- **Порожній шар відділів — можливий стан**, а не помилка: якщо flood не відпрацював, SVG
  повторює екран, включно з відсутністю контурів (§6, §10).
- **Promote-оверлей поза експортом** (§13).
- **Мільйон посад — це адресний простір, а не намальована сцена**: вікно матеріалізується, решта
  живе як індекс.
- **Рушій не змінюється після монтування.** Щоб перемкнути `renderer`, потрібне перемонтування —
  і, якщо на сторінці вже монтувалась діаграма з іншим значенням, **перезавантаження сторінки**:
  Pixi кешує вердикт «чи є придатний WebGL» на весь час життя сторінки, і кеш не зважає на те,
  що наступна діаграма просила інше.
- **Дві діаграми з різними `renderer`, змонтовані одночасно**, дають недетермінований результат
  для тієї, що на `'auto'`: вердикт диктує та, що першою дійшла до ініціалізації рушія, а не та,
  яку першою покликали. Монтуйте послідовно, якщо це важливо. `'canvas'` від цього не залежить —
  він WebGL не питає взагалі.

---

## 15. Куди далі

| Питання | Файл |
|---|---|
| Алгоритми, G-правила, псевдокод | [`work/SPEC.md`](../work/SPEC.md) |
| Вимоги й фази | [`docs/REQUIREMENTS.md`](./REQUIREMENTS.md) |
| Стек | [`docs/TECH_STACK.md`](./TECH_STACK.md) |
| Словник термінів | [`CONTEXT.md`](../CONTEXT.md) |
| Стан коду перед імплементацією | [`work/CTO-RESEARCH.md`](../work/CTO-RESEARCH.md) |
| Живі приклади всіх режимів | `packages/demo` (13 табів) |
