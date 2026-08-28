# Інвентаризація React Flow — ділянка 2б: UI навігації та орієнтація користувача

> Джерело: клон `xyflow` @ `b1b99e9`, `@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`.
> Порівняння: `/Users/strelia/projects/dg` (main @ `04901a4`).
> Ділянка **не** покриває механіку камери (жести, `fitView`, межі, координати) — це паралельна ділянка 2а.
> Статус: **WIP** (файл наповнюється інкрементально).

---

## 1. Компоненти-надбудови над камерою

Усі чотири — це «просто діти» `<ReactFlow>`; вони не мають власного механізму позиціювання, крім
`<Panel>`, і читають стан із zustand-стора через `useStore`.

### 1.1 `<Panel />` — базовий примітив позиціювання

- **Що це:** `div.react-flow__panel` поверх в'юпорта; уся «хромота» (Controls, MiniMap,
  Attribution) побудована на ньому.
- **API:** `position?: PanelPosition` (default `'top-left'`) + усі `HTMLAttributes<HTMLDivElement>`;
  `forwardRef`.
- **Позиції:** `top-left | top-center | top-right | bottom-left | bottom-center | bottom-right`
  (`packages/system/src/types/general.ts` — `PanelPosition`).
- **Код:** `packages/react/src/components/Panel/index.tsx:41` — уся реалізація 12 рядків:
  `position` розбивається по `-` на два CSS-класи (`.top`, `.left`), решта — CSS.
- **Вартість:** нульова. Не підписаний на стор взагалі.

### 1.2 `<Controls />`

- **Склад кнопок (фіксований, 4 шт.):** zoom-in, zoom-out, fit-view, toggle-interactivity (замок).
  Далі `children` — можна дописати свої через `<ControlButton>`.
  `packages/react/src/additional-components/Controls/Controls.tsx:79-121`.
- **API** (`Controls/types.ts:9-63`): `showZoom`, `showFitView`, `showInteractive` (усі `true`),
  `fitViewOptions`, `onZoomIn/onZoomOut/onFitView/onInteractiveChange`, `position`
  (default `bottom-left`), `orientation: 'horizontal'|'vertical'` (default vertical),
  `style`, `className`, `aria-label`, `children`.
- **Неочевидне:**
  - `onFitView` **не замінює** дефолт — `fitView()` викликається завжди, колбек лише додається
    (`Controls.tsx:55-58`), попри те що JSDoc типу стверджує протилежне (`types.ts:36-40`) — це
    розбіжність доків і коду.
  - «Замок» — це не readonly-режим: він одночасно перемикає три прапорці стора
    `nodesDraggable/nodesConnectable/elementsSelectable` (`Controls.tsx:60-68`). Zoom/pan лишаються.
  - Кнопки zoom дизейбляться на межі зуму (`minZoomReached/maxZoomReached`, `Controls.tsx:20-21`) —
    єдиний вбудований індикатор «далі нікуди».
  - Підписка на стор — `shallow` по 4 скалярах, тому перерендер тільки на зміні зуму/прапорців.
- **Вартість:** мізерна. Ререндериться на кожній зміні `transform[2]` (зум), але це memo-компонент
  з 4 кнопок.

### 1.3 `<Background />`

- **Варіанти (`BackgroundVariant`):** `dots` (default), `lines`, `cross`.
  `additional-components/Background/types.ts:9-13`.
- **API:** `id`, `variant`, `gap: number|[x,y]` (20), `size` (1 для dots/lines, 6 для cross),
  `lineWidth` (1), `offset: number|[x,y]` (0), `color`, `bgColor`, `className`, `patternClassName`,
  `style`. `types.ts:18-60`.
- **Механіка:** один `<svg>` на весь контейнер із SVG `<pattern>`; скрол імітується через
  `pattern x = transform[0] % scaledGap[0]` (`Background.tsx:68-69`), масштаб — множенням gap на
  `transform[2]`. Тобто **браузер малює патерн, не JS** — вартість константна незалежно від зуму.
- **Композиція:** кілька `<Background>` з різними `id` = сітка «дрібна + крупна»
  (`Background.tsx:113-139`); без унікального `id` патерни колізують по DOM-id.
- **Вартість:** ререндер на **кожен** кадр пану/зуму (підписка на `s.transform`), але це
  оновлення 4 атрибутів одного `<pattern>`.

### 1.4 `<MiniMap />` — найважливіше для нашої задачі

**Що це:** окремий `<svg>` у `<Panel>`, де кожна нода — свій `<rect>`. Показує рамку в'юпорта як
«вікно» в масці (evenodd-path), опційно клікабельний/панабельний/зумований.

**Усі пропи** (`MiniMap/types.ts:12-101`), розширює `HTMLAttributes<SVGSVGElement>` мінус `onClick`:

| Проп | Default | Що робить |
|---|---|---|
| `nodeColor` | `#e2e2e2` | `string \| (node) => string` — колір ноди |
| `nodeStrokeColor` | `transparent` | `string \| (node) => string` |
| `nodeClassName` | `''` | `string \| (node) => string` |
| `nodeBorderRadius` | 5 | |
| `nodeStrokeWidth` | 2 | |
| `nodeComponent` | `MiniMapNode` | свій SVG-рендерер ноди |
| `bgColor`, `maskColor`, `maskStrokeColor`, `maskStrokeWidth` | — / `rgba(240,240,240,.6)` / transparent / 1 | кольори |
| `position` | `bottom-right` | `PanelPosition` |
| `onClick(event, {x,y})` | — | клік по мінімапі → координати **у flow-просторі** |
| `onNodeClick(event, node)` | — | клік по конкретній ноді мінімапи |
| `pannable` | `false` | драг усередині мінімапи рухає в'юпорт |
| `zoomable` | `false` | wheel усередині мінімапи зумить в'юпорт |
| `inversePan` | `false` | інвертувати напрямок пану |
| `zoomStep` | 1 (JSDoc бреше «10») | крок зуму колесом |
| `offsetScale` | 5 | «падінг» навколо bounds |
| `ariaLabel` | `'Mini Map'` | `<title>` для SVG |

**Як рахує масштаб і межі** (`MiniMap.tsx:19-53`, `105-116`):
1. `viewBB` — прямокутник в'юпорта у flow-координатах: `x=-transform[0]/zoom`, `width=width/zoom`.
2. `boundingRect = getBoundsOfRects(getInternalNodesBounds(nodeLookup, {filter: !hidden}), viewBB)` —
   **об'єднання** AABB усіх видимих нод **із самим в'юпортом**. Тому коли ти від'їхав від графа,
   мінімапа не «губить» тебе — вона розтягується, а граф стискається в точку.
3. `viewScale = max(boundsW/elemW, boundsH/elemH)` → SVG `viewBox` центрується по bounds з
   симетричним `offset = offsetScale * viewScale`. Тобто масштаб мінімапи **не фіксований**, він
   плаває при кожному русі камери.
4. Розміри самої мінімапи беруться з `style.width/height` **тільки якщо це числа**
   (`MiniMap.tsx:105-106`) — `style={{width:'20%'}}` мовчки зламає розрахунок (візьме 200×150).

**Чи фільтрує ноди:** тільки `node.hidden` — і то **двічі й по-різному**:
- у розрахунку bounds — `filter: (node) => !node.hidden` (`MiniMap.tsx:17`, `:44`);
- у рендері — **ні!** `MiniMapNodes` бере `s.nodes.map(n => n.id)` (`MiniMapNodes.tsx:14`) і рендерить
  wrapper для **кожної** ноди; відсів `hidden`/безрозмірних відбувається вже всередині
  `NodeComponentWrapperInner` (`MiniMapNodes.tsx:86+`, `nodeHasDimensions`).
- Жодного viewport-culling, жодного LOD, жодної кластеризації. **N нод = N React-компонентів + N
  SVG `<rect>`.**

**Ціна (важливо для нас):**
- `O(N)` обхід `nodeLookup` у селекторі **на кожен кадр** пану/зуму (бо `viewBB` змінюється →
  `getInternalNodesBounds` перераховується повністю). Для 600 нод дешево, для 100k — ні.
- `O(N)` React-піддерево: окремий `useStore`-підписник **на кожну ноду** (`MiniMapNodes.tsx:65-90`).
  Це свідомий розмін: перерендер однієї ноди не чіпає решту, але фіксована вартість на ноду висока.
- `areEqual` (`MiniMap.tsx:61-69`) — ручний компаратор по значеннях прямокутників, бо селектор
  щоразу створює нові об'єкти і `shallow` завжди казав би «змінилось». Класична пастка при
  копіюванні цього патерну.
- `shapeRendering` перемикається на `crispEdges` у Chrome (`MiniMapNodes.tsx:36`) — перф-хак.

**Взаємодія (`packages/system/src/xyminimap/index.ts`):** окремий d3-zoom на SVG мінімапи.
Пан рахується як дельта пікселів × `viewScale * max(zoom, log(zoom))` (`xyminimap/index.ts:84`) —
евристика, щоб рух миші по мінімапі відповідав руху камери, і застосовується через
`panZoom.setViewportConstrained(...)` з `translateExtent` (`:94-102`). Зум — тільки на `wheel`.
