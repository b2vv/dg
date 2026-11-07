# R3 — Pixi зовнішні view-фабрики (node visual) + D2 — spec

**Статус:** spec. Гілка `feat/extensibility`. Джерело: ROADMAP §R3 + D2 (рішення власника: дві моделі інжекції;
API-ескіз у роадмапі). GATE-1 з роадмапу. Гейт: простіше за GoJS (чисті функції/фабрики, без DSL).

## Проблема / мета
Зараз візуал ноди хардкодить SDK (`PersonNode.create`→`PersonNodeView`). ROADMAP R3: дати хосту інжектувати
**Pixi view-фабрику** для візуалу ноди (far/mid), поки SDK лишає **геометрію/placement** (Б2-інваріант). D2: свідомо
дві моделі — React-компонент (near, вже є promote-overlay) і Pixi-view-фабрика (far, нове).

## Межа (R3 РОБИТЬ / НЕ робить)
- **РОБИТЬ:** публічна фабрика візуалу **staff-ноди** (person/position) двома рівнями (роадмап):
  1. Проста: `(node, ctx) => Container` (повертає Graphics/Container з даних ноди+контексту).
  2. Retained (масштаб): `createNodeView(node, ctx): { root: Container; update(node, ctx): void; destroy(): void }` —
     SDK **пулить за id** і кличе `update` замість перестворення (перф на тисячах нод).
  SDK: якщо фабрику задано — будує/оновлює root нею; **placement/трансформ робить SDK** з геометрії ядра;
  реєстрація в scene, hover/selection (через D1, якщо opt-in), culling — лишаються SDK. Хост повертає візуал у
  **ЛОКАЛЬНИХ** координатах; тип — `Container`/`DisplayObject` (загальніше за Graphics).
- **НЕ робить:** не чіпає near React-шар (D2 інша модель — R2); не чіпає edges/lines (окремо); org-ноди —
  **розширення тим самим механізмом** (якщо час; інакше наступний зріз); без фабрики — поточний PersonNodeView
  байт-у-байт (opt-in, урок D1).

## User scenarios
1. Хост дає `nodeView: (node, ctx) => Container` → кожна staff-нода малюється його візуалом; SDK ставить у world-позицію.
2. Хост дає retained-фабрику `{ create(node,ctx)→{root,update,destroy} }` → при ре-рендері SDK кличе `update` на
   наявному root (той самий id), не перестворює — плавно на тисячах нод.
3. Без `nodeView` — внутрішній PersonNodeView, як зараз (байт-у-байт).
4. Хост малює лише ЛОКАЛЬНИЙ візуал (0,0 — лівий-верх ноди); позицію/масштаб/LOD дає `ctx`; SDK застосовує world-transform.

## Acceptance (чернетка)
- AC1: проста фабрика `(node,ctx)=>Container` — кожна staff-нода = root хоста, розміщена SDK у коректній world-позиції.
- AC2: retained-фабрика — при другому рендері того самого id викликається `update(node,ctx)` на наявному root (НЕ новий
  інстанс, НЕ destroy+create); при зникненні ноди — `destroy()`; пул за id.
- AC3: SDK володіє placement — хост НЕ рахує позицій; `ctx` не дає писати координати сцени (лише читати lod/дані/тему).
- AC4: без `nodeView` — PersonNodeView як зараз (байт-у-байт; наявні golden/тести зелені).
- AC5: hover/selection (D1), culling, transition (D3), export — працюють із хост-візуалом (SDK обгортає root, не ламає).
- AC6: тип повернення `Container` (graphics+text+sprite компонуються); `ctx` типобезпечний (без стрингового DSL — простіше за GoJS).
- AC7: 0 вартості в спокої; retained-пул не тече (destroy на видаленні/clear).

## Out of scope / Open
- near React-шар (R2), edges/lines-фабрики, org-ноди (розширення; реалізувати якщо час — інакше наступний зріз).
- ⚠️ **API-ергономіка (owner-review при пуші):** точні імена/форма `NodeViewContext` (що саме дає: lod, theme, дані,
  хелпери media?), `nodeView` як union (функція | {create}) чи два поля, kind-ключування (person/org) — grounded
  роадмапним ескізом, але фінальна ергономіка = смак власника («простіше за GoJS»). GATE 2 стрес-тестує; флаг власнику.
- Взаємодія з D3-переходами (ghosts), D1-hover-акцентом на хост-візуалі — уточнити в плані (SDK обгортає root
  контейнером, акцент/transform на обгортці, щоб не конфліктувати з хост-візуалом).
