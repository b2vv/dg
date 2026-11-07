Model: claude-opus-4-8

NEXT: Read plan.md, spec.md, helpers H1-H3 to understand the contract and planned implementation before checking edge cases against code.

FACT: keys are `kind:id` via nodeEntityKey — person vs position sharing an id do NOT collide (SceneRegistry.ts:53-55,118-119). Duplicate-key concern for person/position is clean.
FACT: render() takes NO params (OrgHierarchyDiagram.ts:874-877); options built inside renderNow via buildRenderOptions (:905). No `source`/`animate-this-render` hint is threaded to renderStaffCanvas. Plan §1 shows `controller.retarget(..., {source})` but never says where source comes from.
FACT: onViewportTransform fires a bare render() for LOD crossing via queueMicrotask (OrgHierarchyDiagram.ts:686-696); geometry computed per-LOD (DiagramRenderer.ts:726-734) → different box sizes near vs far.
FACT: reactChrome = staffReactChrome===true && lod!=='far' (DiagramRenderer.ts:767). Else Pixi paints chrome (zones/departments/frame/edges) into layers, NOT keyed by kind:id (:776-781). Default host path (backdrop unmounted) and all far-LOD use the Pixi path.
FACT: afterRender runs AFTER the awaited render pass (OrgHierarchyDiagram.ts:1078-1083); commitDataChange throws "never reached the screen" when lastDrawnData!==next (H3 AREA6). retarget in renderStaffCanvas runs mid-pass, before this confirmation.
FACT: promote overlay else-branch for an unknown reason = onCameraChange (150ms debounced rebuild), NOT a no-op (createReactPromoteOverlay.ts:515-519). test-anchor overlay rebuilds on every promoteSync (H3 AREA5, createTestAnchorOverlay:166).
DECISION: 8 findings recorded, 3 blocking. Handing back.

## Delta re-check (rev 2)

NEXT: verify B5/B3/B4 closure and hunt new edges in §1, §5.1-5.3, §4 T-C/T-D/T-E, §6, rows #27-#32.

FACT: §5.1 adds RenderReason threaded render(reason)→renderNow→renderer.render({transition}); coalesce rule "any 'animate' in pass → pass 'animate'"; LOD mid-transition → 'snap'→snapToTarget (#28). B3 plumbing addressed.
FACT: §1/§5.2 split prepare (no cycle) → startTransition after lastDrawnData===next; abortTransition on refusal/supersede "restores previous target set, DESTROYS this pass's ghosts, 0 frames". B4 addressed at plan level.
FACT: §1/§4 T-C/#30: chrome as boxes on BOTH React and Pixi paths. B5 addressed for frames/zones.
FACT (code): clear() (DiagramRenderer.ts:523-524) runs BEFORE throwable computeStaffLiveGeometry (:726); drawOrRestore rethrows WITHOUT re-render (OrgHierarchyDiagram.ts:855-871). So a thrown animate pass has already clear()'d the originals; the detached ghosts are the ONLY surviving copy of the last confirmed frame.
FACT (code): Pixi dept chrome default deptStyle='blob' (DiagramRenderer.ts:827) paints polygon hulls via contours.paint (:859-867), NOT rectangles; dashed frame is a union box (:874). "Chrome as boxes" fits card/zones/frame, not blob hulls.
DECISION: B3 CLOSED, B5 CLOSED-with-residual (blob), B4 CLOSED-but-new-contradiction. 3 new findings (2 blocking). Handing back.

## Final delta re-check (rev 5)

NEXT: verify N1 (LOD rule), N2 (abort restores), blob staging, ghost reaping against code; hunt rev3-5 new edges.

FACT (code): notifyPromoteSync is a bare loop, NO try/catch (OrgHierarchyDiagram.ts:637-639), unlike callHostCallback (:645-652). §5.4 citation accurate; wrapping subscribers for 'transition' is justified.
FACT (code): render() runs personInteractions.reset() at :522 BEFORE layers.clear() (:523) — so any views re-attached by abortTransition were stripped of interaction bindings at render entry.
FACT (code): epoch = ++renderEpoch at :515; lastLod set at :538 on EVERY render before renderStaffCanvas, regardless of confirmation; isRenderCurrent(epoch) early-return at :545 (superseded pass returns without throw, as §5.2 claims).
VERDICT: N1 CLOSED (§5.1 LOD rule + #37), caveat: compare vs last-CONFIRMED lod, not this.lastLod (:538 overwritten each render). N2 CLOSED (§5.2). blob CLOSED (author decision, staged as lines, §1/#30/#33). reaping CLOSED for snap path (#38); residual for animate→animate preemption.
DECISION: 2 prior blockers CLOSED at plan level; 3 new non-blocking findings. Gate green on edges lens pending these. Handing back.
