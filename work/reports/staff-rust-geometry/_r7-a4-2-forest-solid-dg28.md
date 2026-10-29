claude-opus-4-8

ДАЛІ: прочитати 3 вхідні репорти + звірити код-факти (positionExpand, staff_layout.rs хедер, orgBlockLayout collapse-гейт, canvasLayout leadershipOf/expandedOrgIds-cap), тоді відповісти 6 forest-питань SOLID і дати карту+вердикт.

## ФАКТ — код звірено (не передовіряю попереднім критикам)
- `positionExpand.ts:48-79` visiblePositions — чистий ВІДБІР (BFS admin-ребрами, нерозгорнутий вузол не ставить дітей; detached засіяні). 0 координат. Повертає DiagramPosition[]. ПІДТВЕРДЖЕНО.
- `orgBlockLayout.ts:378-383` collapse-прапор → visiblePositions pre-filter ПЕРЕД лейаутом (per-org). ПІДТВЕРДЖЕНО.
- `staff_layout.rs:1-8` хедер: «collapse/detached:true/expanded/memberOrder НЕ в контракті ⇒ TS-адаптер; matrix/hybrid структурно недосяжні — TS-адаптер гейтить до виклику». Rust СВІДОМО = лише tree+compose+bounds. ПІДТВЕРДЖЕНО.
- `canvasLayout.ts:75` tier1 = leadershipOf(head,...) — TS відбирає підмножину посад ПЕРЕД блоком. ПІДТВЕРДЖЕНО.
- `canvasLayout.ts:160-163` tier3 expandedOrgIds фільтр + maxExpandedOrgCards cap (slice(0,maxExpand)), ceilingDropped → diagnostic. ПІДТВЕРДЖЕНО.
- `orgBlockLayout.ts:395-402` dept-membership гейт (deptGrouping + departments + p.departmentId) → layoutDeptGroupedBlock. ПІДТВЕРДЖЕНО.
- Отже пре-фільтри РОЗКИДАНІ по 2 рівнях (canvasLayout tier1/tier3; orgBlockLayout collapse/dept) й переплетені з композицією геометрії, яку R7 ВИДАЛЯЄ.

## РІШЕННЯ — forest-інсайт
R7 видаляє canvasLayout-композицію + orgBlockLayout (у Rust). Отже всі 4 пре-фільтри МУСЯТЬ кудись релокуватись незалежно від collapse. Вибір не «collapse у TS чи Rust», а «чи дати відбору ЄДИНИЙ названий дім на TS-боці шва, чи розсипати його всередині buildStaffLayoutInput». SRP + консистентність шва кажуть: єдиний дім (V2a'). Попередній критик дивився на collapse ІЗОЛЬОВАНО (дерево) → V2a≥V2b. Ліс показує збіжність 3-4 фільтрів → V2a' чистіший за V2a.

## ВЕРДИКТ: карта + ранжування V2a'/V2a/V2b. Деталі в SubagentHandback.
