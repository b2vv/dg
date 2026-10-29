# T126 R7 A4.2b — карта терену (dg29)

Зібрано Explore-агентом (read-only) + звірка. Гілка `feat/t126-staff-rust-geometry`.

## 1. Споживач у DiagramRenderer.ts (computeStaffLiveGeometry @ :645)
Виклик у `renderStaffCanvas` :645-654; вхід: data, currentOrgId, theme, resolvedTheme, config, staff, lod (`?? 'near'`), `canvas: staffCanvasResult` (reuse T2b).
- `const { canvas } = live` :656.
- `live.zoneLabelBand` → `this.lastZoneLabelBand` :659 (viewport/діагностика, не фарба).
- `live.staffOptions` → `staffMerged` :662 → `geom` :663-670 (margin, pitchX=refCellWidth+horizontalGap, pitchY=refCellHeight+verticalGap, insetX/Y) + dragGrid :671-678.
- `live.canvas.diagnostics` → `this.lastDiagnostics` :660.
- `live.canvas.positionNodes` — найважче: frame union :777; contourSceneInputs :724, resolveContourWorldTransform :745; StaffZonesView :702; addStaffPersonCards :824 (читає id,x,y,width,height,role; role==='external'→alpha :858).
- `live.canvas.orgCards` — addStaffOrgCards :876 (orgId,x,y,width,height,expanded,positionCount :899); StaffZonesView :703.
- `live.canvas.edges` — НЕ рендерером; вхід resolveStaffRouting усередині compute (staffLiveGeometry.ts:127); golden читає.
- `live.canvas.width` → zones canvasWidth :708 + enrich :101/:104. **canvas.height рендерером НЕ читається** (лише golden normalizeLayout).
- `live.zones` (StaffTierBand[]) → paintStaffZones :694 `zones: tiers`; :695-699 rememberChrome{tier.x,y,width,height} (вимагає x/width визначені); весь tiers у StaffZonesView.fromCanvas :701.
- `live.routes` + `live.markedCrossings` → paintStaffFrameAndEdges :774; markedKeys Set `fromId\u0000toId` :793; StaffEdgesView.fromLayout :794-795.
- `live.contentPadding` → zones :709.
REUSE input.canvas: `staffCanvasResult?` тягнеться render():430→renderStaff→renderStaffCanvas:638→виклик :653. Джерело: `OrgHierarchyDiagram.ts:786-799` викликає `layoutStaffCanvas(...)` і передає у render. У compute: `input.canvas ?? await layoutStaffCanvas(...)` staffLiveGeometry.ts:82-95.
**ВИСНОВОК: рендерер читає `live.zones`, НЕ `canvas.tiers`. Але golden normalizeLayout(live.canvas) серіалізує `bands` з canvas.tiers → canvas.tiers ПОТРІБЕН для golden.**

## 2. Golden-харнес
Файл `packages/demo/src/scenarios/staffGeometry.golden.test.ts`; бейслайн `packages/demo/src/scenarios/__golden__/staff-geometry.json`.
- Сцени :24-28: staff-shps, variant-b, staff-tree, staff-dept-legacy, staff-dept-v2, mockup-staff-figma, mockup-staff-magnetic, **staff-brigade**, staff-1m, mockup-staff-gojs, worker. Гейт «covers every real tab» :136-140 (крім scale-100k). Collapse зашитий у cfg.staffLayout табів, окремого табу нема.
- LODS=['near','mid','far'] :21. **routes — по КОЖНОМУ LOD** :100-105; layout/zones/nodes/bands/orgCards — лише `geoms.near` :93.
- Seam A: сирий `layoutStaffCanvas` :70-74. Seam B: `computeStaffLiveGeometry` через SDK :90-92 (раз на LOD). Бейслайн {layout, live}.
- normalizeLayout :44-58: nodes(id+rect) byId, bands(organizationId??'org-cards', x??margin, y, w??width, h), orgCards(orgId+rect), edges(link from/to/kind), width, height. zones :96-99 вимагають band.x/width (throw «missing zone bounds»). routes :100-105 {from,to,kind,points:{x,y}} byLink. rect={x,y,w,h}.
- VERIFY: `npm run test -w @org-hierarchy/demo -- staffGeometry`. Толеранс ±1px числа, 0 для структури/детермінізму (двічі :156-159).
- REBASELINE: `UPDATE_GOLDEN=1 ...` :154/:160-163. Відсутній бейслайн без прапора → throw.
**ОРАКУЛ: Seam B `live` має БАЙТ-ІДЕНТИЧНО збігтися з наявним бейслайном (знятим старим TS-конвеєром). A4.2b НЕ чіпає Seam A (layoutStaffCanvas). diff=баг, НЕ rebaseline (U4).**

## 3. Routing-шов (замінює A4.2b)
`resolveStaffRouting` staffRouterV2.ts:53 → `StaffRoutingResult{routedSegments: StaffEdgeSegment[]; markedCrossings: {fromId,toId}[]}` :40-44. legacy: markedCrossings=[] :60-62. v2: deptFrames :64-78, edgeIntrudesForeignFrame→markedCrossings :83-89.
`StaffEdgeSegment` staffEdgeGeometry.ts:66-78: `{fromId,toId,kind('admin'|'matrix'|'dotted'|'lead-org'),points[{x,y}],x1,y1,x2,y2,endsOnDeptTop?}`. **TS НЕ має `marked` на сегменті** — marked через окремий markedCrossings. x1/y1/x2/y2 — TS-only порти, фарба їх НЕ читає.
Rust ціль: `StaffRouteSet{lod,segments[StaffEdgeRoute]}`; `StaffEdgeRoute{fromId,toId,kind:string,points[{x,y}],marked?,endsOnDeptTop?}` rust-types.ts:75-87.
АДАПТЕР: (а) StaffEdgeRoute→StaffEdgeSegment: додати x1/y1=points[0], x2/y2=points[last], пронести points/kind/endsOnDeptTop, звузити kind до union; (б) markedCrossings = routes.filter(marked===true).map({fromId,toId}).

## 4. enrich namespaces + resolveDeptHeads
`enrichStaffTierBands` staffZoneBounds.ts:113-151: worldBoundsForTier рахує x/width/y/height з контент-юніону; label=tier.label??orgName??(org-cards?undefined:orgId) :134-137; role=tier.role??orgRole :148. Виклик staffLiveGeometry.ts:100-107 лише коли staffZoneChrome.
`resolveDeptHeads` resolveDeptHeads.ts:15-46 → Map<deptId,headId> (detached root, sort byId). staffLiveGeometry.ts:117→resolveStaffRouting deptHeadById :129.
Rust `StaffNamespace` rust-types.ts:111-116 = {tier,kind,organizationId?,x,y,width,height} — межі ЗАВЖДИ, АЛЕ **НЕ label/role** (:114 «TS-адаптер»). Rust `enrich_namespaces` (staff_layout.rs:1157) рахує межі (content bounds + pad + labelBand). TS до-enrich: label(org.name), role(org.role) з data.organizations.

## 5. points/marked/endsOnDeptTop
Точки однакові {x,y} (TS :61-64, Rust :163); golden серіалізує points.map({x,y}).
`endsOnDeptTop` — булевий на сегменті (TS :77, Rust inline :87): останній пойнт на frame-top; фарба малює entry-кружечок.
`marked` — Rust inline :81; TS окремий markedCrossings→markedKeys :793. StaffEdgesView.ts applyHighlight читає seg.{kind,points,endsOnDeptTop} + markedKeys(зовні); x1/y1/x2/y2 НЕ читає.
УВАГА: `StaffEdgeRoute` існує ДВІЧІ: layout/staffEdgeGeometry.ts:265 (classifier via/points — НЕ ціль) vs Rust rust-types.ts:75 (ЦІЛЬ). Реекспорт через layoutBridge.ts:28-32.

## 🔴 ГОЛОВНИЙ РИЗИК ПАРИТЕТУ (знайдено при синтезі)
Rust `StaffNamespace` bounds = ENRICHED (content-union+pad+labelBand, staff_layout.rs:1157). Старі `canvas.tiers` (layoutStaffCanvas) = RAW tier y/height (НЕ content-union; enrich рекомпутить окремо у zones). normalizeLayout(live.canvas).`bands` бере RAW canvas.tiers.y/height з бейслайну. Якщо canvas.tiers y/height мапити з enriched Rust-namespaces → DIFF на bands.
→ РІШЕННЯ ПЛАНУ: canvas.tiers має нести значення, що дають ту саму normalizeLayout-серіалізацію, що й старий raw. x/width лишити undefined (fallback margin/canvas.width — як старий raw). y/height — відкрите: чи Rust дає raw-band y/height ОКРЕМО від enriched. Перевірити staff_layout.rs: чи namespace несе RAW band y/height, а enrich_namespaces — окремий вихід. ВЕРИФІКАЦІЯ golden-ом локалізує.
