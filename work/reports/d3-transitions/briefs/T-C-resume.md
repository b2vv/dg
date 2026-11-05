T-C RESUME — the contract bug that blocked you is FIXED. Re-run task T-C from scratch (your first attempt made ZERO source changes). Everything in briefs/T-C.md still applies — read it in full first. This file is the ADDENDUM: what changed since, and two renderer↔facade seam requirements the facade (T-E) already depends on.

## 0. The blocker is resolved
`TweenAnimator.retarget` is now idempotent: `retarget(v)` when `v === current` stays settled (animators.ts). So acceptance #11 (unchanged data with animate:true → 0 frames) holds through the real factory. The controller contract (TransitionController.ts) is reliable — do NOT work around it. If you still see a contract problem, write QUESTION and stop as before.

## 1. getTransitionFrame() MUST be null at settle (facade settle-signal)
The facade (OrgHierarchyDiagram.ts:513-522, ALREADY WRITTEN) wires:
```ts
renderer.onTransitionFrame = () => {
  if (facade.getTransitionFrame()) notifyPromoteSync('transition');   // a live frame
  else notifyPromoteSync('structural');                               // settle
};
// facade.getTransitionFrame() === renderer.getTransitionFrame() (when animate on)
```
Therefore YOUR renderer must implement:
- `getTransitionFrame(): TransitionFrame | null` → return `null` when the controller is NOT active (e.g. `controller.isActive() ? controller.frame() : null`). Do NOT return `controller.frame()` unconditionally — after settle the controller's `frame()` is a non-empty idle frame, which would wrongly read as "still transitioning".
- `onTransitionFrame` (the callback field) must fire once per animating frame AND exactly once at settle. Order at settle: let the controller settle FIRST (so `getTransitionFrame()` now returns null), THEN invoke `onTransitionFrame`. That final call is how the facade learns to emit `'structural'`.

## 2. RenderOptions.transition + RenderReason (facade passes the reason in)
The facade calls `renderer.render(data, { ...options, transition: reason })` with `reason: 'animate' | 'snap'` (OrgHierarchyDiagram.ts:954). YOU must:
- add `transition?: RenderReason` to the renderer's `RenderOptions` type;
- define and export `type RenderReason = 'animate' | 'snap'`. (The facade currently has a local structurally-identical copy; that compiles fine — no coordination needed, just define yours.)

## 3. settleNow() is also called on backdrop teardown and export
The facade calls `renderer.settleNow()` from `setStaffReactChromeMounted(false)`, `export()`, and `destroy()`-adjacent paths. Your `settleNow()` just needs to be the forward-to-final method from briefs/T-C.md §(settleNow) — no extra work, just make sure it is idempotent and safe to call when nothing is animating (no-op).

## 4. Everything else
Unchanged from briefs/T-C.md. Same files, same prohibitions (no build/root-typecheck/dist, no commit/push, no files outside your list, no external store), same working file /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-C.md (append; it currently holds only your BLOCKED first pass — continue appending below it, do not rewrite). Same acceptance rows. Package-wide `typecheck -w` will still show the ~10 T-E seam errors UNTIL your methods land — once you add configureTransition/startTransition/abortTransition/settleNow/getTransitionFrame/onTransitionFrame/RenderOptions.transition, those resolve; any that remain are yours to fix. End with the STATUS line.
