Model: claude-opus-4-8

NEXT: read plan.md (§1,§4,§5,§6,§10,§11), spec.md §7, _integration-notes.md, then the diff.

FACT: Read plan.md (§1 flow, §4 task map, §5 seams, §6, §10 40 rows, §11), spec.md §7 (Q1-Q8), _integration-notes.md, and full diffs of DiagramRenderer.ts, OrgHierarchyDiagram.ts, LayerManager.ts, SceneRegistry.ts, personInteractions.ts, promoteMath.ts.
FACT: Facade wiring present: animate config, resolveAnimate at create(), configureTransition, onTransitionFrame → notifyPromoteSync('transition'|'structural'), pendingReason OR-accumulate, drawOrRestore(next,'animate'), startTransition after confirmed frame, abortTransition on throw, settleNow on export/resize/setStaffReactChromeMounted, getTransitionFrame, setStaffReactChromeMounted, 'transition' subscriber try/catch isolation.
NEXT: read wave-2 test files + TransitionController + animators to map rows→tests.

FACT: Read all wave-2 test files: DiagramRenderer.transitions.test.ts (18 tests incl. golden opt-out), OrgHierarchyDiagram.transitions.test.ts (14 tests, uses prototype seam mock of renderer), createReactPromoteOverlay.test.ts (new 'transition frames' describe + 3 tests), createTestAnchorOverlay.test.ts (1 new test). Read TransitionController.ts (wave1, committed).
NEXT: read animators.ts, resolveAnimate.ts, constants.ts (wave1) for rows #9/#13/#13a/#14/#15/#25; then map each of 40 rows.

FACT: Ran the 4 wave-2 test files: 89 tests, 0 failed, 0 skipped. Confirmed real (not empty/skipped).
FACT: setStaffReactChromeMounted defined (OrgHierarchyDiagram.ts:2134) but NOT called by the built-in overlay dispose — host-facing contract, documented USAGE:1042. Barrel index.ts does NOT export AnimateOption/TransitionFrame/RenderReason (integration-notes §4 defers to coordinator).
FACT: Facade tests mock renderer transition methods via DiagramRenderer.prototype seam; renderer tests use real controller but no facade; no single end-to-end facade+real-renderer+real-controller test. Each seam individually covered.
FACT: Q7 — under animate, framePositionToggle defers to settle then calls fitStaffChrome({animate:false}) and `if(this.animate) return` skips prepare-camera. Camera SNAPS at settle (facade test asserts animateViewport not called), not animated-parallel as Q7 prose suggests; but row #23 only requires end state → satisfied.

DECISION: All 40 rows mapped. 37 covered by failing-if-removed tests at the plan's required level. #26 manual (N/A). #31 informational measurement (no test, per plan not a gate). #40 SDK-auto-wire gap (method+settleNow tested; overlay->method wiring is host's job, documented). No row contradicts Q1-Q8 or a §5 seam. No BLOCKING findings.

VERDICT: GREEN (non-blocking concerns)
