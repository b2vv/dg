Model: claude-opus-4-8

(continued — see entries above)

## Q1 render paths & narrowest interposition point

FACT: render entry = `OrgHierarchyDiagram.render()` → `renderCoalesce.schedule()` → `renderNow()` (OrgHierarchyDiagram.ts:874-923). renderNow computes org layout for org-view (`computeOrgLayout`, :899) and calls `host.renderer.render(...)` (:910). Staff geometry is NOT precomputed here — the renderer computes it per-LOD (:906-909 comment).
FACT: `DiagramRenderer.render()` dispatches: staff when `data.positions.length>0` (:539 hasStaff) else org. Each render first `layers.clear()` + `scene.clear()` + `lastStaffChrome=null` (DiagramRenderer.ts:523-528).

(a) STAFF ALPHA MOCKUP + (b) STAFF NON-ALPHA — same code path:
FACT: both go through `renderStaffCanvas` (DiagramRenderer.ts:717-784). It calls `computeStaffLiveGeometry` once (:726-734) → one `live: StaffLiveGeometry` object. The alpha-vs-nonalpha fork is INSIDE computeStaffLiveGeometry (staffLiveGeometry.ts:172/189). Downstream of :734 the path is identical.
FACT: Pixi node boxes positioned: seats `node.position.set(n.x, n.y)` where n ∈ `canvas.positionNodes` (DiagramRenderer.ts:957); org cards `view.position.set(card.x, card.y)` (:993). canvas = live.canvas.
FACT: promote-overlay boxes: seat box built from n.x/n.y and passed to `personInteractions.bind({box})` (DiagramRenderer.ts:964), which calls `rememberBox` (personInteractions.ts:148) → scene.boxes. Org card `rememberBox` at :996. listNodeBoxes→scene.listBoxes→listPromoteBoxes/Candidates (DiagramRenderer.ts:311-313; OrgHierarchyDiagram.ts:2068-2107).
FACT: staff chrome geometry: when `staffReactChrome===true && lod!=='far'` (:767), `lastStaffChrome = buildStaffChromeGeometry(live, data, ...)` (:770-775) — reads live.frames, live.routes, live.canvas.positionNodes (staffChromeGeometry.ts:139-194). Else Pixi paints chrome itself (paintStaffFrameAndEdges :780/:870).
=> NARROWEST interposition for staff = the `live` object (specifically `live.canvas.positionNodes` + `live.frames` + `live.routes`) returned by `computeStaffLiveGeometry` and consumed at DiagramRenderer.ts:726-784. Rewriting those boxes/points there — before :782 addStaffPersonCards / :770 buildStaffChromeGeometry — reaches ALL THREE consumers (Pixi set, rememberBox→promote, chrome geometry) because all three read that one object. No single function narrower than `renderStaffCanvas` sees all three; `computeStaffLiveGeometry`'s return value is the single data choke point.

(c) ORG VIEW:
FACT: `renderOrganizations` (DiagramRenderer.ts:1112-1207). Layout from `orgLayoutResult` (passed from renderNow) else `computeOrgLayout` fallback (:1125-1131). Nodes: `node.position.set(ln.x, ln.y)` + `rememberBox({x:ln.x,y:ln.y,...})` for each ln ∈ layout.nodes (:1184-1197). Edges: `OrgEdgesView.fromEdges(layout.edges,...)` (:1134-1138).
=> NARROWEST for org = the `OrgLayoutResult` (`layout.nodes` x/y/w/h + `layout.edges`) consumed in renderOrganizations. Both Pixi set and rememberBox read ln; promote overlay reads the remembered boxes. (Org view has no React backdrop/chrome; promote overlay still reads listNodeBoxes.)

## Q2 rebuild cadence / what survives
FACT: render() callers (OrgHierarchyDiagram.ts): bootstrap (:544), setData/mutators and `drawOrRestore` (:827,855; :1489,1511,1525), many mutators `await this.render()` (:1149,1211,1232,1243,1404,1418,1424,1452,1596,1617,1625,1856), LOD crossing `onViewportTransform`→queueMicrotask→render (:686-695). togglePositionExpand/revealPath route through drawOrRestore/render.
FACT: Pixi views are DESTROYED and RECREATED every render, not pooled: `LayerManager.clear()` does `removeChildren()` then `child.destroy({children:true})` on all 8 layers (LayerManager.ts:46-63); `SceneRegistry.clear()` wipes boxes/views/baselineAlphas/mediaViews (SceneRegistry.ts:46-51).
FACT: what SURVIVES a render: only the SceneRegistry `promoted` Set (clear() deliberately skips it, SceneRegistry.ts:45-51) + diagram-level ViewStateStore/selection scalars. There is NO persistent keyed per-node geometry state across rebuilds today — confirms roadmap claim the TransitionController would be the first holder of such state.
FACT: notifyPromoteSync fires on: selection change (:342), every camera frame 'camera' (:503), resize (:511), afterRender 'structural' (:1083), prepare-camera before refit (:1540), repaintSelection (:1815). LOD transition re-renders then afterRender emits 'structural' (:500-503 comment).

## Q3 promote overlay positions
FACT: overlay reads via `PromoteOverlayDiagram`: `listPromoteBoxes()` (cheap rects) and `listPromoteCandidates(ids)` (rect+resolved data) (createReactPromoteOverlay.ts:65-66; both → renderer.listNodeBoxes → scene.listBoxes). `getPromoteChrome(kind)`, `getScreenSize()`, `getViewport()`.
FACT: re-read triggers = `subscribePromoteSync` reasons (createReactPromoteOverlay.ts:515-519): 'prepare-camera'→flushSync(sync); 'structural'→sync() (full rebuild of slot positions now); else ('camera'/resize)→onCameraChange (CSS catch-up transform, rebuild after settleMs=150). sync() reads boxes fresh each time (:441-481).

## Q4 edges on alpha path
FACT: alpha line polylines computed in RUST mockup lib via `computeStaffMockupLayoutWasm` → `result.edges[].points` (staffLiveGeometry.ts:384, 411-430). Adapted to StaffEdgeSegment: `points[]` plus x1/y1=points[0], x2/y2=points[last] (:417-429), `endsOnDeptTop` flag from Rust.
FACT: drawn by `StaffEdgesView.fromLayout(routes, ...)` added to layers.edges (DiagramRenderer.ts:892-894) on the Pixi chrome branch; on reactChrome branch lines go to host via `buildStaffChromeGeometry` → `ChromeLine.points` (staffChromeGeometry.ts:149-154). A line IS a list of points; endpoints are points[0] / points[-1] — tweenable, but interior routed vertices come from Rust A* per rebuild (no key persistence).

## Q5 existing per-node animation in render layer
FACT: NO per-node box tween today. node.position.set(...) is an immediate assignment; every rebuild snaps.
FACT: existing animation is only: (1) CAMERA tween `Viewport.animateTo` / `goTo` with `easeOutCubic`, requestAnimationFrame (Viewport.ts:176-200,408-419; PixiHost.animateViewport :223) — animates the camera transform, not node geometry; (2) CONTOUR ring morph `contour/contourMorph.ts` (`lerpClosedRings`, `runPointMorph`, `resampleClosedRing`, `easeOutCubic`) driven by `contourMorphMs` (DiagramRenderer.ts:77-78,865,1053) — morphs department outline polygons during drag/session, not node boxes; (3) motion-blur CSS filter (motionBlur.ts). No tween/lerp keyed by `kind:id` on node positions.
