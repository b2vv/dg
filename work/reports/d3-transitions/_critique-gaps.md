model: claude-opus-4-8

NEXT: Read plan.md, spec.md, and the three helper files; then verify §5 seams and §10 acceptance rows against the actual code (DiagramRenderer, LayerManager, SceneRegistry, OrgHierarchyDiagram, createReactPromoteOverlay).

FACT: Read plan.md, spec.md, H1/H2/H3. Spec §7 owner decisions Q1-Q8 FINAL.
NEXT: verify code seams: (1) clear() ordering vs exit-ghost diff; (2) who holds "from" boxes / previous routes for ghost lines; (3) controller construction/injection path T-E→T-C; (4) drag-start snapToTarget owner file (personInteractions); (5) cull union; (6) overlay key format. Reading DiagramRenderer (render entry, renderStaffCanvas, cull, ctor), LayerManager.clear, SceneRegistry, OrgHierarchyDiagram (render/drawOrRestore/export/framePositionToggle/construct renderer), personInteractions, createReactPromoteOverlay.

FACT: LayerManager.clear() destroys all 8 layers' children (LayerManager.ts:46-63). DiagramRenderer.render() calls layers.clear()+scene.clear()+personInteractions.reset() at entry (:522-524) BEFORE renderStaff→renderStaffCanvas→computeStaffLiveGeometry (:726). So exit views/old routes are destroyed before the new geometry (hence any enter/exit diff) exists.
FACT: SceneRegistry.clear() wipes boxes/views/alphas/mediaViews, keeps only `promoted` (SceneRegistry.ts:46-51). Box keys = kind:id via nodeEntityKey (:53-55) → matches plan's kind:id frame keys (overlay key-format is NOT a gap).
FACT: DiagramRenderer is constructed in PixiHost.ts:133 (`readonly renderer = new DiagramRenderer()`); onNeedsPaint→requestPaint wired PixiHost.ts:343; requestPaint loop lives in PixiHost (:269-281). PixiHost.ts is in NO task's exclusive file list (T-C=DiagramRenderer/LayerManager/SceneRegistry; T-E=OrgHierarchyDiagram/docs; T-D=react/promoteMath).
FACT: OrgHierarchyDiagram.renderer is a getter → host.renderer (:566), so outbound seam (getTransitionFrame/settleNow) works. renderNow passes this.renderConfig to host.renderer.render (:910); retarget would run INSIDE that render, before reportIfRenderFails/drawOrRestore confirm the frame.
FACT: pointerdown on seat cards is handled in personInteractions.ts:178 (owns drag state); only onPersonDragEnd surfaces to diagram (:40). No onDragStart callback. personInteractions.ts is in NO task's file list → scenario #22 (drag→snapToTarget) has no owner site.
FACT: PromoteSyncReason defined in promoteMath.ts:85 (T-D file); notifyPromoteSync in OrgHierarchyDiagram.ts:637 (T-E); subscribe handler createReactPromoteOverlay.ts:515-517 (T-D). 'transition' signal ownership is CLEAN — not a gap.
FACT: Q5 (animate data/expand, NOT LOD/theme/resize) — LOD crossing goes onViewportTransform→render (H1 Q2), same render() as toggle; buildRenderOptions carries no "reason/animate-this-render" flag → no carrier for the snap-vs-animate decision at the retarget site.

DECISION: 6 blocking + 3 non-blocking gaps. Writing handback.

## Delta re-check (rev 2)

FACT: render() (OrgHierarchyDiagram.ts:874) takes NO args → renderCoalesce.schedule() (type `schedule: () => Promise<void>`, renderCoalesce.ts:17-18, parameterless). renderNow() no args. So RenderReason must be stashed in an instance field; the coalescer merges callers (one follow-up pass, renderCoalesce.ts:77-85) → a single last-writer field does NOT implement the §5.1 "any animate in pass → animate" OR-merge.
FACT: drawOrRestore (OrgHierarchyDiagram.ts:853-872) sits between toggle/reveal and render(); it calls this.render() with no reason param → reason must ride an instance field, not an arg, for drawOrRestore paths too.
FACT: lastDrawnData assigned at :1109 on successful render; drawOrRestore catch rethrows (:857-869). coalescer answers each caller about its own pass (T104, renderCoalesce.ts:6-13) → after a non-throwing await, the caller's data was drawn → facade can gate startTransition on success. render() returns early on supersession (:545) WITHOUT throwing → facade cannot distinguish "superseded" from "success" by the await; self-healing because the superseding render's prepare() overwrites controller targets.
FACT: SceneRegistry.listViews() exists (:87) returns {key,view,baselineAlpha}; getView (:83). Detach-before-clear is realizable: old views still attached when render() entry runs, clear() (DiagramRenderer.ts:523) only destroys the 8 named layers' children (LayerManager.ts:46-55), so views moved into a separate ghost container survive.
FACT: on reactChrome path lines are NOT Pixi views — buildStaffChromeGeometry → host backdrop (H1 Q4, DiagramRenderer.ts:770-775). B2's fix ("старий контейнер ліній → ghost") is Pixi-container-specific; §1 apply line 35 gives the React backdrop only "інтерпольовані рамки" (frames), never line handling during motion.

DECISION: B1 CLOSED, B2 CLOSED (Pixi only), B3 CLOSED (semantics; plumbing wrinkle), B4 CLOSED, B5 CLOSED (Pixi only), B6 CLOSED. NEW: React-path line staging unspecified (blocking, scoped to T-D); RenderReason per-pass OR-accumulation + drawOrRestore threading (non-blocking plumbing).

## Final delta re-check (rev 5)

FACT: getStaffChromeGeometry() returns this.lastStaffChrome (DiagramRenderer.ts:444-445); facade exposes it (OrgHierarchyDiagram.ts:2080-2081, host-read H3 AREA 5); StaffChromeGeometry.lines: ChromeLine[] (staffChromeGeometry.ts:101) built from live.routes (:149). So "lines: [] during motion, new on settle" (§1 lines 40-42, row #33) is realizable within T-C (owns DiagramRenderer). React-path skewed-line problem resolved by HIDING lines during motion → Q3 satisfied. My prior NEW blocker CLOSED.
FACT: §5.1 lines 108-110 now name the carrier explicitly: instance field pendingReason, OR-accumulates callers of one pass, reset at pass start; drawOrRestore sets it too. renderCoalesce.schedule()/render()/drawOrRestore are parameterless (confirmed renderCoalesce.ts:17-18). My prior non-blocking carrier finding CLOSED.
FACT: notifyPromoteSync (OrgHierarchyDiagram.ts:637-639) is a BARE loop `for (const listener...) listener(reason)` with NO try/catch; callHostCallback (:641-654) HAS try/catch. §5.4's claim is accurate; wrapping 'transition' subscribers (T-E) + guarding onTransitionFrame (T-C) is justified and realizable. Defense Q2 / row #34 sound.
FACT: SceneRegistry has listBoxes() (:93), rememberBox() (:53), listViews() (:87); clear() wipes boxes+views (:46-50). So abort's "restore box snapshot + re-attach detached views" IS realizable: capture listBoxes() + detach listViews() BEFORE clear (they survive clear since ghost container is not one of the 8 layers), re-seed via rememberBox + re-attach by kind→layer. Realizable.
FACT: DiagramRenderer.lastLod (:216) is set at render ENTRY (:538) = CURRENT pass lod, exposed via currentLod (:244). There is NO lastConfirmedLod field. The §5.1 LOD rule needs a NEW field distinct from lastLod, updated on success.

DECISION: (1) React-path line blocker CLOSED. (2) carrier CLOSED. (3) abort restoration realizable (CLOSED) with 2 small unstated steps; LOD rule info is available but storage/update-policy is an unstated gap. 3 non-blocking new notes; gate GREEN from the gaps lens.
