# Контракт рушія хоста → SDK 1.0.0: що покрито, чого бракує

Джерело контракту: повідомлення Cass-1 від 2026-11-02 про `src/shared/lib/gojs-diagram/tree-diagram-engine.ts`
на `main` хоста (20 методів + 8 подій). Сам файл хоста я не читав; цей список — переказ Cass-1.
Cass-1 підтвердив переказ контракту (28 членів, форми ✗-членів) — але лише host-факти, не класифікацію ✗/≈.
Уточнення Cass-1: у знесеній 4311-роботі згортання+fit і пошук жили на боці хоста поверх шва, не в SDK.
SDK звірено з `packages/sdk/src/OrgHierarchyDiagram.ts` і `callbacks.ts` на `0e737de`. Межа переліку: тільки ці 28 членів.

Легенда: ✓ — є прямий відповідник; ≈ — адаптер збере з наявного; ✗ — у SDK немає.

## Методи (20)

| Член хоста | SDK | Стан |
|---|---|---|
| `init(host)` | конструктор/mount `OrgHierarchyDiagram` | ✓ |
| `setData(data, {preserveViewport})` | `setData` (камеру не чіпає; рефіт — окремо `fitView`) | ≈ |
| `expand` / `collapse(nodeKey)` | `togglePositionExpand`, `collapsePositionSubtree`, `expandOrg`/`collapseOrg` | ≈ (ідемпотентних `expandPosition`/`collapsePosition` нема) |
| `setSelection(keys[])` | `selectMany(NodeRef[])` | ≈ (key→NodeRef) |
| `reveal(nodeKey)` | `revealPath` | ✓ |
| `increaseZoom` / `decreaseZoom` | `zoomBy` | ✓ |
| `zoomToFit()` | `fitView` | ✓ (але для alpha див. нижче) |
| `visibleNodeCount` / `visibleNodeKeys` | — (є `listPromoteBoxes` + `getViewport`) | ≈ |
| `selectedKeys()` | `getSelections` | ✓ |
| `nodeCenter` (page) / `nodeCanvasPoint` (canvas) | — (є `listPromoteBoxes`, `getViewport`, `getCanvas`) | ≈, кандидат на метод SDK |
| `expanderCenter(key)` | `listTestAnchors().expander` — **лише для організацій** | ✗ для посад |
| `invalidateIcon(fileRef)` | `diagram.media` (USAGE §8) | ✓ (не перевіряв семантику fileRef) |
| `exportPng()` | `export({ format: 'png' })` | ✓ |
| `applyTheme(mode)` | `setTheme` | ✓ |
| `on(event, cb)` / `dispose()` | колбеки конфігу / `destroy` | ≈ (фан-аут в адаптері) |

## Події (8)

| Подія хоста | SDK | Стан |
|---|---|---|
| `nodeDoubleClick` | `onNodeDoubleClick` | ✓ |
| `nodeClicked{modifiers}` | `onNodeClick(node)` — **без модифікаторів** | ✗ |
| `backgroundClicked` | `onBackgroundClick` | ✓ |
| `expanderToggled{expanded}` | `onPositionExpandChange` / `onOrgExpandChange` | ✓ |
| `contextMenu{incomingLink, viewportPoint}` | `onContextMenu({node, items, pointer})` — **без `incomingLink`** | ✗ частково |
| `viewportChanged` | `onViewportChange` | ✓ |
| `reparent` | `onLayoutChange` `position-reparent` | ✓ |
| `linkClick{structureId, fromDate, toDate}` | — | ✗ |

## Специфічно для ШПС alpha (те, що власник бачив у демо)

Головна прогалина не в таблиці, а в тому, що alpha-поведінка живе в **демо**, а не в SDK:
картка `ShpsStaffCard`, хром `StaffChromeBackdrop`, згортання (`staffCollapsed` — фільтр даних у
`App.ts`), пошук `StaffSearchDropdown`, v3-fit `staffFitTransform`. Хост через SDK цього не отримає.
Через це для alpha не працюють `expanderToggled` і `expanderCenter` (шеврон — React-DOM демо),
а `zoomToFit` дає старий `fitView` (zoom 4.00 на одній картці).

## Беклог SDK (кандидати, до узгодження з Cass-1/власником)

1. Перенести alpha-картку, хром, згортання й fit з демо в SDK (або дати хосту рецепт) — найбільший пункт.
2. `nodeClicked.modifiers`: додати модифікатори в `onNodeClick` — розширення без ламання.
3. `linkClick` + `contextMenu.incomingLink`: хіт-тест по лініях ШПС.
4. `expanderCenter` для посад.
5. Опційно: `nodeScreenPoint(key)` / `visibleNodeIds()` як методи, щоб адаптер не рахував їх сам.

Пункти 2–5 — нова публічна поверхня, тобто minor-версії 1.x; ламати нічого не треба.

## Після reset 4311 (2026-11-02)

Власник (через Cass-1): 4311 не відновлюється — там хост сам рахував геометрію/розміри карток
(DOM-вимір + власні константи). Інваріант host-смуги: геометрію рахує лише SDK (Rust), хост читає.
Попередній перелік від Cass-1, які точки мають стати методами SDK: `nodeCenter`, `nodeCanvasPoint`,
`expanderCenter`, розмір/bbox картки. Фінальний перелік — після design-doc Cass-1.

Уточнення (той самий день): розмір картки — **вхід** SDK (`nodeSizes` / `position.width|height`,
`packages/sdk/src/render/buildStaffLayoutInput.ts:41-46`), сумісно з ADR-0079 хоста (калібрація під
Onest у хості). Причина reset за словами власника (через Cass-1): хост рахував лінії/лейаут/позиції
поверх SDK + костилі; калібрація розмірів сама не була причиною. Інваріант: уся геометрія — лише
Rust/SDK; корекції позиціонування — у Rust, не в хості. Хто дає калібрований розмір — у design-doc.
