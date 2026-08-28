# Inventory 2a — механіка камери (React Flow)

Джерело: клон `xyflow` @ `b1b99e9`, `@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`.
Шляхи нижче — відносно кореня клону
(`/private/tmp/claude-501/-Users-strelia-projects-dg/d70ef649-0260-4575-a168-ee3361a4b37f/scratchpad/xyflow`).
Порівняння — з `/Users/strelia/projects/dg` (абсолютні шляхи).

**Опорний факт:** уся камера React Flow — це тонка обгортка над `d3-zoom`. Один інстанс
`zoom()` тримає `__zoom` (ZoomTransform `{x,y,k}`) прямо на DOM-вузлі pane; усе інше
(режими жестів, fitView, межі, анімація) — це або конфіг `d3ZoomInstance`, або обчислення
цільового трансформа + `d3Zoom.transform(selection, t)`.
`packages/system/src/xypanzoom/XYPanZoom.ts:83-87`.

---

## 1. Режими жестів

Єдина точка збірки — `XYPanZoom.update()`,
`packages/system/src/xypanzoom/XYPanZoom.ts:120-227`. Викликається на кожну зміну пропсів з
`packages/react/src/container/ZoomPane/index.tsx:110-131`.

Механіка розкладена на **три незалежні шари**, і це не очевидно:

1. **`d3ZoomInstance.filter(fn)`** — булевий гейт «чи взагалі d3 бачить цю подію»
   (`packages/system/src/xypanzoom/filter.ts:19-109`).
2. **власний `wheel.zoom` handler** — підміняє d3-шний, бо pan-on-scroll d3 не вміє
   (`XYPanZoom.ts:151-170`).
3. **`dblclick.zoom`** — окремо вмикається/вимикається, бо на тач-скрінах подвійний тап
   обходить filter (`XYPanZoom.ts:217-226`, коментар прямо про це).

| Проп | Дефолт | Тип | Де реалізовано |
|---|---|---|---|
| `panOnDrag` | `true` | `boolean \| number[]` (номери кнопок миші) | фільтр `filter.ts:92-103` |
| `panOnScroll` | `false` | `boolean` | вибір handler-а `XYPanZoom.ts:145,151` |
| `panOnScrollMode` | `PanOnScrollMode.Free` | `'free'\|'vertical'\|'horizontal'` | `eventhandler.ts:101-102` |
| `panOnScrollSpeed` | `0.5` | `number` | `eventhandler.ts:110-116` |
| `zoomOnScroll` | `true` | `boolean` | `filter.ts:34,87` |
| `zoomOnPinch` | `true` | `boolean` | `filter.ts:35,77-84`; `eventhandler.ts:86-94` |
| `zoomOnDoubleClick` | `true` | `boolean` | `XYPanZoom.ts:222-226` |
| `preventScrolling` | `true` | `boolean` | `eventhandler.ts:143-162` |
| `panActivationKeyCode` | `'Space'` | `KeyCode` | `FlowRenderer/index.tsx:79-82` |
| `zoomActivationKeyCode` | `Meta` (mac) / `Control` | `KeyCode` | `ZoomPane/index.tsx:54` |

Дефолти — `packages/react/src/container/ReactFlow/index.tsx:72-100`.

### Неочевидна вартість / пастки

- **`panOnDrag: number[]`** — це номери кнопок миші DOM (`0` ЛКМ, `1` СКМ, `2` ПКМ).
  `panOnDrag={[1,2]}` = «панорамувати лише середньою/правою», ЛКМ вивільняється під
  rubber-band selection. Права кнопка додатково має спец-логіку: якщо панування правою
  кнопкою не зрушило камеру — `onPaneContextMenu` таки стріляє
  (`eventhandler.ts:196-198, 225-233`, прапорець `usedRightMouseButton`).
- **Активаційні клавіші не «модифікують» жест, а перевизначають проп.**
  `panActivationKeyPressed || _panOnDrag` і `panActivationKeyPressed || _panOnScroll`
  (`FlowRenderer/index.tsx:81-82`) — тобто Space *вмикає* обидва режими, а не додає модифікатор.
  Дзеркально `zoomActivationKeyPressed || zoomOnScroll` (`filter.ts:34`), і при затиснутому
  zoom-key pan-on-scroll примусово вимикається (`XYPanZoom.ts:145`).
- **`preventScrolling={false}` не вимикає pinch.** Гейт спеціально пропускає `ctrlKey`-колесо
  (`eventhandler.ts:147`) — тобто сторінка скролиться, але trackpad-pinch усе ще зумить полотно.
- **macOS pinch = `wheel` + `ctrlKey`.** Множник дельти ×10 саме для цього кейсу
  (`xypanzoom/utils.ts:36-40`). Тобто «pinch» — не окремий жест, а гілка в обробці колеса.
- **Firefox `deltaMode === 1`** нормалізується множником 20 (`eventhandler.ts:100`)
  і 0.05 у `wheelDelta` — інакше швидкість скролу відрізняється в рази між браузерами.
- **Shift+scroll = горизонтальний pan** — тільки не на macOS (`eventhandler.ts:105-108`),
  бо там ОС сама перетворює.
- **pan-on-scroll не використовує d3-шні start/zoom/end.** Власні
  `onPanZoomStart/onPanZoom/onPanZoomEnd` + **дебаунс 150 мс** на «кінець»
  (`eventhandler.ts:120-139`) — бо кожен тік колеса інакше дав би окремий start+end.
- **escape-hatch по класах:** `.nowheel` глушить колесо, `.nopan` глушить драг
  (`filter.ts:65-75`). Це саме те, що дозволяє скролити список усередині вузла.
- **`connectionInProgress`** блокує всі не-wheel жести (`filter.ts:60-62`) — щоб тягнучи
  ребро не почати панувати.
- **`userSelectionActive` викликає `destroy()`** — не «вимикає прапорець», а **знімає
  `zoom`-listener** (`XYPanZoom.ts:141-143, 229-231`). Через це `ResizeObserver` навмисне
  ніколи не відключають (коментар `XYPanZoom.ts:58-64`).
- **Кешований `extent`:** `d3ZoomInstance.extent(() => cachedExtent)` з `ResizeObserver`
  замість дефолтного d3 (той читає `clientWidth/clientHeight` → синхронний layout **на кожен
  кадр** пану/пінчу). Це прямо задокументована оптимізація `XYPanZoom.ts:58-84`.

---

## 2. Програмний рух

Публічний вхід — `useReactFlow()` (він же `ReactFlowInstance`), який мерджить
`useViewportHelper()` (`packages/react/src/hooks/useViewportHelper.ts:19-121`)
з методами стору. Уся сімка зводиться до трьох примітивів `PanZoomInstance`:
`setViewport` / `scaleTo` / `scaleBy` (`XYPanZoom.ts:248-302`).

### Сигнатури (усі повертають `Promise<boolean>`)

```ts
// packages/system/src/types/general.ts:236-256
type ViewportHelperFunctionOptions = {
  duration?: number;                      // ms; 0/undefined = миттєво
  ease?: (t: number) => number;           // дефолт — cubicInOut
  interpolate?: 'smooth' | 'linear';      // дефолт 'smooth'
};
type SetCenterOptions  = ViewportHelperFunctionOptions & { zoom?: number };
type FitBoundsOptions  = ViewportHelperFunctionOptions & { padding?: number };

fitView(options?: FitViewOptions): Promise<boolean>            // react/src/hooks/useReactFlow.ts:294-304
fitBounds(bounds: Rect, options?: FitBoundsOptions)            // useViewportHelper.ts:68-83
setCenter(x: number, y: number, options?: SetCenterOptions)    // react/src/store/index.ts:422-441
zoomTo(zoomLevel: number, options?)                            // useViewportHelper.ts:34-38  → scaleTo
setViewport(viewport: Viewport, options?)                      // useViewportHelper.ts:40-60
zoomIn(options?)                                               // useViewportHelper.ts:24-28  → scaleBy(1.2)
zoomOut(options?)                                              // useViewportHelper.ts:29-33  → scaleBy(1/1.2)
```

Ще поруч (не в списку, але корисне): `panBy(delta)` (`store/index.ts:417-421`),
`getZoom()`, `getViewport()` (`useViewportHelper.ts:39,61-64`).

### Анімація: `duration` / `ease` / `interpolate`

Один спільний механізм, `packages/system/src/xypanzoom/utils.ts:23-34`:

```ts
const defaultEase = (t) => ((t *= 2) <= 1 ? t*t*t : (t -= 2)*t*t + 2) / 2;   // cubicInOut, скопійовано з d3-ease
getD3Transition(selection, duration = 0, ease = defaultEase, onEnd)
  → duration > 0 ? selection.transition().duration(duration).ease(ease).on('end', onEnd)
                 : selection;      // без duration — той самий selection, зміна миттєва
```

`interpolate` вибирає інтерполятор **d3**: `'linear'` → `d3-interpolate.interpolate`,
`'smooth'` (дефолт) → `interpolateZoom` (`XYPanZoom.ts:106-117, 278-302`).
Це принципова різниця: `interpolateZoom` — це **Van Wijk & Nuij «smooth and efficient
zooming and panning»**: камера при далекому перельоті спершу *від'їжджає*, летить,
і *під'їжджає*. `'linear'` — просто лінійна інтерполяція x/y/k, при великій дистанції дає
ефект «розмазаного пролітання» повз усе.

### Неочевидна вартість / пастки

- **Promise резолвиться з `.on('end')` d3-транзиції** (`utils.ts:33`), тобто **перерваний
  користувачем жест лишає Promise невирішеним** — d3 при interrupt стріляє `interrupt`,
  не `end`. `await fitView({duration: 800})` може повиснути назавжди, якщо юзер крутнув колесо.
- **`fitView()` не виконується одразу — він у черзі.** Ставиться `fitViewQueued: true` і
  штовхається no-op у `nodeQueue` (`useReactFlow.ts:294-304`); справжній `fitViewport()`
  запускається аж у `setNodes` і **лише якщо `nodesInitialized`** (`store/index.ts:130-138`).
  Причина: fit неможливий, доки вузли не виміряні. Наслідок — **на порожній сцені
  `nodesInitialized === false`** (`packages/system/src/utils/store.ts:140`), отже
  Promise від `fitView()` **ніколи не резолвиться**, доки не з'являться вузли.
- **Порожня сцена в `fitViewport`** — окремий ранній вихід: `if (nodes.size === 0) return true`
  (`packages/system/src/utils/graph.ts:381-383`). Тобто камера не рухається, але «успіх».
  Два різних поводження на порожнечу залежно від входу.
- **Багаторазовий виклик `fitView` дає один Promise** — резолвер перевикористовується
  (`useReactFlow.ts:296-297`, коментар у `store/index.ts:76-80`).
- **`setCenter` без `options.zoom` бере `maxZoom`, а не поточний зум** (`store/index.ts:429`).
  Це стабільно ловить людей: «центруй на вузлі» несподівано ще й зумить на максимум.
  Внутрішній автопан на фокус вузла це знає і передає зум явно
  (`packages/react/src/components/NodeWrapper/index.tsx:168-180`).
- **`setViewport` приймає часткові координати** — `x ?? tX` тощо (`useViewportHelper.ts:50-57`),
  тож `setViewport({zoom: 2})` рухає лише зум.
- **`setViewport` НЕ обмежується `translateExtent`** — воно йде в `panZoom.setViewport`
  (`XYPanZoom.ts:248-254`), яке кличе `setTransform` напряму. Обмежена версія —
  окрема функція `setViewportConstrained` (`XYPanZoom.ts:233-246`), і вона в публічний
  API не виведена; використовується лише при ініті та в `panBy`.
- **`zoomIn`/`zoomOut` — фіксований множник 1.2** (`useViewportHelper.ts:27,32`), не
  конфігурується пропом; хочеш інший крок — пиши свій через `zoomTo`.
- **`fitBounds.padding` — тільки `number`, дефолт `0.1`** (`useViewportHelper.ts:70`), тоді
  як `fitViewOptions.padding` приймає повний `Padding` (числа, `'10px'`, `'5%'`, per-side об'єкт).
  Асиметрія API.

---

## 3. `fitViewOptions`

```ts
// packages/system/src/types/general.ts:186-195
type FitViewOptionsBase<NodeType> = {
  padding?: Padding;              // number | '10px' | '5%' | {top,right,bottom,left,x,y}
  includeHiddenNodes?: boolean;
  minZoom?: number;               // перекриває глобальний minZoom
  maxZoom?: number;               // перекриває глобальний maxZoom
  duration?: number;
  ease?: (t: number) => number;
  interpolate?: 'smooth' | 'linear';
  nodes?: (NodeType | { id: string })[];   // достатньо {id}
};
```

Реалізація: `getFitViewNodes()` (`packages/system/src/utils/graph.ts:343-372`) →
`getInternalNodesBounds()` → `getViewportForBounds()` → `panZoom.setViewport()`
(`graph.ts:375-403`).

- **`nodes`** — фільтр за `id` через `Set` (`graph.ts:347`); передавати можна як цілі вузли,
  так і `{id}`-заглушки. Це і є «зумни на цей піддерев'я».
- **`includeHiddenNodes`** — перемикає критерій «видимості»: без нього потрібні
  `measured.width/height && !hidden`; з ним береться `getNodeDimensions()` — declared/initial
  розміри, бо приховані вузли **ніколи не рендерились і не мають measured**
  (`graph.ts:352-365`, коментар з посиланням на issue #5841).
- **`minZoom`/`maxZoom`** тут — це clamp на **обчислений** fit-зум (`general.ts:319`), а не
  зміна глобальних меж панзуму.
- **`padding` дефолт `0.1`** (`graph.ts:395`) — 10 % **від відповідного виміру вьюпорта**
  (`parsePaddings`, `general.ts:229-256`): вертикальні відступи рахуються від `height`,
  горизонтальні від `width`, тому `padding: 0.1` — це різна кількість пікселів по осях.
- **Асиметричний padding — двопрохідний алгоритм** (`general.ts:304-342`): спершу рахується
  центрований вьюпорт, потім `calculateAppliedPaddings()` міряє фактичні відступи і зсуває
  камеру рівно настільки, наскільки якийсь бік *недобрав* required-padding
  (`Math.min(applied - required, 0)`). Тобто padding — це **мінімум**, а не точна рамка:
  бік із запасом лишається як є.
- **`'%'` рахується від виміру вьюпорта, `'px'` — абсолютно**; невалідна одиниця →
  `console.error` і `0` (`general.ts:215-219`).
