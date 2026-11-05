Model ID: claude-opus-4-8

# Critique — Unnecessary complexity lens

NEXT: read plan.md, spec.md, helpers H1-H3, standards.md, ROADMAP D3 section.

FACT: Owner-decided (spec §6/§7, roadmap §76-190) and therefore OUT of scope for this lens:
TransitionController-between-geometry-and-layers; Spring+Tween two animators behind one
`advance(dt)→{value,settled}` interface (roadmap:83-86); AnimateOption discriminated union with
both perceptual {duration,bounce} and physical {stiffness,damping,mass} forms + presets (Розвилка 7
ВИРІШЕНО owner, roadmap:181-184; spec AC2); fixed-timestep accumulator dt=1/60, ≤6 steps clamp
(roadmap:141-142); settle=rest-threshold + ~750ms cap (roadmap:98, spec AC7); w/h snap
(roadmap:170); 4 phases entering/updating/exiting/idle (roadmap:162); real exit ghosts
(spec §7 Q2); line staging (spec §7 Q3); CSS-transform per card (spec §7 Q4).

FACT: Reuse-first table (plan §2) honored where checkable:
- easeOutCubic reused (Viewport.ts), camera keeps its own tween (Q7, scenario 23 uses existing
  animateViewport), requestPaint reused (PixiHost.ts:269-281 per H2 Q2), matchMedia reduced-motion
  pattern reused (resolveMotionBlur OrgHierarchyDiagram.ts:2544), fake-clock test pattern reused.
- Overlay per-frame notification REUSES existing subscribePromoteSync (OrgHierarchyDiagram.ts:679;
  createReactPromoteOverlay.ts:74) — plan only adds one PromoteSyncReason value 'transition'
  (promoteMath.ts:85 is `'camera'|'structural'|'prepare-camera'`; type is public, index.ts:165;
  additive, own listeners ignore unknown reasons). This is correct reuse, not a new mechanism.

FACT: Checked the lens hint "reuse promote 'camera' catch-up transform": existing 'camera' path is
ONE uniform container transform for all cards (H1 Q3; H3 AREA2 "carries these cards with one CSS
transform"). Node transitions move each card to a DIFFERENT target, so the uniform catch-up cannot
express per-card motion. New per-card path is justified, not avoidable complexity.

FACT: Checked "reuse onNeedsPaint instead of new onTransitionFrame" (§5): onNeedsPaint
(DiagramRenderer.ts:213,264,407) fires on EVERY paint (selection/camera/resize/structural), so
firing notifyPromoteSync('transition') off it would be spurious. A distinct frame-advanced signal
is defensible. Not flagged.

DECISION — findings below. No BLOCKING complexity finding: the heavy machinery is all
owner-mandated and §9 pre-answers the KISS/Animator-interface objection (2 impls, both used in
slice 1: position/scale spring, opacity tween). Remaining items are non-blocking seam/surface
cleanups.
