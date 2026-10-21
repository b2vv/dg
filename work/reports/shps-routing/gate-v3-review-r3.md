model: claude-opus-4-8

# gate-v3-review-r3 (re-GATE раунд 3, свіжий контекст)

ДАЛІ: прочитаю design-v3.md (§Рішення: блок «LAYOUT-фаза K-релаксація» + «Шов монтування») і r2-звіт (gate-v3-review-r2.md), щоб точно знати, яку seam-діру автор нібито закрив. Потім звіряю з реальним кодом DiagramRenderer.ts (~631/666/668/669/769), staffEdgeGeometry.ts:409, layout/staff/types.ts.

## ФАКТ — render-flow (DiagramRenderer.ts, HEAD eb1fab8)
- 631 `const canvas = await layoutStaffCanvas(...)` — async, awaited. 643 `if (!this.isRenderCurrent(epoch)) return;` epoch-guard одразу після layout. ✅
- 665 paintStaffZones(sync) → 666 `await paintStaffDepartments` (контури з canvas.positionNodes, memberBoxesByDept з contourSceneInputs:721) → 667 epoch-guard → 668 `paintStaffFrameAndEdges` (SYNC) → 669 addStaffPersonCards (canvas.positionNodes). Три споживачі читають ОДНІ canvas.positionNodes, без мутації між ними. ✅
- Q1 PASS: layout awaited+epoch; фінальні positionNodes доходять до contours/edges/cards без подальшої мутації.

## ФАКТ — Q2 buildStaffEdgeSegments:409
- staffEdgeGeometry.ts:409 — чиста sync: Map(boxes) → iterate edges → staffEdgePolyline→classifyStaffEdgeRoute (гео, без WASM/await/side-effects). Callable в scoring-циклі. ✅ PASS.

## ФАКТ — Q3 StaffCanvasResult (layout/staff/types.ts:132-141)
- Поля: currentOrgId, tiers, positionNodes, edges, orgCards, width, height, diagnostics. markedCrossings відсутній → додати optional additive, споживачі не ламаються. edges+positionNodes там, звідки paint бере (DiagramRenderer:801/790). ✅ PASS.

## ФАКТ — Q4 memberBoxesByDept у layout
- contourSceneInputs (render/contour/contourInputs.ts:29) — чиста fn(positionNodes, positionById)→memberBoxesByDept, групує за contourDepartmentId (data/types.js). Обидва входи є в layout-фазі. АЛЕ fn живе в render/ шарі; layout→render import = шарова проблема; групувальне правило мусить лишитись ЄДИНИМ (contourDepartmentId) в обох фазах інакше дрейф. NON-BLOCKING placement, але годує Q5.

## 🔴 Q5 — НОВА BLOCKING seam: дві routing-ділянки з РІЗНОЮ геометрією
r2-фікс переніс SCORING у layout, але лишив paint route-only re-route → ТЕПЕР ДВІ ділянки маршрутизації, що МУСЯТЬ дати ідентичний результат (design 108: «детермінізм → той самий результат, що й scoring у layout»; markedCrossings рахує layout, малює paint).
Але paint маршрутизує НЕ над positionNodes:
- DiagramRenderer:789-805 `edgeBoxes = mapStaffEdgeBoxesForLod(mapPositionNodesToStaffEdgeBoxes(positionNodes, positionById, theme.person), orgCards, lod)` → StaffEdgesView.fromLayout(edges, edgeBoxes) → redraw:89 buildStaffEdgeSegments(edges, **edgeBoxes**).
- mapPositionNodesToStaffEdgeBoxes→staffEdgeBoxForPosition (visualEdgeBox.ts:52) додає personEdgeHints → AABB зсунутий (y+cardY, h=cardH+countBarH) vs сирий box.
- visualPersonEdgeBox(lod) (visualEdgeBox.ts:25) навіть при 'near' дає shrunk/offset box для gojs-row/figma-row.
- orgCards додаються як ПЕРЕШКОДИ (789/791).
Дизайн §12-seam (104-107) каже layout кличе buildStaffEdgeSegments «по всьому набору» над positionNodes — НЕ згадує theme.person-enrichment, LOD, orgCards. layoutStaffCanvas (canvasLayout.ts:43) НЕ отримує ні theme, ні lod, ні не бере orgCards як obstacles.
НАСЛІДОК: layout скорить над іншою геометрією, ніж paint малює → markedCrossings не відповідає фактичним перетинам paint (напр. ребро, що в layout чисте, у paint forced-around повз orgCard → перетин, який layout не позначив; або навпаки). §12-маркер (головний deliverable) показує НЕ ті ребра. Детермінізм — незабезпечене ТВЕРДЖЕННЯ, не механізм. Прямий наслідок r2-переносу (у r1 scoring+route в одній фазі = один набір боксів, розбіжності не було).
Не покрито наявними non-blocking: r2(c) про deptFrames-location, не про edge-box геометрію між двома site.

МІНІМАЛЬНИЙ ФІКС design-doc (перед кодом): §Рішення/§12-seam зобов'язати ОБИДВІ ділянки маршрутизувати над ІДЕНТИЧНИМ edge-box-набором — протягнути theme.person + options.lod + orgCards(obstacles) у layout-оркестратор і переюзати ті самі mapPositionNodesToStaffEdgeBoxes+mapStaffEdgeBoxesForLod (винести у спільний шар, якщо render→layout import заборонено). Альтернатива (чистіша): прибрати другу ділянку — layout рахує фінальні routed segments + markedCrossings у StaffCanvasResult, paint СПОЖИВАЄ read-only без re-route. Будь-що робить «той самий результат» істинним за конструкцією.

## ВЕРДИКТ r3: 🔴 BLOCKED
Q1-Q4 PASS (seam когерентний: layout async+epoch, buildStaffEdgeSegments чиста, markedCrossings additive). Q5 — 1 НОВА blocking seam (розбіжність геометрії двох routing-ділянок, уведена r2-переносом scoring у layout). Gate лишається ЧЕРВОНИМ, поки design не зафіксує єдиний edge-box-набір (або єдину ділянку маршрутизації).
