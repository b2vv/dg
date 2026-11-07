You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). Another coder works IN PARALLEL in the same checkout on animators.ts / resolveAnimate.ts — never touch files outside your list, and do NOT import from animators.ts (it may not exist yet). Do NOT switch branches, create worktrees, commit or push.

🔴 packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or emitting tsc. Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/sdk -- TransitionController`. Rstest needs a localhost listener: if the sandbox denies it (`listen EPERM`), rerun with the permission it needs; if the port is busy because the other coder's run is active, wait and retry — do not change config. Do not write outside the repo and the working file.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-B.md
Append AFTER EVERY STEP (append, not rewrite). First entry before your first tool call: `NEXT:`. Labels FACT / DECISION / NEXT / QUESTION. English. Paste FULL test output (no pipes). Finish with exactly one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

READ FIRST: packages/sdk/src/render/transition/types.ts and constants.ts (the contract — do not modify; if wrong, write QUESTION and stop); work/reports/d3-transitions/plan.md §1, §3, §5, §10 rows #2 #3 #4 #11 #12 #13 #18 #24 #35 #36 #39; work/TDD.md.

YOUR FILES (exclusive): packages/sdk/src/render/transition/TransitionController.ts, TransitionController.test.ts.

TASK T-B — a pure (no Pixi, no DOM) controller. TDD: failing success AND failure tests first, record RED, implement, GREEN. In tests use a minimal FAKE `Animator` (e.g. moves linearly toward target, settles exactly) via an injected `AnimatorFactory`, and a fake `FrameClock` (manual time + collected frame callbacks, like packages/sdk/src/render/Viewport.test.ts:139-157).

API (you may refine names; document them in the working file so the next task can call them):
```ts
new TransitionController({ resolved: ResolvedAnimate, createAnimator: AnimatorFactory, clock: FrameClock,
  maxNodes?: number /* ANIMATE_MAX_NODES */, settleCapMs?: number /* SETTLE_CAP_MS */ })
prepare(targets: readonly TargetBox[], opts: { animate: boolean }): void   // diff only; does NOT start the loop
start(): void            // begin ticking the prepared transition (no-op if nothing to animate)
abort(): void            // stop; restore the last CONFIRMED target set + frame; 0 further frames
snapToTarget(): void     // jump instantly to final state; remove exiting entries; 0 further frames
confirm(): void          // mark the prepared targets as the new confirmed set (called after a confirmed frame)
frame(): TransitionFrame // current frame; passthrough (= targets, idle) when nothing animates
isActive(): boolean      // internal use only (the renderer seam exposes frame-or-null instead)
onFrame(cb): () => void; onSettle(cb): () => void   // listener errors are isolated: one console.warn, loop continues
destroy(): void          // cancel any requested frame; 0 further frames
```
Rules (plan §1, §3):
- Keys are `kind:id` strings from TargetBox.key. Diff previous frame vs new targets: new key → entering (start at target x/y, scale ENTER_SCALE_FROM, opacity 0 → end scale 1, opacity 1); missing key → exiting (keep its last frame box, opacity → 0, then removed); common key → updating (x,y retarget from CURRENT frame value with velocity carried; w,h SNAP to target).
- Channels: x, y, scale = 'spring'; opacity = 'tween'.
- First prepare (no previous frame), `animate:false`, or targets.length > maxNodes → snap (no animation, 0 frames).
- Zero changes (same keys, same boxes) → no animation, 0 frames (row #11).
- Re-entry: a key that comes back while its exiting entry is still fading absorbs that entry — one entry per key, it becomes updating/entering from its current values (row #39).
- Fixed-timestep accumulator: each tick adds (now − last) to an accumulator and runs at most MAX_STEPS_PER_FRAME steps of FIXED_DT; if more time is owed, the remainder is dropped and the state snaps forward safely — no NaN, no explosion (row #13).
- Settle when every animator is settled → remove exiting entries, fire onSettle once, request no more frames. Cap: if not settled after settleCapMs from start, snap to target and settle (row #18).
- While active: request exactly one frame per tick via clock.requestFrame; after settle/abort/snap/destroy: zero frame requests (rows #24, #16 at controller level).
- 0 or 1 target, or all targets removed (all exiting) — must work (rows #35, #36).

Done = your 2 files only; tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass (full outputs in the working file).
