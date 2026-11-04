# Ресерч: lazy render діаграми поза вьюпортом

Дата: 2026-11-04 · гілка: main · статус: research (до планування)

Скоуп (узгоджено з власником): осі **1 (Pixi viewport culling)** + **2 (React/DOM оверлеї)**,
плюс «як вирішують інші» (для React — **React Flow**). Сценарій **дуже великого дерева**
(spatial index на 100k+) **відкладено**.

---

## 0. Архітектурне заземлення (чому передумова «react layout» не лягла)

Explore-агент (path:line): у репо **немає `.tsx/.jsx`**; React — лише `createElement`/`createRoot`
для **DOM-оверлеїв** поверх канваса (context menu, promote-картки, test-anchors, SVG backdrop).
**React не обгортає канвас і не керує layout/рендером.** Діаграму веде чистий TS:
`OrgHierarchyDiagram` (`OrgHierarchyDiagram.ts:272`) → `PixiHost` (`PixiHost.ts:131`) →
`DiagramRenderer` (`DiagramRenderer.ts:171`). Initial render = `OrgHierarchyDiagram.ts:526`.
**Viewport-culling Pixi-нод відсутній:** `DiagramRenderer.render` ітерує ВСІ ноди
(`:863`, `:920`, `:1009`). Є лише LOD (`lod.ts`) + `screenRectInView` (`promoteMath.ts:231`,
тільки для DOM-оверлеїв).

---

## 1. Ось 1 — Pixi viewport culling (реальна ціль для діаграми)

### Що дає сам Pixi v8
- **CullerPlugin** (вимкнений за замовч.): `extensions.add(CullerPlugin)` перевизначає
  `Application.render()` і перед кожним рендером викликає `Culler.shared.cull(stage, renderer.screen)`.
- Per-container прапорці: **`cullable`** (default `false`; контейнер підлягає culling),
  **`cullableChildren`** (рекурсивно на дітей), **`cullArea: Rectangle`** (замінює дорогий
  розрахунок global bounds фіксованим прямокутником — радять для контейнерів із багатьма дітьми).
- Рішення: порівняння bounds контейнера з екранним прямокутником; нема перетину → контейнер
  пропускається (не рендериться).
- **Ручний режим** (без плагіна): `Culler.shared.cull(stage, {x,y,width,height}); renderer.render({container: stage})`.
- Застереження Pixi: culling може коштувати **більше** за рендер off-screen об'єктів — виграш лише
  коли off-screen багато; bounds-розрахунок дорогий → `cullArea`.

### Community-патерн (бібліотеки навколо pixi-viewport)
- `@pixi-essentials/cull` і `pixi-cull` (автор pixi-viewport): **ре-cull лише коли viewport
  dirty / рухається**, не щокадру. Для динамічних сцен — на `prerender`.

### 🔑 Ключова інженерна засторога для ЦЬОГО репо (до перевірки у планінгу)
Вбудований culling Pixi перемикає `renderable` і пропускає **GPU-сабміт** culled-контейнерів.
Але наш bottleneck інший: `DiagramRenderer.render` **сам ітерує всі ноди й будує геометрію**
щоразу (`:863/:920/:1009`). Якщо ці цикли **перебудовують** per-node geometry на кожен render —
CullerPlugin цю CPU-роботу **не прибере**: треба відсікати **самим** (обчислити world-rect
вьюпорта, перевіряти перетин і **пропускати побудову** off-screen нод + `renderable=false`).
Чи цикли перебудовують, чи переюзають persistent display-objects — **треба прочитати нутрощі
`render()`** перед дизайном (не стверджую як факт). Якщо персистентні — тоді CullerPlugin
достатній; якщо перебудова — потрібен DIY-skip у циклах.

Лінійний перетин-тест по нодах наразі ОК (spatial index відкладено разом із великим деревом).

---

## 2. Ось 2 — React/DOM оверлеї

- **Вже зроблено:** які оверлеї показувати — gate через `screenRectInView` (promote/anchor):
  off-screen DOM-картки не створюються. Тобто «lazy» за вьюпортом тут частково вже є.
- **Не зроблено:** recycling/pooling — кожен оверлей тримає власний `createRoot`; при частих
  pan/zoom можливий churn монтування. Патерни (веб):
  - Chrome infinite-scroller: **переюзати off-viewport DOM-ноди** (переносити в кінець, перезаливати
    контентом), а не створювати нові — кожна DOM-нода коштує пам'ять/layout/style.
  - Pooling (Unity/Gameface): тримати пул, **ресетити елемент перед поверненням**; lazy-mount через
    dynamic import відкладає і модуль, і DOM-ноди.
- **Пріоритет нижчий:** promote-картки існують лише для promoted-стану (обмежена кількість).
  Pooling додавати, лише якщо churn `createRoot` реально проявиться у вимірі.

---

## 3. Як вирішують інші

| Інструмент | Підхід | Нюанс |
|---|---|---|
| **React Flow** | `onlyRenderVisibleElements` (default **`false`**): «рендерити лише ноди/едги, видимі у вьюпорті»; «**adds overhead**». Доки не підтверджено unmount vs skip. | Головний bottleneck у RF — **re-renders**, не culling: memoize (`React.memo`, компоненти поза батьком), не читати весь масив `nodes` у компоненті. Для великих дерев — **collapse** (прапорець `hidden`). Community-пороги: <100 default, 100–500 ввімкнути prop, >1000 virtualization/WebGL. |
| **GoJS** | Вбудованої віртуалізації **немає**: окрема менша модель + ручне add/remove при зміні viewport (`isVirtualized`). Off-screen/collapsed не рендериться. | **Overview/minimap несумісний** із віртуалізацією — потребує, щоб усі ноди були створені й розкладені. Засторога на майбутнє, якщо додамо minimap. |
| **JointJS** | Quadtree spatial index + virtual rendering: монтує лише cells у вьюпорті; viewport-query на кожен scroll/zoom. | Це вже «велике дерево» — поза поточним скоупом. |
| **VirtualCanvas (WPF)** | Quadtree на 100k shapes / 100k×100k px, плавний скрол. | Edge-case zoom-out: query повертає майже все → priority-quadtree, топ-N. Поза скоупом. |

---

## 4. Висновки / рекомендації до планування

1. **Реальна ціль осі 1** — не просто ввімкнути CullerPlugin, а **пропускати CPU-побудову
   off-screen нод** у циклах `DiagramRenderer.render`. Спершу **прочитати `render()`**: перебудова
   per-render чи persistent-objects. Від цього залежить, чи достатньо built-in culling.
2. **Cull лише на viewport-dirty** (у нас рендер уже coalesced — `renderCoalesce`): viewport move
   планує render → cull там. Не щокадру.
3. **Антидребезг (урок React Flow + pixi-viewport):** re-build/re-mount churn на pan може коштувати
   більше, ніж економить. Culling з **padded-rect** (margin навколо вьюпорта), щоб малі pan не
   «молотили» побудову.
4. **Ось 2 — нижчий пріоритет:** вибір оверлеїв уже gate-иться `screenRectInView`; pooling/recycling
   `createRoot` — лише за виміряним churn.
5. **Майбутнє:** minimap/overview ⟂ culling (урок GoJS); spatial index (quadtree) — коли повернемось
   до великого дерева.

---

## 5. Заземлення в коді — знято ключову невідомість (прочитано `render()` + wiring)

**Два окремі центри вартості з різними тригерами:**

### A. Rebuild сцени (CPU) — `OrgHierarchyDiagram.render()` → `DiagramRenderer.render()`
- `render()` на старті робить `this.scene.clear()` + `this.layers.clear()`
  (`DiagramRenderer.ts:465-466`) і **повністю перебудовує всі ноди** + перераховує геометрію
  (Rust через `computeStaffLiveGeometry`). **Будує все, незалежно від вьюпорта.**
- Тригери повного rebuild: initial (`OrgHierarchyDiagram.ts:526`), зміна даних, **LOD-crossing**
  (`onViewportTransform:669-677` рендерить ЛИШЕ коли LOD перетнув поріг), expand/collapse, theme.
- ⇒ **CullerPlugin тут НЕ допомагає** — він культивує GPU-сабміт, а не цей CPU-rebuild.
  Щоб lazy-рендерити на цьому центрі — треба **будувати лише visible(+margin) ноди**, решту
  відкласти (стиль GoJS/React-Flow). Ціна: pan у небудовану зону тепер потребує **інкрементальної
  побудови** (зараз pan rebuild-free).

### B. Paint кадру (GPU) — `PixiHost.requestPaint()` → `app.render()`
- Render-on-demand: `autoStart:false`, ticker зупинений (`PixiHost.ts:308,319`); малює лише коли
  викликають `requestPaint()` → rAF → `app.render()` (`:269-276`), coalesced.
- **Pan у межах LOD НЕ перебудовує сцену** — лише рухає трансформ вьюпорта; але `requestPaint`
  щокадру pan перемальовує **весь stage на GPU** (всі display-objects, і off-screen теж).
- ⇒ **Тут CullerPlugin / `renderable=false` дає чистий виграш:** cull перед кожним paint
  відсікає off-screen контейнери з GPU-сабміту. Патерн pixi-cull «cull on viewport move» лягає
  точно (у нас і так paint-on-demand). **Низький ризик: без rebuild-churn.**

### Початкова камера
- `create()` **не робить auto-fit**; рендерить at `:526`, далі опційно `focusNode`. Fit —
  host-driven (`fitView`/`fitBounds`, `PixiHost.ts:228`). ⇒ Якщо host НЕ робить fit-to-whole,
  на старті частина великого дерева off-screen і culling на initial render **має сенс**; якщо
  робить fit-to-whole — на старті off-screen нема, виграє лише zoom-in/pan згодом.

### Висновок заземлення → порядок робіт
1. **Ось 1-B (GPU cull на paint)** — найдешевша й найбезпечніша: `cullable=true` на view-контейнерах
   + `Culler.shared.cull` (або DIY `renderable`) перед paint, ре-cull на viewport-dirty. Без
   зміни rebuild-моделі. Виграш на zoom-in pan.
   **⚠️ Перевірити при дизайні:** чи culling перекриває **motion-blur** (щойно змерджений) і
   **promote-overlay** (`screenRectInView` уже gate-ить DOM-частину — не подвоїти).
2. **Ось 1-A (CPU build-skip)** — більший виграш на initial render великих сцен, але змінює
   pan-модель (інкрементальна добудова) → потребує spec + антидребезг (padded-rect, hysteresis).
   Залежить від рішення про початкову камеру.
3. **Ось 2 (DOM pooling)** — найнижчий пріоритет, лише за виміряним churn.

### Джерела
- Pixi CullerPlugin: https://pixijs.com/8.x/guides/components/application/culler-plugin
- Pixi Culler API: https://pixijs.download/release/docs/scene.Culler.html
- @pixi-essentials/cull: https://npmjs.com/package/@pixi-essentials/cull · pixi-cull: https://npmjs.com/package/pixi-cull
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- React Flow API (onlyRenderVisibleElements): https://reactflow.dev/api-reference/react-flow
- GoJS performance: https://gojs.net/intro/performance.html · VirtualizedPacked sample (unpkg)
- JointJS performance: https://docs.jointjs.com/react/features/performance
- Chrome infinite-scroller (DOM recycling): https://developer.chrome.com/blog/infinite-scroller
- VirtualCanvas (quadtree): https://github.com/clovett/VirtualCanvas
