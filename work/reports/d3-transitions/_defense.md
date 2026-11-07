claude-opus-4-8

NEXT: read plan.md (rev 2), spec.md (§7 final), helpers H1-H3, prior critique for context. Then run 5 defense questions.

FACT: read plan.md rev2, spec.md (§7 final), H1-H3, gate2-critique. Plan structure: §1 arch pseudocode, §3 types, §4 task slicing, §5 seams, §6 side-effects, §8 rollback, §10 32 acceptance rows.
NEXT: verify code claims for the 5 defense questions — resolveAnimate precedent (invalid animate), cullToViewport finite guard (NaN boxes), notifyPromoteSync error isolation (overlay throws), drawOrRestore rollback (render refuse), SETTLE_CAP (cap bounds non-convergence).

## Code verification
FACT: resolveMotionBlur precedent confirmed (OrgHierarchyDiagram.ts:2539-2551): falsy→null, reduced-motion→null, true→defaults, obj→merge. resolveAnimate (§3) mirrors it. Supports Q1 `animate`-value half.
FACT: cullToViewport has a finite guard + try/catch (DiagramRenderer.ts:469-486): non-finite box → renderable=true, geometry throw → renderable=true. So NaN target boxes do NOT crash culling. Relevant to Q1 geometry half.
FACT: notifyPromoteSync is a BARE loop with NO try/catch (OrgHierarchyDiagram.ts:637-639) — unlike callHostCallback which wraps in try/catch (:645-652). A throwing promote subscriber propagates. Plan emits notifyPromoteSync('transition') EVERY FRAME (plan line 36,113). Q2 "overlay throws in a slot" → a throwing slot can kill the rAF tick and strand ghosts/views mid-interpolation. No plan line isolates this.
FACT: drawOrRestore (OrgHierarchyDiagram.ts:853-872) rolls back DATA+expand set on render throw, rethrows; does nothing about view positions — confirms plan's abortTransition is NEW code (H3 AREA6). Supports Q2 render-refuse (#19) + Q5 mid-transition cancel.
FACT: renderCoalesce (renderCoalesce.ts) enforces ≤1 in-flight + ≤1 queued, no concurrent passes, failed pass does not block next. Supports Q3 coalesced-render consistency.
FACT: transition symbols (ANIMATE_MAX_NODES, SETTLE_CAP, getTransitionFrame, configureTransition, abortTransition) absent from code — plan-only, as expected for a plan.

## Verdicts
Q1 malformed input → GAP (minor). `animate` value closed (#25 + §3 resolveAnimate). NaN/Infinity/zero-size geometry: no plan line. Bounded by cap (line 38/80) + cull finite-guard (code), parity with today, but unstated.
Q2 dependency failure → GAP (material). WASM throw/render-refuse closed (#19,§1 abort,§5.2,§8); rAF background/slow closed (#13, AC6 clamp, line 32); jsdom via §10 test infra. "Overlay throws in a slot" NOT closed: notifyPromoteSync:637 no isolation + per-frame emission.
Q3 race/repeat → CLOSED. #12 retarget, §5.1 coalescing (+renderCoalesce verified), #20 export settleNow, #24 destroy, §5.2 start only-if-prepared / abort restore, §1 single state.
Q4 empty/boundary → GAP (minor). MAX_NODES (§6 line128, const line81) + cap (line38/80,#18) closed; 0/1-node, all-exit, deepest-nesting: no plan line.
Q5 rollback → CLOSED. §8 lines 141-147 (runtime opt-out AC1 golden, code revert, mid-transition cancel) + §6 additive API.

Remaining gaps: 3 (Q1 minor, Q2 material, Q4 minor).

## Re-check (rev 5)
Delta re-check of plan.md rev 5 against my 3 gaps + coordinator-noted changes (N1 LOD, N2 abort, rows #33/#37/#38). Read-only.

FACT (Q1): §6 bullet "Невалідна геометрія ... поза скоупом валідації" (plan L155-158) = the out-of-scope line I proposed — parity with non-animate position.set + SETTLE_CAP_MS bound + cull finite-guard cited DiagramRenderer.ts:469-486 (verified earlier: finite-guard + try/catch present). Pairs with #25 for the `animate`-value half. CLOSED.
FACT (Q2): new §5.4 (plan L138-142) isolates the per-frame 'transition' signal — correctly cites notifyPromoteSync bare loop OrgHierarchyDiagram.ts:637-639 vs callHostCallback try/catch :645-652 (both verified earlier). Fix: T-E wraps each 'transition' subscriber (throw → one warning, following subscribers/frames continue) + T-C guards onTransitionFrame in tick; acceptance row #34 (L260) asserts settle reached + ghosts removed + 0 frames. CLOSED.
FACT (Q3): §5.1 carrier made explicit — reason is instance field pendingReason because render()/schedule()/drawOrRestore take no params; cite renderCoalesce.ts:17-18 verified (`schedule: () => Promise<void>`). N1 LOD rule (L113-116) + #37 (L264) strengthen coalesced-render consistency. #12/#20/#24/§5.2 unchanged. CLOSED (was already closed in rev2).
FACT (Q4): rows #35 (0/1 node → immediate final, 0 frames; L261) and #36 (empty tree → all ghosts fade, scene empty, 0 frames; L262) = the acceptance rows I proposed; added to T-B/T-C scope (L94). Pairs with MAX_NODES (§3 L87) + cap (§1 L44/L86, #18). CLOSED.
FACT (Q5): §8 (opt-out runtime AC1 golden, revert commits, mid-transition cancel) unchanged; N2 abort (§5.2 L123-128) now restores last confirmed frame (returns detached views to layers + restores SceneRegistry box snapshot + destroys ghosts) — strengthens AC9; cite DiagramRenderer.ts:545 verified (`if (!this.isRenderCurrent(epoch)) return;` = evicted pass returns without throwing). §6 confirms additive-only public surface. CLOSED (was already closed).

All 5 questions closed. Remaining gaps: 0.
