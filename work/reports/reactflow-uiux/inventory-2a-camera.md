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
