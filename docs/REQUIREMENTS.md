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
| **DepartmentBlob** | staff layout | Органічний зовнішній контур (без internal edges) |
| **PersonNode** | staff layout | Avatar + ПІБ + посада + badge |

```ts
type NodeVisualKind = 'organization' | 'department' | 'person' | 'position';

interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
}
```

### 4.6 Dept contour — обтікання (канонічні приклади)

**Загальне правило:**

1. Positions розставляються на **координатній сітці** (`col`, `row` або `layoutX/Y`).
2. Dept = **один зовнішній контур на магнітну компоненту** (own cells у межах `magnetRadius`) — **без internal lines** між pos тієї ж компоненти.
3. Якщо own cells **не** «поруч» (див. G1 / M4) — **кілька** контурів того ж dept.
4. Чужі pos (інший dept) — **свої coords** + за потреби окремий контур; контур компоненти **огинає** foreign у своєму bbox (виїмка / коридор).
5. Плавні органічні краї (Chaikin/Bezier).

---

#### Варіант A — сітка 2×2

```
         col0     col1
row0      P1       P2
row1      P4       P3
```

| Dept | Посади |
|------|--------|
| **IT** | P1, P2, P3 |
| **CEO** | P4 |

```
         col0              col1
      ╭────────────────────────────╮
row0  │   P1              P2       │
      │                            │
      ╰──────╮                     │
row1    ┌───┐│              P3     │
        │P4 ││                     │
        └───┘╰─────────────────────╯
          CEO              IT
```

IT own cells зв’язані через сусідів (Manhattan ≤ 1.5) → **одна** L / reversed-C компонента, огинає клітину P4 (G5/G6).

---

#### Варіант B — магнетизм «поруч» (канон)

**Pos на сітці (staff nodes):**

```
         col0     col1     col2
row0      P1       P2       P3      ← IT (сусідні → одна група)
row1               P4               ← CEO (інший dept)
row2      P5                P6      ← IT (не сусідні ні з верхом, ні між собою)
```

| Dept | Pos |
|------|-----|
| **IT** | P1, P2, P3, P5, P6 |
| **CEO** | P4 (row1, col1) |

**Магнетизм (G1):** own cells злипаються лише якщо Manhattan ≤ `magnetRadius` (дефолт / demo **1.5** = ортогональні сусіди).  
Якщо між двома own є **дірка в одну клітинку** (Manhattan **2**) — вони **не** магнітяться.

| IT-група | Cells | Manhattan між групами | Contour |
|----------|-------|------------------------|---------|
| **Top** | P1–P3 @(0..2, 0) | — | **1** blob |
| **Bottom-left** | P5 @(0, 2) | top↔P5 = 2 | **окремий** blob |
| **Bottom-right** | P6 @(2, 2) | top↔P6 = 2; P5↔P6 = 2 | **окремий** blob |

```
      ╭────────────────────────────╮
row0  │  P1      P2      P3        │   ← одна магнітна група IT
      ╰────────────────────────────╯

row1            [ P4 CEO ]             ← чужий dept; не в IT fill

      ╭──────╮              ╭──────╮
row2  │  P5  │              │  P6  │   ← два окремі IT-контури
      ╰──────╯              ╰──────╯
```

**✗ Заборонено трактувати Variant B як один C-контур** навколо CEO (це виходило лише з штучно завищеного `magnetRadius` ≥ 2 / 8 і **не** є магнетизмом «поруч»).

**Membership:** P4 ніколи не в IT fill (M1/M2). Стрілки `reportLines` — окремий шар, не магнетизм.

---

#### Неправильно ✗

```
┌────┬────┬────┐     internal grid lines
│ P1 │ P2 │ P3 │
├────┼────┼────┤
│    │ P4 │    │
├────┼────┼────┤
│ P5 │    │ P6 │
└────┴────┴────┘
```

```
╭──────────────────╮     P4 всередині IT
│ P1  P2  P3       │
│ P4  P5  P6       │
╰──────────────────╯
```

```
╭──────────────────╮     один C / «підкова» IT навколо CEO
│ P1  P2  P3       │     при gap=2 між верхом і низом
│   ┌──┐           │     ← НЕ магнетизм «поруч»
│ P5│P4│       P6  │
╰───┴──┴───────────╯
```

```
P3 │              ← пряма вертикаль P3→P6 як internal edge
   │         P6   ← ЗАБОРОНЕНО (G3)
   │
```

---

### 4.6.1 Правила побудови контурів (магнетизм)

**Магнетизм** — правила, за якими own cells **того ж dept** злипаються в компоненти, а контур кожної компоненти «притягується» до своїх pos і **відштовхується** від чужих, утворюючи зовнішній полігон без internal edges.

---

#### A. Терміни

| Термін | Значення |
|--------|----------|
| **Own cell** | Grid-клітина pos з `departmentId === targetDept` |
| **Foreign cell** | Pos іншого dept (або empty hole), що лежить у bbox компоненти |
| **Contour** | Один замкнений шлях (orthogonal → smooth) **на одну магнітну компоненту** |
| **Padding** | Відступ contour від bbox pos (магнітний зазор) |
| **Gap / corridor** | Мінімальний проміжок між contour і foreign bbox |
| **Magnet radius** | Макс. Manhattan-відстань (у клітинках), на якій own cells злипаються |

---

#### B. Правила membership (хто в контурі)

| # | Правило |
|---|---------|
| M1 | Pos ∈ contour dept **лише** якщо `position.departmentId === dept.id` |
| M2 | Foreign pos **ніколи** не входить у fill polygon (може лежати в bbox, але в **виїмці**) |
| M3 | Empty grid cells між own **тієї ж компоненти** — **не** малюються як internal lines; вони стають **внутрішнім простором** fill |
| M4 | Якщо own cells поза `magnetRadius` (напр. дірка в одну клітинку при radius 1.5) — **окремі контури** того ж dept |

---

#### C. Правила магнетизму (злипання / відштовхування)

| # | Правило | Поведінка |
|---|---------|-----------|
| G1 | **Attract own** | Own cells з **Manhattan ≤ magnetRadius** зливаються в **одну компоненту**. Дефолт **1.5** = лише ортогональні сусіди. Gap **2** (одна порожня клітинка між) → **не** злипаються |
| G2 | **Repel foreign** | Contour **огинає** foreign bbox з `gap ≥ corridorMin` (за замовч. 0.5 cell) |
| G3 | **No internal edges** | Між own pos **компоненти** немає ліній; лише **зовнішній** периметр |
| G4 | **Orthogonal first** | Спочатку маршрут по сітці (H/V); потім Chaikin/Bezier |
| G5 | **Prefer step notch** | Якщо foreign всередині bbox **компоненти** — прямокутна виїмка (C-notch), не дірка з дірою (коли foreign торкається краю) |
| G6 | **No far-side wall** | З боку foreign, де **немає** own cells за ним — **не** малювати вертикаль / борт |
| G7 | **Padding snap** | Contour тримає **прямокутний** pad (Chebyshev ≤ pad) від own; vacant tongues далі — зрізаються. Ряд клітинок → більший прямокутник, не «шляпа» |

| G8 | **Stable under drag** | Після D&D pos — перерахунок; компоненти можуть роз’єднатись / злитись при зміні відстані |

---

#### D. Алгоритм perimeter walk (WASM)

```
1. OwnCells   = cells of positions where departmentId == D
2. Components = union-find own cells with Manhattan ≤ magnetRadius
3. For each component C:
   a. ForeignInBBox = foreign cells overlapping bbox(C)
   b. Mask = union(own cells + internal empty) MINUS foreign cells (expanded by gap)
   c. Walk outer perimeter of Mask (clockwise, orthogonal)
      — only edges adjacent to OUTSIDE or to foreign corridor
      — never emit edges between two own cells
   d. Apply G6: drop edges on foreign far-side if no own beyond
   e. Smooth (Chaikin / quadratic Bezier), keep topology
4. Emit one path per component → Pixi DepartmentBlob
```

---

#### E. Параметри магнетизму (config)

```ts
interface ContourMagnetConfig {
  /** Радіус злипання own cells (grid Manhattan). Default 1.5 = сусіди. */
  magnetRadius: number;       // default: 1.5 — НЕ завищувати «щоб вийшов C»
  /** Rust flood pad (internal). Live demo paint uses RenderConfig.paddingCells instead. */
  padding: number;            // default: 0 у paint path
  /** Мін. зазор до foreign bbox */
  corridorMin: number;        // default: 0.5 cell
  /** Дозволити виїмку (notch) замість hole — Rust membership only */
  preferNotch: boolean;       // default: true
  /** Rust Chaikin (internal). Live paint: RenderConfig.smoothIterations → arc segments. */
  smooth: 'none' | 'chaikin' | 'bezier';
  smoothIterations?: number;
}

interface RenderConfig {
  /** Demo Padding slider: +8 px per step around member-card union (button-group paint). */
  paddingCells: number;
  /** Demo Smooth slider: corner arc density on button-group ring. */
  smoothIterations: number;
}
```

Demo Variant B: `VARIANT_B_MAGNET_RADIUS = 1.5` (`packages/sdk`).

---

#### F. Приклади застосування правил

**Варіант A (2×2):** P1,P2,P3 own · P4 foreign  
→ G1: одна L-компонента (усі IT ≤ 1.5 через ланцюг сусідів) · G5/G6 виїмка навколо P4 · G3 без internal lines

**Варіант B:** P1,P2,P3,P5,P6 own · P4 foreign · `magnetRadius: 1.5`  
→ **3** IT-контури: верхній ряд; P5; P6  
→ P4 не в жодному IT fill  
→ `magnetRadius ≥ 2` дає один C-blob — **порушує** правило «поруч», не використовувати як канон Variant B

---

#### G. Що НЕ є контуром

| ✗ | Чому |
|---|------|
| Bounding box усіх pos dept | Захоплює foreign і ігнорує M4 |
| Один C навколо CEO при gap=2 | Не магнетизм «поруч» (G1) |
| Grid з перегородками між own | Internal edges (G3) |
| Суцільний борт повз foreign без own за ним | Порушує G6 |
| Окремий квадрат навколо **кожної** pos навіть сусідніх | Немає магнетизму (G1) |

**Pixi:** один `DepartmentBlob` path **на компоненту** + окремі `PersonNode` на coords.

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

**Контури dept:** union grid cells → polygon (membership) → paint polish: **завжди button-group rounded rect** навколо карток компоненти. Без ортогонального «шуму» і без окремого L/C fillet-шляху.

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
import { mapInWorker, mapFlatRowsInPool } from '@org-hierarchy/sdk/worker';

const diagramData = await mapInWorker(worker, 'flatRowsToDiagram', rawRows);
```

| Helper | Призначення |
|--------|-------------|
| `mapInWorker(worker, key, data)` | One-shot mapper у worker |
| `mapFlatRowsInPool(rows)` | Chunked pooled map → `DiagramData` |
| `WorkerPool` | Паралельні chunk-и для великих масивів |

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
- [x] Monorepo: `packages/core` (Rust), `packages/sdk` (TS + Pixi + Rsbuild)
- [x] WASM: layout subtree, row-tree, sparse matrix neighborhood
- [x] Web Worker bridge
- [x] Pixi: viewport, clusters, базовий person/org node
- [x] `DiagramData` types + `DataMapper<TRaw, TDiagram>`
- [x] Worker helpers: `mapInWorker`, `WorkerPool`, `mapFlatRowsInPool`
- [x] `mount(el, { data, mappers })` → `OrgHierarchyDiagram.create`

### Фаза 2 — Org modes
- [x] Matrix collapsed / row-tree expanded
- [x] Search + path expand
- [x] D&D порядку org у matrix
- [x] Theme-aware org symbols (+ textures T23)

### Фаза 3 — Staff
- [x] PersonNode vs OrganizationNode vs DepartmentBlob — **3 renderers**
- [x] Person nodes (photo, ПІБ, посада, temp icon)
- [x] WASM: Tetris dept clustering + irregular contour
- [x] Pixi: polygon dept fill/stroke, person cards
- [x] D&D primitive coords + contour recompute
- [x] Block shift ↑↓ (з перерахунком polyomino)
- [x] Incremental API merge (`appendData` / setData)

### Фаза 4 — Integration polish
- [x] Context menu API
- [x] Export SVG/PNG/PDF/print
- [x] Документація для embed
- [x] Layout diagnostics API (T24)

---

## 8. Відкриті уточнення (minor) — resolved

1. **Контекстне меню** — SDK дає `defaultContextMenuItems` + `onContextMenu`; host може повністю кастомізувати (React host у `@org-hierarchy/sdk/react`).
2. **Persist drag** — host зберігає через `onLayoutChange`; SDK не викликає зовнішній API.
3. **Тема** — prop `theme: 'light' | 'dark' | 'auto'` (`resolveTheme`); не CSS variables для canvas.

---

## 9. Зняті пункти (explicit no)

- Service Worker / PWA offline
- Three.js / 3D
- Shader effects
- Завантаження всіх 2M nodes в один draw call
