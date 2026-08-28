# React Flow — інвентаризація, ділянка 4: дані, стан, інтеграція, екосистема

**Джерело:** клон `xyflow/xyflow` @ `b1b99e9`, `@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`.
Шляхи виду `packages/react/src/...` — відносно кореня клону. Шляхи виду `packages/sdk/src/...` —
відносно `/Users/strelia/projects/dg`. Ліцензія React Flow: MIT (`LICENSE:1`, webkid GmbH).

Суміжні ділянки (не мої, згадую одним рядком): взаємодія/редагування — ділянка 1;
в'юпорт/навігація — ділянка 2; рендер/контент — ділянка 3.

---

## Зведення

| Тема | React Flow | У нас (`dg`) | Вердикт |
| --- | --- | --- | --- |
| Контрольований режим | `nodes`/`edges` + `onNodesChange`/`onEdgesChange` | немає; `setData()` імперативно | **немає, і треба** (частково) |
| Неконтрольований режим | `defaultNodes`/`defaultEdges`, стан у сторі | так — це наш **єдиний** режим | є, але без другої опції |
| `useNodesState`/`useEdgesState` | хелпер-міст між двома режимами | немає | немає, і не треба (не React-first) |
| Changes API (`NodeChange`/`EdgeChange`) | 6 + 4 типи змін, `applyNodeChanges` | `LayoutPatch` — 5 типів, лише layout | **немає, і треба** (розширити) |
| `addEdge` / `reconnectEdge` | pure-утиліти над масивом | немає (edges виводяться з `reportLines`) | немає, і не треба |
| Серіалізація `toObject()` | `{nodes, edges, viewport}` | немає | **немає, і треба** |
| Відновлення стану | просто `setNodes/setEdges/setViewport` | часткові сеттери є, агрегату немає | **немає, і треба** |
| Хуки (19 публічних) | повний React-first доступ до стану | 0 хуків; ~60 методів класу | немає, і не треба (але див. §4) |
| `nodeLookup`/`parentLookup`/`edgeLookup`/`connectionLookup` | 4 живі Map у сторі | немає жодного персистентного lookup | **немає, і треба** |
| `InternalNode` (user node + `internals`) | явний поділ user/internal | немає — `DiagramData` мутують на місці | **немає, і треба** |
| `getIncomers`/`getOutgoers`/`getConnectedEdges` | публічні pure-утиліти | немає (є `revealOrgPath`, `filterDiagramSubtree`) | немає, і треба (дешево) |
| `getNodesBounds` | публічна | `orgCardAabb`, `listPromoteBoxes` — часткові | частково є |
| `getElementsToRemove` + `onBeforeDelete` | veto-хук на видалення | немає (немає delete API взагалі) | немає, і не треба зараз |
| Дженерики `Node<TData,TType>`, `ReactFlow<N,E>` | наскрізні | `OrgHierarchyConfig<TRaw>`, `DiagramMappers<TRaw>` | є, вужче |
| `<ReactFlowProvider>`, кілька інстансів | ізольовані zustand-стори | клас-інстанс на контейнер | є (природно) |
| SSR/гідратація | `width`/`height`, `initialWidth/Height`, `handles[]` | немає (Pixi/WebGL, browser-only) | немає, і не треба |
| `onInit` | інстанс у колбеку після mount | `await OrgHierarchyDiagram.create()` | є (краще) |
| Тестування застосунків споживача | `mockReactFlow()` для jest + порада Playwright/Cypress | `testAnchors` + `createTestAnchorOverlay` | **є, і сильніше за них** |
| Pro | платні приклади/шаблони + зняття атрибуції; ядро MIT | — | n/a |
| Розмір | 187 KB min / 59.8 KB gzip (+ d3) | `pixi.js` як dependency | n/a |

---

## 1. Форма публічного API: контрольований vs неконтрольований

### 1.1 Що це в них

React Flow свідомо тримає **два режими володіння даними**, і обидва — публічні.

**Контрольований (controlled).** Хост передає `nodes` / `edges` як props і зобов'язаний
самостійно застосувати кожну зміну:

- `packages/react/src/types/component-props.ts:73` — `nodes?: NodeType[]` («array of nodes to render in a **controlled** flow»);
- `.../component-props.ts:86` — `edges?: EdgeType[]`;
- `packages/react/src/types/general.ts:35` — `type OnNodesChange<NodeType> = (changes: NodeChange<NodeType>[]) => void`;
- `.../general.ts:50` — `OnEdgesChange`.

**Неконтрольований (uncontrolled).** Хост дає лише початковий знімок, далі стан живе у сторі:

- `.../component-props.ts:88` — `defaultNodes?: NodeType[]` («The **initial** nodes to render in an uncontrolled flow»);
- `.../component-props.ts:90` — `defaultEdges?: EdgeType[]`.

**Розвилка — один прапорець у сторі**, і вона видна у 15 рядках коду:

```ts
// packages/react/src/store/index.ts:265
triggerNodeChanges: (changes) => {
  const { onNodesChange, setNodes, nodes, hasDefaultNodes, debug } = get();
  if (changes?.length) {
    if (hasDefaultNodes) {            // uncontrolled: стор сам застосував зміни
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
    }
    if (debug) console.log('React Flow: trigger node changes', changes);
    onNodesChange?.(changes);         // controlled: віддали хосту, чекаємо новий props
  }
},
```

- `hasDefaultNodes` виставляється один раз: `packages/react/src/store/initialState.ts:99`
  (`defaultNodes !== undefined`) і в `store/index.ts:150` (`setDefaultNodesAndEdges`).
- Ключове: **обидва режими проходять через одну й ту саму трубу змін**. Внутрішній код ніколи
  не пише в `nodes` напряму — він завжди формує `NodeChange[]` і кличе `triggerNodeChanges`.
  Це і є причина, чому два режими не розповзаються.
- Дзеркальна логіка для батчевих `setNodes/addNodes` — `packages/react/src/components/BatchProvider/index.tsx:60`
  (`if (hasDefaultNodes) setNodes(next); if (changes.length > 0) onNodesChange?.(changes);`).
  Тут різниця з `triggerNodeChanges` в тому, що дельту доводиться **обчислювати** —
  `getElementsDiffChanges` (`packages/react/src/utils/changes.ts:271`) порівнює новий масив із
  `nodeLookup` і синтезує `replace` / `add` / `remove`.

**`useNodesState` / `useEdgesState`** — офіційний міст: контрольований режим із мінімумом коду.

```ts
// packages/react/src/hooks/useNodesEdgesState.ts:51
export function useNodesState<NodeType extends Node>(initialNodes: NodeType[]):
  [nodes, setNodes: Dispatch<SetStateAction<NodeType[]>>, onNodesChange: OnNodesChange<NodeType>]
```
Реалізація — три рядки: `useState` + `useCallback((changes) => setNodes(nds => applyNodeChanges(changes, nds)))`.
У доці чесна ремарка (`useNodesEdgesState.ts:45`): хук зроблений «щоб прототипувати було легше»,
у продакшені радять свій state-manager.

**Що ще примітно.**
- `experimental_useOnNodesChangeMiddleware` (`packages/react/src/hooks/useOnNodesChangeMiddleware.ts:13`)
  — реєстрація `(changes) => changes` перехоплювача **перед** доставкою хосту. Це дає
  «змінити/відфільтрувати зміну, не переписуючи весь обробник».
- `debug` prop друкує кожен пакет змін у консоль (`store/index.ts:271`) — дешевий інтроспект.

### 1.2 Що в нас

У нас **тільки неконтрольований режим**, і він не названий так явно.

- Дані заходять один раз через `OrgHierarchyConfig.data` + `mappers`
  (`packages/sdk/src/OrgHierarchyDiagram.ts:87-99`) або цілим шматком через
  `setData()` (`packages/sdk/src/OrgHierarchyDiagram.ts:631`) / `appendData()` (`:666`).
- Далі **власником канонічних даних є SDK**: `DataStore` (`packages/sdk/src/state/DataStore.ts:7`),
  плюс `ViewStateStore` (`packages/sdk/src/state/ViewStateStore.ts:10`) і
  `SelectionStore` (`packages/sdk/src/state/SelectionStore.ts:15`).
- Читання назад — `getData(): DiagramData` (`OrgHierarchyDiagram.ts:623`), і воно повертає
  **живий об'єкт** (`DataStore.snapshot` — `state/DataStore.ts:10`, без копії).
- Повідомлення хосту про зміну — `OrgHierarchyCallbacks` (`packages/sdk/src/callbacks.ts:12`):
  `onLayoutChange(patch: LayoutPatch)`, `onSelectionChange`, `onOrgModeChange`,
  `onPositionExpandChange`, `onDataMapped`, `onLayoutDiagnostics`.

Тобто наш `onLayoutChange` — це **функціональний аналог `onNodesChange`**, але:

| | React Flow `onNodesChange` | Наш `onLayoutChange` |
| --- | --- | --- |
| Хто застосував зміну | у controlled — **ще ніхто**, хост зобов'язаний | **вже застосував SDK** |
| Чи може хост відхилити | так (просто не застосувати) | ні — це нотифікація постфактум |
| Утиліта «застосувати до моїх даних» | `applyNodeChanges(changes, nodes)` | немає |
| Пакетність | масив змін за раз | по одному патчу |
| Покриття | позиція, розмір, селект, add/remove/replace | лише 5 layout-операцій |

`LayoutPatch` (`packages/sdk/src/callbacks.ts:5-10`): `position-move`, `matrix-reorder`,
`matrix-cell`, `block-shift`, `position-expand`. Це вужче за `NodeChange` і — головне —
**односпрямоване**: хост дізнається, але не вирішує.

### 1.3 Вердикт

**Немає, і треба — частково.** Повний controlled-режим нам, найпевніше, не потрібен: у нас
дані живуть у WASM-layout і Pixi-сцені, «джерело правди у React-state хоста» коштувало б
перерахунку всієї сцени на кожен кадр драгу. Але **дві конкретні речі з їхньої моделі — треба**:

1. **Veto / preview перед застосуванням.** Зараз `onLayoutChange` — постфактум. Мінімальний
   крок у їхньому дусі — дозволити колбеку повернути `false` (як `onBeforeDelete`,
   `packages/system/src/utils/graph.ts:483`, або як наш `onContextMenu`, що вже вміє
   `MenuItem[] | false | void` — `packages/sdk/src/callbacks.ts:20`). У нас уже є прецедент
   у своєму ж API; варто його поширити на `onLayoutChange`.
2. **Пакетність.** `expandToDepth` (`OrgHierarchyDiagram.ts:767`) і
   `collapsePositionSubtree` (`:804`) змінюють десятки вузлів. Зараз
   `onPositionExpandChange` віддає `changedIds: readonly string[]` (`callbacks.ts:40`) —
   тобто ми вже наполовину прийшли до «масив змін», просто нерівномірно по API.
   Варто уніфікувати: **усі** колбеки-нотифікації віддають масив, а не скаляр.

Чого **не варто** копіювати: `useNodesState`-подібний хелпер (він має сенс лише для
React-first API) і повний dual-mode. Але **назвати вголос**, що ми — uncontrolled-only, і
записати це в `docs/USAGE.md` §1 («Що це і чого воно не робить», `docs/USAGE.md:9`) — треба:
зараз читач цього рішення в документації не бачить.

---
