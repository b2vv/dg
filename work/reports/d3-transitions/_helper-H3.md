claude-opus-4-8

# Helper H3 — fact gathering for TransitionController interactions

NEXT: Locate and read OrgHierarchyDiagram.ts render + collapse/expand methods and positionExpand.ts visiblePositions.

## AREA 1 — Collapse/expand (#96): render timing, callbacks, visible-set source

FACT render pipeline: `render()` (OrgHierarchyDiagram.ts:874-877) only calls `this.renderCoalesce.schedule()`; actual draw is `renderNow()` (879-923). No shared ticker — `autoStart:false` (PixiHost.ts:311); every visual change asks for ONE paint via `requestPaint()` (PixiHost.ts:269-280) → rAF → `cullToViewport` + `app.render()`.
FACT coalescer (renderCoalesce.ts:22-88): at most one pass in flight; a caller arriving mid-pass joins ONE follow-up pass and is answered about ITS OWN pass (T104). A failed pass does not block the next.
FACT `renderNow` snapshots state BEFORE any await via `captureDrawingState()` (959-964): `drawing = this.data`, `drawingStaffOrgIds`. Staff geometry is computed inside the renderer per-LOD from the Rust bridge — no pre-computed canvas (906-917).
FACT SceneRegistry.clear() (SceneRegistry.ts:46-51) is called at render entry and wipes ALL boxes/views/alphas (promote set survives). => The SDK keeps NO previous-layout snapshot; each render rebuilds boxes from scratch. A TransitionController must snapshot boxes before clear to get "from" positions.
FACT visible-set source: `visiblePositions()` (positionExpand.ts:49-90) is a pure BFS from staff head along admin edges; a non-expanded node does not enqueue its children. Driven by `staffExpandedPositionIds`. This is where the node set shrinks/grows. No previous-vs-new diff is captured anywhere — enter/exit is implicit between two independent renders.

FACT `togglePositionExpand` (1498-1530): mutates `staffExpandedPositionIds` + `position.expanded` via `setPositionExpandedFlag` (792-801), then `await this.drawOrRestore(this.data)`, THEN emits callbacks (`emitPositionExpand`), THEN `framePositionToggle`. Callbacks fire AFTER the frame (T104). Honors maxExpandedPositions (evicts oldest).
FACT `revealPath` (1822-1888): sets expand flags before `await this.render()`; on throw rolls back data + expand set (1864-1866); emits `emitPositionExpand` AFTER the frame (1879); then focus/pan.
FACT `expandToDepth` (1567-1601): mutates expand set + data, fires `onPositionExpandChange` BEFORE `await this.render()` (1591-1596), then pans to head. NOT drawOrRestore — plain render, callback before frame.
FACT `collapsePositionSubtree` (1604-1619): clears flags, fires `onPositionExpandChange` BEFORE `await this.render()`, then pans. Also plain render, callback before frame.
FACT `setData` (1364-1405): rebuilds data+index atomically (no await inside commit), re-seeds expand set, clears selection, fires `onDataMapped`/`onOrgModeChange`/`onOrgExpandChange` BEFORE `await this.render()` (1390-1404). So setData's callbacks precede the frame; the expand toggles via drawOrRestore follow it.
DECISION: Two callback disciplines coexist — drawOrRestore paths (toggle, reveal) emit AFTER frame; expandToDepth/collapsePositionSubtree/setData emit BEFORE frame. A TransitionController hooking "after new layout" must know which path it is on.

## AREA 2 — Camera refit T131 (staffRefitOnToggle / framePositionToggle / 'prepare-camera')

FACT `framePositionToggle` (1532-1547): if `staffRefitOnToggle`, (a) `from = getViewport()`; (b) `target = fitStaffChrome({...,animate:false})` which READS the settled scene chrome box and SETS viewport to target synchronously; (c) `notifyPromoteSync('prepare-camera')` so the HTML promote overlay builds its cards for the TARGET frame; (d) `setViewport(from)` returns to start; (e) `host.animateViewport(target)` tweens camera. Comment: "During the animation the overlay carries these cards with one CSS transform."
FACT `fitStaffChrome` (2168-2181) uses `getStaffChromeGeometry()?.org` — derived from the settled render (SceneRegistry boxes). `computeStaffFit` from the org box.
FACT It runs synchronously right after `drawOrRestore` resolved, i.e. boxes are already at TARGET positions when the target camera frame and overlay cards are computed.
DECISION: A concurrent node-box animation WOULD break "cards for the target frame": prepare-camera assumes SceneRegistry boxes are settled at target. If boxes are still interpolating, the computed target camera frame and the overlay card positions are taken from a layout that hasn't visually arrived. The camera tween (CSS transform of one overlay) and a per-node box tween are two independent motions that would fight.

## AREA 3 — Viewport culling (cullToViewport / resetCull)

FACT `cullToViewport` (DiagramRenderer.ts:456-491) reads `this.scene.getBox(key)` — SceneRegistry (settled TARGET) boxes — transformed by the passed `viewport` via `worldBoxToScreen`. Called from `PixiHost.requestPaint` (PixiHost.ts:276) each paint with current camera. Below CULL_MIN_NODES it resets.
FACT `resetCull` (494-498) sets every view `renderable = true`.
DECISION: Culling uses TARGET boxes, not animated frame boxes. During a node animation: (a) a node whose Pixi view is interpolating from offscreen toward an in-view target would be marked renderable (target in view) — OK; (b) an EXIT node whose target box is removed from the registry on the new render would not be in `scene.getBox`, but its view would still be in `listViews` — `box` undefined => `renderable=true` (the `if (box && finite)` guard leaves renderable at its default true), so exit nodes are NOT culled, which is what an exit tween needs, but they are also never culled while animating out of view. A TransitionController animating views away from their registry target means cull decisions use target, not the on-screen interpolated box — a node animating OUT of the viewport stays drawn because its target is still in view, and vice-versa.

## AREA 4 — Export geometry

FACT `export` (2449-2477): temporarily removes promote (so raster draws the cards) and `resetCull()` (2471) before the frame.
FACT SVG export is built from the MODEL: `buildDiagramSvg(data, ...)` (exportDiagram.ts:37-40), fed `this.data` + staffLayout + expandedOrgIds (runExportNow 2480-2499). Independent of the live scene/animation — always the settled target layout.
FACT PNG/PDF export reads the LIVE Pixi stage: `extractPngFromPixi(ctx.app)` → `app.renderer.extract.canvas(app.stage)` (pngExport.ts:70-73; exportDiagram.ts:57,66). => A raster export fired mid-animation would capture the interpolated frame, NOT the settled target.
DECISION: SVG export is safe during motion; PNG/PDF export is NOT — a TransitionController must settle (or export must force-settle view positions to registry targets) before raster capture.

## AREA 5 — Hit-testing / interactions during motion

FACT `nodeCanvasPoint`/`nodeCenter` (1992-2000): read `renderer.getNodeBox(nodeId)` = SceneRegistry TARGET box, then apply camera. NOT live Pixi view position. Mid-animation these return the TARGET center, mismatched with the on-screen interpolated card.
FACT `expanderCenter` (2008-2011) and `listTestAnchors` (1914, reads `listNodeBoxes()` = registry boxes) and `getPromoteChrome`/`getStaffChromeGeometry` (2069,2089) — all read registry TARGET boxes.
FACT test anchor overlay (createTestAnchorOverlay.ts:82-92): places DOM hit-targets from `diagram.listTestAnchors()` (`anchor.world`) × viewport. Refreshed on `subscribePromoteSync` (166). During a node animation, anchors sit at TARGET world positions, not the animated frame — unless the animation fires promoteSync per rAF, which nothing today does.
FACT drop-target hit-testing (`DropTargetIndex`, dropTargetIndex.ts) is built once per render from NodeWorldBox (registry TARGET) boxes. Pointer-vs-box test uses target boxes.
FACT pointer events on cards (personInteractions.ts): Pixi's own hit-test uses each view's LIVE position; drag reads `node.x/node.y` (live) and `node.position.set` (209-233). But `PersonInteractions.reset()` (138-142) is called at render entry — "the old cards are gone, so any drag on them is too" — so a render clears drag state.
FACT context menu: `onPersonContextMenu`/`onOrgContextMenu` (1027-1033) open at the POINTER coords (clientX/clientY), independent of node box; `contextMenu.open(ref, pointer)`.
DECISION: Two hit-test planes diverge mid-animation. Pixi pointer hits follow the LIVE view (consistent with what the user sees). But all registry-derived surfaces — nodeCenter/nodeCanvasPoint, test anchors, drop-target index, expander/promote chrome — read TARGET boxes, so they are WRONG mid-animation (host DOM placed by nodeCenter, e2e anchors, and drop detection would all point at the settled, not the visible, position). The promote HTML overlay would also sit at target while Pixi cards interpolate (double image) unless promote is suppressed during motion.

## AREA 6 — drawOrRestore / rollback on a refused frame

FACT `drawOrRestore` (853-872): `await render()`; on throw, if `this.data === next` restore `this.data = lastDrawnData` + re-seed expand set (857-860); always restore `staffExpandedOrgIds` from `lastDrawnStaffOrgIds` (865-869); rethrow.
FACT `commitDataChange` (815-838): applies edit, draws, and if `lastDrawnData !== next` throws "never reached the screen" — i.e. a neighbour's rollback or nothing-drawn discards the edit; callback only fires on success.
FACT `revealPath` has its own inline rollback (1864-1870) mirroring drawOrRestore.
DECISION: A rollback puts DATA and the expand set back to the last drawn state, but it does nothing about Pixi view positions. If a TransitionController started animating toward a refused target, the data reverts to the previous layout while views are mid-flight toward a layout that will never be drawn. The next render (which rollback does NOT itself trigger — it rethrows) would re-establish boxes; until then the animation would converge to a stale/abandoned target. The TransitionController must be cancellable on render failure and must not begin until the frame it animates toward is confirmed drawn (lastDrawnData === next).
