# R7 A4 terrain — карта TS staff-геометрія pipeline (dg28)

ДАЛІ: читаю layoutBridge.ts (міст), canvasLayout.ts, staffLiveGeometry.ts, DiagramRenderer.ts, barrels index.ts, щоб побудувати ланцюг виклику.

## ФАКТ — міст і вхід у геометрію
- `wasm/layoutBridge.ts:81-86` `computeStaffGeometryWasm(input: StaffLayoutInput): Promise<StaffGeometryResult>` — typed pass-through до `wasm.computeStaffGeometry(input)`. Реекспорт усього type-closure (`layoutBridge.ts:13-34`). БЕЗ консюмерів (grep далі).
- Поточний TS-вхід: `render/staffLiveGeometry.ts:71 computeStaffLiveGeometry(input)` — чиста композиція layout+zones+routes, повертає `StaffLiveGeometry` (canvas, staffOptions, zoneLabelBand, contentPadding, zones, routes, markedCrossings). Викликає `layoutStaffCanvas` (`staffLiveGeometry.ts:84`), `enrichStaffTierBands` (`:101`), `resolveStaffRouting` (`:121`).
- `layout/staff/canvasLayout.ts:43 layoutStaffCanvas(data, currentOrgId, options): Promise<StaffCanvasResult>` — будує tiers(1 managing/2 current/3 org-cards), positionNodes, edges, orgCards, width, height, diagnostics. Викликає `layoutStaffOrgBlock` (orgBlockLayout) по кожному tier.
- canvasLayout компонує: tier1 leadership (`:67-105`), tier2 full staff (`:107-131`), tier1 centering над curHead (`:139-155`), tier3 org-cards+expand (`:157-232`), cross-tier конектори lead-org (`:234-251`), matrix/dotted reportLines (`:253-260`), width/height (`:262-278`).

ДАЛІ: DiagramRenderer.renderStaffCanvas (ланцюг від renderer), staffZoneBounds, staffDeptGrouping, orgBlockLayout, staff/types, staffEdgeGeometry.
## ФАКТ — пост-проходи
- `layout/staff/staffDeptGrouping.ts:44 groupStaffByDepartment(positions,reports,departments,orgId,geom)` — бакетить по departmentId, сортує по order (`:37`), пакує dept-регіони rightward без overlap (`:86-93`), повертає {nodes, memberBoxesByDept, diagnostics}. Rust `departmentFrames` заміщує memberBoxes→frame rect; nodes→`nodes`.
- `layout/staff/orgBlockLayout.ts:340 layoutStaffOrgBlock` → core(`:357`): режими tree/matrix/hybrid/strict (`:363,389,395,415,436`), deptGrouping гілка (`:395-402`), `layoutConnectedTree:47` викликає `computeOrgRowTreeLayoutWasm` (`:78`) — tidy-дерево вже в Rust; потім корінь-центрування (`:93-102`), externalManagers pin (`:348`). Rust `compute_staff_geometry` робить увесь цей блок-лейаут → заміщує positionNodes/edges/width/height.
- `render/staffZoneBounds.ts:113 enrichStaffTierBands` — бере tiers+positionNodes+orgCards+orgs, рахує world bounds (x/width з контенту, y/height content-hug `:50-55`), label з orgName, role з orgRole (`:125-148`). Rust `namespaces` (tier:1|2|3) заміщує enriched StaffTierBand; але label/role enrichment з DiagramOrganization.name/.role — питання чи Rust має name/role (ризик п.6).
- `layout/staffEdgeGeometry.ts` — TS-роутер: `classifyStaffEdgeRoute:320` (direct/around/forced, preferHorizontal/sameBand `:329-330`, lead-org vertical drop `:373`), `buildStaffEdgeSegments:439` будує StaffEdgeSegment{points,x1y1x2y2,endsOnDeptTop} і класифікує deptTop через headFrame (`:454-459,473`). Rust `routes:StaffRouteSet{lod,segments:StaffEdgeRoute[points,ends_on_dept_top]}` заміщує це. kind (admin/matrix/dotted/lead-org) — в StaffEdgeLink:55-59.

ДАЛІ: staffRouterV2 (хто кличе staffEdgeGeometry), StaffEdgesView, StaffZonesView, svgExport, DiagramRenderer.renderStaffCanvas, barrels, tiers grep.
## ФАКТ — ланцюг виклику (renderer → геометрія)
DiagramRenderer.renderStaff (`DiagramRenderer.ts:624`) → resolveStaffCurrentOrgId (`staffLayoutInputs.ts:53`) → renderStaffCanvas (`:635`) → `computeStaffLiveGeometry` (`:645`, staffLiveGeometry.ts:71) → всередині: buildStaffLayoutOptions(`staffLayoutInputs.ts:68`), layoutStaffCanvas(`canvasLayout.ts:43`, сама кличе layoutStaffOrgBlock→layoutConnectedTree→computeOrgRowTreeLayoutWasm), enrichStaffTierBands(`staffZoneBounds.ts:113`), resolveStaffRouting(`staffRouterV2.ts:53`→buildStaffEdgeSegments→classifyStaffEdgeRoute). Повертає StaffLiveGeometry{canvas,zones,routes,markedCrossings,...}. Потім paint: paintStaffZones(`:688`), paintStaffDepartments(`:718`), paintStaffFrameAndEdges(`:772`), addStaffPersonCards(`:799`), addStaffOrgCards.
Паралельний вхід (export): svgExport.ts:208 layoutStaffCanvas + :225 enrichStaffTierBands + :294 resolveStaffRouting — дублює той самий конвеєр без DiagramRenderer.

## ФАКТ — tiers → namespaces (повний перелік вживань tiers/StaffTier/.tier)
TYPE:
- `layout/staff/types.ts:126-148` StaffTierBand (тип) — Rust замінює на StaffNamespace (`rust-types.ts:116`, поля tier/kind/org/x/y/w/h; БЕЗ label/role).
- `layout/staff/types.ts:152` StaffCanvasResult.tiers: StaffTierBand[] (поле).
- `layout/staff/index.ts:8` + layout/index.ts реекспорт StaffTierBand/StaffCanvasResult (публічний barrel — п.5).
- `render/staffZoneBounds.ts:2,16,114,124` StaffTierBand тип у сигнатурах worldBoundsForTier/enrichStaffTierBands.
- `render/staffLiveGeometry.ts:20` import StaffTierBand; `:53` zones: StaffTierBand[].
- `render/StaffZonesView.ts:2,64` StaffTierBand тип (StaffZonePaintInput.tiers).
- `render/types.ts:279` коментар «paint StaffTierBand chrome» (staffZoneChrome прапор).
LOGIC/поле .tier:
- `canvasLayout.ts:55` tiers акумулятор; `:83` tier:1, `:90-96` tiers.push tier1 band, `:117` tier:2, `:124-130` push tier2, `:140,146,152` фільтр n.tier===1/2 (центрування), `:198` tier:3, `:224-230` push tier3 band, `:271` повертає tiers.
- `staffZoneBounds.ts:59` n.tier===3 (org-cards union), `:93` n.tier===tier.tier (фільтр нод банда), `:127-148` tiers.map enrich.
- `DiagramRenderer.ts:694` zones:tiers деструкт; `:695-699` loop rememberChrome; `:702` передача в StaffZonesView.
- `StaffZonesView.ts:85,95-96` loop tiers, фільтр kind.
- `svgExport.ts:225-252` enrichStaffTierBands + loop tiers (SVG rect/label).
- StaffNodeBox.tier (`types.ts:95`) — поле 1|2|3; Rust StaffNodeGeo.tier:number (`rust-types.ts:122`).
Нерелевантне (НЕ staff-геометрія): `render/personInteractions.ts:108` — лише коментар «staff tiers share gridCell»; `demo/scenarios/scaleStaff.ts` — ScaleStaffTier/tierOfSeat — генератор датасету (lead/current/subordinate), не геометрія; `demo/scenarios/mockupStyles.ts:109` коментар.
USAGE.md: НЕ містить StaffTier/tiers/StaffCanvasResult (grep порожній).

## ФАКТ — джерело маршрутів (StaffEdgesView / svgExport)
- Сьогодні маршрути з TS `layout/staffEdgeGeometry.ts` (НЕ з bridge). Будує resolveStaffRouting (`staffRouterV2.ts:53`) → buildStaffEdgeSegments(`staffEdgeGeometry.ts:439`) → classifyStaffEdgeRoute(`:320`). Повертає StaffEdgeSegment[] {points,x1,y1,x2,y2,endsOnDeptTop}.
- StaffEdgesView (`StaffEdgesView.ts:34`) — чистий painter, redraw(segments) бере `.points`, `.endsOnDeptTop` (`:87,92,105`), `.kind` (`:76`); НЕ роутить. Годується у DiagramRenderer.ts:795 `StaffEdgesView.fromLayout(live.routes,...)`.
- svgExport (`:294-314`) теж через resolveStaffRouting, читає s.points/s.kind.
- kind класифікується: edges будуються в canvasLayout (admin/matrix/dotted з reportLines `:255-260`; lead-org cross-tier `:245,249`) та adminEdges (`orgBlockLayout.ts:35-44`). dotted/dash — у StaffEdgesView style.dash (`:88`) + staffEdgeStrokes. deptTop/admin-head — класифікується в buildStaffEdgeSegments через headFrame (`:454-459,473`).
- Rust замінює: routes:StaffRouteSet{lod,segments:StaffEdgeRoute[points,ends_on_dept_top,marked]} (`rust-types.ts:75-87,168`) + edges:StaffEdge[fromId,toId,kind] (`:65`). markedCrossings TS → Rust `marked` прапор на route.

## ФАКТ — публічна поверхня (barrels)
- sdk `index.ts`: експортує computeStaffLiveGeometry(`:123`), StaffLiveGeometry/Input(`:168-169`), classifyStaffEdgeRoute(`:74`), StaffEdgeBox/Link/RouteVia(`:165-167`), layoutStaffCanvas(`:263`), layoutStaffOrgBlock(`:264`), StaffCoordMode/LayoutOptions/CanvasResult/OrgBlockResult(`:283-286`). НЕ експортує canvasLayout-as-module, StaffTierBand (у sdk barrel немає), computeStaffGeometryWasm, StaffGeometryResult.
- render `index.ts`: computeStaffLiveGeometry(`:16`), StaffEdgesView(`:15`), buildStaffEdgeSegments/classifyStaffEdgeRoute(`:20-24`), StaffEdgeSegment/Route(`:28-31`), StaffZonesView(`:147`), enrichStaffTierBands/worldBoundsForTier(`:151-152`).
- layout/staff `index.ts`: StaffTierBand, StaffCanvasResult, layoutStaffCanvas, layoutStaffOrgBlock (реекспорт у layout/index.ts:52-72 → але StaffTierBand НЕ підтягнутий у layout/index.ts, лише StaffCanvasResult). Тобто StaffTierBand публічний лише через layout/staff, НЕ через кореневий sdk barrel.
- computeStaffGeometryWasm/StaffGeometryResult: НЕ в жодному barrel — лише в wasm/layoutBridge.ts (внутрішній). docs/USAGE.md НЕ згадує нічого з цього.

## ФАКТ — ризики/що лишається в TS після rewire
1. theme/paint: StaffEdgesView, StaffZonesView, paintStaffDepartments — суто TS/Pixi, Rust геометрії не торкається. staffEdgeStrokes/dash/arrow/entryDot — TS.
2. label/role на namespace: Rust StaffNamespace НЕ має label/role (rust-types.ts:113-116 прямо каже «label/role — TS-адаптер»); enrichStaffTierBands бере name/role з DiagramOrganization. Після rewire label/role треба домалювати в TS поверх Rust namespaces.
3. zoneLabelBand/contentPadding: похідні з theme/config (staffLayoutInputs.ts:78-83, staffLiveGeometry.ts:61-69) — Rust бере готові ЧИСЛА як StaffLayoutMetrics.zoneLabelBand/contentPadding; резолв із теми ЛИШАЄТЬСЯ TS (підтверджено rust-types.ts:107).
4. nodeSizes/DOM: StaffLayoutInput.nodeSizes (DOM-виміряні картки, rust-types.ts:132-136) та dockHints (figma/gojs порти, `:46-60`) — TS має подати їх у вхід. Зараз TS бере nodeWidth/Height з theme.person (staffLayoutInputs.ts:86-87), per-card розміри — з position.width/height (orgBlockLayout.ts:104-116). Міст НЕ має хто будує nodeSizes/dockHints вхід — gap для A4.
5. orgCards name/positionCount/expanded: Rust StaffOrgCardGeo має лише геометрію (rust-types.ts:139-141 «name/positionCount/expanded — TS»). addStaffOrgCards/paint бере name/count з canvas.orgCards — треба мерджити з DiagramData після rewire.
6. departmentFrames: Rust віддає StaffDepartmentFrameGeo (rust-types.ts:33). Сьогодні рамки малюються з memberBoxesByDept (contourSceneInputs/groupStaffByDepartment) у paintStaffDepartments(`:718`) + svgExport. Rust-рамки поки БЕЗ консюмера.
7. markedCrossings → Rust `marked` прапор на route (інша форма): StaffEdgesView чекає markedKeys:Set, Rust дає per-route boolean — адаптація форми при rewire.
8. lod: computeStaffLiveGeometry — один lod на виклик; golden кличе 3 рази. Rust routes прив'язані до одного вхідного lod (StaffLayoutInput.lod) — та сама модель.

## ГОТОВО — карта зібрана.
