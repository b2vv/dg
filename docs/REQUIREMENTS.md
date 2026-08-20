# Вимоги — Org Hierarchy (v1 scope)

> Зафіксовано за відповідями замовника. Основа коду — після підтвердження цього документа.

---

## 0. Відповіді на ключові питання

| # | Питання | Відповідь |
|---|---------|-----------|
| 1 | Формат продукту | **Бібліотека для інтеграції** (npm package / embeddable SDK) |
| 2 | Масштаб на діаграмі | **2M осіб** у dataset, доступні через діаграмy (search, clusters, viewport) |
| 3 | Де працює логіка | **Клієнт** (browser) |
| 4 | Джерело даних | **Дані in-memory** + **мапери** (API опційно через mapper) |
| 5 | UI вузлів + взаємодія | Див. розділ 4 |
| 6 | Режими | **Обидва**: org matrix/tree **і** staff hierarchy |
| 7 | Експорт | **Все**: SVG, PNG, PDF, друк |
| 8 | Bundler | **Rsbuild** |
| 9 | Web Worker | **Так** |
| 10 | Service Worker / offline | **Ні** |

---

## 1. Масштаб

| Сутність | Обсяг |
|----------|-------|
| Організації | ~50 000 |
| Персони | ~2 000 000 |
| Org ↔ Group | 0..N груп на org |
| Person ↔ Position | many-to-many |

**Важливо про «2M на діаграмі»:** у dataset — 2M осіб. Одночасно на екрані рендериться **viewport** (LOD + clusters). Усі 2M **адресуються** (search, focus, expand path). Повний raster 2M nodes — фізично неможливий; бібліотека garantує **повну адресність**, не **повний одночасний рендер**.

---

## 2. Режими відображення

### 2.1 Організації

| Стан | Режим |
|------|-------|
| Усі org **collapsed** | **Matrix** — sparse зв'язки між org |
| ≥1 org **expanded** | **Row-tree** — ряд 1, 2, 3… (depth) |

### 2.2 Штатка

- Групування: **департамент**, **організація**, **група**
- Складні зв'язки: admin + matrix + міжorg
- Блок посад — зсув **цілого блоку** на рівень ↑ / ↓

---

## 3. Модель даних (API contract draft)

### Organization

```ts
interface Organization {
  id: string;
  name: string;
  symbolUrl?: string;        // емблема org
  symbolUrlDark?: string;    // символ під темну тему
  symbolUrlLight?: string;   // символ під світлу тему
  parentOrgId?: string;
  collapsed?: boolean;       // UI state (може жити локально)
  groupIds: string[];        // 0..N
}
```

### Group

```ts
interface Group {
  id: string;
  name: string;
  emblemUrl?: string;
}
```

### Person

```ts
interface Person {
  id: string;
  fullName: string;          // ПІБ
  photoUrl?: string;
}
```

### Position

```ts
interface Position {
  id: string;
  title: string;             // назва посади
  organizationId: string;
  departmentId?: string;
  groupIds: string[];
  status: 'filled' | 'vacant' | 'acting';
  isTemporary: boolean;      // тимчасово / не тимчасово → значок
  assignments: PositionAssignment[];
  layoutCoords?: { x: number; y: number };  // primitive coords (drag)
  hierarchyLevel?: number;   // для зсуву блоку ↑↓
}
```

### PositionAssignment

```ts
interface PositionAssignment {
  personId: string;
  positionId: string;
  isPrimary?: boolean;
}
```

### ReportLine

```ts
interface ReportLine {
  fromId: string;
  toId: string;
  kind: 'admin' | 'matrix' | 'dotted';
}
```

### API (мінімальні endpoints)

```
GET  /orgs/:id/neighborhood?depth=k
GET  /orgs?search=&page=
GET  /groups/:id/orgs
GET  /staff/by-org/:orgId?page=
GET  /persons/:id/positions
GET  /persons?search=
POST /layout/patch          — опційно: persist drag coords (якщо API зберігає)
```

---

## 4. UI вузлів і взаємодія

### 4.1 Person node

| Поле | Відображення |
|------|--------------|
| ПІБ | текст |
| Назва посади | текст |
| Фото | avatar |
| Тимчасово / постійно | **значок** (icon badge) |

### 4.2 Organization node

| Поле | Відображення |
|------|--------------|
| Назва організації | текст |
| Назва групи | текст (primary group або список) |
| Емблема групи | image |
| Символ org | image, **theme-aware** (light/dark) |

**Візуальний профіль:** окремий шаблон — «картка org» (горизонтальна, акцент на символі/емблемі, інший border/radius ніж у person).

### 4.3 Department / Org container (контекст посад)

**Відмінний від org-node у matrix/tree** — це **контейнер штатки**, не org-картка.

| Елемент | Відображення |
|---------|--------------|
| Контур департаменту | **Неправильна форма** (не axis-aligned rectangle) |
| Назва dept | label на/contour |
| Positions всередині | person/position nodes |

**Org-контейнер** (коли групуємо dept у межах org) — теж **інший** візуальний профіль: більший периметр, інший stroke/fill, можлива вкладеність dept-блоків.

### 4.4 Person / Position node

| Поле | Відображення |
|------|--------------|
| ПІБ | текст |
| Назва посади | текст |
| Фото | avatar (круглий/rounded — **не** як org) |
| Тимчасово / постійно | **значок** (icon badge) |

**Візуальний профіль:** компактна «картка особи», вертикальна, фото-центрична — **свідомо не схожа** на org/dept.

### 4.5 Три типи вигляду (summary)

| Тип | Де використовується | Форма |
|-----|---------------------|-------|
| **OrganizationNode** | matrix, row-tree | Картка org + symbol/emblem |
| **DepartmentBlob** | staff layout | Неправильний полігон (Tetris-блок) |
| **PersonNode** | staff layout | Avatar + ПІБ + посада + badge |

```ts
type NodeVisualKind = 'organization' | 'department' | 'person' | 'position';

interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
}
```

### 4.6 Tetris-кластеризація департаментів

Департаменти **не** малюються прямокутниками. Посади всередині org/dept layout:

1. **Кластеризація** — посади одного dept збираються в **зв'язний блок**.
2. **Форма блоку** — **неправильний полігон** (as organic Tetris piece), не bounding box.
3. **Обтікання** — посади **інших** dept та «чужі» nodes **не перекривають** блок; layout **укладає** їх навколо, як **фігури в тетрісі** (puzzle packing / no overlap + minimal gaps).
4. **Межа dept** — concave hull / rounded union of position cells з padding; Pixi `Graphics` path або mesh fill.

#### Схема A — 2×2 (компактний блок)

Посади одного dept: `P1 P2 / P4 P3` → квадратний polyomino 2×2.

```
        col0   col1   col2
row0   ┌─────┬─────┐
       │ P1  │ P2  │░░░░  ← чужа посада обтікає справа
       ├─────┼─────┤░░░░
row1   │ P4  │ P3  │░░░░
       └─────┴─────┘
         └─ IT dept blob (одна фігура)
```

Контур IT — зовнішній периметр клітин P1–P4 (не окремі квадрати навколо кожної посади).

#### Схема B — 1×4 (лінійний ряд)

Посади того ж dept: `P1 P2 P4 P3` в один ряд → «I-tetromino».

```
col0    col1    col2    col3    col4
┌─────┬─────┬─────┬─────┐
│ P1  │ P2  │ P4  │ P3  │░░░░  ← чужа посада обтікає справа
└─────┴─────┴─────┴─────┘
  └──────── IT dept blob ────────┘
```

#### Схема C — обтікання «чужих» посад навколо блоку

IT = `{P1,P2,P3,P4}`, HR = `{H1}`, чужа/інша = `{X1}`.

**До packing (наївно, з перекриттям — погано):**

```
┌──────────────┐
│ P1  P2       │  IT rectangle (зайвий простір)
│ P4  P3  H1   │  ← H1 «всередині» чужого bounding box
└──────────────┘
```

**Після Tetris packing (правильно):**

```
        ┌─────┬─────┐
        │ P1  │ P2  │──┐
        ├─────┼─────┤  │ IT contour (L або 2×2)
        │ P4  │ P3  │──┘
        └─────┴─────┘
┌─────┐           ┌─────┐
│ H1  │           │ X1  │   ← HR і «чужа» обтікають IT
└─────┘           └─────┘     без входу всередину контуру
```

Або L-форма, якщо layout щільніший:

```
┌─────┬─────┐
│ P1  │ P2  │
├─────┤─────┘
│ P4  │  ┌─────┐
├─────┤  │ H1  │  ← H1 заповнює «виїмку», обтікає IT
│ P3  │  └─────┘
└─────┘
```

#### Схема D — два dept поруч (puzzle)

```
IT (2×2)              HR (ряд)
┌─────┬─────┐         ┌─────┬─────┐
│ P1  │ P2  │─────────│ H1  │ H2  │
├─────┼─────┤         └─────┴─────┘
│ P4  │ P3  │─────┐
└─────┴─────┘     │   ┌─────┐
                  └───│ X1  │  чужа «підпирає» обидва блоки
                      └─────┘
```

**Правило:** dept contour = union клітин **своїх** посад; чужі клітини **ніколи** не входять у polygon dept; між блоками — мінімальний gap, як у тетрісі після «посадки» фігур.

**Алгоритм (WASM Worker, draft):**

| Крок | Дія |
|------|-----|
| 1 | Grid / spatial hash для position slots |
| 2 | Tetromino-like **polyomino** на dept з member positions |
| 3 | **Packing** (bin pack + constraint): dept blocks + foreign positions без overlap |
| 4 | **Contour**: alpha shape або union grid cells → polygon |
| 5 | Smooth corners (optional Chaikin / Bezier) для **плавних органічних** країв dept blob |
| 6 | Hit-test: point-in-polygon для dept, окремо для person nodes |

**LOD:** при віддаленні dept blob = simplified polygon + count badge; person nodes collapse to dots.

### 4.7 Події

| Дія | Поведінка |
|-----|-----------|
| **Click** | select / focus node |
| **Context menu** | actions (expand, collapse, details, export subtree, …) |
| **Search** | знайти org/person → **розкрити шлях** у дереві → focus |
| **Incremental build** | нові дані з API → **добудова** без full reload |
| **D&D org (matrix)** | зміна **порядку** org у матриці |
| **D&D person** | зміна **примітивних координат** у dept/org ієрархії |
| **Block shift** | зсув **блоку посад** на рівень вище / нижче |

**Контури dept:** union grid cells → polygon → **Chaikin / quadratic Bezier smoothing** → плавні органічні краї (не суворо ортогональні).

**LOD:** при віддаленні dept blob = simplified polygon + count badge; person nodes collapse to dots.

---

## 4.9 Дані + мапери (замість обов'язкового API)

Бібліотека працює з **готовими або сирими даними**, які host передає напряму.

```ts
// Сирий тип від host (1С, Excel, REST response, …)
type RawOrgRecord = { org_id: string; org_name: string; ... };

// Мапер → канонічна модель діаграми
const mapper: DataMapper<RawOrgRecord[], DiagramData> = (raw) => ({
  organizations: raw.map(r => ({ id: r.org_id, name: r.org_name, ... })),
  ...
});

const diagram = await OrgHierarchyDiagram.create(container, {
  data: rawRecords,           // або diagramData вже готові
  mappers: { toDiagram: mapper },
});
```

| Підхід | Коли |
|--------|------|
| **`data: DiagramData`** | Дані вже в канонічному форматі |
| **`data: TRaw` + `mappers`** | Host має свій формат |
| **`fetcher` + mapper** | Опційно: async load, потім mapper |

**Не потрібен** вбудований HTTP-клієнт — host сам fetch → mapper → `setData()`.

### Worker helpers для трансформацій

Швидке перегоняння типів **off main thread**:

```ts
import { createWorkerPipeline, mapInWorker } from '@org-hierarchy/sdk/worker';

const pipeline = createWorkerPipeline<RawRow[], DiagramData>()
  .step('normalize', normalizeRows)      // sync або async у worker
  .step('toDiagram', flatToDiagram)
  .step('layout', computeLayoutWasm);    // WASM у worker

const diagramData = await pipeline.run(rawRows);
```

| Helper | Призначення |
|--------|-------------|
| `createWorkerPipeline<TIn,TOut>()` | Ланцюжок трансформацій у Web Worker |
| `mapInWorker(mapper, data)` | One-shot mapper у worker |
| `transferable()` | Zero-copy для великих ArrayBuffer |
| `WorkerPool` | Паралельні chunk-и для 2M records |

### 4.10 Callbacks для інтеграції

```ts
interface OrgHierarchyCallbacks {
  onNodeClick?(node: NodeRef): void;
  onContextMenu?(node: NodeRef, items: MenuItem[]): void;
  onLayoutChange?(patch: LayoutPatch): void;
  onDataMapped?(stats: { orgs: number; persons: number; ms: number }): void;
}
```

**Прибрано з обов'язкових:** `fetchNeighborhood`, `fetchStaffPage` — замінено на `data` / `setData()` / incremental `appendData()`.

---

## 5. Технологічний стек (фінальний)

| Шар | Технологія |
|-----|------------|
| Core compute | **Rust → WASM** (+ dept polyomino pack, contour) |
| Threading | **Web Worker** (не Service Worker) |
| Render | **Pixi.js** WebGL, LOD, instancing |
| Bridge | TypeScript, embeddable API |
| Bundler | **Rsbuild** |
| Data | **In-memory** + **DataMapper** (API опційно зовні) |
| Export | SVG / PNG / PDF / print |

**Не входить:** Service Worker, offline, Three.js, GLSL шейдери (на v1).

---

## 6. Архітектура бібліотеки (інтеграція)

```
┌──────────────────────────────────────────────────────────┐
│  Host app (React/Vue/vanilla)                             │
│  import { OrgHierarchyDiagram } from '@org-hierarchy/sdk' │
├──────────────────────────────────────────────────────────┤
│  Public API: mount(), destroy(), search(), export*()    │
├──────────────────────────────────────────────────────────┤
│  Main thread: Pixi stage, input, context menu, themes     │
├──────────────────────────────────────────────────────────┤
│  Web Worker: WASM layout, graph, **dept tetris pack**, contour   │
├──────────────────────────────────────────────────────────┤
│  Injected data + mappers (host fetch → map → setData)      │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Фази реалізації

### Фаза 1 — Foundation
- [ ] Monorepo: `packages/core` (Rust), `packages/sdk` (TS + Pixi + Rsbuild)
- [ ] WASM: layout subtree, row-tree, sparse matrix neighborhood
- [ ] Web Worker bridge
- [ ] Pixi: viewport, clusters, базовий person/org node
- [ ] `DiagramData` types + `DataMapper<TRaw, TDiagram>`
- [ ] Worker helpers: `createWorkerPipeline`, `mapInWorker`, `WorkerPool`
- [ ] `mount(el, { data, mappers })`

### Фаза 2 — Org modes
- [ ] Matrix collapsed / row-tree expanded
- [ ] Search + path expand
- [ ] D&D порядку org у matrix
- [ ] Theme-aware org symbols

### Фаза 3 — Staff
- [ ] PersonNode vs OrganizationNode vs DepartmentBlob — **3 renderers**
- [ ] Person nodes (photo, ПІБ, посада, temp icon)
- [ ] WASM: Tetris dept clustering + irregular contour
- [ ] Pixi: polygon dept fill/stroke, person cards
- [ ] D&D primitive coords + contour recompute
- [ ] Block shift ↑↓ (з перерахунком polyomino)
- [ ] Incremental API merge

### Фаза 4 — Integration polish
- [ ] Context menu API
- [ ] Export SVG/PNG/PDF/print
- [ ] Документація для embed

---

## 8. Відкриті уточнення (minor)

1. **Контекстне меню** — фіксований набір дій від SDK чи повністю кастомний від host?
2. **Persist drag** — координати/порядок зберігає host через `onLayoutChange` чи SDK викликає API напряму?
3. **Тема** — `light`/`dark`/`auto` через CSS variables чи prop `theme`?

---

## 9. Зняті пункти (explicit no)

- Service Worker / PWA offline
- Three.js / 3D
- Shader effects
- Завантаження всіх 2M nodes в один draw call
