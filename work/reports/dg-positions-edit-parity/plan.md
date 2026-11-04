# plan — subordinate-counts (A) + node-sugar accessor (B)

> spec-flow крок 4 (HOW). Вхід: `spec.md` (12 AC, GATE 1 пройдено). Поріг спрацював (публічний API).
> Конституція: тести перед кодом; KISS→SOLID→…; публічний API = зміна `docs/USAGE.md`; межа WASM↔TS явна.

## Placement (маніфест)
- **A — обчислення лічильників:** граф-агрегація по admin-reportLines — це **логіка, не геометрія**.
  Маніфест: геометрія/розкладка → `packages/core` (Rust); логіка → TS. Тому **pure-функція в
  `packages/sdk/src/core/`** (сусід `nodeKey.ts`/`seatDrop.ts`, уже чистий шар — grep render/wasm/pixi=0).
  Межу WASM↔TS **не чіпає**.
- **B — node-accessor:** `packages/sdk/src/` новий модуль `DiagramNode` + публічний метод на фасаді
  `OrgHierarchyDiagram`. Читає `this.data` + стор-и; презентаційний шар, без геометрії.

## Reuse-first
| Reuse | Нове | Чому не існуюче |
|---|---|---|
| `NodeRef`/`NodeKind` (`core/types.ts`), `SelectionStore` (selection), `viewState` (expand-сети, highlighted) | `core/subordinateCounts.ts` — pure `computeSubordinateCounts(positions, reportLines)` | нема функції рахунку підлеглих у SDK (поля були host-input) |
| `this.data` lookup за id; `setData` commit-шлях (:1307-1329) | `DiagramNode` accessor + `OrgHierarchyDiagram.getNode(ref)` | `getData()` клонує ВСЮ сцену (~7.6мс/4000) — нема дешевого per-node читача |
| `orgCardChrome.ts:14` футер (гейт на присутності поля — лишаємо) | — | — |

## Дизайн-рішення (фіксовано; що інакше йшло б у Codex недоспецифікованим)
### A — computeSubordinateCounts
- Сигнатура: `(positions: readonly DiagramPosition[], reportLines: readonly DiagramReportLine[])
  => Map<string, { childrenCount: number; allDescendantCount: number }>`.
- Будує admin-adjacency: для кожного reportLine з `kind==='admin'` ребро `fromId → toId`.
- `childrenCount(p)` = out-degree p в admin-графі. `allDescendantCount(p)` = розмір досяжної множини
  від p (DFS, **visited-set** для циклів AC8), без самої p.
- **По ВСІХ вузлах** (не лише від голови) — UnlinkedPositionRoot теж мають числа (AC2/AC3, Cass-1).
- **Лише не-листи в Map** (childrenCount>0); лист відсутній → поле лишиться undefined (AC1, лист=undefined).
- Межа org: admin-ребра within-org за побудовою (Cass-1); **guard** — ребро, де `fromId`/`toId` у різних
  org, пропускається (захист від крос-org, host не рахує крізь межу).
- Pure, детермінована, без I/O — повний unit-набір (success + 2+ failure: цикл, дубль-ребро, крос-org).
### A — wiring у setData
- У `OrgHierarchyDiagram.setData` ПІСЛЯ `mapConfig` і ПЕРЕД commit `this.data = next`: обчислити мапу,
  **перезаписати** `next.positions[i].childrenCount/allDescendantCount` з мапи (AC5 overwrite); лист →
  видалити поля (undefined). Так числа течуть у render (картка) і getData() з одного source.
- `epoch`-guard уже є (setData:1296,1303,1305) — обчислення синхронне, у commit-вікні без await.
### B — getNode / DiagramNode
- **Additive** публічний метод `getNode(ref: NodeRef): DiagramNode | null` (НЕ міняємо `onNodeClick(NodeRef)`
  — additive, конституція не ламати мовчки). Хост: `diagram.getNode(node).getData()`.
- `DiagramNode`: `{ ref; getData(): DiagramPosition | DiagramOrganization | DiagramPerson | null;
  getState(): { selected: boolean; hovered: boolean; expanded: boolean; collapsed: boolean } }`.
  - `getData`: lookup за ref.kind+id у `this.data`; повертає **shallow-clone одного об'єкта** (не structuredClone
    сцени) — мутація назовні не псує стан. `null` якщо не знайдено.
  - `getState`: selected ← SelectionStore; hovered ← viewState.highlightedNode; expanded ←
    staffExpandedPositionIds/OrgIds має id; collapsed ← не-expanded і має дітей.

## Side effects
- `setData` тепер робить O(V+E) граф-прохід (дешево; counts-граф невеликий) — мінорний CPU.
- **Перезапис host-переданих counts** — свідома зміна поведінки (host=legacy, AC5). Хост, що покладався на
  свої числа, отримає SDK-числа (мають збігатися за побудовою, AC4).
- **`appendData`** (:1352) мерджить partial і рендерить, але counts НЕ перераховує → стануть **stale**
  після append. Рішення: перерахувати counts і в `appendData` перед render (той самий виклик). Інакше
  append-додані підлеглі не відобразяться в числах. (Якщо дорого — відкласти, але за замовчуванням робимо.)
- Картка листа: без змін (undefined → футер прихований, AC6).

## Migration plan
1. SDK-порт A+B landиться (цей PR). SDK перезаписує counts → одразу авторитетне джерело.
2. Хост (Cass-1, окремо): сайдбар читає з `getData()`/`getNode()` замість власного null; потім **дроп
   legacy-мапер-calc** (`position-tree-to-dg-diagram.ts:101-105`) і host-кеш. **Сигнал — від Dg 13 після
   зеленого SDK-порту**, не раніше (щоб не було вікна подвійного джерела).
3. Хост-сторона — лейн Cass-1, поза цим PR.

## Rollback
- Фіча additive + одна обчислювальна вставка. Відкат = (1) прибрати виклик `computeSubordinateCounts` у
  setData/appendData → counts повертаються до host-переданих; (2) прибрати `getNode`/`DiagramNode`. Жодної
  міграції даних, жодного стану на диску. Чистий revert коміту.

## Acceptance scenarios (таблиця перед tasks — делегується acceptance-spec на звірку)
| # | Сценарій | Precondition | Дія | Очікується | Перевірка | AC |
|---|---|---|---|---|---|---|
| S1 | counts не-лист | ШПС без host-counts | setData | getData().positions: не-лист має числові children/all | unit | AC1/AC2/AC3 |
| S2 | лист undefined | лист-посада | setData | поля undefined; картка без футера | unit + contract | AC1/AC6 |
| S3 | all-roots | UnlinkedPositionRoot | setData | посади непідпорядк. кореня теж мають числа | unit | AC2/AC3 |
| S4 | parity host | дерево з відомими host-числами | setData | SDK === host children.length/countDescendants | unit (фікстура) | AC4 |
| S5 | overwrite | host передав counts | setData | getData має SDK-пораховані, не host | unit | AC5 |
| S6 | цикл/дубль | admin A→B→A, дубль-ребро | setData | не вішає, кінечні числа | unit failure | AC8 |
| S7 | getNode data | змонтована діаграма | getNode(ref).getData() | поля однієї посади (вкл. counts), без клону сцени | unit | AC9 |
| S8 | getNode state | selection/hover/expand | getNode(ref).getState() | {selected,hovered,expanded,collapsed} вірні | unit | AC10 |
| S9 | USAGE.md | — | check:docs | A-поля + getNode задокументовані, гейт зелений | gate | AC7/AC12 |

## Констит-чек (інлайн)
- Тести перед кодом: TDD, success+failure — так (S1–S8 unit, S6 failure). ✅
- KISS>GoF: pure-функція + additive метод, без патернів/абстракцій наперед. ✅
- Публічний API: `getNode` новий + семантика counts → `docs/USAGE.md` оновити (AC7/AC12). ✅
- Межа WASM↔TS: не чіпається (логіка в TS core). ✅
- Pocock лише TS: весь дифф TS. ✅
