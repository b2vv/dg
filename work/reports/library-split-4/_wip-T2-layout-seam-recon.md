# T2 layout-seam recon (dg split #4)

ДАЛІ: заземлити call-site'и layout у DiagramRenderer; перевірити гілку/HEAD; прочитати DiagramRenderer.ts, OrgHierarchyDiagram, layout/types.ts.

ФАКТ (крок 1-2): call-site'и layout у DiagramRenderer.ts
- import `layoutStaffCanvas` :17, тип `StaffCanvasResult` :18
- import `computeOrgLayout` :27
- `render()` :424-466 — вхід `(data, theme, resolvedTheme, config, options)`. :434 epoch=++renderEpoch; :435 this.currentPositions=data.positions; :436 contours.reset(); :442 layers.clear; :443 scene.clear. Гілки: :456 hasStaff(data.positions.length>0) → renderStaff; :458 else org>0 → renderOrganizations.
- STAFF гілка: renderStaff :614 → якщо є currentOrgId+org існує :625 renderStaffCanvas; інакше :629 renderPositionGrid (fallback без layoutStaffCanvas — сам розкладає по gridCell).
- renderStaffCanvas :633: будує staffOpts :654-664, ВИКЛИК `const canvas = await layoutStaffCanvas({organizations,positions,reports,groups,departments,persons}, currentOrgId, staffOpts)` :665-676 → `StaffCanvasResult`. :677 guard isRenderCurrent. :679 lastDiagnostics=canvas.diagnostics. :699-704 споживання: paintStaffZones/paintStaffDepartments/paintStaffFrameAndEdges/addStaffPersonCards/addStaffOrgCards — усі приймають `canvas: StaffCanvasResult`.
- renderPositionGrid :992 — НЕ кличе layoutStaffCanvas; матрична розкладка matrixNodeBoxes + position.gridCell напряму (:1043-1044 x=col*cellWidth..).
- ORG гілка: renderOrganizations :1071, ВИКЛИК `const layout = await computeOrgLayout(data.organizations, data.orgLinks ?? [], options.orgLayout)` :1079-1083 → OrgLayoutResult. :1084 guard. Споживання: layout.edges :1086, layout.nodes :1108/:1119.
- ДВІ різні layout-функції у двох взаємовиключних гілках (staff vs org). Fallback renderPositionGrid — третя гілка без layout-функції.

ФАКТ (крок 3): фасад OrgHierarchyDiagram.ts
- renderNow :737-755 → captureDrawingState :791 повертає {drawing:this.data (СИРИЙ), drawingStaffOrgIds}; host.renderer.render(drawing, nodeTheme, resolved, this.renderConfig, buildRenderOptions()) :744-749.
- buildRenderOptions :804 — scalar knobs + callbacks (lod, staff, orgLayout тощо).
- Фасад НЕ кличе computeOrgLayout/layoutStaffCanvas ніде (grep порожній). Layout живе ВИКЛЮЧНО в рендері.
- Діагностика: layout пише canvas.diagnostics → renderer.lastDiagnostics :679; фасад читає через getLayoutDiagnostics :1504 і віддає onLayoutDiagnostics :914. fitView :1813 через host.fitView (камера проти scene-bounds), НЕ читає layout.height. panTo :1087 бере node-box зі сцени, не з layout. → фасад layout.height/width прямо не споживає.

ФАКТ (крок 4): сигнатури/типи
- computeOrgLayout(organizations: DiagramOrganization[], orgLinks: DiagramOrgLink[]=[], options: OrgLayoutOptions={}): Promise<OrgLayoutResult>  (rowTreeLayout.ts:231). АСИНХРОННА (WASM).
- layoutStaffCanvas(data: StaffCanvasInput, currentOrgId: string, options: StaffLayoutOptions={}): Promise<StaffCanvasResult>  (staff/canvasLayout.ts:43). АСИНХРОННА.
- OrgLayoutResult (types.ts:50): {mode, nodes:OrgLayoutNode[], edges:OrgLayoutEdge[], width, height}. OrgLayoutNode має x,y,width,height,depth (:28). → B2 ✓: позиції+розмір уже в завершеному результаті.
- StaffCanvasResult (staff/types.ts:141): {tiers, positionNodes:StaffNodeBox[], edges, orgCards:StaffOrgCard[], width, height, diagnostics}. StaffNodeBox має x,y,width,height (:87). → B2 ✓.
- render() міг би приймати вже-порахований layout через новий параметр/options (positioned-layout), бо всі споживачі (paintStaff*, OrgEdgesView.fromEdges, siblingOrgGroupBounds) працюють з полями результату, не з сирими data.

ФАКТ (крок 5): пастки relocation
- staffOpts :654-664 залежить від theme.person.width/height, config.cellWidth/cellHeight, config.staffEdgeRouter, config.staffZoneChrome (zoneLabelBand через resolveStaffZoneStyle(theme,resolvedTheme) — хелпер У РЕНДЕРІ DiagramRenderer.ts:1224), options.staff. → щоб підняти staff-layout у фасад, фасаду потрібні theme+resolvedTheme (має через applyRenderTheme) + config (this.renderConfig) + перенести/експортувати resolveStaffZoneStyle.
- currentOrgId = options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data) — хелпер render/inferStaffCurrentOrgId.ts:7 (окремий файл, портований легко).
- epoch/staleness: layout АСИНХРОННА, після await стоять guard-и isRenderCurrent(epoch) :677 (staff), :1084 (org), :1023 (grid). Якщо layout піднести у фасад — зберегти семантику «новіший рендер перекриває» (фасад має власний dataEpoch guard :649 + renderCoalesce :299).
- Стан лише в рендері, від якого layout НЕ залежить (чистий для переносу): epoch :434, currentPositions :435, contours.reset :436, layers.clear :442, scene.clear :443 — усе це render-only state; layout його НЕ читає. currentPositions/contours живлять drag/interaction, не layout.
- Кеш/мемоізація layout: НЕМАЄ (grep порожній) — кожен render рахує заново.
- БІЛЬШ НІЖ раз за render? НІ — staff і org взаємовиключні (:456 vs :458); у межах одного render одна layout-функція (або жодної у grid-fallback).
- Гілки: 3 шляхи — renderStaffCanvas (layoutStaffCanvas), renderOrganizations (computeOrgLayout), renderPositionGrid (БЕЗ layout-функції, matrixNodeBoxes+gridCell напряму). Relocation мусить вкрити всі три.
- Діагностика (крок 3): якщо layout переїде у фасад — canvas.diagnostics мусять текти з фасадного виклику (а не з renderer.lastDiagnostics :679), інакше onLayoutDiagnostics :914 порожніє. Це поведінкова зміна-ризик.

ФАКТ (крок 6): тести-сторожі
Layout-ядро: layout/rowTreeLayout.test.ts, layout/staff/staffLayout.test.ts, layout/staff/canvasLayout.deptGrouping.test.ts, layout/staff/orgBlockLayout.deptGrouping.test.ts, layout/staff/staffDeptGrouping.test.ts, layout/staff/positionExpand.test.ts, layout/staff/_recenterProbe.test.ts, layout/flatOrgRootExpand.test.ts, wasm/reingoldTilford.invariants.test.ts.
Render↔layout шов/позиції/стейл: render/layoutDiagnostics.test.ts (diagnostics через render()), render/highlight.test.ts (render + deferred facade @renderNow tail :144), render/renderCoalesce.t104.test.ts (кожен pass відповідає стану що намалював — staleness), render/renderCoalesce.test.ts, render/setDataEpoch.contract.test.ts, render/twoDiagrams.contract.test.ts, render/fitContain.test.ts / flatOrgRootViewport.test.ts (fit проти bounds), render/OrgHierarchyDiagram.test.ts + OrgHierarchyDiagram.interactions.test.ts.

РІШЕННЯ (крок 7): пропозиція relocation — у підсумковому звіті.
