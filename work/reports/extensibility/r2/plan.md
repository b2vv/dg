# R2 — plan: багатший React-контракт інжекції (near interaction props)

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/sdk` (react/). GATE-1 з роадмапу.

## 1. Архітектура (рев.2 — GATE-2 блокер AC3)
Збагатити `PromoteSlotProps` типізованими `selected/hovered` + `onSelect(mods?)/onHover(on)` (пишуть у store через
фасадні `handlePointerSelect`/`setHovered`). **🔴 Механізм (блокер AC3):** interaction НЕ йде через
`notifyPromoteSync('structural')`→`sync()` (це ПОВНИЙ rebuild: `listPromoteCandidates` ре-резолвить УСІ картки
~2.1мс/639 нод + `root.render` усіх слотів — регресія на кожен hover). Натомість **per-slot підписка за id**: кожен
slot-обгортка підписується на interaction-стан СВОЄЇ ноди (seam `subscribe`), і при зміні ре-рендериться **лише ця
картка** через imperative-refresh — точно патерн `FrameBackdrop` (`createReactPromoteOverlay.ts:173-181`:
`useImperativeHandle`+`useReducer`). `sync()`/`listPromoteCandidates` НЕ викликаються на hover/selection-акценті.
Hover сьогодні НЕ доходить до overlay (setHovered→лише paint-subscriber) — тож цей шлях новий і має бути дешевим.
Без D1-opt-in — selected/hovered=false, колбеки no-op, slot як зараз.

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| injection | `createReactPromoteOverlay({component,backdrop})` + `PromoteSlotProps` | нові поля props |
| стан | D1 `InteractionStore` (selected/hovered, subscribeInteraction) | — |
| запис | фасадні `select/handlePointerSelect`, `setHovered` | колбеки props→фасад |

## 3. Контракт (публічний, адитивний)
```ts
interface PromoteSlotProps { /* наявні */ …; selected: boolean; hovered: boolean;
  onSelect(mods?: SelectionPointerMods): void; onHover(on: boolean): void }
```

## 4. Наріза (рев.2 — GATE/impl знахідка: overlay створює ХОСТ, не фасад)
⚠️ `createReactPromoteOverlay` конструюється **хостом** (demo `App.ts:701`), не фасадом — фасад його не володіє. Тож
R2 = (A) overlay ПРИЙМАЄ `interaction`-seam; (B) фасад ЕКСПОНУЄ публічні примітиви, з яких хост будує seam; (C) демо
їх зв'язує. Фасад уже має `subscribeInteraction`/`select`/`setHovered` (D1) — бракує лише публічного read `isSelected(ref)/
isHovered(ref)` (або хост деривує з `InteractionState` від subscribeInteraction).

| ID | Файли | Що | Залежить | Приймання |
|---|---|---|---|---|
| R2-A | `react/createReactPromoteOverlay.ts` (+PromoteSlotProps) (+test) | **DONE** — props selected/hovered/onSelect/onHover; per-slot imperative-refresh; `interaction`-seam опція; без seam — false/no-op | — | AC1,AC3,AC5 |
| R2-B | `OrgHierarchyDiagram.ts`, `docs/USAGE.md`, `index.ts` (+test) | переконатися, що публічні примітиви достатні для seam: `subscribeInteraction` (є), `select`/`setHovered` (є), + за потреби публічний `isSelected(ref)/isHovered(ref)` чи документувати derive з InteractionState; USAGE: як хост будує `interaction` і передає в createReactPromoteOverlay; барель за потреби | R2-A | AC2,AC4,AC5 |
| R2-C-demo | `packages/demo/src/app/App.ts` (ділянка `createReactPromoteOverlay({…})`) (+demo test) | зв'язати: передати overlay'у `interaction`, збудований із публічних примітивів діаграми (isSelected/isHovered/subscribe/select/hover). Хост-видима частина (як D1-D) | R2-A, R2-B | AC2 |

**Паралель:** R2-B (facade, серіалізовано з R3-C) після R2-A; R2-C-demo (demo-файл, незалежний) після R2-B.
**AC3 уточнення:** per-slot дешевий шлях стосується HOVER (новий — сьогодні hover не доходить до overlay). SELECTION вже
фаерить `notifyPromoteSync('structural')` (існуюче, :353-358) → overlay і так ре-білдиться на вибір; R2 цього НЕ погіршує
(картка тепер ще й отримує типізовані props). AC3 = «hover не додає повного rebuild», не «прибрати наявний selection-rebuild».

**Паралель:** R2-A (react) незалежний від R3/R11. **R2-B чіпає спільні facade/index/USAGE — серіалізується з R3-C (координатор).**

### 4.1 Шов R2-A ↔ R2-B
`createReactPromoteOverlay` приймає опційний `interaction?: { isSelected(id): boolean; isHovered(id): boolean;
subscribe(cb): ()=>void; select(id, mods?): void; hover(id, on): void } | null`. Фасад дає його під opt-in; `null`=картка
як зараз. **id↔NodeRef (non-blocking fix):** seam оперує string-id; фасад мапить id→NodeRef через `slot.node.ref`/
`candidate.kind` (store NodeRef-keyed). **dispose:** `subscribe` повертає unsubscribe — overlay.dispose() (createReactPromoteOverlay.ts:616) його кличе разом із наявним unsubscribe (без тічі). **Per-slot:** overlay підписує КОЖЕН slot на свою ноду; зміна → imperative-refresh лише цього slot (FrameBackdrop-патерн :173-181), не sync().

## 5. Side effects / rollback
- Публічний: адитивні PromoteSlotProps. Без opt-in — false/no-op (байт-у-байт). Крос-шарова консистентність із Pixi (той самий D1).
- Перф: точкове пропс-оновлення slot, не повний overlay-ререндер (AC3). Rollback = revert R2-*.

## 6. Acceptance-table
| # | Сценарій | Дія | Результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | props selected/hovered | D1 opt-in, нода A вибрана/hovered | картка A: props.selected/hovered=true | integ | AC1 |
| 2 | onSelect з картки | картка кличе onSelect(mods) | D1-store оновлено; Pixi-шар теж показує | integ | AC2 |
| 3 | onHover з картки | onHover(true/false) | D1 hovered оновлено; крос-шар | integ | AC2 |
| 4 | точкове оновлення | зміна selected однієї ноди | лише її slot-props оновлено, overlay не ре-білдиться повністю | integ | AC3 |
| 5 | без opt-in | D1 не підписано | props.selected/hovered=false; onSelect/onHover no-op-safe; картка як зараз | integ | AC4 |
| 6 | типобезпека | — | props типізовані, без DSL; адитивно | unit | AC5 |

## 7. Конституція (inline): TDD; KISS (мінімальний набір props, без «весь граф у DOM»; YAGNI на зайві слоти); WASM
незмінний; публічний API→USAGE (R2-B); Pocock-TS (React). **PASS.**
