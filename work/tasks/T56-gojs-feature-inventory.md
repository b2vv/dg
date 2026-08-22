# T56 — GoJS reverse-engineering: інвентаризація функціоналу

**Пріоритет:** P2 (планування parity / roadmap)  
**Статус:** draft  
**Джерела:** [gojs.net](https://gojs.net/latest/), samples (orgChartEditor, orgChartStatic, orgChartAssistants), intro/learn, API

---

## Мета

Зафіксувати **що вміє GoJS** як reference-class diagramming library, і позначити **що вже є / частково / немає** в Org Hierarchy SDK — для roadmap без сліпого копіювання API.

**Легенда parity**

| | |
|---|---|
| ✅ | Є в SDK (v1 або demo) |
| 🔄 | Частково / інша модель |
| ❌ | Немає (кандидат на backlog) |
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
| **React / Vue / Angular** | integration guides | 🔄 React menu/promote only |
| **TypeScript API** | typed | ✅ |
| **Commercial license** | Northwoods | ➖ MIT OSS SDK |

---

## 14. Підсумок: топ можливостей GoJS для parity-обговорення

**P0-клас (org chart must-have в enterprise)**

1. Tree expand/collapse з збереженням viewport — 🔄 T53 fix
2. Search + reveal path — ✅
3. Context menu on nodes — ✅ T52
4. Pan/zoom/fit — ✅
5. Export SVG/PNG/PDF — ✅

**P1 (часто очікують поруч із GoJS org samples)**

1. Overview minimap — ❌ → backlog
2. Multi-select + bulk actions — ❌
3. Undo/redo edit session — ❌
4. Drag-reparent org tree — ❌
5. In-place rename — ❌
6. Link draw / relink — ❌
7. Search highlight (all matches) — ❌
8. Assistant nodes / LastParents alignment — ❌
9. testId / DOM anchors for e2e — 📋 T55

**P2 (diagramming platform — за межами v1 scope)**

1. Force-directed / circular layouts
2. Full GraphObject template system
3. Group/subgraph editor
4. TextEditingTool, ResizingTool
5. Data Inspector extension
6. Server-side image generation farm

---

## 15. Рекомендовані задачі (похідні від інвентаризації)

| ID | Тема | Пріоритет |
|----|------|-----------|
| T54 | Playwright e2e smoke | P1 |
| T55 | testId + DOM anchors | P1 |
| T57 | Overview minimap (GoJS Overview parity) | P2 |
| T58 | Search highlight collection | P2 |
| T59 | Undo/redo для org expand + drag | P2 |
| T60 | Org drag-reparent (LinkingTool parity) | P3 |
| T61 | Assistant / LastParents tree layout | P3 |

---

## Verify

Документ — planning only. Оновлювати після major releases SDK.
