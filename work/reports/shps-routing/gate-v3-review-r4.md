# Gate v3 Review — Round 4 (re-GATE, свіжий контекст)

Model ID: claude-opus-4-8

ДАЛІ: прочитати design-v3.md (секції «Шов монтування» + «ОДНА async render-ділянка»), r3-звіт (gate-v3-review-r3.md), тоді перевірити реальний код DiagramRenderer.ts:631-669 / :789-805, staffRouterV2.ts, StaffEdgesView.ts, layoutStaffCanvas / StaffCanvasResult споживачів.

## ФАКТ — render-path (packages/sdk/src/render/DiagramRenderer.ts, HEAD eb1fab8)
- `renderStaffCanvas` ASYNC (:600). layout awaited :631, epoch-guard :643, geom build :648-663, paintStaffZones :665, `await paintStaffDepartments` :666, epoch-guard :667, paintStaffFrameAndEdges :668, addStaffPersonCards :669. Збіг із design 1:1.
- Q1: вставити `await resolveStaffRouting` реально можна МІЖ :664 (geom готовий) і :665. Усі входи resolve в render-path наявні: theme.person (ctx.theme), options.lod, canvas.orgCards, geom.positionById. canvas.positionNodes мутуються ДО :665/:666 → zones/contours/edges/cards читають фінальні. ✅
- Q1 nuance (NON-BLOCKING): guard :643 стоїть ПЕРЕД новим await → НЕ покриває async-щілину resolve. Треба guard одразу ПІСЛЯ resolve, перед :665. Патерн guard-after-await у файлі вже канон (643/667) + §Рішення п.4 (epoch на async-пасі), тож codex додасть природно; design не спеллить явно.

## ФАКТ — map-функції + StaffEdgesView
- :789-799 edgeBoxes = mapStaffEdgeBoxesForLod(mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, geom.positionById, theme.person), orgCards→boxes, options.lod). Обидві у render/visualEdgeBox.ts (render-шар). resolveStaffRouting як render-метод їх бачить. orgCards-obstacles — canvas.orgCards. Q2 ✅.
- StaffEdgesView.redraw:89 рахує buildStaffEdgeSegments ВСЕРЕДИНІ. Additive precomputed: опційний `segments?` + `segments ?? buildStaffEdgeSegments(...)`; fromLayout-виклик :801 не ламається; OrgEdgesView — інший клас. Q3 ✅ additive feasible.
- StaffCanvasResult (layout/staff/types.ts:132-141): routedSegments/markedCrossings відсутні → optional additive, споживачі деструктурують іменовані поля → safe. Q5-additive ✅.

## 🔴 НОВА BLOCKING (Q4/Q5) — ДРУГА routing-ділянка в SVG-export, design мовчить
- `packages/sdk/src/export/svgExport.ts:270-283` — ПОВНІСТЮ незалежний routing-site: власний `layoutStaffCanvas` :194, ТІ САМІ map-функції :272-273, власний `buildStaffEdgeSegments` :270, власні contourSceneInputs+memberBoxesByDept :244.
- resolveStaffRouting — метод render-path DiagramRenderer; svgExport його НЕ кличе й НЕ читає routedSegments (вони undefined у його StaffCanvasResult). Отже під прапором v2:
  - dept-grouping (design кладе в layoutStaffCanvas) → svgExport дістане ЗГРУПОВАНІ positionNodes, АЛЕ маршрутизує БЕЗ K-loop reorder, БЕЗ frame-aware obstacles (deptFrames у buildStaffEdgeSegments не передаються), БЕЗ §12-маркерів → напів-мігрований експорт (групований layout + frame-ignorant лінії), гірший за legacy;
  - АБО (якщо прапор не доходить до layout у svgExport) → svgExport = legacy, розходиться з live-render, що показує групування+обхід.
- Це ламає ЯВНИЙ інваріант кодбази «shared by live render + SVG export» (visualEdgeBox.ts:91) і «One builder for canvas, matrix and export» (svgExport.ts:243).
- КЛАС: ТОЙ САМИЙ routing-placement (кілька ділянок маршрутизації над потенційно різною геометрією → лінії/маркери розходяться) — але НЕ fix-induced: svgExport передує усім раундам r1-r3, design його просто не врахував. Це COMPLETENESS-прогалина покриття споживача, а не доказ хибності seam-підходу.
- Висновок для ескалації: r3-фікс КОРЕКТНО закриває root у RENDER-path (дві render-ділянки → одна, markedCrossings by construction — підтверджено). Але теза «прибирає корінь» завелика по SDK: routing-ділянок дві (render + svgExport), design уніфікує лише одну. Fix = ОДНЕ явне рішення по svgExport (спільний resolveStaffRouting-результат АБО явний scope-out з прийнятою divergence + прапор групування вимкнено в export), НЕ редизайн варіанта C.

## ВЕРДИКТ r4: 🔴 BLOCKED
Q1 PASS (render-path async, вставка feasible; guard-after-resolve — non-blocking нота). Q2/Q3 PASS (map-функції доступні; redraw additive). Render-path routing справді ОДНА ділянка — r3-фікс когерентний. АЛЕ Q4/Q5: svgExport.ts:270 — друга незадекларована routing-ділянка того ж класу → gate лишається ЧЕРВОНИМ. Умова зняття: design додає явну disposition svgExport.
