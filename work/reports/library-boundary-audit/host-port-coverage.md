# Покриття порту хоста `TreeDiagramEngine` бібліотекою dg

**Дата:** 2026-11-05 · **Ціль (власник):** «Library must get Cass API for using… це в ідеалі» — бібліотека дає
готовий API під те, як `cassiopeia-admin-ui` користується діаграмою; адаптер хоста
(`src/shared/lib/gojs-diagram/dg-tree-diagram.engine.ts`, 501 р.) і фабрика
(`src/modules/positions/lib/make-dg-sdk-factory.ts`, 504 р.) стають тонкою прокладкою без власної логіки.
**Як знято:** читанням коду; контракт порту — `src/shared/lib/gojs-diagram/tree-diagram-engine.ts`.

**Легенда:** ✅ бібліотека покриває 1:1 · ⚠️ покриває, але хост дописує логіку · ❌ у бібліотеці нема

## Методи порту

| Метод порту | Що робить хост зараз | Бібліотека | Статус | Що бракує в бібліотеці |
|---|---|---|---|---|
| `init(host)` | асинхронний `create` ховає за синхронним хендлом: буфер `setData` до готовності (last-wins), знищення «сироти», якщо `dispose` прийшов під час `create` | `OrgHierarchyDiagram.create` (async) | ⚠️ | життєвий цикл: синхронне монтування з буфером даних |
| `setData(data, {preserveViewport})` | сам зберігає/відновлює камеру; на першій сцені сам робить fit | `setData` | ⚠️ | опція збереження камери; початковий fit; збереження стану перегляду — [T133](../../tasks/T133-setdata-preserves-view-state.md) |
| `expand(key)` / `collapse(key)` | емулює ідемпотентність: читає `getStaffExpandedPositionIds()` і кличе `togglePositionExpand` | лише `togglePositionExpand` | ⚠️ | явний `setPositionExpanded(id, bool)`; ⚠️ перевірка хоста дивиться лише набір, а предикат SDK — ще й `position.expanded === true` |
| `setSelection(keys)` | `selectMany` / `clearSelection`, тип вузла захардкоджено `'position'` | `selectMany`, `clearSelection` | ✅ | — |
| `highlightSelectionPath(keys)` | бере **лише перший** ключ | `highlightPath(id)` | ⚠️ | підсвітка кількох шляхів (якщо потрібна) |
| `setFoundFocus(key, badgeText)` | `badgeText` ігнорує | `setFoundFocus(ids)` | ⚠️ | бейдж «знайдено» з текстом |
| `reveal(key, {onlyWhenOffscreen})` | `onlyWhenOffscreen` ігнорує; виділяє вузол усупереч порту | `revealPath(id, {select:false})` (`945069b`) | ⚠️ | `onlyWhenOffscreen` — панорамувати лише коли вузол поза кадром |
| `increaseZoom` / `decreaseZoom` | `setViewport({scale × 1.2})` — навколо кута | `zoomBy` (центр, без анімації) | ❌ | [T134](../../tasks/T134-zoom-controls-in-library.md) |
| `zoomToFit` | `fitStaffChrome()` | `fitStaffChrome` | ✅ | — |
| `visibleNodeCount` / `visibleNodeKeys` | `listPromoteBoxes()` + фільтр `position` | `listPromoteBoxes` | ⚠️ | ключі typed `position:<id>` (D8); семантика «видимі» = усі розкладені бокси, не «в кадрі» — **не перевірено**, що порт очікує саме це |
| `selectedKeys` | `getSelections().map(id)` | `getSelections` | ✅ | — |
| `nodeCenter` / `nodeCanvasPoint` | прохід | ті самі | ✅ | — |
| `expanderCenter` | прохід | лише кнопки **організацій** (`docs/USAGE.md`) | ⚠️ | шеврон посади малює хост (DOM) — для посад завжди `null` |
| `subordinateCounts` | `getNode().getData()` → `childrenCount`/`allDescendantCount` | SDK ≥1.1.1 | ✅ | — |
| `invalidateIcon(fileRef)` | **порожній** | `media.invalidate(url)` є (`media/MediaService.ts:112`) | ⚠️ | мапінг `fileReference → url` — знання хоста; або бібліотека приймає ключ хоста |
| `exportPng` | сирий `canvas.toBlob` | `export()` не знімає React-хром на near/mid | ❌ | [T135](../../tasks/T135-export-matches-screen.md) |
| `applyTheme` | `setTheme` | `setTheme` | ✅ | — |
| `dispose` | знищує оверлеї, тест-якорі, слухач, діаграму | `destroy` (оверлеї окремо) | ⚠️ | один `destroy`, що прибирає й те, що бібліотека змонтувала |

## Події порту (`on`)

| Подія | Звідки зараз | Статус | Що бракує |
|---|---|---|---|
| `nodeClicked` | Pixi → SDK `onNodeClick` ✅ · HTML-картка → **хост** викликає колбек сам | ⚠️ | [T130](../../tasks/T130-near-card-event-seam.md) |
| `nodeDoubleClick` | лише Pixi; HTML-картка — ніхто (у посадах не слухають) | ⚠️ | T130 |
| `backgroundClicked` | SDK | ✅ | — |
| `expanderToggled` | емітить **хост** після свого `togglePositionExpand` | ⚠️ | SDK вже шле `onPositionExpandChange` — порт міг би брати його |
| `contextMenu` | Pixi → SDK ✅ · HTML → хост рахує canvas-точку з `getBoundingClientRect` | ⚠️ | T130 |
| `viewportChanged` | SDK | ✅ | — |
| `reparent` | SDK `onLayoutChange(position-reparent)` лише з Pixi-drag; на near-зумі drag, імовірно, недоступний (D4) | ⚠️ | T130 |
| `linkClick` | емітить **хост** з SVG-ліній свого хрому | ⚠️ | подія лінка від SDK (лінії — геометрія бібліотеки, Б2) |

## Що робить фабрика хоста поза портом

Монтує `createReactPromoteOverlay` з карткою хоста й backdrop'ом, вето `shouldPromote` для не-посад,
`onSlotError`, лейбли на кожен рендер, DEV-тест-якорі, шов `__orgHierarchy`, індекс дат лінків для
`linkClick`. Більшість — склейка шаблонів хоста зі шарами бібліотеки; у моделі T130 це має стати
«хост передає шаблони, бібліотека монтує».

## Підсумок

- **Покрито 1:1 — 7 методів із 23** (`setSelection`, `zoomToFit`, `selectedKeys`, `nodeCenter`, `nodeCanvasPoint`,
  `subordinateCounts`, `applyTheme`) **і 2 події з 8** (`backgroundClicked`, `viewportChanged`). Межа переліку —
  методи й події в `tree-diagram-engine.ts` хоста станом на `61459a01c`.
- **Решта — хост дописує логіку або її нема.** Найбільші блоки: події near-картки (T130), стан через `setData`
  (T133), зум (T134), експорт (T135), життєвий цикл монтування, явне `expand/collapse`, `onlyWhenOffscreen`.
