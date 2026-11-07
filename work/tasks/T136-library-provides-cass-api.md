# T136 — бібліотека надає API, яким користується Cass

**Пріоритет:** P1 · **Статус:** 🔵 не почато · **потребує `spec-flow`** (нова публічна поверхня)
**Рішення власника 2026-11-05 (дослівно, кілька формулювань):** «Library must get Cass api for using» ·
«Це в ідеалі» · «Бібліотека повинна надати API Cass для використання» · «The library must provide the Cass
API for use!!!» · «The library must provide an API for Cass to use».

## Модель (власник 2026-11-05, дослівно)

> «Remember you are a diagram library you provide an API. Cass sends templates for react and pixi
> nodes/wrappers/lines, styles and themes. I want to do it like react flow does. it is already written the core
> for calculations is already there is an orchestrator for switching layers is also in the library»

- **Cass передає:** дані · **шаблони** `node` / `wrapper` / `line` — кожен у двох виглядах: **React** (близький
  зум) і **Pixi** (далекий) · **стилі** · **теми**.
- **Бібліотека робить усе інше:** розрахунки (ядро вже є), перемикання шарів React↔Pixi (оркестратор уже є),
  розміщення, події, координати, hit-test, стан взаємодії. Шаблон отримує **стан і події**, нічого не рахує.
- **Орієнтир — React Flow** (`nodeTypes` / `edgeTypes`, `NodeProps`), з поправкою: у dg кожен шаблон має
  ще й Pixi-вигляд (D2 роадмапу: дві моделі інжекції, природні кожній технології).

**Стан на 2026-11-05:**

| Що передає Cass | Аналог React Flow | dg зараз |
|---|---|---|
| React-шаблон вузла | `nodeTypes` | ✅ `createReactPromoteOverlay({ component })` / `PromoteSlotProps`; події картки — хост (T130) |
| React-шаблони обгортки й лінії | group-ноди, `edgeTypes` | ⚠️ один суцільний `backdrop`: хост сам малює всі рамки й лінії з `getStaffChromeGeometry()` |
| Pixi-шаблони node/wrapper/line | — | ❌ лише внутрішні view (`StaffPersonView`, `OrgEdgesView`…); публічна фабрика — R3 роадмапу |
| Стилі | `style`, `className` | ✅ `styles` / `setStyles` (`NodeThemeOverrides`) |
| Теми | `colorMode` | ✅ `theme` / `setTheme` |
| Стан у пропсах шаблону | `NodeProps` | ⚠️ частково |
| Події від бібліотеки | `onNodeClick`, `onEdgeClick` | ⚠️ з Pixi — є; з React-шаблонів — нема (T130) |

T130 (подієвий шов near-картки) — **частина цієї моделі**, не окрема лінія.

## Мета

Бібліотека надає **свій** повний API, яким хост `cassiopeia-admin-ui` користується напряму, без власної логіки
поверх. Порт хоста `TreeDiagramEngine` (`src/shared/lib/gojs-diagram/tree-diagram-engine.ts`: **23 методи,
8 подій**) — це **перелік потреб** Cass (що хост робить із діаграмою), а **не форма**, яку треба відтворити:
порт успадкований від GoJS-рушія. Кожна потреба зі списку має мати відповідь у API бібліотеки; як саме вона
виглядає — вирішує spec-flow.

Після T136 у хості зникають (або стають тонкими):
- `src/shared/lib/gojs-diagram/dg-tree-diagram.engine.ts` (501 р.) — адаптер порту;
- `src/modules/positions/lib/make-dg-sdk-factory.ts` (504 р.) — create, буфер, оверлей, `installMountListener`,
  перерахунок координат, індекс дат лінків.

## Розрив сьогодні

Повна карта — [`work/reports/library-boundary-audit/host-port-coverage.md`](../reports/library-boundary-audit/host-port-coverage.md):
бібліотека покриває 1:1 лише **7 із 23** методів і **2 із 8** подій; решту хост дописує сам або її нема.

## Складові (уже заведені таски — тепер частини T136)

| Таска | Що закриває в порті |
|---|---|
| [T130](./T130-near-card-event-seam.md) | події near-картки: `nodeClicked`, `nodeDoubleClick`, `contextMenu`, `reparent` з HTML; шаблони хоста |
| [T133](./T133-setdata-preserves-view-state.md) | `setData` без втрати згортання/виділення/підсвітки/пошуку |
| [T134](./T134-zoom-controls-in-library.md) | `increaseZoom` / `decreaseZoom` |
| [T135](./T135-export-matches-screen.md) | `exportPng` як на екрані |

## Нове, чого ще не заведено окремо

- **Життєвий цикл:** синхронний `init(host)` поверх асинхронного `create`, буфер `setData` до готовності
  (last-wins), безпечний `dispose` під час `create`, початковий fit першої сцени.
- **`setData(..., { preserveViewport })`** — збереження камери в бібліотеці.
- **`expand(key)` / `collapse(key)`** — явні й ідемпотентні (нині хост емулює через `toggle`).
- **`reveal(key, { onlyWhenOffscreen })`** — панорамувати лише коли вузол поза кадром; без виділення.
- **Події, які нині емітить хост:** `expanderToggled`, `linkClick` — від бібліотеки.
- **`invalidateIcon(fileRef)`** — підключити до наявного `media.invalidate`.
- **`visibleNodeKeys`** — ключі в тому вигляді, що й дані порту (без `position:` префікса), і чітка семантика «видимі».
- **`dispose`** — прибирає все, що бібліотека змонтувала (оверлеї, якорі).

## Відкриті питання для spec-flow

1. Де живе реалізація: новий вхід пакета (напр. `@org-hierarchy/sdk/tree-engine`) чи `./react` (вона монтує
   React-оверлей з картками)?
2. Чи лишається в хості порт `TreeDiagramEngine` як тонка прокладка над API бібліотеки (бо через нього ж іде
   GoJS-діаграма організацій), чи контролер ШПС кличе API бібліотеки напряму?
3. Порт сьогодні GoJS-подібний (`setData(TData)` з generic, `invalidateIcon(fileReference)`): що лишити як є,
   а що спростити, поки міграція хоста ще не завершена (діаграма організацій — ще GoJS)?
4. Порядок: який мінімальний зріз дає хосту видалити адаптер найшвидше?
