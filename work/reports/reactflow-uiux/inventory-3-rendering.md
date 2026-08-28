# React Flow — інвентаризація, ділянка 3: рендер, вміст, оформлення

**Джерело:** клон `xyflow` @ `b1b99e9` — `@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`.
Шляхи `packages/react/...` та `packages/system/...` — відносно кореня клону.
Шляхи `packages/sdk/...` — це наш репозиторій `/Users/strelia/projects/dg`.

**Наскрізна відмінність.** У них **усе** — DOM/SVG: нода — `<div>` з `transform: translate()`,
ребро — `<svg><g><path>`, мітка — окремий портал у DOM. У нас масову сцену малює **Pixi**
(`packages/sdk/src/render/LayerManager.ts:7`), а DOM-картки з'являються тільки на близькому
зумі через промоут-оверлей (`packages/sdk/src/react/createReactPromoteOverlay.ts:205`).
Тому:

- **переноситься:** формули маршрутизації й геометрії (`getSmoothStepPath`, `getBezierPath`,
  `getHandlePosition`), модель «порт = точка на межі боксу», модель z-порядку, контр-масштаб;
- **не переноситься:** усе, що зроблено CSS/SVG-механізмами — анімоване ребро через
  `stroke-dasharray` + `@keyframes`, `interactionWidth` як другий невидимий `<path>`,
  CSS-змінні теми, `<marker>` у `<defs>`.

Межі з іншими ділянками позначені явно (ділянка 1 — взаємодія/редагування, ділянка 2 —
в'юпорт/навігація, ділянка 4 — дані/стан/інтеграція).

---

## 1. Таблиця-зведення

| # | Пункт | React Flow (де) | У нас | Вердикт |
|---|---|---|---|---|
| 1 | `nodeTypes` — реєстр типів нод | `components/NodeWrapper/index.tsx:55` + `utils.tsx:16` | немає реєстру; `DiagramRenderer` жорстко знає `PersonNodeView` / `OrganizationNodeView` | **немає, і треба** (частково) — див. §3.1 |
| 2 | `NodeProps` (усі поля) | `system/src/types/nodes.ts:114` | `PersonNodeView.create(person, position, style, lod, options)` (`render/PersonNode.ts:213`) | **є еквівалент**, вужчий |
| 3 | `width`/`height` vs `measured` | `system/src/utils/general.ts:351`, `store.ts:401` | розмір фіксований у стилі (`render/types.ts:261`), вимірювання немає | **немає, і не треба** — §3.3 |
| 4 | `hidden` | `NodeWrapper/index.tsx:83` (`return null`) | `SceneRegistry.applyPromoteVisibility` → `view.visible` (`render/SceneRegistry.ts:120`) | **є**, інша семантика |
| 5 | `zIndex`, `elevateNodesOnSelect` | `system/src/utils/store.ts:33,268`, `types/component-props.ts:615` | шари `LayerManager` + `sortableChildren` на карті (`PersonNode.ts:165`) | **є частково** — §3.9 |
| 6 | `selectable/focusable/draggable/deletable/connectable` | `NodeWrapper/index.tsx:64-67` | межа з ділянкою 1 | — |
| 7 | `style` / `className` на ноді | `NodeWrapper/index.tsx:203-210` | `NodeTheme` глобально, per-node стилю немає (`render/types.ts:185`) | **немає, і треба** — §3.4 |
| 8 | `edgeTypes` + 5 вбудованих | `EdgeWrapper/utils.ts:10` | `StaffEdgesView` / `OrgEdgesView`, тип = `kind` ребра (`render/StaffEdgesView.ts:18`) | **є еквівалент**, менш гнучкий |
| 9 | `getBezierPath` | `system/src/utils/edges/bezier-edge.ts:121` | немає безьє взагалі | **немає, і треба (опційно)** — §4.1 |
| 10 | `getSmoothStepPath` | `system/src/utils/edges/smoothstep-edge.ts:266` | свій ортороутер `layout/staffEdgeGeometry.ts:68` | **є своє**, слабше — §4.2 |
| 11 | `getStraightPath` | `.../straight-edge.ts:43` | тривіально, є де-факто | **є** |
| 12 | `getSimpleBezierPath` | `react/src/components/Edges/SimpleBezierEdge.tsx:47` | немає | **немає, і не треба** |
| 13 | `MarkerType` / `markerStart` / `markerEnd` | `system/src/utils/marker.ts:3`, `EdgeRenderer/MarkerSymbols.tsx:8` | `arrowHeadTriangle` (`render/staffEdgeArrows.ts:4`) + `drawEdgeEndDots:86` | **є**, простіше й дешевше |
| 14 | `<BaseEdge />` | `components/Edges/BaseEdge.tsx:34` | немає спільного примітива | **немає, і не треба** |
| 15 | `interactionWidth` | `BaseEdge.tsx:50` | ребра `eventMode='none'` (`LayerManager.ts:30`) — не клікабельні | **немає; треба, якщо ребра стануть клікабельними** |
| 16 | Мітки на ребрах + `<EdgeLabelRenderer />` | `Edges/EdgeText.tsx:7`, `EdgeLabelRenderer/index.tsx:54` | немає міток на ребрах | **немає, і треба (опційно)** — §3.7 |
| 17 | `pathOptions` | `types/edges.ts:82-95`, `system/src/types/edges.ts:45` | `EdgeStyle.cornerRadius` (`render/types.ts:172`) | **є, вужче** |
| 18 | `<NodeToolbar />` + контр-масштаб | `NodeToolbar.tsx:76`, `system/src/utils/node-toolbar.ts:3` | промоут-оверлей масштабує картку разом зі сценою (`promoteMath.ts:50`) | **головна прогалина** — §5 |
| 19 | `<Handle />` | `components/Handle/index.tsx:88` | портів як сутностей немає; порт = точка на межі AABB | **немає, і не треба** (для org-діаграми) |
| 20 | CSS-змінні, теми, `colorMode` | `system/src/styles/init.css:1`, `hooks/useColorModeClass.ts:18` | `resolveTheme` + числові палітри (`render/theme.ts:11`, `render/types.ts:294`) | **є еквівалент**, менш «хостовий» |
| 21 | `defaultEdgeOptions` | `types/component-props.ts:100`, `EdgeWrapper/index.tsx:41` | `NodeTheme.edge` (`render/types.ts:194`) | **є** |
| 22 | `edge.animated` (CSS dashdraw) | `system/src/styles/init.css:134,333` | немає | **немає, і не переноситься** — §3.8 |
| 23 | Порядок відмальовки / шари | `container/GraphView/index.tsx:157-201`, `init.css:69-98` | `LayerManager.ts:20` | **є**, у нас чіткіше |
| 24 | `<ViewportPortal />` | `components/ViewportPortal/index.tsx:34` | немає точки вставки в світових координатах | **немає, і треба** — §3.10 |
| 25 | Нода до першого виміру | `NodeWrapper/index.tsx:207` `visibility: hidden` | у нас такої фази немає | **немає, і не треба** |
| 26 | Зображення/медіа в ноді | звичайний `<img>`, RO переміряє ноду | `media/nodeMedia.ts:152` + маска (`PersonNode.ts:607`) | **у нас сильніше** — §3.11 |
| 27 | Кулінг (`onlyRenderVisibleElements`) | `hooks/useVisibleNodeIds.ts:8`, `useVisibleEdgeIds.ts:15` | немає кулінгу на рівні Pixi | **немає, і треба** — §3.12 |

---

## 2. Як влаштована сцена в них (щоб решта читалася)

Порядок DOM усередині `.react-flow__viewport` (`container/GraphView/index.tsx:157-201`):

```
<Viewport>                      ← один transform: translate(x,y) scale(z)
  <EdgeRenderer/>               ← div.react-flow__edges, всередині <svg> на кожне ребро
  <ConnectionLineWrapper/>
  <div.react-flow__edgelabel-renderer/>   ← ціль порталу EdgeLabelRenderer
  <NodeRenderer/>               ← div.react-flow__nodes, всередині div на кожну ноду
  <div.react-flow__viewport-portal/>      ← ціль порталу ViewportPortal
</Viewport>
```

Наслідки, які варто тримати в голові:

- **ребра завжди під нодами** (порядок DOM), а `zIndex` ребра ставиться на `<svg>`-обгортку
  кожного ребра (`components/EdgeWrapper/index.tsx:184`) — тобто **один `<svg>` на ребро**,
  не один спільний. Це головна причина, чому React Flow «сідає» на тисячах ребер.
- `.react-flow__viewport` має `pointer-events: none` (`system/src/styles/init.css:89`), а нода
  вмикає їх назад лише коли вона інтерактивна (`NodeWrapper/index.tsx:206`).
- трансформ в'юпорта пишеться **напряму в DOM**, поза React (`container/Viewport/index.tsx:21-47`) —
  свіжа оптимізація 12.11 (межа з ділянкою 2).

---

## 3. Детальний розбір

### 3.1 `nodeTypes` — реєстр кастомних нод

**Що це.** Мапа `type → React-компонент`. Вибір типу:
`components/NodeWrapper/index.tsx:55-62` — `node.type || 'default'`, потім
`nodeTypes?.[type] ?? builtinNodeTypes[type]`; якщо нема — помилка `003` і **фолбек на
`default`**, тобто нода не зникає.
Вбудовані: `input | default | output | group` (`components/NodeWrapper/utils.tsx:16`).

**Неочевидна вартість.** `nodeTypes` **має бути стабільним об'єктом** — інакше кожен рендер
створює новий тип компонента і React перемонтовує всі ноди (втрата стану, фокусу, ререндер
ResizeObserver). Вони навіть тримають окремий ворнінг на це:
`container/GraphView/useNodeOrEdgeTypesWarning.ts`.

**У нас.** Реєстру немає: `DiagramRenderer` сам вирішує, що створити —
`PersonNodeView.create(...)` (`packages/sdk/src/render/DiagramRenderer.ts:669`) або
`OrganizationNodeView`. Варіант картки задається **через стиль**, а не через тип:
`PersonNodeStyle.personLayout: 'auto' | 'figma-row' | 'gojs-row' | 'gojs-portrait'`
(`packages/sdk/src/render/types.ts:107`, резолвиться в `render/personLayout.ts`).

**Вердикт: немає, і частково треба.** Не React-компоненти, а **точка розширення**: хост має
могти дати свій `PersonNodeView`-подібний клас (або фабрику `kind → view`) без форку SDK.
Зараз кожен новий макет картки — це ще одне значення в `personLayout` і ще одна гілка в
`personCardContent.ts`. Це вже 4 гілки; п'ята буде дорожчою за реєстр.

### 3.2 `NodeProps` — що саме отримує кастомна нода

Повний список (`system/src/types/nodes.ts:114-125`):

| Поле | Тип | Звідки |
|---|---|---|
| `id` | `string` | — |
| `data` | `NodeData` | користувацький об'єкт |
| `type` | `string` (Required) | вже нормалізований (фолбек `default`) |
| `width`, `height` | `number \| undefined` | `getNodeDimensions(node)` — `NodeWrapper/index.tsx:246` |
| `sourcePosition`, `targetPosition` | `Position` | |
| `dragHandle` | `string` | CSS-селектор ручки перетягування |
| `parentId` | `string` | суб-флоу |
| `selected`, `dragging`, `draggable`, `selectable`, `deletable`, `zIndex` | Required | обчислені прапорці |
| `isConnectable` | `boolean` | `nodesConnectable && node.connectable` |
| `positionAbsoluteX/Y` | `number` | `internals.positionAbsolute` |

Ключове: **у `NodeProps` немає `position`, `hidden`, `style`, `className`, `measured`** — усе
це споживає обгортка, а не сама нода. Тобто «кастомна нода» в React Flow малює **тільки вміст**;
рамку, позицію, z-index, курсор, aria — робить `NodeWrapper`.

**У нас** розділення таке саме за духом: `PersonNodeView` малює вміст картки, а позицію
в світі ставить `DiagramRenderer` (через `view.position.set`), бокс запам'ятовується в
`SceneRegistry`. Різниця — прапорців інтерактивності на ноду в нас немає (межа з ділянкою 1).

### 3.3 Вимірювання розміру: `width`/`height` vs `measured`

Це найбільш «DOM-ний» шматок React Flow, і саме тому найцінніший як контраст.

**Ланцюжок.**
1. `NodeRenderer` створює **один спільний** `ResizeObserver` на весь флоу
   (`container/NodeRenderer/useResizeObserver.ts:9-29`) — не по одному на ноду.
2. Кожна нода підписується на нього в `useNodeObserver`
   (`components/NodeWrapper/useNodeObserver.ts:31-39`); підписка знімається, щойно нода
   «ініціалізована» (`hasDimensions && handleBounds`) — тобто RO тримає тільки невиміряні ноди.
3. Спрацювання RO → `updateNodeInternals` (`system/src/utils/store.ts:401`):
   - зум читається з CSS-матриці в'юпорта: `new DOMMatrixReadOnly(style.transform).m22`
     (`store.ts:418-419`) — **читання computed style на кожен батч вимірювань**;
   - розмір: `node.offsetWidth/offsetHeight` (`system/src/utils/dom.ts:30`) — цілі пікселі,
     без урахування зуму;
   - `getBoundingClientRect()` на ноді (`store.ts:450`) — для перерахунку хендлів;
   - хендли: `querySelectorAll('.source'/'.target')` + `getBoundingClientRect()` кожного,
     поділені на зум (`system/src/utils/dom.ts:68-93`).

**Пріоритет розмірів** (`system/src/utils/general.ts:351`):
`measured.width ?? width ?? initialWidth ?? 0`. Тобто заданий користувачем `width` **не
перекриває** виміряний — він лише фолбек, поки виміру нема. А в інлайн-стилі
(`components/NodeWrapper/utils.tsx:23-39`) до першого виміру ще дозволено
`style.width`, після — вже ні.

**Неочевидна вартість (три штуки):**
- `offsetWidth` + `getBoundingClientRect()` на кожну ноду й кожен хендл — це **форс-лейаут**.
  На додаванні 500 нод одразу це помітно.
- `DOMMatrixReadOnly(getComputedStyle(...).transform)` — ще один синхронний read у тій самій
  точці.
- Виміри йдуть у **цілих пікселях** (`offsetWidth`), а хендли — у дробових (`getBoundingClientRect`),
  поділених на зум. На нецілому зумі це дає дрейф до ~0.5px між кінцем ребра й краєм ноди.

**У нас.** Вимірювання **немає взагалі**: розмір картки заданий у стилі —
`PERSON_CARD_WIDTH = 136`, `PERSON_CARD_HEIGHT = 156` (`packages/sdk/src/render/types.ts:261-262`),
`OrganizationNodeStyle.width/height = 200/64` (`render/types.ts:323-330`). Лейаут іде від
клітинки сітки `GRID_CELL_WIDTH/HEIGHT = 140/160` (`render/types.ts:263-264`).
Текст не міряється, а **обрізається за евристикою символів**:
`truncatePixiText` — `maxChars = maxWidth / (fontSize * 0.58)`
(`packages/sdk/src/render/personCardContent.ts:76-83`), і те саме з коефіцієнтом `0.55` в
`OrganizationNode.ts:611` та `estimateTextWidth` (`render/orgCardChrome.ts:28`).

**Вердикт: немає, і не треба.** Фіксований бокс — це те, на чому тримається вся наша
геометрія: контури (`render/contour/`), сітка драгу, порти ребер. Вимірювання зруйнувало б
детермінізм лейауту. Але одну річ звідти варто взяти: **Pixi `Text` знає свою реальну ширину**
(`label.width`), і три різні магічні коефіцієнти (`0.55`, `0.58`, `0.55`) — це борг, який
одного дня дасть різне обрізання на різних шрифтах. Заміна на `label.width` локальна й безпечна.

### 3.4 `style` / `className` на ноді

`NodeWrapper/index.tsx:203-210` зливає в один інлайн-стиль:
`zIndex` → `transform` → `pointerEvents` → `visibility` → **`...node.style`** → `...inlineDimensions`.
Тобто `node.style` **перекриває** `transform` і `zIndex`, якщо їх туди покласти — це задокументована
пастка. `className` конкатенується з системними класами через `classcat`
(`NodeWrapper/index.tsx:186-201`), плюс є `domAttributes` як escape hatch (`:226`).

**У нас.** Стиль — **глобальний на діаграму**: `NodeTheme` (`packages/sdk/src/render/types.ts:185`),
резолвиться раз через `resolveNodeTheme` (`render/theme.ts:24`). Per-node оверрайду немає —
єдина «умовна» варіативність зашита в код: `temporaryNameColor` / `permanentNameColor`
(`render/types.ts:71-73`), `detachedBorderColor` (`:87`), `backgroundAlpha: 0` для chrome-less
Figma-місця (`:95`).

**Вердикт: немає, і треба.** Не CSS, а **per-node style delta**: щось на кшталт
`DiagramPosition.styleOverride?: Partial<PersonNodeStyle>`, яку `PersonNodeView.create`
мержить поверх теми. Зараз кожен новий візуальний стан («ця посада — червона») означає нове
поле в `PersonNodeStyle` + нову гілку в `personCardContent.ts`. Це той самий борг, що й §3.1,
з іншого боку.

### 3.5 `edgeTypes` і вбудовані типи ребер

Реєстр — `components/EdgeWrapper/utils.ts:10-16`:

| `type` | Компонент | Функція геометрії |
|---|---|---|
| `default` | `BezierEdgeInternal` | `getBezierPath` |
| `straight` | `StraightEdgeInternal` | `getStraightPath` |
| `step` | `StepEdgeInternal` | `getSmoothStepPath` з `borderRadius: 0` (`Edges/StepEdge.tsx:15-18`) |
| `smoothstep` | `SmoothStepEdgeInternal` | `getSmoothStepPath` |
| `simplebezier` | `SimpleBezierEdgeInternal` | `getSimpleBezierPath` |

`step` — це буквально `smoothstep` з нульовим радіусом. Усі п'ять — тонкі обгортки над
`<BaseEdge>`; уся змістовна робота в чистих функціях у `@xyflow/system`.

**`EdgeProps`** (`react/src/types/edges.ts:151-165`): `id, type, animated, data, style, selected,
source, target, selectable, deletable` + **`EdgePosition`** (`sourceX/Y`, `targetX/Y`,
`sourcePosition`, `targetPosition` — `system/src/types/edges.ts:122`) + мітки + `sourceHandleId`,
`targetHandleId`, `markerStart`, `markerEnd`, `pathOptions` (типізований як `any` — вони самі
позначили це `@TODO`), `interactionWidth`.

Ключове: **кастомне ребро отримує вже пораховані координати кінців**, а не ноди. Геометрію
кінців рахує стор (`components/EdgeWrapper/index.tsx:81-89` → `getEdgePosition`), а форму
шляху — компонент ребра. Це чистий шов, і саме він у нас відтворений найгірше (див. §4.2).

**У нас.** Тип ребра = `StaffEdgeLink['kind']: 'admin' | 'matrix' | 'dotted' | 'cross-tier'`
(`packages/sdk/src/layout/staffEdgeGeometry.ts:48`), і він обирає **тільки штрих**, не форму:
таблиці `STROKE_LIGHT` / `STROKE_DARK` (`render/StaffEdgesView.ts:18-30`). Форма завжди одна —
ортогональна ламана з роутера. Org-ребра йдуть іншим шляхом: Rust-лейаут повертає SVG-`d`,
який ми парсимо (`render/svgPath.ts:7`) і малюємо (`render/OrgEdgesView.ts:27`).

**Вердикт: є еквівалент, менш гнучкий.** Розділення «стор рахує кінці — рендер малює форму»
у нас злите: `buildStaffEdgeSegments` віддає одразу повну ламану.

### 3.6 Маркери стрілок

**Механіка.** Маркери — це SVG `<marker>` у спільному `<defs>`
(`container/EdgeRenderer/MarkerDefinitions.tsx:50-88`), а ребро посилається на них через
`markerEnd="url('#id')"` (`components/EdgeWrapper/index.tsx:110-118`).

- **Дедуплікація за значенням**: `getMarkerId` серіалізує весь об'єкт маркера у відсортований
  рядок `color=...&height=...&type=...` (`system/src/utils/marker.ts:3-18`) — два ребра з
  однаковим маркером ділять один `<marker>`.
- **Префікс `rfId`** — щоб два флоу на сторінці не крали один в одного `<defs>`
  (коментар `MarkerDefinitions.tsx:45-49`; реальний баг: сховали перший флоу — у другого
  зникли стрілки).
- Геометрія стрілки: `viewBox="-10 -10 20 20"`, `refX/refY = 0`,
  `orient="auto-start-reverse"`, `markerUnits="strokeWidth"` (`MarkerDefinitions.tsx:29-39`);
  сама фігура — `polyline points="-5,-4 0,0 -5,4"` для `arrow` і та сама з замиканням +
  заливкою для `arrowclosed` (`MarkerSymbols.tsx:8-41`).
- Дефолтний розмір `12.5 × 12.5` в одиницях `strokeWidth` — тобто **стрілка росте разом з
  товщиною лінії**, що регулярно дивує.

**Неочевидна вартість.** `MarkerDefinitions` підписаний на **`s.edges` цілком**
(`MarkerDefinitions.tsx:51`) — будь-яка зміна масиву ребер переганяє `createMarkerIds` по
всіх ребрах. На великих графах з динамічними ребрами це помітний хвіст.

**У нас.** Стрілка малюється як **заповнений трикутник у Graphics**:
`arrowHeadTriangle(from, to, size=7)` (`packages/sdk/src/render/staffEdgeArrows.ts:4-25`) —
tip у кінцевій точці, база на `size` назад по напрямку, півширина `size * 0.45`.
Плюс `shortenPolylineForArrow` (`staffEdgeArrows.ts:28-44`) вкорочує останній сегмент на
`0.85 * arrowSize`, щоб штрих не проступав крізь вістря — з захистом: якщо останній сегмент
коротший за `2 * arrowSize`, не вкорочувати взагалі (інакше вістря відірветься від порту).
Альтернативний термінатор — крапки на обох кінцях: `drawEdgeEndDots` (`staffEdgeArrows.ts:86`),
вмикається `EdgeStyle.terminator: 'dot'` (`render/types.ts:180`).

**Вердикт: є, і в нашій моделі це дешевше.** Ніякого `<defs>`, ніякої дедуплікації —
трикутник просто дописується в той самий `Graphics`, що й лінія (`StaffEdgesView.ts:105`).
Що варто перенести — **ідею `markerStart`**: у нас стрілка тільки в кінці, старту немає.
Для «двонаправлених» зв'язків (матричні) це знадобиться.

### 3.7 Мітки на ребрах, `<BaseEdge />`, `<EdgeLabelRenderer />`, `interactionWidth`

**`<BaseEdge>`** (`components/Edges/BaseEdge.tsx:34-72`) — три речі в одному:
1. видимий `<path className="react-flow__edge-path">`;
2. **невидимий товстий `<path>`** з `strokeOpacity=0`, `strokeWidth={interactionWidth}`
   (дефолт **20**) — це вся реалізація «в ребро легко влучити»;
3. `<EdgeText>`, якщо є `label`.

**`<EdgeText>`** (`components/Edges/EdgeText.tsx:7-72`) — SVG-текст із підкладкою. Вимірювання
через `getBBox()` в `useEffect` (`:24-35`), і **до першого виміру `<g>` має `visibility: hidden`**
(`:45`) — тобто мітка на ребрі має рівно ту саму «фазу першого кадру», що й нода.

**`<EdgeLabelRenderer>`** (`components/EdgeLabelRenderer/index.tsx:54-62`) — портал у
`div.react-flow__edgelabel-renderer`, який лежить **між ребрами й нодами**
(`container/GraphView/index.tsx:182`) і має `pointer-events: none` + `width/height: 100%`
(`init.css:339-347`). Це відповідь на «SVG-текст незручний»: складну мітку малюють у DOM,
самі позиціонують `translate(-50%,-50%) translate(Xpx,Ypx)` за `labelX/labelY`, які повертає
функція шляху. Пастка задокументована прямо в JSDoc (`:50-52`): щоб мітка ловила мишу,
потрібні `pointerEvents: 'all'` **і** клас `nopan`.

**У нас.** Міток на ребрах **немає** взагалі. Ребра — `eventMode: 'none'`
(`packages/sdk/src/render/LayerManager.ts:30`), тобто й `interactionWidth` не потрібен:
вони навмисно не крадуть кліки в карток під ними.

**Вердикт по мітках: немає, і треба (опційно).** Для org-діаграми природний кандидат —
підпис типу зв'язку («в.о.», «матрична»). Реалізація в Pixi очевидна: `Text` у шарі
`layers.edges` в точці середини найдовшого сегмента — цю точку наш роутер уже фактично
має, її просто не повертає (`buildStaffEdgeSegments`). React Flow повертає її з кожної
функції шляху як `labelX/labelY` — варто зробити так само (§4.4).
**Вердикт по `interactionWidth`: немає; знадобиться, щойно ребра стануть клікабельними** —
тоді в Pixi це не другий path, а `hitArea` з розширеним боксом сегмента.

### 3.8 `edge.animated` — чим саме зроблено і чому не переноситься

Реалізація повністю CSS:

```css
.xy-flow__edge.animated path { stroke-dasharray: 5; animation: dashdraw 0.5s linear infinite; }
.xy-flow__edge.animated path.xy-flow__edge-interaction { stroke-dasharray: none; animation: none; }
@keyframes dashdraw { from { stroke-dashoffset: 10; } }
```
(`system/src/styles/init.css:134-142`, `:333-337`)

Клас `animated` вішає обгортка ребра (`components/EdgeWrapper/index.tsx:193`). Тобто
`edge.animated` **не доходить до логіки малювання взагалі** — це чистий CSS-клас.

**Неочевидна вартість, і вона велика.** `stroke-dashoffset` анімується на **головному потоці**
і не компонується GPU: кожне анімоване ребро — це safe-area invalidation + repaint кожен кадр.
Практичний ефект (він же — вся причина, чому це варто зафіксувати): десятки анімованих ребер
роняють FPS усього застосунку, а не лише полотна. Другий рядок правила існує саме тому, що
без нього невидимий `interaction`-path теж отримував пунктир і подвоював вартість.

**У нас.** Анімованих ребер немає. Пунктир є, але **статичний і геометричний**:
`drawDashed` розкладає відрізок на dash/gap і виписує `moveTo`/`lineTo`
(`packages/sdk/src/render/StaffEdgesView.ts:133-166`); патерни в таблиці штрихів —
`matrix: [6,4]`, `dotted: [2,4]` (`StaffEdgesView.ts:21-22`).

**Вердикт: немає, і не переноситься.** CSS-механізму в Pixi не існує. Якщо колись
знадобиться «біжучий пунктир», це буде зсув фази в `drawDashed` + перемальовка в тікері —
тобто **повна перемальовка `Graphics` кожен кадр**, що для нашого обсягу ребер неприйнятно.
Правильна форма, якщо дійде до цього: окремий `Mesh` зі шейдером, який зсуває UV, а не
Graphics. Записую як «свідомо не робимо».

### 3.9 Оформлення: CSS-змінні, теми, `colorMode`, z-index

**CSS-змінні.** Два рівні: `system/src/styles/init.css` — обов'язкові структурні стилі
(позиціонування, шари, `pointer-events`), `base.css` — мінімальна тема,
`style.css` — повна «як на демо». Патерн змінних скрізь однаковий:
`var(--xy-edge-stroke, var(--xy-edge-stroke-default))` (`init.css:106`) — тобто хост
перевизначає **без `-default`**, а бібліотека тримає дефолт окремо. Темна тема — просто
переоприділення тих самих змінних під `.xy-flow.dark` (`init.css:29-51`).

**`colorMode`** (`hooks/useColorModeClass.ts:18-41`): `'light' | 'dark' | 'system'`; для
`system` — підписка на `matchMedia('(prefers-color-scheme: dark)')`. Результат — просто
клас на корені (`container/ReactFlow/index.tsx:176`). Дефолт — `'light'`
(`container/ReactFlow/index.tsx:148`).

**z-index — три рівні, які легко сплутати:**
1. **Шари** (CSS): `pane: 1`, `viewport: 2`, `nodesselection: 3`, `renderer: 4`, `panel: 5`,
   `selection: 6`, `connectionline: 1001` (`init.css:69-98`, `:189`).
2. **Нода**: `internals.z = node.zIndex + (selected ? 1000 : 0)`
   (`system/src/utils/store.ts:268-276`, константа `SELECTED_NODE_Z = 1000` на `:33`),
   вмикається `elevateNodesOnSelect` (дефолт **`true`** — `container/ReactFlow/index.tsx:130`).
3. **Ребро**: `getElevatedEdgeZIndex` (`system/src/utils/edges/general.ts:40-59`) —
   `edgeZ + max(zSource, zTarget)`, де z вузла враховується **тільки якщо** вузол має
   `parentId` або виділений. Тобто ребро в суб-флоу піднімається над батьківською нодою.
   `elevateEdgesOnSelect` дефолт **`false`** (`container/ReactFlow/index.tsx:131`).
4. `zIndexMode: 'auto' | 'basic' | 'manual'` (дефолт `'basic'` —
   `types/component-props.ts:709`, `container/ReactFlow/index.tsx:152`): `'manual'` вимикає
   всю авто-логіку і бере `zIndex` як є (`system/src/utils/store.ts:120`, `:271`).

**Неочевидна вартість.** `+1000` при виділенні — це не порядок, а **магічне число**: якщо
хост поставить нодам `zIndex: 1500`, виділення перестане піднімати. Вони самі це визнали,
додавши `zIndexMode: 'manual'`.

**У нас.** Теми — числові палітри, не CSS: `defaultNodeTheme` / `darkNodeTheme`
(`packages/sdk/src/render/types.ts:294`, `:348`), резолв режиму
`resolveTheme('light'|'dark'|'auto')` з тим самим `matchMedia`
(`render/theme.ts:11-16`), колір полотна `canvasBackgroundForTheme`
(`render/theme.ts:19`), кольори ребер `orgEdgeColorForTheme` / `staffEdgeColorForTheme`
(`render/theme.ts:32,36`). Хост-оверрайд — `mergeTheme(partial, base)`
(`render/types.ts:419`), плоский мерж по підоб'єктах.

Z-порядок у нас — **шари контейнерів**, а не числа:
`zones → departments → edges → organizations → persons → departmentStrokes → overlay`
(`packages/sdk/src/render/LayerManager.ts:20-28`). Всередині картки —
`sortableChildren = true` і `chromeControls.zIndex = 10`
(`render/PersonNode.ts:165-167`, `OrganizationNode.ts:144-146`).

**Вердикт: є еквівалент; шари в нас чистіші, підйому виділеного немає.**
Порядок шарів фіксований і читається з одного місця — це краще, ніж їхні три рівні
з магічною `+1000`. Чого немає: **виділена картка не піднімається над сусідами**. У сітці
без перекриття це не болить; щойно з'явиться драг з перекриттям — знадобиться, і робити
це треба через `zIndex` всередині шару `persons` (він уже `sortableChildren`-готовий на рівні
карток, але сам контейнер `persons` — ні; це однорядкова зміна).

### 3.10 `<ViewportPortal />` — точка вставки власного вмісту

`components/ViewportPortal/index.tsx:34-42` — портал у `div.react-flow__viewport-portal`,
який лежить **останнім усередині в'юпорта** (`container/GraphView/index.tsx:200`), тобто
над нодами, і **всередині трансформу** — вміст пан-зумиться разом зі сценою
(`init.css:349-356`).

Ціна: вміст порталу **не бере участі в `fitView`**, не кулиться, не має `pointer-events`
за замовчуванням (батьківський `.react-flow__viewport` — `pointer-events: none`).

**У нас: немає.** Промоут-оверлей (`packages/sdk/src/react/createReactPromoteOverlay.ts:205`)
живе **над** полотном у **екранних** координатах (`layer.style.position = 'absolute'`,
`inset: 0`, `zIndex: 5` — `:214-220`), і кожна картка позиціонується вручну через
`worldBoxToScreen` (`render/promoteMath.ts:50`). Тобто аналог `ViewportPortal` у нас —
це «сам порахуй екранні координати».

**Вердикт: немає, і треба.** Не React-портал, а **`layers.overlay` у світових координатах**
як публічна точка: хост дає `Container`, ми додаємо його в `layers.overlay`
(`LayerManager.ts:17`) — і він автоматично їде зі сценою. Зараз `overlay` є, але не
експонований назовні. Це дешевий і корисний шов для хостових анотацій, бейджів, легенд.

### 3.11 Нода до першого виміру; зображення й медіа всередині ноди

**До першого виміру.** `NodeWrapper/index.tsx:207`: `visibility: hasDimensions ? 'visible' : 'hidden'`.
Нода **вже в DOM** (інакше не було б що міряти), але невидима. `hasDimensions` — це
`nodeHasDimensions` (`system/src/utils/general.ts:364`): `measured ?? width ?? initialWidth`.
Саме для цього існує `initialWidth`/`initialHeight` — щоб перший кадр не блимав.
Ребро до цього моменту **не малюється взагалі**: `getEdgePosition` повертає `null`,
якщо `isNodeInitialized` хибне (`system/src/utils/edges/positions.ts:19-32`), а
`EdgeWrapper` на `null`-координатах повертає `null` (`components/EdgeWrapper/index.tsx:120-122`).

**Медіа.** Спеціальної обробки **немає**: `<img>` усередині кастомної ноди — звичайний DOM.
Наслідок, який вони не приховують: коли картинка довантажується, змінюється розмір ноди →
спрацьовує `ResizeObserver` → `updateNodeInternals` → перерахунок хендлів → **перемальовка
всіх дотичних ребер**. Тобто «фото в картці» коштує повного циклу вимірювання **після** того,
як картка вже видима.

**У нас — сильніше.** Розмір фіксований, тому довантаження фото **нічого не рухає**:
- завантаження тільки на `near`: `applyPhoto` виходить одразу, якщо `lod !== 'near'`
  (`packages/sdk/src/render/PersonNode.ts:589`);
- кеш промісів + refcount по URL: `loadNodeTexture` (`packages/sdk/src/media/nodeMedia.ts:152`),
  `acquireNodeTextureUrl` / `releaseNodeTextureUrl` (`nodeMedia.ts:59`, `:69`) з
  `Assets.unload` при нулі власників;
- allowlist URL: `isAllowedNodeMediaUrl` (`nodeMedia.ts:121`) — тільки відносні шляхи,
  `data:image/*`, `blob:` і `https:` до непривтаних хостів; `javascript:`, `http:` і
  приватні діапазони відрізані (`isPrivateOrLocalHostname:98`);
- таймаут завантаження 8 с (`nodeMedia.ts:18-23`);
- відсів «битого» 1×1 data-URL: `PersonNode.ts:599-602`;
- поки фото немає — ініціали з детермінованим кольором (`render/personInitials.ts`,
  `avatarColorFromName`), при появі фото ініціали ховаються (`PersonNode.ts:604`);
- форма — маска: коло або `roundRect` залежно від макета (`PersonNode.ts:626-632`).

**Вердикт: у нас сильніше, переносити нічого.** Зафіксувати варто зворотний висновок:
**фіксований бокс + LOD-gate — це те, що робить медіа дешевим**. Їхня модель (вимір → медіа →
перевимір) для 600+ карток була б непридатною.

### 3.12 Кулінг і порядок відмальовки

`onlyRenderVisibleElements` (дефолт `false`):
- ноди — `getNodesInside(nodeLookup, {0,0,w,h}, transform, true)` (`hooks/useVisibleNodeIds.ts:8-14`);
- ребра — `isEdgeVisible`: об'єднаний бокс source+target проти в'юпорта
  (`system/src/utils/edges/general.ts:69-88`), причому вироджений бокс (вертикальне/горизонтальне
  ребро) штучно розширюється на 1px (`:72-77`), інакше площа перетину = 0 і ребро зникає.

Селектори повертають **масив id**, порівнюваний `shallow` — тобто перерахунок іде на кожну
зміну стору, але ререндер тільки коли набір id справді змінився
(`container/NodeRenderer/index.tsx:47-71` — там же вони пояснюють, чому `NodeRenderer`
підписаний лише на id).

**У нас.** Кулінгу немає — `grep` по `packages/sdk/src/render/` не знаходить ані
`cull*`, ані `renderable = false`. Малюється весь `layers.*`; єдина «економія» — LOD:
`resolveLodLevel` (`packages/sdk/src/render/lod.ts:16`, пороги `farMax 0.45`, `midMax 1.2`)
керує тим, **скільки деталей** у картці (`PersonNode.ts:278`, `:333`, `:373` — на `far`
малюється лише крапка через `personFarDotRadius`), і спрощенням контурів
(`simplifyPolyline` — Douglas-Peucker з допуском 2/1 world-px, `lod.ts:27-80`).

**Вердикт: немає, і треба.** Pixi 8 має вбудований `cullable`/`CullerPlugin`, який робить
рівно те саме дешевше, ніж їхній JS-перебір. Зараз при зумі в одну картку ми все одно
обходимо всі 600+ контейнерів. Це найдешевша нескладна перемога з усього списку.
Формула перетину, яку варто взяти дослівно, — `isEdgeVisible` з захистом від виродженого
боксу (`system/src/utils/edges/general.ts:72-77`); у нас ортогональні ребра **завжди**
вироджені по одній осі, тож без цього захисту наївний кулінг ребер зникав би саме на
вертикальних лініях.

---

## 4. Формули й геометрія, які переносяться в Pixi

Це головна цінність усієї ділянки: код нижче не залежить від DOM ні на рядок — це чисті
функції над числами в `@xyflow/system`, і вони переносяться в Pixi буквально.

### 4.1 Безьє: `getBezierPath`

`system/src/utils/edges/bezier-edge.ts:121-164`. Контрольні точки — вбік від сторони порту:

```
calculateControlOffset(distance, curvature):        // :69-75
    distance >= 0  →  0.5 * distance
    distance <  0  →  curvature * 25 * sqrt(-distance)

getControlWithCurvature(pos, x1,y1, x2,y2, c):      // :77-88
    Left   → [x1 - offset(x1-x2, c), y1]
    Right  → [x1 + offset(x2-x1, c), y1]
    Top    → [x1, y1 - offset(y1-y2, c)]
    Bottom → [x1, y1 + offset(y2-y1, c)]
```

`curvature` дефолт `0.25`. Уся хитрість — у другій гілці `calculateControlOffset`: коли ціль
позаду порту (`distance < 0`), лінійний зсув дав би петлю, тому береться **корінь** — крива
відходить назад м'яко й сублінійно. Це і є та формула, заради якої варто читати їхній код.

**Середина кривої** (`getBezierEdgeCenter`, `:38-67`) — **не** справжня середина по довжині,
а точка при `t = 0.5` кубічної безьє, розписана явно:
`0.125·P0 + 0.375·C0 + 0.375·C1 + 0.125·P1`. Вони чесно пишуть у коментарі (`:57-60`), що це
дешева апроксимація, а не медіана довжини. Для мітки достатньо.

**Перенесення в Pixi:** `Graphics.bezierCurveTo(c0x, c0y, c1x, c1y, x, y)` — прямий еквівалент
SVG `C`. Формули копіюються без змін.
**Вердикт: немає в нас, і треба опційно.** Для org-дерева ортогональні лінії правильніші;
безьє знадобиться, якщо колись з'явиться режим «м'яких» зв'язків (матричні/пунктирні
підпорядкування, де ортогональність тільки заважає).

### 4.2 Ортогональний роутер: `getSmoothStepPath` — найцінніше

`system/src/utils/edges/smoothstep-edge.ts:65-212` (`getPoints`) + `:214-233` (`getBend`).
Вони самі підписали це чесно (`:61-63`): *«ми намагаємось імітувати ортогональну маршрутизацію;
це не справжній роутер, але швидко і достатньо як дефолт»*.

**Алгоритм.**

1. **Gapped-точки**: від кожного порту відступ `offset` (дефолт **20**) у напрямку сторони
   порту — `handleDirections` (`:37-42`). Тобто лінія завжди спочатку «виходить» перпендикулярно
   з ноди. (`:84-85`)
2. **Домінантна вісь**: `getDirection` (`:44-57`) — якщо порт лівий/правий, вісь `x`, інакше `y`;
   знак — за взаємним положенням gapped-точок.
3. **Протилежні порти** (`sourceDir·targetDir === -1`, `:107-141`): один злам посередині.
   `stepPosition` (дефолт `0.5`, `:34`) зсуває місце зламу вздовж домінантної осі:
   ```
   centerX = sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition
   ```
   Далі вибір між `verticalSplit` (дві точки з однаковим `x`) і `horizontalSplit`
   (дві з однаковим `y`) — залежно від того, чи збігається напрямок порту з домінантним
   (`:137-141`).
4. **Однакові/змішані порти** (`:142-195`): одна проміжна точка — або `(source.x, target.y)`,
   або `(target.x, source.y)`.
   - **Захист від виродження** (`:153-165`): якщо порти на одній стороні і відстань по
     домінантній осі `≤ offset`, gapped-точка накладається на проміжну і шлях «ламається».
     Лікується додатковим `gapOffset = min(offset - 1, offset - diff)`, зсунутим у бік від
     колізії. Це рівно той баг, який у власному ортороутері ловлять останнім.
   - **Змішані сторони** (Right→Bottom тощо, `:168-180`): предикат `flipSourceTarget` з
     чотирьох умов вирішує, обходити ціль зверху чи знизу.
   - **Мітка на найдовшому сегменті** (`:187-194`): порівнюються `maxXDistance` і
     `maxYDistance`, центр ставиться на довшому.
5. **Дедуплікація точок** (`:200-209`): gapped-точка додається, **тільки якщо** не збігається
   з першою/останньою проміжною — інакше нульовий сегмент зіпсує заокруглення.
6. **Заокруглення кутів** — `getBend` (`:214-233`):
   ```
   bendSize = min(|a-b|/2, |b-c|/2, radius)
   якщо a,b,c колінеарні → просто L
   інакше → L до точки за bendSize до кута, потім Q через кут
   ```
   Радіус **обмежений половиною коротшого сусіднього сегмента** — тому короткий сегмент
   не «з'їдається» дугою. `borderRadius` дефолт **5**; `step` = той самий шлях з радіусом `0`.

**У нас** свій роутер: `layout/staffEdgeGeometry.ts`.
`staffEdgePolyline` вибирає з кількох заготовок: `verticalPolyline` (`:116`),
`aroundLeftPolyline` (`:89`), `aroundTopPolyline` (`:103`) — з фіксованим `pad = 16`
(`:90`, `:104`), плюс перевірка перетину боксів `boxesOverlap` (`:79`) і поняття перешкоди
`routerObstacle` (`:40`) — площа, крізь яку не можна вести (chrome-less Figma-місце «володіє»
більшою площею, ніж його порт-бокс). Заокруглення кутів у нас окремим кроком при малюванні:
`traceRoundedPolyline` (`render/staffEdgeArrows.ts:50-80`) з тим самим захистом
`r = min(radius, inLen/2, outLen/2)` (`:71`) — тобто цю саме частину ми вже маємо еквівалентно.

**Що конкретно варто взяти:**

| Прийом React Flow | Місце | Чому нам |
|---|---|---|
| `offset` — обов'язковий перпендикулярний вихід з порту | `smoothstep-edge.ts:84-85` | у нас `pad=16` є тільки в обхідних гілках, у `verticalPolyline` — ні |
| `stepPosition` — параметризоване місце зламу | `:110-115` | зараз злам завжди посередині; для щільних сіток корисно зсувати |
| `gapOffset` при `diff <= offset` | `:153-165` | наш роутер цієї деградації не обробляє — сусідні місця в одному рядку дають кривий шлях |
| дедуплікація точок перед заокругленням | `:200-209` | `traceRoundedPolyline` на дублі точок дасть `r <= 0.5` і мовчазний квадратний кут |
| `labelX/labelY` на найдовшому сегменті | `:187-194` | потрібно для §3.7 |

**Вердикт: є своє, слабше в трьох конкретних місцях.** Не переписувати роутер під них —
але позичити ці чотири прийоми точково.

### 4.3 Порти: `getHandlePosition` — модель, яку ми вже маємо

`system/src/utils/edges/positions.ts:99-125`:

```
x = handle.x + node.positionAbsolute.x
y = handle.y + node.positionAbsolute.y
Top    → (x + w/2, y)
Right  → (x + w,   y + h/2)
Bottom → (x + w/2, y + h)
Left   → (x,       y + h/2)
center → (x + w/2, y + h/2)
```

Тобто **порт — це точка на середині сторони боксу**, і якщо хендла немає, беруться розміри
самої ноди (`:107`). Це рівно наша модель: `staffEdgeEndpoints` (`layout/staffEdgeGeometry.ts:68`)
бере перший/останній вузол ламаної, а ламана будується від центрів сторін боксів
(`aroundLeftPolyline:93-98` — `{x: from.x, y: from.y + from.height/2}`).

Плюс у нас є те, чого нема в них: **порт може бути не на боксі лейауту, а на видимій частині
картки** — `PersonEdgeVisualHints` (`layout/staffEdgeGeometry.ts:2-15`) і
`personVisualLocalRect` (`render/personVisualGeometry.ts:25-51`), яка на `mid` звужує бокс до
смуги `max(56, h*0.48)`, а на `far` — до кружечка радіусом `max(6, min(w,h)*0.18)`.
Тобто **у нас порти рухаються з LOD, у них — ні**. Це наша перевага, і її варто зафіксувати
як свідоме рішення, а не випадковість.

**Вердикт: є, і в нас багатше.**

### 4.4 Дрібні формули, які варто мати

- **Середина прямого ребра** (`system/src/utils/edges/general.ts:6-24`) — `getEdgeCenter`,
  повертає `[centerX, centerY, offsetX, offsetY]`, де offset — половина модуля різниці.
  Контракт **усіх** їхніх функцій шляху однаковий:
  `[path, labelX, labelY, offsetX, offsetY]`. Це хороший контракт і для нас — наш
  `buildStaffEdgeSegments` повертає `points + x1,y1,x2,y2`, але **не** точку мітки.
- **Кулінг ребра** — `isEdgeVisible` (`general.ts:69-88`), з розширенням виродженого боксу на 1px.
- **Периметр rounded-rect як полілінія** — це вже наше: `roundedRectRing`
  (`render/dashedStroke.ts:28-58`, кути семплуються дугами по `arcSteps = 6`); у них
  еквівалента немає, бо в CSS `border-radius` безкоштовний.

---

## 5. Контр-масштаб — окремо, бо це наше відкрите питання

Питання формулюється так: **як зробити елемент сталого екранного розміру всередині
масштабованого шару.** React Flow має **дві різні відповіді**, і різниця між ними — це
відповідь і для нас.

### 5.1 `<NodeToolbar />` — рахувати в екранних координатах

`additional-components/NodeToolbar/NodeToolbar.tsx:76-141` +
`system/src/utils/node-toolbar.ts:3-51`.

Тулбар **портується не у в'юпорт, а в `.react-flow__renderer`**
(`NodeToolbarPortal.tsx:7`) — тобто **поза** `transform: scale()`. Позиція рахується вручну:

```
pos = [ (rect.x + rect.width * alignmentOffset) * zoom + viewport.x,
        rect.y * zoom + viewport.y - offset ]
shift = [ -100 * alignmentOffset, -100 ]        // у відсотках власного розміру
transform = translate(pos.x px, pos.y px) translate(shift.x%, shift.y%)
```

- `align: 'start' | 'center' | 'end'` → `alignmentOffset = 0 | 0.5 | 1` (`node-toolbar.ts:10-16`);
- `offset` (дефолт **10**) — **екранні пікселі**, не світові: він додається **після** множення
  на `zoom`, тому зазор від картки візуально сталий на будь-якому зумі. Це важлива деталь:
  наївна реалізація додала б offset до світових координат і зазор би «дихав».
- `position: Right/Bottom/Left` — окремі гілки з іншими `pos`/`shift` (`:29-48`);
- другий `translate` у **відсотках** зсуває на власний розмір тулбара, який ніхто не міряв —
  це і є трюк, що дозволяє центрувати без вимірювання.
- `zIndex = max(z нод) + 1` (`NodeToolbar.tsx:120`).

**Вартість.** Компонент підписаний на `state.transform` (`:34-39`) — **ререндер React на
кожен кадр пан/зуму**. Плюс `state.nodes.filter(n => n.selected).length` у тому ж селекторі —
прохід по всіх нодах на кожне оновлення стору. Плюс `nodesEqualityFn` (`:20-32`) порівнює
всю мапу вручну. Для одного тулбара нормально; це не механізм для сотень елементів —
і вони явно ховають тулбар, коли виділено більше однієї ноди (`:109-112`), формально
«щоб не перекривалися», фактично ще й тому, що N тулбарів були б дорогими.

### 5.2 `<EdgeToolbar />` — контр-масштаб через `scale(1/zoom)`

`system/src/utils/edge-toolbar.ts:13-23`:

```
translate(x px, y px) scale(1/zoom) translate(-alignX%, -alignY%)
```

Тут елемент живе **всередині** масштабованого шару (`EdgeLabelRenderer`, тобто у в'юпорті),
і сталий розмір досягається зворотним масштабом. `x`/`y` — **світові** координати
(`EdgeToolbar.tsx:58` бере їх від `centerX/centerY` шляху).

**Порядок трансформів критичний**: `translate` світовими → `scale(1/zoom)` → `translate` у
відсотках. Якби `scale` стояв першим, зсув у пікселях теж поділився б на зум.

### 5.3 Що з цього нам

**У нас зараз — третій варіант, і він не контр-масштаб.**
`worldBoxToScreen` (`packages/sdk/src/render/promoteMath.ts:50-57`):

```
left  = box.x * scale + viewport.x
top   = box.y * scale + viewport.y
width  = box.width  * scale        ← розмір ТЕЖ множиться на зум
height = box.height * scale
```

і `DefaultPromoteCard` ставить `width: max(screenRect.width, 120)`, `minHeight: screenRect.height`
(`react/createReactPromoteOverlay.ts:405-406`). Тобто **промоут-картка масштабується разом зі
сценою** — вона навмисно збігається з боксом Pixi-картки, яку заміщає. Це правильно для
самої картки (заміна має стояти рівно там, де стояла), але це **не** механізм для елементів,
які мають лишатися сталого розміру: бейджів, кнопок, тулбарів, підказок над карткою.

Плюс `Math.max(screenRect.width, 120)` — прихована пастка: на далекому зумі бокс вужчий за 120,
і картка **перестає збігатися** з тим, що заміщає; вона стирчить назовні. `minHeight` при
цьому не має верхньої межі, тож картка розтягується вниз, але не вгору — тобто на малому
зумі промоут-картка не просто більша за оригінал, а ще й асиметрично.

**Рекомендація — брати обидва рецепти, кожен на своє місце:**

1. **Для самої промоут-картки** (заміна Pixi-картки): лишити як є —
   `worldBoxToScreen` без контр-масштабу. Але прибрати `max(..., 120)` або зробити його
   явним параметром: «мінімальна ширина» — це рішення хоста, а не мовчазний дефолт SDK.
2. **Для чипів/кнопок/тулбарів над карткою**: рецепт `NodeToolbar` —
   рахувати в **екранних** координатах, offset додавати **після** множення на `scale`,
   центрування робити другим `translate` у відсотках (не треба міряти елемент).
   Формула `getNodeToolbarTransform` (`system/src/utils/node-toolbar.ts:3-51`) переноситься
   в наш оверлей рядок у рядок — вона не залежить від React ні на йоту.
3. **Якщо колись з'явиться DOM-шар усередині Pixi-трансформу** (аналог `ViewportPortal`,
   §3.10) — тоді і тільки тоді `scale(1/zoom)` з `edge-toolbar.ts:20`, і саме в тому порядку
   трансформів.
4. **Вартість, якої треба уникнути:** їхній `NodeToolbar` ререндериться на кожен кадр зуму,
   бо підписаний на `transform` через React. Наш оверлей уже влаштований краще —
   `subscribePromoteSync` + один `root.render` на sync (`createReactPromoteOverlay.ts:344-350`),
   і `getScreenSize()` навмисно не читає `mount.clientWidth`, щоб не форсити лейаут
   (коментар `createReactPromoteOverlay.ts:48-55`). Це саме та обережність, якої немає в них —
   не втратити її при додаванні тулбарів.

**Дрібниця, яку варто вкрасти:** їхній `NodeToolbar` приймає **масив `nodeId`** і показує
один тулбар на групу, рахуючи `getInternalNodesBounds(nodes)` (`NodeToolbar.tsx:118`).
Для нас це «дії над виділеним підрозділом» — природний майбутній кейс.

---

## 6. Чого немає в них (а в нас є або нам потрібно)

1. **LOD.** У React Flow немає жодного поняття рівня деталізації: нода малює той самий DOM
   на зумі 0.05 і 4.0. Уся їхня «оптимізація» — не малювати те, що за екраном
   (`onlyRenderVisibleElements`). У нас `resolveLodLevel` (`render/lod.ts:16`) керує і
   складністю картки (`PersonNode.ts:278,333,373`), і спрощенням контурів
   (`simplifyPolyline`, `lod.ts:27`), і завантаженням медіа (`PersonNode.ts:589`),
   і порти ребер рухаються з LOD (`render/personVisualGeometry.ts:25`).
2. **Контури / блоби навколо груп.** У них є `group`-нода — звичайний `<div>` з рамкою.
   Нічого схожого на `packages/sdk/src/render/contour/` (16 модулів: flood, notch, corridor,
   fillet, morph, clearance) немає й близько. Ортогональних вирізів навколо чужих карток —
   теж.
3. **Refcount і безпека медіа.** `acquireNodeTextureUrl`/`releaseNodeTextureUrl` +
   allowlist URL (`media/nodeMedia.ts:59,69,121`). У них медіа — це `<img>`, і питання
   не стоїть.
4. **Детермінований аватар-плейсхолдер.** `avatarColorFromName` + ініціали
   (`render/personInitials.ts`) — у них це справа хоста.
5. **Дашед-геометрія як примітив.** `roundedRectRing` + `strokeDashedRing`
   (`render/dashedStroke.ts:28`) — у CSS це `border-radius` + `border-style: dashed`,
   безкоштовно, тому окремого коду немає.
6. **Явні шари сцени з `eventMode: 'none'`** (`LayerManager.ts:29-32`) — у них аналог
   розмазаний по `pointer-events` у CSS і по порядку DOM.
7. **Знищення GPU-ресурсів при очищенні** (`LayerManager.ts:45-51`, коментар «removeChildren
   alone leaks GPU») — питання, якого в DOM не існує.
8. **`resolution` / `autoDensity` / `antialias`** (`render/PixiHost.ts:223-225`) — теж
   поза їхнім світом.
9. **Error boundary на кожну DOM-картку** — `SlotBoundary`
   (`react/createReactPromoteOverlay.ts:165`, доданий паралельно з цією інвентаризацією).
   У React Flow **жодного boundary немає**: кинуло в одній кастомній ноді — впав увесь флоу.
   Різниця по суті та, що там ноди пише хост, а в нас картка будується з даних, які можуть
   бути кривими.

**Чого немає в обох, але нам знадобиться:**
`markerStart` (стрілка на початку — §3.6), мітки на ребрах (§3.7), кулінг (§3.12),
per-node style delta (§3.4), публічний world-space overlay (§3.10), підйом виділеної
картки в межах шару (§3.9).

---

## 7. Межі з іншими ділянками

- **Ділянка 1 (взаємодія/редагування):** прапорці `selectable/focusable/draggable/deletable/
  connectable` на ноді й ребрі, `dragHandle`, `noDragClassName`/`noPanClassName`,
  `<Handle />` як механізм створення зв'язків, `connectionLine`, `EdgeUpdateAnchors`,
  клавіатурна навігація в `NodeWrapper/index.tsx:128-182`. Я їх торкався **тільки** там,
  де вони впливають на те, що намальовано (класи, `pointer-events`, `interactionWidth`).
- **Ділянка 2 (в'юпорт/навігація):** `container/Viewport/index.tsx:21-47` (запис трансформу
  повз React), `fitView`, `getViewportForBounds`, `pointToRendererPoint`,
  пан/зум-жести. Я використав лише формулу `world → screen` як основу контр-масштабу (§5).
- **Ділянка 4 (дані/стан/інтеграція):** `adoptUserNodes` / `nodeLookup` / `parentLookup`
  (`system/src/utils/store.ts:129`), `zustand`-стор, `defaultEdgeOptions` як частина стору,
  `BatchProvider`, controlled vs uncontrolled. Я брав звідти тільки те, що визначає
  **намальований** розмір і z (`getNodeDimensions`, `calculateZ`, `getElevatedEdgeZIndex`).

---

## 8. Найкоротший список дій, які випливають

Не план — перелік того, на що інвентаризація вказує прямо, від дешевого до дорогого:

1. **Кулінг Pixi** (`cullable` / `CullerPlugin`), з формулою `isEdgeVisible` і захистом
   від виродженого боксу для ортогональних ребер. Найдешевша перемога.
2. **`label.width` замість трьох магічних коефіцієнтів** у `truncatePixiText`
   (`personCardContent.ts:76`, `OrganizationNode.ts:611`, `orgCardChrome.ts:28`).
3. **`labelX/labelY` з роутера** — розширити контракт `buildStaffEdgeSegments` до їхнього
   `[points, labelX, labelY]`, за формулою «найдовший сегмент»
   (`smoothstep-edge.ts:187-194`). Відкриває мітки на ребрах.
4. **Чотири прийоми в наш ортороутер** (§4.2): `offset` у всіх гілках, `stepPosition`,
   `gapOffset` при `diff <= offset`, дедуплікація точок перед заокругленням.
5. **`getNodeToolbarTransform` в оверлей** (§5) — для чипів/кнопок сталого розміру над
   картками; і прибрати мовчазний `max(width, 120)` з `DefaultPromoteCard`.
6. **`layers.overlay` як публічна точка** у світових координатах (§3.10).
7. **Per-node style delta** (§3.4) і **точка розширення для видів карток** (§3.1) —
   найдорожче, але це той борг, що зростає з кожним новим макетом.
