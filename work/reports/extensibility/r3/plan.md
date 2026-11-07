# R3 — plan: Pixi node view-фабрики

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/sdk`. GATE-1 з роадмапу D2.

## 1. Архітектура (рев.2 — GATE-2 B1/B2/N1)
Новий тип `nodeView` (union: проста функція АБО retained-фабрика). `DiagramRenderer` при побудові staff-ноди: якщо
`nodeView` задано — будує/оновлює **root-Container** нею замість `PersonNodeView`; SDK кладе root у **обгортку**, на якій
робить placement/transform/culling. Без `nodeView` — PersonNodeView як зараз (opt-in, байт-у-байт).

**🔴 B1 — D1-hover для хост-візуалу (генералізація, не плоска обгортка):** `paintInteraction`/`bindInteraction`
(DiagramRenderer.ts:236-266) зараз гейтовані на `instanceof PersonNodeView`+кличуть `setHovered/setHoverHandler`, і
related-dim-набір (:255) будується лише з PersonNodeView. Плоский Container у це НЕ потрапить → hover/dim не дійдуть.
Фікс: ввести **інтерфейс** `InteractiveNodeView { nodeRef: NodeRef; lod: LodLevel; setHovered(on): void;
setHoverHandler(fn): void }` і переписати paintInteraction/bindInteraction/related-dim із `instanceof PersonNodeView` на
`implements InteractiveNodeView` (PersonNodeView уже має ці методи — лишається сумісним). **Обгортка-клас реалізує
InteractiveNodeView** (несе nodeRef/lod; setHovered малює акцент НА ОБГОРТЦІ навколо хост-root, не чіпаючи хост-візуал).
Так D1 hover/related-dim працюють і для хост-нод, і для PersonNodeView однаково. ⚠️ Чіпає D1-paint-шлях — у скоупі R3-B.

**🔴 B2 — containment хост-фабрики:** `create/update/проста-fn` кличуться в render-циклі (addStaffPositions ~:1451,
grid ~:1598). Кожен виклик у **try/catch**: на throw / null / не-Container → fallback у PersonNodeView (або скип ноди) +
warn-once. Один хост-error НЕ валить весь рендер (live ШПС на цьому SDK).

**N1 — retained-пул reconcile (mark-and-sweep):** пул живе в `nodeViewFactory.ts` (поза SceneRegistry, переживає
`scene.clear()` :985). Кожен рендер: збирати множину побудованих цей прохід `kind:id`; **після** staff-build-циклу
(під epoch-guard `isRenderCurrent`, щоб застарілий прохід не чистив) — `destroy()` пулу для id, яких цей прохід НЕ
торкнувся. Без sweep: тіча (AC7) або destroy-щокадру (нема ретенції, AC2). Reappear-after-destroy → новий create.

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| Реєстр/пул | `SceneRegistry` (views за kind:id, clear) | обгортка-root + lifecycle update/destroy |
| placement/transform | наявний `view.position.set` + world-transform | — |
| hover/selection | D1 (акцент на обгортці) | — |
| внутрішній візуал | `PersonNode.create` (дефолт, коли nodeView нема) | — |

## 3. Контракт (публічний — grounded роадмап-ескізом; ергономіка → owner-review)
```ts
interface NodeViewInput { kind: 'position'; id: string; data: DiagramPerson | undefined; position: DiagramPosition }
interface NodeViewContext { lod: LodLevel; theme: NodeTheme /* read-only; БЕЗ координат сцени */ }
type SimpleNodeView = (node: NodeViewInput, ctx: NodeViewContext) => Container;
interface RetainedNodeView { create(node: NodeViewInput, ctx: NodeViewContext): { root: Container; update(node: NodeViewInput, ctx: NodeViewContext): void; destroy(): void } }
// OrgHierarchyConfig.nodeView?: SimpleNodeView | RetainedNodeView
```

## 4. Наріза
| ID | Файли | Що | Залежить | Приймання |
|---|---|---|---|---|
| R3-A | `render/nodeViewFactory.ts` (new: типи + retained-пул-менеджер + mark-and-sweep reconcile, чистий від DiagramRenderer) + test | нормалізація union→retained (проста fn → create/update=**знищити старих дітей root** і перебудувати (N3)/destroy); пул за key; reconcile(seenIds)→destroy зниклих (N1); try/catch-safe виклики (B2) | — | AC2,AC6,AC7 |
| R3-B | `render/DiagramRenderer.ts`, `render/PersonNode.ts`, `render/interactiveNodeView.ts` (new interface) (+tests) | **B1:** інтерфейс `InteractiveNodeView`; переписати paintInteraction/bindInteraction/related-dim із instanceof PersonNodeView на нього; обгортка-клас реалізує його (акцент на обгортці). staff-build: nodeView→root у обгортку, placement/culling; **B2** try/catch→fallback PersonNodeView+warn-once; reconcile-hook під epoch-guard; без nodeView — PersonNodeView direct (байт-у-байт) | R3-A | AC1,AC3,AC4,AC5 |
| R3-C | `OrgHierarchyDiagram.ts`, `index.ts`, `docs/USAGE.md` (+test) | `nodeView` у конфігу (opt-in) → рендерер; типи в барель; USAGE (local-coords інваріант, SDK-placement, retained-пул) | R3-B seam | AC1,AC4 + публічний API |

**Паралель усередині R3:** R3-A (pure) → R3-B ∥ (R3-C після B-seam). **R3-C чіпає спільні facade/index/USAGE — серіалізується координатором з R2-C.**

### 4.1 Шов R3-B ↔ R3-C
`DiagramRenderer.setNodeViewFactory(f: NormalizedNodeView | null)`. Фасад нормалізує `config.nodeView` (R3-A) і ставить;
`null`=внутрішній PersonNodeView (байт-у-байт). Рендерер не знає про конфіг; фасад не знає про Pixi-внутрішнє.

## 5. Side effects / rollback
- Публічний: `nodeView` + типи (адитивно, opt-in). Без нього — байт-у-байт PersonNodeView (урок D1).
- D3/D1/culling/export працюють, бо акцент/transform/ghost — на SDK-обгортці, не на хост-root.
- Перф: retained-пул (update, не recreate) — ключ на тисячах нод. destroy на clear (без тічі). Rollback = revert R3-*.

## 6. Acceptance-table
| # | Сценарій | Дія | Результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | проста фабрика | nodeView=fn | кожна нода = root хоста, world-позиція SDK коректна | integ | AC1 |
| 2 | retained update | ре-рендер того самого id | update(node,ctx) на наявному root (не new, не destroy) | integ | AC2 |
| 3 | retained destroy | нода зникла / clear | destroy() викликано; пул не тече | integ | AC2,AC7 |
| 4 | local coords + SDK placement | фабрика малює у (0,0) | SDK ставить у world-позицію; хост не рахує | integ | AC3 |
| 5 | без nodeView байт-у-байт | nodeView не задано | PersonNodeView як зараз (golden) | integ | AC4 |
| 6 | hover/selection на хост-візуалі | nodeView + D1 opt-in, hover | акцент на обгортці; хост-root не зламано | integ | AC5 |
| 7 | transition з хост-візуалом | nodeView + animate | рух/ghost працюють (обгортка рухається) | integ | AC5 |
| 8 | тип Container | фабрика повертає Container з text+graphics | рендериться; типобезпечно | unit | AC6 |
| 9 | B1 hover на хост-візуалі | nodeView + D1 opt-in, hover хост-ноди | related-dim + акцент на обгортці працюють (через InteractiveNodeView), як для PersonNodeView; PersonNodeView-шлях не зламано | integ | AC5 |
| 10 | B2 фабрика кидає | nodeView.create/update кидає / вертає null | fallback PersonNodeView (або скип) + 1 warn; рендер діаграми НЕ падає; інші ноди ок | integ | AC5 |
| 11 | N1 reconcile sweep | рендер з 3 нодами, потім 2 (одна зникла) | destroy() лише зниклої; 2 що лишились — update, не recreate; пул не тече | integ | AC2,AC7 |
| 12 | N3 proste-fn recreate | проста fn, ре-рендер того самого id | старі діти root знищені перед перебудовою (без Pixi-тічі) | unit | AC7 |

## 7. Конституція (inline): TDD; KISS (union нормалізується в один retained-шлях, обгортка — 1 рівень); межа WASM
незмінна (чистий TS-рендер); публічний API→USAGE+барель (R3-C); Pocock-TS. **PASS.**
