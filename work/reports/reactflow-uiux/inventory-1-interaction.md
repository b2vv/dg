# React Flow — інвентаризація, ділянка 1: взаємодія та редагування

**Матеріал:** клон xyflow, коміт `b1b99e9` (`@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`),
шлях клону: `/private/tmp/.../scratchpad/xyflow`. Усі `шлях:рядок` нижче — відносно кореня клону.

**Наш репо:** `/Users/strelia/projects/dg` (Org Hierarchy SDK, Pixi.js 8 + TypeScript).
Нічого не змінювалось — це інвентаризація.

**Ключова асиметрія, з якої випливає половина вердиктів:** у React Flow ребра малює користувач
(`onConnect` створює `Edge` і кладе його в масив), у нас ребра **виводяться зі структури** —
`layoutStaffCanvas` / `buildSpineBusPaths` рахують геометрію з `reportLines`, а шар ребер узагалі
не приймає події: `packages/sdk/src/render/LayerManager.ts:30` (`this.edges.eventMode = 'none'`),
закріплено тестом `packages/sdk/src/render/nodeInteractions.contract.test.ts:356`.
Тому «створити зв'язок мишею» в нас не має де застосуватись **у первинному вигляді**, але має
осмислене перетлумачення (див. §2.7).

---

## Зведення

| Фіча | Є в React Flow | Є в нас | Вердикт |
|---|---|---|---|
| Плавний драг ноди (d3-drag + snapped-diff gate + in-place мутація) | так, `XYDrag.ts` | частково, `personInteractions.ts` | **треба доробити** (§1) |
| Auto-pan під час драгу | так, `XYDrag.ts:232` | ні | треба (§1.6) |
| `nodeDragThreshold` / `nodeClickDistance` | так | так (4px hard-coded) | є, різниця в конфігурованості |
| `dragHandle` / `noDragClassName` | так | ні (тягнеться вся картка) | не треба (§1.8) |
| Магнітне притягання до handle (`connectionRadius`) | так, `xyhandle/utils.ts:28` | ні | **треба, у перетлумаченні** (§2.7) |
| `connectionMode` loose/strict, `isValidConnection` | так | ні | треба в перетлумаченні (§2.7) |
| Підсвітка валідної/невалідної цілі | так, CSS-класи на handle | ні | треба (§2.7) |
| Перепідключення ребра (`reconnectEdge`, `onReconnect*`) | так | ні | **треба, у перетлумаченні** (§2.6) |
| Connection line + її типи | так | не застосовно | не треба (ребра похідні) |
| `snapToGrid` / `snapGrid` | так | так, але завжди-увімкнено | є, §3 |
| Helper lines / вирівнювання | **ні** (тільки приклад у доках) | ні | див. «чого немає в них» |
| Рамка виділення (box-select) | так, `Pane/index.tsx` | ні | треба (§4) |
| `selectionMode` Full/Partial | так | не застосовно поки нема рамки | §4 |
| `multiSelectionKeyCode` | так | так, але без keyCode (модифікатор миші) | є, §4 |
| Переміщення групи (`NodesSelection`) | так | ні | треба (§4) |
| Клавіатура: стрілки/Enter/Escape | так, `NodeWrapper/index.tsx:128` | **ні взагалі** | треба (§5) |
| `tabIndex` / `role` / `aria-*` / live-region | так, `A11yDescriptions` | ні (Pixi-канва) | треба, але інакше (§5) |
| `autoPanOnNodeFocus` | так | ні | треба (§5) |
| `NodeResizer` / `XYResizer` | так | ні | не треба (§6) |
| `parentId` / `extent:'parent'` / `expandParent` | так | ні (є свій expand/collapse) | не треба у їх вигляді (§6) |
| `deleteKeyCode` / `onBeforeDelete` / каскад на ребра | так | **ні** | треба (§7) |
| DnD із палітри | не в бібліотеці, приклад | ні | треба (§7.2) |
| Копіювання/вставка | **ні** | ні | не треба |
| Undo/redo | **ні** | ні | треба нам (§7.4) |

## 1. 🔴 Плавність перетягування ноди

### 1.1 Що це
Перетягування ноди мишею/пальцем із порогом старту, обмеженням по extent, прилипанням до сітки,
авто-панорамою біля краю і трьома колбеками (`onNodeDragStart/onNodeDrag/onNodeDragStop`).
Уся механіка — у framework-agnostic класі `XYDrag`, React лише монтує його на DOM-вузол ноди.

### 1.2 API-поверхня
- Пропи: `nodesDraggable`, `nodeDragThreshold`, `nodeClickDistance`, `dragHandle` (на ноді),
  `noDragClassName`, `selectNodesOnDrag`, `autoPanOnNodeDrag`, `autoPanSpeed`, `nodeExtent`,
  `snapToGrid`, `snapGrid` — перелік у `packages/react/src/types/component-props.ts:394,676,268,555,446,632,649,503,375,380`.
- Колбеки: `onNodeDragStart/onNodeDrag/onNodeDragStop` (`component-props.ts:114-118`),
  `onSelectionDragStart/Drag/Stop` (`:196-200`).
- Ядро: `packages/system/src/xydrag/XYDrag.ts:100` (`XYDrag(...)`), хук
  `packages/react/src/hooks/useDrag.ts:22`, монтується у `packages/react/src/components/NodeWrapper/index.tsx:72`.

### 1.3 На чому побудовано
**d3-drag + d3-selection**, не власний pointer-стек: `packages/system/src/xydrag/XYDrag.ts:1-2`,
інстанс — `:306` `drag().clickDistance(nodeClickDistance).on('start'|'drag'|'end').filter(...)`,
підключення — `:411` `d3Selection.call(d3DragInstance)`. З цього безкоштовно виходить: захоплення
покажчика (драг не рветься, коли курсор вийшов за картку чи за канву), коректний touch, і
`clickDistance` — рух менший за N px взагалі не рахується драгом, а лишається кліком.

Фільтр драгу — там же, `:401-409`: не ліва кнопка → ні; є `noDragClassName` у ланцюжку предків → ні;
є `dragHandle`-селектор і ціль поза ним → ні. `hasSelector` (`xydrag/utils.ts:22`) йде вгору по
`parentElement` **до `domNode`**, а не до кореня документа.

### 1.4 Що відбувається на кожен pointermove — і чого НЕ відбувається
Обробник `'drag'` — `XYDrag.ts:324-363`. По кроках:

1. `getPointerPosition` (`packages/system/src/utils/dom.ts:11-28`) повертає **і сиру, і зняповану**
   позицію (`x, y, xSnapped, ySnapped`) — коментар на `:22` прямо каже навіщо: щоб можна було
   дешево пропускати зайві drag-події.
2. **Gate на «руху не було»** — `XYDrag.ts:359`:
   `if ((lastPos.x !== pointerPos.xSnapped || lastPos.y !== pointerPos.ySnapped) && dragItems && dragStarted)`.
   При `snapToGrid` це відсікає **всі** рухи всередині клітинки; без нього — субпіксельні дублікати.
3. `updateNodes()` (`:130-230`) проходить **лише по `dragItems`**, а не по всіх нодах.
   `dragItems` збирається **один раз на `dragstart`** — `getDragItems` (`xydrag/utils.ts:35-76`);
   саме там єдиний повний обхід `nodeLookup`, і він не повторюється на рух.
4. Позиція мутується **in-place**: `XYDrag.ts:204-205`
   `dragItem.position = position; dragItem.internals.positionAbsolute = positionAbsolute;`
   Ніяких нових об'єктів на ноду на кадр.
5. **Другий gate — `hasChange`** (`:202` рахується, `:210` `if (!hasChange) return;`). Якщо extent
   притиснув ноду і вона фактично не зрушила — стор не чіпають узагалі.
6. `updateNodePositions(dragItems, true)` (`:214`) → `packages/react/src/store/index.ts:211` формує
   масив `position`-змін із `dragging: true` і віддає в `triggerNodeChanges`.
7. Колбеки хоста викликаються **тільки якщо вони є** — `:216`
   `if (dragEvent && (onDrag || onNodeDrag || (!nodeId && onSelectionDrag)))`. Це важливо, бо
   `getEventHandlerParams` (`xydrag/utils.ts:83-124`) робить `{...node}` на кожен drag-item —
   єдина помітна алокація на кадр, і вона під прапорцем.

### 1.5 Чому не перемальовуються всі ноди
- Кожен `NodeWrapper` підписаний **точково на свою ноду**: `useStore((s) => ({node: s.nodeLookup.get(id), ...}), shallow)` —
  `packages/react/src/components/NodeWrapper/index.tsx:44-53`; сам компонент — `memo` (`:253`).
- Рух ноди — це **CSS-трансформ на її ж div**: `:205`
  `transform: translate(${positionAbsolute.x}px,${positionAbsolute.y}px)` — без reflow, композитор.
- Поріг драгу міряється **у клієнтських координатах**, не у flow-координатах (`:346-356`,
  коментар «for consistent drag threshold behavior across zoom levels») — інакше на zoom 0.2
  поріг у світових пікселях перетворювався б на кілька екранних.

### 1.6 Auto-pan біля краю — на rAF, а не на pointermove
`XYDrag.ts:232-257`. Ключове: цикл `autoPan()` сам себе планує через `requestAnimationFrame` (`:256`)
і працює **з останньої відомої `mousePosition`**, тому нода їде далі, навіть коли покажчик стоїть.
Після успішного `panBy` викликається `updateNodes(lastPos)` (`:252`), і `lastPos` заздалегідь
компенсовано на зсув камери, поділений на zoom (`:248-249`).
Профіль швидкості — `calcAutoPan` (`packages/system/src/utils/general.ts:67-77`): смуга 40 px від
краю, `speed` за замовчуванням 15, швидкість пропорційна глибині заходу в смугу
(`calcAutoPanVelocity`, `:57-65`). Такий же цикл — для connect (`XYHandle.ts:81-89`) і для
рамки виділення (`Pane/index.tsx:259-274`).

### 1.7 Дрібниці, які теж дають «відчуття плавності»
- `nodePositionsChanged` (`XYDrag.ts:116,208,379`) — фінальний `updateNodePositions(dragItems, false)`
  йде **один раз** на кінці й лише якщо щось справді змінилось. Хост отримує чисту межу
  «drag / drop» через прапорець `dragging`.
- `abortDrag` (`:115,329-339`) — другий палець у мультитачі або видалення ноди під час драгу
  зупиняють драг, а не ламають стан.
- Мультидраг зі `snapToGrid` знімає **спільний офсет по першій ноді** (`calculateSnapOffset`,
  `xydrag/utils.ts:130-157`, застосування `XYDrag.ts:148-156,167-174`) — інакше при індивідуальному
  снапі група «розсипається».
- Дочірні ноди виділеного батька в драг не потрапляють (`isParentSelected`, `xydrag/utils.ts:4-20`) —
  інакше зсув подвоївся б.

### 1.8 Порівняння з нами

**Є в нас — частково.** Наш драг: `packages/sdk/src/render/personInteractions.ts:127-201`
(`pointerdown` `:127`, `globalpointermove` `:159`, `pointerup`/`pointerupoutside` `:199-200`),
контракт зафіксовано в `packages/sdk/src/render/personDrag.contract.test.ts:70`.

Що в нас **уже правильно**:
- Поріг руху 4 px перед тим, як драг зарахується (`personInteractions.ts:165`) — аналог
  `nodeDragThreshold`, і тест `personDrag.contract.test.ts:71` тримає «клік ≠ дроп».
- Позиція мутується in-place: `node.position.set(nx, ny)` (`:168`).
- Малювання коалесоване по rAF: `requestPaint` → `PixiHost.requestPaint`
  (`packages/sdk/src/render/PixiHost.ts:178-186`) — один `app.render()` на кадр, скільки б разів
  не попросили. Тікер зупинено (`PixiHost.ts:230`), тобто простій коштує нуль.
- Дорога робота (перерахунок контурів) під gate «клітинка змінилась»
  (`personInteractions.ts:172-176`) — прямий аналог snapped-diff gate React Flow.

Чим їхній відрізняється — і де, найімовірніше, наша «неплавність»:

1. **`globalpointermove` підписаний на кожну картку** (`personInteractions.ts:159`, всередині `bind()`,
   що викликається на кожну ноду). Pixi розсилає `globalpointermove` **усім** підписникам, тож на
   1000 карток — 1000 викликів на кожен рух покажчика, з яких 999 виходять на першому ж `if`.
   У React Flow слухач один і живе на `document` через d3-drag (`XYDrag.ts:411`).
   **Це найдешевше з можливих виправлень:** один глобальний слухач на шар + активний `dragState`.
2. **Алокація на кожен рух:** `this.deps.personLayer.toLocal(e.global)` (`:162`) без вихідної точки
   створює новий `Point` щоразу; те саме в `pointerdown` (`:132`). Pixi `toLocal` приймає третім
   аргументом `point` для перевикористання — його не передано. Плюс `Math.hypot` (`:165`).
   У React Flow на кадр алокуються лише два маленькі об'єкти позиції, а per-node алокація
   заховані під прапорець «чи є колбек» (`XYDrag.ts:216`).
3. **Немає gate «позиція не змінилась».** Ми ставимо `node.position.set` і кличемо `requestPaint()`
   безумовно (`:168-169`) — навіть коли `nx/ny` збіглися з попередніми. У React Flow це `:359` і
   `:210`. Наш rAF-коалесер це частково приховує, але робота до нього все одно виконується.
4. **Немає auto-pan під час драгу.** Дотягнути картку до краю й далі — неможливо: камера стоїть.
   Аналог — `XYDrag.ts:232-257` + `calcAutoPan`. У нас камера вміє анімуватись
   (`OrgHierarchyDiagram.panTo`, `:1061`), тобто будівельний блок є, циклу немає.
5. **`previewDrag` робить O(N) на кожну зміну клітинки:** `ContourPainter.previewDrag`
   (`packages/sdk/src/render/contour/ContourPainter.ts:373-390`) — `session.inputs.find`, потім
   `session.inputs.map(...)` з новим масивом на всі позиції, потім `refresh(true)`.
   Gate по клітинці рятує від «на кожен піксель», але сам крок дорогий; React Flow у порівнянні
   на зміну позиції не переобчислює нічого глобального.
6. **Немає захоплення покажчика на рівні DOM.** Ми покладаємось на Pixi `globalpointermove` +
   `pointerupoutside`; якщо покажчик вийде за canvas і кнопку відпустять там, `pointerupoutside`
   Pixi може не побачити. d3-drag вішає слухачі на документ і знімає їх на кінці
   (`XYHandle.ts:244-248` — той самий підхід у їхньому connect-коді).
7. `dragHandle` / `noDragClassName` — **немає і не треба**: у нас тягнеться вся картка, а її
   «хром» (кнопки +/−, меню) уже перехоплює покажчик сам —
   `personInteractions.ts:128-131` (`node.isChromePointer(e)`), `nodeCardChrome.ts:24`.
   Це функціональний еквівалент `noDragClassName`, лише виражений об'єктами, а не класами.

**Вердикт §1: є в нас, але треба доробити.** Порядок за співвідношенням «ефект / вартість»:
(1) один глобальний слухач руху замість per-card; (2) gate «позиція не змінилась»;
(3) перевикористання `Point` у `toLocal`; (4) auto-pan; (5) здешевити `previewDrag`.

