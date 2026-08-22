# T56 — GoJS reverse-engineering: інвентаризація функціоналу

**Пріоритет:** P2 (планування parity / roadmap)  
**Статус:** draft — **для product selection** (позначайте `[x]` що беремо)  
**Джерела:** [gojs.net](https://gojs.net/latest/), samples (orgChartEditor, orgChartStatic, orgChartAssistants), intro/learn, API

---

## Як користуватись цим документом

1. Пройдіться по **§16 Feature catalog** — там checkbox-групи з коротким описом і parity.
2. Позначте `[x]` те, що хочете в roadmap (можна дописати свої пункти в §17).
3. Пріоритети P0/P1/P2 — орієнтир, не жорстке правило.

**Легенда parity**

| | |
|---|---|
| ✅ | Є в SDK (v1 або demo) |
| 🔄 | Частково / інша модель |
| ❌ | Немає (кандidat backlog) |
| ➖ | N/A для нашого scope (2M staff, org matrix) |

---

## 1. Архітектура

| GoJS | Опис | SDK |
|------|------|-----|
| **Model–View** | `Model` (data) ↔ `Diagram` (view); зміни data → автоматичний rebind | 🔄 `DiagramData` + `OrgHierarchyDiagram.render()` — явний render cycle |
| **GraphObject tree** | Декларативні шаблони (Panel, Shape, TextBlock, Picture) | 🔄 Pixi `PersonNodeView` / `OrganizationNodeView` — imperative code |
| **Binding** | TwoWay binding полів data → appearance | ❌ немає binding DSL; theme + mappers |
| **Template Map** | `nodeTemplateMap`, `linkTemplateMap` по category | 🔄 фіксовані типи: org / person / dept blob |
| **Transaction** | `startTransaction` / `commitTransaction` | ❌ |
| **Incremental updates** | `mergeNodeDataArray`, збереження Part identity | 🔄 повний re-render layers; contour session incremental |

---

## 2. Моделі даних

| GoJS | Опис | SDK |
|------|------|-----|
| **GraphLinksModel** | nodes + links arrays, довільні графи | 🔄 `organizations` + `orgLinks` + `reportLines` |
| **TreeModel** | дерево parent→child без окремих link objects | 🔄 `parentOrgId` на org |
| **Tree + links** | одночасно | ✅ org tree + staff report lines |
| **Groups** | `nodeIsGroup`, subgraph як node | 🔄 dept contour groups, staff tiers — не GoJS Groups |
| **modelData** | shared diagram metadata | ❌ |
| **Unique keys** | auto key generation | ✅ string ids |
| **Categories** | різні templates per category | 🔄 kind: org / person / position |
| **Copy/clone data** | `copyNodeData`, duplicate subtree | ❌ |
| **JSON I/O** | `model.toJson()` / `fromJson` | 🔄 mapper JSON → DiagramData |
| **testId / stable keys** | custom fields for automation | ✅ T55 `testId` + DOM anchors |

---

## 3. Layouts (автоматичне розміщення)

| GoJS Layout | Призначення | SDK |
|-------------|-------------|-----|
| **TreeLayout** | класичне дерево, angle, layer spacing, compaction | ✅ row-tree (WASM `computeOrgRowTreeLayout`) |
| **TreeLayout.assistants** | «assistant» nodes збоку від manager | ❌ |
| **TreeLayout LastParents** | інше вирівнювання останніх батьків | ❌ |
| **GridLayout** | сітка | ✅ org matrix (`matrixLayout`) |
| **LayeredDigraphLayout** | DAG, не лише дерево | ❌ |
| **ForceDirectedLayout** | physics spring | ❌ |
| **CircularLayout** | коло | ❌ |
| **Custom Layout** | subclass Layout | 🔄 staff 3-tier canvas, contour magnetism |
| **Layout invalidation** | auto re-layout on size/visibility | 🔄 manual render on data change |
| **isInitial / isOngoing** | контроль auto-layout | ➖ |
| **Manual location** | `Part.location` + binding, skip layout | 🔄 `gridCell`, drag snap |
| **Routers** | custom link paths after layout | 🔄 staff/org edge geometry окремо |

---

## 4. Org chart (samples & patterns)

| GoJS | Опис | SDK |
|------|------|-----|
| **Classic org chart** | top-down tree, cards | ✅ row-tree org cards |
| **Org chart editor** | drag-reparent, add/remove nodes | 🔄 expand/collapse; ❌ drag-reparent org |
| **Expand/collapse subtree** | `TreeExpanderButton`, `isTreeExpanded` | ✅ `+/−` chrome (T52); 100k вимкнено (T48) |
| **Collapse levels** | приховати глибину | 🔄 collapsed flag per org |
| **Matrix ↔ tree switch** | різні layouts на одних data | ✅ matrix / row-tree (orgMode) |
| **Assistants** | lateral nodes | ❌ |
| **Overview minimap** | `Overview.observed` | ❌ (zoom FAB + fitView) |
| **Search + highlight** | filter string in node data | 🔄 search index + revealPath; ❌ highlight all matches |
| **Static org chart** | read-only + navigation | 🔄 demo tabs |
| **In-place text edit** | TextEditingTool | ❌ |
| **Table panel in node** | rows/columns (photo, name, title) | 🔄 фіксований card layout |
| **Data Inspector** | HTML editor для selected part | ❌ |

---

## 5. Links (зв'язки)

| GoJS | Опис | SDK |
|------|------|-----|
| **Link template** | path, arrowhead, labels | ✅ `OrgEdgesView`, `StaffEdgesView` |
| **Orthogonal routing** | сегменти 90° | ✅ SVG path ortho |
| **Link labels** | TextBlock on link | ❌ |
| **Link reshaping** | drag segments | ❌ |
| **Relinking** | reconnect endpoints | ❌ |
| **Draw new link** | LinkingTool | ❌ |
| **Ports / spots** | fromSpot, toSpot, portId | 🔄 LOD edge ports (T45) |
| **Avoid nodes** | routing around obstacles | 🔄 corridors / visual AABB (T37, T44) |
| **Valid cycle** | DAG constraint | 🔄 tree validation (`validateOrgHierarchy`) |
| **Duplicate links** | allowed/blocked | ➖ |

---

## 6. Tools & interaction

| GoJS Tool | Опис | SDK |
|-----------|------|-----|
| **DraggingTool** | move nodes | 🔄 person grid drag |
| **Drag-and-drop reparent** | tree restructure | ❌ org reparent |
| **PanningTool** | pan canvas | ✅ Viewport |
| **Zoom** | wheel / pinch | ✅ wheel + pinch + FAB |
| **LinkingTool** | draw links | ❌ |
| **RelinkingTool** | reconnect | ❌ |
| **ResizingTool** | resize nodes | ❌ |
| **RotatingTool** | rotate | ❌ |
| **TextEditingTool** | edit in place | ❌ |
| **ContextMenuTool** | built-in | 🔄 React context menu (T52) |
| **ToolManager** | gesture arbitration | 🔄 Pixi event boundary |
| **Custom tools** | subclass Tool | ❌ formal tool framework |
| **Click / double-click** | GraphObject events | ✅ onNodeClick, context menu |
| **Hover / tooltips** | Adornment | 🔄 hover ring; ❌ tooltip |

---

## 7. Selection & adornments

| GoJS | Опис | SDK |
|------|------|-----|
| **Selection collection** | multi-select | 🔄 single selection |
| **Select all / region** | marquee | ❌ |
| **Selection adornments** | handles, outline | 🔄 overlay selection rect |
| **Highlight data** | `Diagram.highlightCollection` | ❌ search highlight |
| **Promote / detail panel** | external HTML | 🔄 React promote overlay (T26) |

---

## 8. Undo / redo

| GoJS | Опис | SDK |
|------|------|-----|
| **UndoManager** | model + diagram history | ❌ |
| **Transactions** | group changes | ❌ |
| **undo / redo** | user + API | ❌ |
| **skipsUndoManager** | perf for bulk | ➖ |

---

## 9. Groups & layers

| GoJS | Опис | SDK |
|------|------|-----|
| **Group** | collapsible subgraph | 🔄 dept contour blob (не node group) |
| **SubGraphExpanderButton** | expand group | 🔄 staff org ▼/▲ in-place |
| **Layered diagram** | Layer, z-order | ✅ LayerManager |
| **Temporary layers** | tools overlay | 🔄 overlay layer |

---

## 10. Styling & themes

| GoJS | Опис | SDK |
|------|------|-----|
| **ThemeManager** | light/dark, CSS-like | 🔄 light/dark node theme |
| **Per-part bindings** | data → fill/stroke | 🔄 theme tokens |
| **Gradients / pictures** | Shape brushes | 🔄 sprites, avatar fill |
| **Fonts / text** | TextBlock styling | ✅ Pixi Text |
| **LOD by scale** | hide details when small | ✅ far/mid/near LOD |

---

## 11. Performance & scale

| GoJS | Опис | SDK |
|------|------|-----|
| **VirtualizedTreeLayout** | не всі nodes materialized | 🔄 100k window (400 cards), 2M search index |
| **Suspension** | pause layout | ❌ |
| **Viewport culling** | implicit | 🔄 LOD + windowing |
| **Server-side layout** | headless Diagram | 🔄 WASM layout worker |
| **skipsUndoManager** | bulk load | ➖ |

---

## 12. Export & print

| GoJS | Опис | SDK |
|------|------|-----|
| **diagram.makeSvg** | SVG | ✅ SVG export |
| **diagram.makeImage** | PNG raster | ✅ PNG export |
| **PDF** | via print/image | ✅ PDF export |
| **Print** | browser print | ✅ print |
| **Export selection only** | scope | 🔄 scope param |

---

## 13. Extensions & ecosystem

| GoJS | Опис | SDK |
|------|------|-----|
| **200+ samples** | reference apps | 🔄 demo tabs |
| **Extensions source** | Buttons.js, DataInspector | ❌ |
| **React / Vue / Angular** | integration guides | 🔄 React menu/promote/test anchors |
| **TypeScript API** | typed | ✅ |
| **Commercial license** | Northwoods | ➖ MIT OSS SDK |
| **E2E automation** | no official DOM per node | ✅ T54 Playwright + T55 anchors |

---

## 14. Підсумок: топ можливостей GoJS для parity-обговорення

**P0-клас (org chart must-have в enterprise)**

1. Tree expand/collapse з збереженням viewport — ✅ T53
2. Search + reveal path — ✅
3. Context menu on nodes — ✅ T52
4. Pan/zoom/fit — ✅
5. Export SVG/PNG/PDF — ✅
6. E2E / stable selectors — ✅ T54 + T55

**P1 (часто очікують поруч із GoJS org samples)**

1. Overview minimap — ❌ → T57
2. Multi-select + bulk actions — ❌
3. Undo/redo edit session — ❌ → T59
4. Drag-reparent org tree — ❌ → T60
5. In-place rename — ❌
6. Link draw / relink — ❌
7. Search highlight (all matches) — ❌ → T58
8. Assistant nodes / LastParents alignment — ❌ → T61
9. Tooltips on hover — ❌

**P2 (diagramming platform — за межами v1 scope)**

1. Force-directed / circular layouts
2. Full GraphObject template system
3. Group/subgraph editor
4. TextEditingTool, ResizingTool
5. Data Inspector extension
6. Server-side image generation farm

---

## 15. Рекомендовані задачі (похідні від інвентаризації)

| ID | Тема | Пріоритет | Статус |
|----|------|-----------|--------|
| T54 | Playwright e2e smoke | P1 | ✅ done |
| T55 | testId + DOM anchors | P1 | ✅ done |
| T57 | Overview minimap (GoJS Overview parity) | P2 | backlog |
| T58 | Search highlight collection | P2 | backlog |
| T59 | Undo/redo для org expand + drag | P2 | backlog |
| T60 | Org drag-reparent (LinkingTool parity) | P3 | backlog |
| T61 | Assistant / LastParents **або** group recursion — див. [T61-group-recursion-tier3.md](./T61-group-recursion-tier3.md) | P3 | backlog |
| T63–T70 | Міграційні gaps GoJS→dg — див. [T71](./T71-gojs-to-dg-migration-plan.md) | P0–P2 | planned |

> **Нумерація:** T53–T56 зайняті зданими тікетами `dg`. Міграційні gaps починаються з **T63**; B8c = **T61**; індекс плану = **T71**.
> Assistants (старий T61 у §15) при колізії перенести в **T72** при старті імплементації.

---

## 16. Feature catalog — для вибору (checkbox)

Позначте `[x]` що беремо в наступні спринти. Додаткові ідеї — §17.

### A. Navigation & viewport

- [ ] **A1 Overview minimap** — міні-карта з viewport rect (GoJS `Overview`) → T57
- [x] **A2 Fit / reset / zoom FAB** — toolbar + on-diagram controls
- [x] **A3 Pan after expand/collapse** — T53 viewport fix
- [ ] **A4 Breadcrumb / focus path** — «Root › Ministry › Dept» для drill-down staff
- [ ] **A5 Deep-link URL** — `?focus=org-123` / `?testId=root` для share
- [ ] **A6 Keyboard navigation** — arrows між nodes, Enter expand

### B. Org tree & matrix

- [x] **B1 Row-tree layout** — WASM org tree
- [x] **B2 Matrix layout** — flat org grid
- [x] **B3 Matrix ↔ tree toggle** — expand/collapse per org
- [x] **B4 Org +/− chrome** — T52 (off on 100k)
- [ ] **B5 Collapse to level N** — «show 2 levels only»
- [ ] **B6 Drag-reparent org** — DnD change `parentOrgId` → T60
- [ ] **B7 Assistant nodes** — lateral siblings (GoJS assistants) → T61
- [ ] **B8 LastParents alignment** — alternate last-row layout → T61
- [ ] **B9 Org card inline edit** — rename org in place
- [ ] **B10 Matrix reorder drag** — swap `matrixOrder` visually

### C. Staff / positions

- [x] **C1 Grid snap drag** — person move between cells
- [x] **C2 Report lines (admin)** — ortho edges + arrows
- [x] **C3 Dept contours** — WASM blob + magnetism
- [x] **C4 Staff 3-tier canvas** — org cards + drill
- [x] **C5 Staff org expand-in-place** — ▼/▲ under card
- [ ] **C6 Vacant position styling** — dashed / placeholder avatar
- [ ] **C7 Multi-report (matrix mgmt)** — кілька ліній на одну позицію
- [ ] **C8 Link draw / relink** — interactive report line edit
- [ ] **C9 Block move** — shift department block разом
- [ ] **C10 Headcount badge** — FTE / vacant count on org card

### D. Search & selection

- [x] **D1 Full-text search** — worker index 2M scale
- [x] **D2 revealPath / focusNode** — expand + pan
- [x] **D3 testId search** — T55 in haystack
- [ ] **D4 Highlight all matches** — dim non-matches → T58
- [ ] **D5 Multi-select** — Shift+click, marquee
- [ ] **D6 Selection scope export** — PNG/SVG лише subtree
- [ ] **D7 Recent / pinned nodes** — sidebar shortcuts
- [ ] **D8 Fuzzy search** — typo tolerance

### E. Context menu & actions

- [x] **E1 Context menu (React)** — T52 ⋮ + right-click
- [x] **E2 Expand / collapse / focus** — menu actions wired
- [ ] **E3 Copy id / copy subtree JSON** — clipboard helpers
- [ ] **E4 Bulk actions** — collapse selected, export selected
- [ ] **E5 Custom menu items** — host inject via callback (partial ✅)
- [ ] **E6 Permissions** — hide actions by role (host-side)

### F. Visual polish & LOD

- [x] **F1 LOD far/mid/near** — simplify cards + edges
- [x] **F2 Light/dark theme**
- [x] **F3 Promote overlay (HTML card)** — near zoom detail
- [ ] **F4 Tooltips** — name/title on hover delay
- [ ] **F5 Animation on layout change** — morph positions (contour morph partial)
- [ ] **F6 Custom node templates** — host-provided React card per kind
- [ ] **F7 Edge labels** — «admin / func» on report lines
- [ ] **F8 Emblem / photo lazy load** — progressive textures

### G. Edit session & history

- [ ] **G1 Undo / redo stack** — expand, drag, reparent → T59
- [ ] **G2 Optimistic UI + rollback** — failed WASM layout
- [ ] **G3 Dirty flag / beforeunload** — unsaved changes
- [ ] **G4 Audit log hook** — who moved whom (callback)

### H. Scale & perf

- [x] **H1 100k org window** — sliding window + search jump
- [x] **H2 Worker search index**
- [x] **H3 Worker contour + layout WASM**
- [ ] **H4 Incremental render** — patch layers без full clear
- [ ] **H5 Virtual scrolling for flat matrix** — не materialize off-screen
- [ ] **H6 Suspended diagram** — pause layout during bulk import
- [ ] **H7 Memory budget telemetry** — callback on heap / texture count

### I. Export & integration

- [x] **I1 PNG / SVG / PDF / print**
- [x] **I2 Mapper JSON pipeline**
- [ ] **I3 Embed API (iframe postMessage)** — host ↔ diagram events
- [ ] **I4 Server-side render** — headless PNG for reports
- [ ] **I5 WCAG: focus ring + aria on anchors** — extend T55
- [x] **I6 Playwright e2e** — T54 smoke

### J. GoJS-only / low priority для нас

- [ ] **J1 Force-directed layout**
- [ ] **J2 Circular layout**
- [ ] **J3 Rotating / resizing tools**
- [ ] **J4 GraphObject binding DSL**
- [ ] **J5 Data Inspector panel**
- [ ] **J6 Swimlanes / BPMN**

---

## 17. Ваші доповнення (placeholder)

Додайте сюди фічі, яких немає в GoJS, але потрібні продукту:

- [ ] _(приклад)_ Інтеграція з LDAP / HRIS sync
- [ ] _(приклад)_ Порівняння двох знімків штатки (diff view)
- [ ] _(приклад)_ Compliance overlay (посади без наказу)
- [ ] **…ваші пункти…**

---

## 18. Mapping: обрані фічі → задачі

| Якщо обрали | Пропонований ticket |
|-------------|---------------------|
| A1 | T57 minimap |
| B6 | T60 drag-reparent |
| B7, B8 | T61 assistants / LastParents |
| D4 | T58 search highlight |
| G1 | T59 undo/redo |
| I5 | T62 a11y anchors |
| H4–H6 | T63 perf incremental |

---

## Verify

Документ — planning only. Оновлювати після major releases SDK.

**Останнє оновлення:** T54/T55 done — e2e + testId anchors in SDK/demo.
