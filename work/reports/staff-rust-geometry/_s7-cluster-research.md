# S7 — дослідження: правило кластеризації «частин» відділу в tree-режимі ШПС (B5b)

**Статус:** ✅ ВИРІШЕНО (власник підтвердив 2026-10-28). Висновок нижче.
**Дата:** 2026-10-28 (Dg21). Гілка `feat/t126-staff-rust-geometry` @ `68061ef`.

## Питання S7
Відділ може бути розбитий на кілька частин (`partIndex`), кожна — окрема рамка. У matrix-режимі
«частини» = magnetic-кластери на grid-клітинках. **У tree-режимі ШПС grid-клітинок немає** — як
визначати частини? (Рішення власника Dg21: S7 спершу, тоді код B5b.)

## Факти коду (grounded)

### Чинна кластеризація (matrix) — `render/contour/contourCluster.ts`
- `clusterPositionIds`: union-find; злиття коли `manhattan(a,b) = |Δcol|+|Δrow| ≤ magnetRadius` (деф. 1.5).
  Сусіди шукаються по cell-hash (`cellKey=col*73856093+row`), span=ceil(radius). `contourCluster.ts:4,42,61`.
- `clusterPositionsByDepartment` фільтрує за `departmentId`, тоді кластеризує. `contourCluster.ts:79`.
- Працює **виключно на `col`/`row`** (цілі клітинки).

### Звідки беруться col/row — `render/contour/contourInputs.ts`
- `ContourPositionInput { id, departmentId, col, row }` — «one seat, addressed by its cell on the
  department grid». `contour/types.ts:13`.
- `gridCell?: {col,row}` — **ОПЦІОНАЛЬНИЙ** на позиції. `contourInputs.ts:51`:
  `if (!position.gridCell) continue;` — позиція без gridCell **не входить** у `inputs` (кластеризацію),
  але лишається в `memberBoxesByDept` як «foreign mass».
- matrix: пікселі деривуються з клітинок — `matrixNodeBoxes`: `x = col*cellWidth + inset`. `contourInputs.ts:72`.

### Tree-режим ШПС — навпаки
- Координати з `compute_org_row_tree_layout` (Ploeg) — **пікселі** x/y, gridCell нема → magnetic сьогодні
  пропускається (саме тому в journal «magnetic там пропускається»).
- `StaffNodeGeo { x,y,width,height, tier:u8, depth:Option<u32>, department_id, part_index }`.
  `types.rs:423`. Є `depth` (рівень у дереві) і `tier` (1|2|3 ярус).
- `DepartmentMembers { department_id, members:Vec<StaffNodeGeo>, wrapped }` — вхід `pack_departments`;
  члени вже розкладені (локальні пікселі з row-tree). `staff_packing.rs:46`.

## 🔑 ДОМЕННИЙ ФАКТ власника (Dg21) — переломний для S7
Magnetic-департамент для ШПС задумано так: **уся обгортка організації стає матрицею**, користувач сам
задає `row`/`col` кожної посади в межах організації. Magnetic-департамент «об'єднує» посади в групу поверх
цієї матриці. Посади одного департаменту можуть лежати **не впритул** → рамка мусить бути **розривною**
(виїмки/кілька частин). GoJS це не зміг: `group` у GoJS — суцільний прямокутник без переривань. API під це
«колись підготували». **Зараз у ШПС лише дерева** (grid-розміщення ще не ввімкнене).

**Висновок (чекає підтвердження власника):** «розріз» — феномен **grid-розміщення**, не дерева. Частина
виникає, коли посади департаменту розкидані по клітинках `(col,row)`. У tree-only (без grid) департамент
**завжди цілий** — B5 там no-op. Правило розрізу = **той самий** union-find Manhattan на `(col,row)`
(`clusterPositionIds`), НЕ нове пікселеве/субдеревне.

## ✅ ВИСНОВОК S7 (власник підтвердив 2026-10-28)
Усі три кандидати **відкинуто як зайві**. Правило розрізу вже існує й визначене:
- Частина департаменту = union-find Manhattan на `(col,row)` — **наявний `clusterPositionIds`**, не нове.
- «Розріз» — феномен **grid-розміщення**, не дерева. У tree-only ШПС (сьогодні) grid нема →
  департамент **завжди цілий** (`partIndex=None`), B5-розріз = **no-op** до вмикання матриці в ШПС.
- B5b = **переюзати** правило, а не вигадувати пікселеве/субдеревне. S7 закрито без нового алгоритму.

Доменну модель на майбутнє винесено в `work/_draft-shps-grid-matrix-model.md`.

### Кандидати, що відкинуто (для історії)
1. Manhattan на пікселі/pitch — зайве: grid дасть справжні `(col,row)`, квантувати пікселі не треба.
2. Вивести клітинки з row-tree — зайве: `(col,row)` — авторський вхід користувача, не дериват дерева.
3. Розріз по субдереву — хибне: розріз не деревний, а матричний.

## Наслідок для R3/B5 (що це означає для коду зараз)
- У поточному (tree-only) обсязі T126 **розрізу немає** — один департамент = одна рамка. Поточний
  `pack_departments` вже це робить коректно (`part_index: None`). B5-«magnetic» у tree-режимі — no-op.
- Контракт (`partIndex` на `StaffNodeGeo`/`StaffDepartmentFrameGeo`) **уже закладено** — готовий до grid.
- Лишається **архітектурне Рішення 1**: КОЛИ grid прийде, хто кластеризує (pack несе готові частини vs
  pack сам). Це не блокує tree-only R3, але визначає форму контракту `pack_departments` → розбір окремо.
