# Стандарти коду TypeScript — Org Hierarchy SDK

> Обов’язкові вимоги до TS-коду в `packages/sdk`, `packages/demo`.  
> **Архітектура / дизайн:** Clean Code, Clean Architecture (R. Martin), SOLID, DRY, KISS, GoF.  
> **TypeScript-стиль:** [Matt Pocock](https://www.totaltypescript.com/) / Total TypeScript tips & articles.  
> Пов’язано: [`SPEC.md`](./SPEC.md) §13, [`TDD.md`](./TDD.md).

**Дата:** 2026-08-20 · **звірено з репо** 2026-09-02

> **Частину цього документа тепер перевіряє машина.** `npm run lint` (oxlint) — гейт у CI:
> мертві імпорти, `no-shadow`, посилання на функцію в ітераторі, повернення з виконавця проміса
> та ще десяток правил більше не тримаються на уважності рев'юера.
> **Що лишилось людині:** розмір функцій (`max-lines*` вимкнено навмисно — межу тут ставить цей
> документ, не лінтер), іменування, `no-inline-comments`, вкладеність функцій.
> Повний перелік вимкненого з причинами — [T85 в архіві задач](./archive/tasks-2026-09-02.md) (повний текст — в історії git).
>
> 🔴 І окремо: **підказка лінтера не є вироком.** Закриваючи T85, знайшли чотири місця, де
> застосування автофіксу внесло б баг. `lint:fix` на весь репо — не інструмент цього документа.

---

## 0. Ієрархія принципів (як застосовувати)

```text
KISS  →  спочатку найпростіше рішення, що працює
SOLID →  структура модулів і залежностей
DRY   →  одна правда для знання (не копіпаста логіки)
Clean Code → читабельність імена/функції/помилки
Clean Architecture → напрям залежностей між шарами
GoF → патерн лише коли вже є ≥2–3 повторення проблеми
Matt Pocock TS → як саме писати типи в TypeScript
```

**Правило конфлікту:** якщо SOLID/GoF суперечать KISS на ранньому етапі — **перемагає KISS**, поки abstraction не доведена профілем або другим споживачем.

---

## 1. Clean Code (читабельність)

| Правило | Вимога для TS |
|---------|----------------|
| Meaningful names | `computeOrgRowTreeLayout`, не `doStuff` / `data2` |
| Small functions | одна функція — одна дія; ціль ≤ ~40 рядків body |
| Few arguments | ≤ 3 параметри; більше → options object з іменованими полями |
| No side effects у pure compute | layout/mapper — чисті; side effects лише на краю (DOM, Worker, Pixi) |
| Fail fast | invalid вхід → throw / Result рано, не «тихий» wrong layout |
| Comments | пояснюють *чому*, не *що*; заборонено закоментований код у main |
| Boy Scout Rule | кожен PR залишає модуль чистішим (імена, мертвий код, типи) |
| Law of Demeter | не тягнути `a.b.c.d`; працювати з прямими залежностями |

---

## 1b. TypeScript за Matt Pocock (Total TypeScript)

Канонічний TS-стиль проєкту. Джерела: [totaltypescript.com](https://www.totaltypescript.com/) (tips, articles).

### Типи й імена

| Правило | Вимога |
|---------|--------|
| Singular types | Тип у однині (`OrgLayoutNode`), множина лише для масивів |
| Різний casing value vs type | values `camelCase`, types `PascalCase` — щоб не плутати рівні |
| Generics prefix `T` | `TData`, `TRaw`; один параметр можна `T`; уникати `T, U, V` |
| Без Hungarian | не `IUser` / `TOrganization` як префікс «класу типу» |
| Без `enum` | prefer `as const` object + derived union (`typeof X[keyof typeof X]`) |

Чому без enum (Pocock): enums ламають structural typing (стають nominal), numeric/string enums компіляться по-різному, зайвий runtime. `as const` — ідіоматичний TS.

### Inference vs annotations

| Правило | Вимога |
|---------|--------|
| Default: infer return | Не вимагати return type на кожній функції (application code) |
| Return type обов’язково | **Library / публічний SDK API**; функції з кількома гілками (`if`/`switch`); рідкісні perf-кейси infer |
| Prefer `satisfies` | Перевірити тип **без** втрати вузького infer (конфіги, maps, const objects) |
| Уникати `as` / `!` | Assertion лише на межі з обґрунтуванням |
| Без `any` | `unknown` + narrowing; `any` заражає залежний код |
| `import type` | Type-only imports |

Для `@org-hierarchy/sdk` як **бібліотеки**: усі **exported** функції/методи — з явними типами параметрів і return (виняток Pocock для library code).

### Generics

- Generic лише коли тип **динамічний** і впливає на результат.
- Якщо всі форми відомі наперед — **union**, не generic.
- Не вводити generic «про запас».

### Runtime validation (межі)

- Зовнішній / напівдовірений вхід (host data, worker messages) — валідація на межі, не довіра
  лише до compile-time типів. **Zod у залежностях немає** (звірено 2026-09-02) — межу тримають
  рукописні перевірки: `validateOrgHierarchy` (`layout/orgTree.ts`), нормалізація повідомлень у
  `worker/bridge.ts`, `checkReparent` (`interaction/positionReparent.ts`). Заводити Zod — окреме
  рішення, а не мовчазна вимога цього документа.
- Внутрішні чисті виклики після валідації — типи без повторного parse.

### Exhaustiveness

```ts
// switch по discriminated union — default: assertNever(x)
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${String(x)}`);
}
```

### Compiler

- `strict: true`
- Бажано `noUncheckedIndexedAccess` (індекс → `T | undefined`)
- Без ігнорування помилок TS у збірці

---

## 2. Clean Architecture (Dependency Rule)

Залежності **лише всередину** (до політики / domain):

```text
┌─────────────────────────────────────────────────────────┐
│  Frameworks & Drivers                                   │
│  Pixi, DOM, Worker, wasm-bindgen glue                   │
├─────────────────────────────────────────────────────────┤
│  Interface Adapters                                     │
│  OrgHierarchyDiagram, layoutBridge, mappers, callbacks  │
├─────────────────────────────────────────────────────────┤
│  Application (use cases)                                │
│  expand/collapse gesture → layout; setData; export      │
├─────────────────────────────────────────────────────────┤
│  Domain / Enterprise                                    │
│  DiagramData, org tree rules, matrix membership,        │
│  layout contracts (типи результатів)                    │
└─────────────────────────────────────────────────────────┘
         ← залежності вказують СЮДИ (inward)
```

### Правила для цього репо

| ✅ | ❌ |
|----|----|
| Domain не імпортує Pixi / Worker | `data/types.ts` тягне `render/` |
| Layout compute не знає про canvas | `matrixGrid` малює в Pixi |
| WASM — adapter: Domain описує контракт, Rust/WASM реалізує | Бізнес-правила collapse лише в Rust *або* лише в TS — одне місце правди для семантики visible-tree |
| Host callbacks на краю | Callbacks всередині layout algorithm |

**DiagramData** — єдине джерело правди стану. LayoutResult — view-model, не пише назад у domain без явного use case.

---

## 3. SOLID (структура модулів)

| Літера | Принцип | У нашому SDK |
|--------|---------|--------------|
| **S** | Single Responsibility | `matrixGrid` ≠ `rowTreeLayout` ≠ `DiagramRenderer`; один файл — одна причина змінюватись |
| **O** | Open/Closed | Новий edge style / layout algorithm — через options / strategy, не if-лавина в renderer |
| **L** | Liskov | Підтипи LayoutResult / NodeView взаємозамінні без `instanceof`-гілок у клієнта |
| **I** | Interface Segregation | Вузькі callback-типи (`onLayoutChange`, `onNodeClick`), не «GodCallbacks» |
| **D** | Dependency Inversion | Renderer залежить від `ContourComputer` / layout ports, не від конкретного wasm-модуля |

**Антипатерн:** God-class `OrgHierarchyDiagram` на 2k рядків з layout+render+worker+export. Виносити use-case методи в application-сервіси, diagram — facade.

---

## 4. DRY (Don’t Repeat Yourself)

- **DRY = одна правда знання**, не «нуль рядків схожого коду».
- Дозволено схожу glue-обгортку (wasm call), якщо абстракція дорожча за дубль.
- Заборонено дублювати: правила collapse, matrix eject, org validate — в TS і Rust по-різному без синхронізації.
- Спільні типи: `packages/sdk/src/wasm/generated/` або shared contracts; не copy-paste `LayoutNode` вручну.

---

## 5. KISS (Keep It Simple)

- Не вводити DI-container, EventBus, мікрофронти «на виріст».
- Не stateful WASM session, доки batch + один gesture→layout не виміряні як bottleneck.
- Не GoF-патерн «бо красиво» — лише під повторену проблему (див. §6).
- Prefer functions + modules над глибокими class hierarchies у TS compute-шарі.

---

## 6. GoF — дозволені / обережні патерни

| Патерн | Коли ✅ | Коли ❌ |
|--------|---------|--------|
| **Facade** | `OrgHierarchyDiagram` для host | Facade, що ховає 5 side effects без тестів |
| **Adapter** | `layoutBridge`, `flatToDiagram`, wasm pkg | Adapter на кожен внутрішній виклик |
| **Strategy** | matrix vs row-tree; orthogonal vs bezier edges | Strategy на 2 рядки різниці |
| **Observer** | callbacks `onLayoutChange` | Власний EventEmitter замість простих callbacks без потреби |
| **Factory** | `createWorker`, `OrgHierarchyDiagram.create` | AbstractFactory для однієї реалізації |
| **Composite** | org tree / Pixi display list | Composite для плоского списку nodes |
| **Command** | layout patches (`LayoutPatch`) для undo-готового API | Command на кожен setter |
| **Singleton** | уникати; wasm module cache — lazy module-level ok | Глобальний mutable Diagram store |

---

## 7. Якість коду в процесі (Boy Scout + TDD Refactor)

| Практика | Вимога |
|----------|--------|
| Perfective в кожному PR | Дрібні покращення імен/типів/мертвого коду в зачеплених файлах — норма |
| Dead code | Видаляти, не коментувати; archive лише в `archive/` |
| Consistent abstractions | Один стиль layout call, один стиль worker message |
| TDD Refactor step | Після GREEN — вирівняти під Clean Code + Matt Pocock TS rules |
| Review checklist | Див. §9 |

Великий rewrite — лише після виміру (розмір модуля, час layout, flake tests), не «перепишемо все під патерни».

---

## 8. Шари TypeScript у монорепо (мапінг)

| Шар Clean Architecture | Шлях |
|------------------------|------|
| Domain | `packages/sdk/src/data/`, layout *contracts* у `layout/types.ts` |
| Application | `expandOrg` / `collapseOrg` / `reorderOrg` orchestration; mappers use-cases |
| Adapters | `contour/bridge.ts`, `wasm/layoutBridge.ts`, `worker/*`, `mappers/*` |
| Frameworks | `render/*` (Pixi), demo app, wasm pkg glue |

Rust (`packages/core`) = **окремий compute core** за портом (WASM), не «внутрішній шар TS». Семантика visible-tree / validate має мати **один канонічний опис** у SPEC; імплементація — в Rust для hot path, тонкий TS adapter.

---

## 9. Definition of Done (код)

PR / задача не done, якщо:

- [ ] Немає success **і** failure тестів ([TDD.md](./TDD.md))
- [ ] Порушено Dependency Rule (domain ← frameworks)
- [ ] З’явився `any` / `@ts-ignore` без обґрунтування
- [ ] Новий `enum` замість `as const` + union (без винятку в PR)
- [ ] Публічний SDK export без явного return type (library rule, Matt Pocock)
- [ ] Дубль бізнес-правила в TS і Rust без позначки source of truth
- [ ] God-module розрісся без винесення SRP
- [ ] Патерн GoF додано «на майбутнє» без другого споживача

---

## 10. Приклади для нашого контексту

### ✅ Добре (Matt Pocock + Clean Architecture)

```ts
export const OrgDisplayMode = {
  Matrix: 'matrix',
  RowTree: 'row-tree',
} as const;

export type OrgDisplayMode = (typeof OrgDisplayMode)[keyof typeof OrgDisplayMode];

// Library export — явний return type
export async function computeOrgRowTreeLayout(
  organizations: DiagramOrganization[],
  expandedRootId: string,
  options?: OrgLayoutOptions,
): Promise<OrgLayoutResult> {
  /* … */
}
```

```ts
// Application: один жест → один layout
async expandOrg(orgId: string): Promise<void> {
  this.data = { ...this.data, organizations: expandOrg(this.data.organizations, orgId) };
  await this.relayout();
}
```

### ❌ Погано

```ts
enum Mode { Matrix, RowTree } // nominal enum — уникати

function click(n: any) {
  n.collapsed = false;
  wasm.layout(n);
  app.stage.addChild(/* … */);
}
```

---

## 11. Референси

1. Robert C. Martin — *Clean Code*; *Clean Architecture* (Dependency Rule)
2. GoF — *Design Patterns* (вибірково)
3. SOLID / DRY / KISS — прагматичні принципи дизайну
4. **Matt Pocock / Total TypeScript** — [totaltypescript.com](https://www.totaltypescript.com/)  
   - Naming types, return types, generics  
   - Why I don’t like enums / `as const`  
   - `satisfies`, `unknown` vs `any`  
   - When to use Zod  
5. ts-rs / generated types — single source з Rust, де застосовно