# R2 — React-шар DX: багатший контракт інжекції — spec

**Статус:** spec. Гілка `feat/extensibility`. Джерело: ROADMAP §R2 + D1. GATE-1 з роадмапу.

## Проблема / межа (КРИТИЧНО — звуження)
ROADMAP R2 має ДВІ частини: (а) багатший контракт інжекції; (б) анімація переходів layout. **(б) = D3 — вже зроблено.**
Також роадмап застерігає: «як React Flow» ≠ «весь граф у DOM» — **категорійна помилка**; паритет = DX/типізація для
**near-зрізу**, не ввесь граф у React. Отже **R2 = (а): багатший, типобезпечний контракт пропсів near-картки**,
без стрингового DSL, щоб хост-React-компонент природно відображав/керував станом. Grounded D1 (interaction-store).

## Що вже є
`createReactPromoteOverlay({ component, backdrop })` + `PromoteSlotProps` інжектують near-картку. Бракує: картка не
отримує типізовано **стан взаємодії** (selected/hovered з D1) і **колбеки** (вибрати/навести), тож хост реалізує це сам.

## Межа R2 (РОБИТЬ / НЕ)
- **РОБИТЬ:** збагатити `PromoteSlotProps` (типобезпечно): `selected: boolean`, `hovered: boolean` (з D1-store, opt-in),
  `onSelect(mods?)`, `onHover(on)` — щоб хост-картка відображала акцент і керувала вибором/hover через SDK (єдине джерело
  D1). Чисті типізовані props/колбеки — не DSL. Опційно: 1-2 додаткові іменовані слоти, якщо тривіально й потрібно.
- **НЕ робить:** не «весь граф у React»; не far-Pixi (R3); не анімація (D3); не нові стор-джерела (emphasis окремо).
  Без opt-in (D1 не підписано) — `selected/hovered` просто `false`, колбеки no-op-safe; картка як зараз (байт-у-байт).

## User scenarios
1. Хост-картка отримує `props.selected/hovered` і малює акцент — консистентно з Pixi (той самий D1-store).
2. Картка кличе `props.onSelect(mods)` / `props.onHover(true/false)` → SDK оновлює D1-store → обидва шари реагують.
3. Без interaction-opt-in — props.selected/hovered=false, колбеки безпечні no-op; поточна поведінка.

## Acceptance (чернетка)
- AC1: `PromoteSlotProps` має типізовані `selected`, `hovered`, `onSelect`, `onHover`; значення з D1-store (коли opt-in).
- AC2: `onSelect`/`onHover` з картки оновлюють D1-store → Pixi-шар теж відображає (крос-шарова консистентність).
- AC3: selected/hovered у props оновлюються при зміні D1-стану без повного React-ререндеру overlay (ефективно).
- AC4: без D1-opt-in — props.selected/hovered=false, колбеки no-op-safe; картка/overlay байт-у-байт.
- AC5: типобезпечно, без стрингового DSL (простіше за GoJS); адитивно до наявних PromoteSlotProps.

## Out of scope / Open
- far-Pixi (R3), анімація (D3), emphasis {found,highlight}, «весь граф у DOM».
- ⚠️ Owner-review (при пуші): які саме нові props/слоти (мінімальний набір selected/hovered/onSelect/onHover vs ширше) —
  ергономіка = смак власника; GATE 2 стрес-тестує. Чи додавати слоти понад interaction — тільки за явною потребою (YAGNI).
