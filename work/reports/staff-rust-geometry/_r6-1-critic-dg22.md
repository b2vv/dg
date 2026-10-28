# R6-1 критика дизайну (Dg22, незалежний критик)

Модель: claude-opus-4-8

ДАЛІ: прочитати probeA.constructive.ts (routeOrtho + layered layout), crossingDetector.ts
(edgeEdgeCrossings/sharedSource), staffEdgeGeometry.ts (legacy), staff_compose.rs/staff_packing.rs/
hierarchy.rs (реальна R3/R4-розкладка). Потім по 6 питаннях.

## ФАКТИ (path:line)

- probeA admin corridorY = `e.to.y - V_GAP/2` (probeA.constructive.ts:191), inter-dept = track-доріжки (:194-196). Per-edge елбоу `routeOrtho` (:160-165), поріг прямої `1e-6` (:163).
- **Легасі STAFF admin = midpoint**: `verticalPolyline` midY=`(y1+y2)/2`, y1=parent.bottom, y2=child.top (staffEdgeGeometry.ts:142-148), порти bottom-center/top-center (:124-125,:131-132), поріг прямої `0.5` (:136). → R6-1 midpoint ЗБІГАЄТЬСЯ з легасі staff, НЕ з probeA.
- Staff-ребра йдуть через `buildStaffEdgeSegments`→`classifyStaffEdgeRoute` (staffLiveGeometry.ts:138, staffEdgeGeometry.ts:314) — per-edge. spine/bus/riser (spineBusEdges.ts) — це ОРГ-матриця (rowTreeLayout/matrixLayout), НЕ staff. → per-edge дизайн консистентний зі staff-шляхом.
- Розкладка блоку = `compute_ploeg_layered_layout` (org_layout.rs:38) — LAYERED tidy: сиблінги одного батька на одному рядку (ploeg_layout.rs:248-249,257-264), батько центрується над середньою колоною (:253). Subtrees не накладаються (tidy-tree).
- Grid/matrix (T113) переписується в ЛАНЦЮГИ ДО розкладки (collapsedSiblingGrid.ts:91-100); прямі діти батька лишаються co-rowed (grid-тест :242-249). Grid — властивість org-рівня (DiagramOrganization), tier-3.
- Вісь R4: зсуває ЛИШЕ tier==1 вправо на dx (staff_compose.rs:76-82) — жорстко весь ярус; tier-2/3 не рухає.
- Dept packing: зсув членів відділу на band-x (staff_packing.rs:69-113) — жорстко в межах відділу.
- StaffEdge без order (types.rs:518-524); kinds admin|matrix|dotted|cross-tier (staffEdgeGeometry.ts:55). crossingDetector: sameManager виключає collinearOverlap (:107,:111), транзверсаль сама відсікає спільний стовбур (:40-41).

## ВЕРДИКТИ

Q1 (0-by-construction при реальній R3/R4): ТРИМАЄТЬСЯ, але ТРИВІАЛЬНО й УМОВНО. Layered-tidy (org_layout.rs:38) + non-overlapping subtrees ⇒ будь-який center-port routing дає 0 перетинів дерева. Тобто 0 — властивість РОЗКЛАДКИ, не R6. Загроза: вісь R4 рухає tier-1 окремо (staff_compose.rs:76-82) → by-construction валідний ЛИШЕ якщо admin-ребра INTRA-block (один ярус). Cross-tier (tier1→tier2) — kind 'cross-tier', МАЄ бути поза R6-1. Фікстура «батько+2 дітей» — найслабша можлива (підігнана під зелений): не може перетнутись у принципі. ПРАВКА: явно обмежити scope intra-block admin + додати мульти-батьківську фікстуру.

Q2 (corridorY=midpoint): ПРАВИЛЬНО і КРАЩЕ за probeA для R6. Midpoint ТОЧНО дорівнює легасі staff `verticalPolyline` (staffEdgeGeometry.ts:142) — це і є ціль паритету R6-6. probeA `to.y-V_GAP/2` (:191) — probe-специфіка. Спільний trunk НЕ потрібен: layered сиблінги мають спільний to.y ⇒ спільний corridorY ⇒ overlap колінеарний і виключений sameParent. Поріг прямої має бути 0.5 (як легасі :136), НЕ 1e-6 (probeA :163) — інакше f32-джитер дає мікро-елбоу.

Q3 (sharedSource=sameParent): ПРАВИЛЬНО для tree. Транзверсаль відсікає стовбур (crossingDetector.ts:40-41), sameParent виключає колінеар сиблінгів (:107,:111). Окремий trunk-merge для коректності НЕ потрібен (кожен елбоу самостійний, overlap пробачено). Але оракул СЛІПИЙ до того, чи це «правильний spine» чи N накладених елбоу — не доводить коректність.

Q4 (center vs edgePort/LOD R6-2): РИЗИК переробки, керований. `staff_routes(nodes,edges,lod)` вже бере lod. edgePort (center|avatar, visualEdgeBox.ts:69) — конфіг, не параметр. ПРАВКА: винести обчислення порту в окрему fn `port(node, side, edgePort)`, щоб R6-2 міняв формулу, не call-sites.

Q5 (детермінізм, tie-break): достатньо для КОРЕКТНОСТІ (кожне ребро незалежне), але tie-break (from_id,to_id) може переставити вихідний Vec vs producer/push-порядок (hierarchy.rs preorder). Для admin це косметика (ребра не конфліктують z-order). Ризик РОЗБІЖНОСТІ: track-assignment (inter-dept) залежить від порядку — але це R6-3+, не R6-1. Краще ЗБЕРЕГТИ вхідний порядок edges, ніж пересортовувати.

Q6 (пастки): (a) self-loop from==to → corridorY всередині ноди, малформ; гард потрібен. (b) to.y<=from.y+from.h (нема вертикального зазору / дитина вище) — легасі повертає null і падає в інший кандидат (staffEdgeGeometry.ts:133,153); R6-1 не має fallback у scope — визначити поведінку. (c) поріг прямої 1e-6 vs 0.5 (див. Q2). (d) forced-гілка легасі без перевірки чистоти (staffEdgeGeometry.ts:402) — R6 не відтворювати тихо (не R6-1). (e) f32 vs f64 паритет — ±1px запас покриває.

## РАНЖОВАНІ ПАСТКИ
1. [BLOCKER-дизайн] Scope: R6-1 мусить явно = INTRA-block admin. Вісь R4 (staff_compose.rs:76-82) ламає by-construction для cross-tier. Без цього «0» хибно узагальнюється.
2. [BLOCKER-тест] Фікстура «батько+2 дітей» не інформативна (0 неможливий у принципі). Додати мульти-батьківську/глибшу + тримати осьовість+порти+midpoint як головні асерти.
3. [MAJOR] Поріг прямої: 0.5 (легасі), не 1e-6 (probeA) — f32-джитер.
4. [MAJOR] Поведінка при to.y<=parent.bottom (нема зазору) — визначити (легасі: null+fallback).
5. [MINOR] Порт як окрема fn (R6-2 edgePort/avatar) — не хардкодити inline.
6. [MINOR] Зберегти вхідний порядок edges замість пересорту (push-порядок паритет).
7. [MINOR] Guard self-loop / дублі from/to.

ГОТОВНІСТЬ: дизайн майже готовий, але червоний гейт — відкриті #1 і #2 (scope-обмеження intra-block + інформативна фікстура). Поки вони відкриті — НЕ готовий до коду.
