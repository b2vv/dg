claude-opus-4-8

# R6 критик ПЕРЕД зрізом — ПЛАН T126 R7 A4.2b (dg29)

ДАЛІ: читаю терен-файл + живу ноту плану, тоді звіряю з первинними джерелами.

## ФАКТИ (звірено з кодом)

### Споживання полів рендерером (DiagramRenderer.ts)
- renderStaffCanvas :645-686; `const {canvas}=live` :656; lastDiagnostics=[...canvas.diagnostics] :660.
- paintStaffZones :688-712 читає `live.zones` (НЕ canvas.tiers); rememberChrome з zones.x/width :696-698;
  StaffZonesView.fromCanvas{tiers:live.zones, canvas.positionNodes, canvas.orgCards, canvas.width} :701-710.
- addStaffPersonCards читає n.{id,x,y,width,height}, **n.role** (external→alpha :858; seatDragMode :866).
- addStaffOrgCards читає card.{orgId,x,y,width,height}, **card.expanded** :881, **positionCount** через orgStaffCardOptions :889.
- paintStaffFrameAndEdges :772-797: routes, markedCrossings→markedKeys :793; StaffEdgesView.fromLayout(routes,...,markedKeys) :795.
- renderer САМ резолвить currentOrgId :625 `resolveStaffCurrentOrgId`; `if(currentOrgId)` :626 → grid(null) НЕ входить у renderStaffCanvas.

### Golden normalizeLayout (staffGeometry.golden.test.ts)
- nodes={id,+rect} :46; bands=canvas.tiers{id:orgId??'org-cards', x:band.x??margin, y, w:band.width??canvas.width-2m, h} :49-53;
  orgCards={id,+rect} :54; edges=link{from,to,kind} :55; width,height :56.
- zones=live.zones{id,+rect}, throw якщо x/width undefined :96-99. routes per-LOD {from,to,kind,points} :100-105.
- **НЕ серіалізує**: diagnostics, node.role, card.expanded, card.positionCount, route.marked, route.endsOnDeptTop, zone cards. Усе sorted (order не гейтиться).
- Seam A (layout) = прямий layoutStaffCanvas :70-74 — A4.2b його НЕ чіпає.

### Rust-вихід (rust-types.ts / staff_bounds.rs / staff_layout.rs)
- StaffGeometryResult{currentOrgId,nodes[StaffNodeGeo],orgCards[StaffOrgCardGeo],namespaces[StaffNamespace],departmentFrames,edges[StaffEdge],routes:StaffRouteSet,width,height,diagnostics} :92.
- StaffNamespace{tier,kind,organizationId?,x,y,width,height} — межі ЗАВЖДИ, label/role=TS :111-116.
- StaffOrgCardGeo={orgId,x,y,width,height} — name/positionCount/expanded=TS :139-141.
- StaffNodeGeo.role?:string, StaffEdge.kind incl "lead-org" :63-65.
- **staff_bounds.rs:4: compose_tiers лишає межі НУЛЯМИ; enrich_namespaces (staff_layout.rs:1157) їх заповнює content-union.** → у Rust-виході namespaces ТІЛЬКИ enriched; RAW tier y/height НЕ існує ніде.
- enrichStaffTierBands (staffZoneBounds.ts:50-55) рахує y/height з content (vertical(ys)); raw tier.y/height лише fallback при 0 нодів. → OLD live.zones=content-enriched; OLD live.bands=RAW canvas.tiers (різні).

### Споживачі (grep)
- canvas.tiers: ЛИШЕ svgExport:226 (будує власний canvas через layoutStaffCanvas:208). Рендерер canvas.tiers НЕ читає. У виході staffLiveGeometry canvas.tiers читає ТІЛЬКИ golden live.bands. ✅ підтверджує FORK1-передумову.
- svgExport (208/225/294) незалежно кличе layoutStaffCanvas/enrichStaffTierBands/resolveStaffRouting — A4.2b їх НЕ видаляє (A4.3). Scope-межа коректна.

### FORK2 (OrgHierarchyDiagram.ts:782-808)
- :786-799 pre-compute staffCanvasResult→render :807→renderer :653 `canvas:staffCanvasResult`→compute `input.canvas ?? layoutStaffCanvas`. Після A4.2b input.canvas ЗАТІНИВ би міст → треба прибрати.
- Повний ланцюг видалення: :786-799(pre-compute) + :782-785(staffCurrentOrgId стає мертвим) + import :78(layoutStaffCanvas, єдиний юз :787) + renderer param staffCanvasResult + StaffLiveGeometryInput.canvas поле.
- Помилки: весь IIFE у reportIfRenderFails :765; throw із бриджа всередині render→теж через :765. ✅ claim вірний. Рендерер сам резолвить currentOrgId :625 → видалення pre-compute поведінку НЕ втрачає.

## ВЕРДИКТ — див. фінальну відповідь (BLOCKING B1 + FORK1/FORK2 коректні з умовами).
