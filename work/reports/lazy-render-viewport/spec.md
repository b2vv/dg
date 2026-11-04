# spec.md — 1-B GPU viewport culling

Topic: `lazy-render-viewport` · ось **1-B** (GPU paint cost) · гілка `feat/viewport-culling-gpu`
Research: `work/reports/lazy-render-viewport/research.md` §5 (заземлено).

## Problem

На pan/zoom у межах одного LOD сцена **не перебудовується**, але `PixiHost.requestPaint()` →
`app.render()` щокадру перемальовує **весь stage на GPU**, включно з контейнерами, що повністю
поза вьюпортом (`PixiHost.ts:269-276`; `DiagramRenderer` будує всі view без відсікання —
`:863/:920/:1009`). На великих сценах це марний GPU-сабміт off-screen вузлів кожен кадр pan.

**Чому зараз:** це найдешевша й найбезпечніша половина «lazy render поза вьюпортом» — вона не
чіпає CPU-rebuild-модель (ось 1-A), а лише прибирає off-screen з GPU-сабміту перед кожним paint.

## User scenarios

1. **Zoom-in + pan великою сценою.** Користувач наблизив камеру (видно частину дерева) і тягне
   полотно. Off-screen вузли не йдуть у GPU-сабміт → кадр дешевший, pan плавніший. Візуально
   картина **ідентична** (що видно — те й намальовано).
2. **Fit-to-whole.** Усе дерево у вьюпорті → culling нічого не відсікає і **нічого не коштує
   помітного** (не гірше за поточне).
3. **Promote-оверлей активний.** DOM-promote-картки вже gate-яться `screenRectInView`; GPU-culling
   Pixi-сцени **не конфліктує** з цим і не ховає нічого, що промоутнуте й має бути видимим.
4. **Motion-blur на pan (свіжо змерджений).** Culling і velocity-blur співіснують: blur-філтр не
   «обрізається» разом із вузлами, межі філтра не ламають видимість.

## Acceptance criteria (чернетка — уточнити на acceptance-spec)

- AC1: при zoom-in стані вузли, чиї world-bounds не перетинають (padded) екранний прямокутник,
  **не рендеряться** (renderable=false або Culler), і це **спостережно** (лічильник намальованих
  view / draw calls, не «на око»).
- AC2: візуальний паритет — те, що у вьюпорті (+margin), намальовано повністю; нема «вискакування»
  вузла на краю при малому pan (margin/hysteresis).
- AC3: ре-cull відбувається **лише коли viewport dirty** (перед paint), не окремою щокадровою
  петлею поза paint.
- AC4: fit-to-whole і маленька сцена — без регресу (culling не дорожчий за виграш; поведінка не
  гірша за baseline).
- AC5: motion-blur і promote-overlay — без регресу (інваріанти обох цілі).
- AC6: публічна поведінка задокументована в `docs/USAGE.md`, якщо вводиться публічний прапорець.

## Out of scope

- Ось 1-A (CPU build-skip у `DiagramRenderer.render`) — окрема фіча.
- Spatial index (quadtree/R-tree) і сценарій дуже великого дерева (100k+).
- Ось 2 (DOM pooling/recycling оверлеїв).
- Overview/minimap (несумісний із culling — засторога GoJS, не цей скоуп).

## Open questions (на Gate 1)

- OQ1: **публічний тумблер чи завжди-ввімкнено?** Pixi застерігає: culling може коштувати більше
  за виграш на малих сценах. Варіанти: (a) завжди-on з дешевим early-out на малій сцені;
  (b) публічний `culling?: boolean` у конфізі (default?); (c) авто-поріг за кількістю вузлів.
- OQ2: **механізм** — вбудований `Culler.shared.cull(stage, screen)` + `cullable` прапорці, чи
  DIY `renderable=false` за власним перетином world-rect? (DIY дає контроль над margin і
  лічильником для AC1; Culler менше коду, але щокадрова bounds-калькуляція.)
- OQ3: **margin/hysteresis** — скільки padding навколо вьюпорта (у px/world чи частках екрана),
  щоб малий pan не «молотив» видимістю (AC2).
- OQ4: **на якому рівні графа** вмикати cullable — на кожному view-вузлі, чи на контейнерах
  шарів (`layers`)? Edges, що перетинають вьюпорт одним кінцем за межами, не мають зникати.
- OQ5: **де міряти** AC1/AC4 — чи додаємо в `npm run measure` (не CI-гейт) лічильник draw/culled,
  чи достатньо поведінкового тесту на renderable-стан.
