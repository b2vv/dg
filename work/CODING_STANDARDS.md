# Стандарти коду TypeScript — Org Hierarchy SDK

> Обов’язкові вимоги до TS-коду в `packages/sdk`, `packages/demo`.  
> Джерела: Clean Code / Clean Architecture (R. Martin), SOLID, DRY, KISS, GoF;  
> практики індустрії (Meta Better Engineering / continuous code improvement; MetaMask TS guidelines).  
> Пов’язано: [`SPEC.md`](./SPEC.md) §13, [`TDD.md`](./TDD.md).

**Дата:** 2026-08-20

---

## 0. Ієрархія принципів (як застосовувати)

```text
KISS  →  спочатку найпростіше рішення, що працює
SOLID →  структура модулів і залежностей
DRY   →  одна правда для знання (не копіпаста логіки)
Clean Code → читабельність імена/функції/помилки
Clean Architecture → напрям залежностей між шарами
GoF → патерн лише коли вже є ≥2–3 повторення проблеми
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

### TypeScript-специфіка (індустрія)

- `strict: true` у tsconfig (як мінімум `strictNullChecks`, `noImplicitAny`, `noImplicitReturns`).
- **Без `any`** у публічному API. Для невідомого — `unknown` + narrowing.
- Prefer inference всередині модуля; **явні типи** на exports / публічних функціях.
- `import type { … }` для type-only imports.
- Без `@ts-ignore` / `@ts-expect-error` без коментаря *чому* і ticket/TODO.
- Не дублювати типи Rust↔TS вручну, якщо є codegen (`ts-rs` / generated).

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

## 7. Практики рівня Meta / індустрія (Better Engineering)

Джерела: Meta continuous code improvement / Better Engineering culture; MetaMask TypeScript guidelines.

| Практика | Вимога |
|----------|--------|
| Perfective maintenance | Регулярні дрібні покращення (імена, dead code, типи) — нормальні PR, не лише features |
| Dead code | Видаляти, не коментувати; archive лише з позначкою (`archive/`) |
| Metrics before rewrite | Великий reengineering — після виміру (розмір модуля, час layout, flake tests) |
| Consistent abstractions | Один спосіб робити layout call, один спосіб worker message — не 3 паралельні стилі |
| Review checklist | Див. §9 |

Орієнтир індустрії: виділяти помітну частку зусиль на якість коду (у Meta BE часто згадують порядок ~20–30% для команд) — у нашому процесі це відображається як обов’язковий Refactor у TDD і окремі tech-debt задачі.

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
- [ ] Публічний API без явних типів
- [ ] Дубль бізнес-правила в TS і Rust без позначки source of truth
- [ ] God-module розрісся без винесення SRP
- [ ] Патерн GoF додано «на майбутнє» без другого споживача

---

## 10. Приклади для нашого контексту

### ✅ Добре

```ts
// Application: один жест → один layout
async expandOrg(orgId: string): Promise<void> {
  this.data = { ...this.data, organizations: expandOrg(this.data.organizations, orgId) };
  await this.relayout(); // єдиний прохід
}
```

```ts
// Adapter: typed bridge, domain не знає wasm
export async function computeOrgRowTreeLayoutWasm(
  organizations: OrgFlatInput[],
  expandedRootId: string,
  options?: WasmRowTreeOptions,
): Promise<OrgRowTreeLayoutResult> { /* … */ }
```

### ❌ Погано

```ts
// Side effect + layout + pixi + any в одній функції
function click(n: any) {
  n.collapsed = false;
  wasm.layout(n);
  app.stage.addChild(new Graphics().rect(n.x, n.y, 10, 10));
  localStorage.setItem('x', JSON.stringify(n));
}
```

---

## 11. Референси

1. Robert C. Martin — *Clean Code*; *Clean Architecture* (Dependency Rule)
2. GoF — *Design Patterns* (застосовувати вибірково)
3. SOLID — класичні п’ять принципів ООП/модульного дизайну
4. DRY / KISS — прагматичні евристики простоти
5. Meta — Code Improvement / Better Engineering practices (continuous perfective work, dead code removal)
6. MetaMask Contributor Docs — TypeScript guidelines (strictness, inference, no unsafe escape hatches)
