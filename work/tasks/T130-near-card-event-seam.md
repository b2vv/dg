# T130 — HTML near-картка не має подієвого шва: хост дублює маршрутизацію подій

**Пріоритет:** P1 · **Статус:** 🔵 не почато · **потребує `spec-flow`** (нова публічна поверхня SDK)
**Джерело:** аудит межі SDK↔host 2026-11-05 (`work/reports/library-boundary-audit/_wip-review.md`)
+ відповідь хост-сесії `cass-13` (cassiopeia-admin-ui), підтверджена кодом dg.
**Споживач, що чекає:** `cassiopeia-admin-ui` — прибере `installMountListener`-делегацію
(`src/modules/positions/lib/make-dg-sdk-factory.ts:387`) і canvas-перерахунок (`:435`), коли шов вийде.

## Факт

SDK емітить node-події **лише для Pixi-нод**:

- `packages/sdk/src/render/personInteractions.ts:150` — `pointertap` → `onNodeClick`;
- `packages/sdk/src/render/personCardContent.ts:222` — шеврон (count-expander);
- `packages/sdk/src/render/cardContextMenu.ts:13` — `rightclick` → контекстне меню.

Near-zoom картка — це HTML-оверлей, який за Б2 малює хост (`createReactPromoteOverlay`,
`PromoteSlotProps`). Для неї SDK дає **лише геометрію** (`listPromoteBoxes`, `nodeCanvasPoint`,
`nodeClientPoint`). Pixi-події крізь HTML-шар не проходять, а подієвого шва нема.

## Наслідок у хості (виміряно хостом)

Хост вручну делегує: клік → `onNodeClick`, шеврон → `togglePositionExpand`, конектор → `onLinkClick`,
ПКМ → `openContextMenu`. ПКМ по HTML-картці не ніс `canvasX/canvasY` (їх дає лише Pixi `e.global`),
тому меню ставало зі зсувом; хост рахує canvas-точку з `getBoundingClientRect` сам. Тобто в
кожного консьюмера дублюється логіка, яку бібліотека вже має для Pixi.

## Межа (що міняється, а що ні)

- **Лишається хосту (Б2):** презентація картки — React-компонент, стилі, розмітка.
- **Переходить у SDK:** маршрутизація «DOM-подія на картці → дія» і переведення координат
  у canvas/world. Події near-картки мусять виходити тими самими колбеками й з тими самими
  метаданими (модифікатори, canvas-точка), що й від Pixi-ноди.

## Напрям межі від власника (2026-11-05, передано хост-сесією cass-13)

Хост передає в бібліотеку **шаблон** node / wrapper / link — React **або** canvas. Шаблон отримує
**стан вузла й події**, уся складна логіка (маршрутизація подій, координати, hit-test) лишається в
бібліотеці. Тоді `installMountListener`-делегація й перерахунок canvas-координат у хості зникають.
Це збігається з D2 у [`ROADMAP-extensibility.md`](../ROADMAP-extensibility.md) (дві моделі інжекції:
React-компонент зблизька / Pixi-view-фабрика здалеку) і з R3 (`createNodeView(node, ctx)`).
⚠️ Контракт шаблону **не погоджено** — його вирішують бібліотека й власник у spec-flow цієї таски.

## Відкриті питання для spec-flow

1. Форма шва: SDK сам вішає слухачі на слот (`PromoteSlotProps` отримує готові хендлери) чи хост
   кличе хелпер (`bindPromoteSlotEvents(el, nodeRef)` / `dispatchNodeEvent(...)`)?
2. Які дії входять у перший зріз: клік, шеврон, ПКМ, конектор, hover?
3. Чи має це сходитися з D1 роадмапу (`work/ROADMAP-extensibility.md`, interaction-store) — щоб
   не будувати другу модель подій перед ним?
4. Як не зламати поточний ручний шлях хоста під час переходу (обидва шляхи одночасно → подвійні події)?

## Не входить

- Атомарні node update/remove/add API — хост їх не споживає (лише `setData`-знімок, ADR-0067 у хості).
- Контракт ключа `position:<guid>` ↔ голий guid — окрема мала задача.
