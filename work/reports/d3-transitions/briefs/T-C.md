You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). TWO other coders work IN PARALLEL in the same checkout (T-D on react/*, T-E on OrgHierarchyDiagram.ts + docs/USAGE.md). Never touch files outside YOUR list. Do NOT switch branches, create worktrees, commit, push, or write anywhere outside the repo except your working file. Prompts and working file in English.

🔴 PROHIBITIONS (hard):
- packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or any emitting tsc.
- Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/sdk -- <yourTestFile>`.
- Rstest needs a localhost listener: if the sandbox denies it (`listen EPERM`), rerun with the permission it needs; if the port is busy because another coder's run is active, wait and retry — do NOT change config.
- Do NOT write any checkpoint/state outside this repo. There is no external store for you.
- Package-wide `typecheck -w` may show errors in files owned by T-D/T-E (seams not landed yet). That is EXPECTED. Report such errors in the working file; do NOT "fix" another coder's file. Only your own files must be internally consistent and your own tests must pass.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-C.md
Append AFTER EVERY STEP (append, not rewrite). First entry BEFORE your first tool call: a `NEXT:` line. Labels FACT / DECISION / NEXT / QUESTION. Paste FULL test output (no pipes, no `| tail`). Finish with exactly one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

READ FIRST:
- Contract (do NOT modify): packages/sdk/src/render/transition/types.ts, constants.ts, TransitionController.ts, animators.ts, resolveAnimate.ts. These are LANDED (wave 1). If the contract looks wrong, write QUESTION and stop.
- Plan: work/reports/d3-transitions/plan.md — §1 (the whole render() flow diagram is your spec), §4 (T-C row), §5.1 (RenderReason seam), §5.2 (renderer→facade seam — THIS IS YOUR PUBLIC API), §6, §10 rows #1 #2 #3 #4 #5 #6 #7 #10 #11 #16 #18 #19 #20 #22 #27 #28 #29 #30 #33 #34 #35 #36 #37 #38 #39.
- Facts: work/reports/d3-transitions/_helper-H1.md (render seams), _helper-H3.md (callback timing, clear ordering). work/TDD.md, work/CODING_STANDARDS.md.

YOUR FILES (exclusive): packages/sdk/src/render/DiagramRenderer.ts, render/LayerManager.ts, render/SceneRegistry.ts, render/personInteractions.ts and their *.test.ts.

TASK T-C — wire the TransitionController into the staff render path. The renderer OWNS the controller instance. When no controller is configured, the render path is byte-for-byte unchanged (passthrough). TDD: write failing success AND failure tests first, record RED, implement, GREEN.

PUBLIC API you must expose on DiagramRenderer (this is the seam T-E calls — signatures fixed in plan §5.2, do not rename):
```ts
configureTransition(resolved: ResolvedAnimate | null): void   // null = no controller, old path byte-for-byte
startTransition(): void       // start the loop for the PREPARED transition; call AFTER a confirmed frame
abortTransition(): void       // restore last CONFIRMED frame + detached views + SceneRegistry snapshot; 0 frames
settleNow(): void             // jump forward to final: snapToTarget + apply + new lines visible + drop ghosts
getTransitionFrame(): TransitionFrame | null   // null when nothing animates (no separate isTransitioning)
onTransitionFrame: ((frame: TransitionFrame) => void) | null   // callback field next to onNeedsPaint
render(..., { transition?: RenderReason }): Promise<...>       // RenderReason = 'animate' | 'snap', default 'snap'
```

Render flow (plan §1 is authoritative — implement it exactly). Key points:
- reason='animate' AND a controller is configured: BEFORE `this.layers.clear()`/`this.scene.clear()` (DiagramRenderer.ts:523-524) snapshot the current views + SceneRegistry boxes + baselineAlphas per `kind:id`, and the old lines/chrome container; DETACH into a ghost container WITHOUT destroy (B1, B2). Everything else clears as today.
- `live = computeStaffLiveGeometry(...)` gives TARGET boxes/lines (lines already routed by Rust to the target).
- `controller.prepare(targetsFrom(live), { animate })`. prepare does NOT start the loop (B4).
  - snap (0 frames) when: first render / reason='snap' / current-pass LOD ≠ `lastConfirmedLod` (see §5.1 LOD rule — `lastConfirmedLod` is a SEPARATE field, NOT `this.lastLod` which render() overwrites at :538) / N > ANIMATE_MAX_NODES. In snap, also remove ALL ghosts including a previous transition's.
  - on EVERY pass: a returning key whose ghost is still fading absorbs that ghost (one sprite per key); evicted-transition ghosts are removed.
- New views created at the START-frame positions; ghost views only for exit keys; the rest of the detached views → destroy.
- Old lines container → ghost (fade out); new lines alpha 0 until settle.
- Chrome as boxes ON BOTH PATHS: React-geometry (frames from the frame, `lines: []` during motion, real lines on settle — via getStaffChromeGeometry, see below) AND Pixi redraw (B5). blob department contours (polygons) stage like lines (fade out during motion, new on settle) — Pixi far path only (plan §1 note).
- `lastConfirmedLod` is written at the end of EVERY successful render (both 'animate' and 'snap') and read by prepare() BEFORE it is updated.
- startTransition() begins ticking (controller.start()); abortTransition() restores (controller.abort() + reattach detached views to their layers + restore SceneRegistry box map + baselineAlphas + destroy failed-pass ghosts), then ONE paint via onNeedsPaint; the restored frame is static (interaction bindings return on next render — personInteractions.reset() runs at render top, :522). abort is ONLY on the animate path; non-animate path unchanged.
- tick (driven by the controller's clock via onFrame → your apply): apply(frame) moves cards (incl. promote-hidden), ghosts, Pixi chrome from frame boxes; culling uses "from ∪ to" for live keys and the ghost's own frame-box for ghosts; wrap the onTransitionFrame call in try/catch (plan §5.4 — a throwing frame callback must not kill the loop). Paint via existing onNeedsPaint (no PixiHost edits).
- settle (natural or cap 750ms) / settleNow(): drop ghosts, fade in new lines (settleNow → immediately visible), then the facade emits promote sync.
- getStaffChromeGeometry() (DiagramRenderer.ts:444): during motion returns frames from the current frame and `lines: []`; add optional additive field `linesOpacity` for the fade; on settle returns the real new lines. (T-E documents this in USAGE; you implement it.)
- onDragStart / drag start → `snapToTarget` (B6): find where personInteractions signals a drag begin (_helper-H3) and snap the controller to final before the drag reads positions.

Tests (your boundary — do NOT need the facade or the overlay): drive the renderer directly with `configureTransition(resolved)` + `render(data, { transition:'animate' })` in rstest (full diagram, rAF spy with manual frame stepping — precedent packages/sdk/src/render/PixiHost.test.ts:110-113). The controller and animators are REAL (landed). Cover acceptance rows listed above. Must include: passthrough identical to old path when controller is null (#1, use/extend the existing golden); abort restores the confirmed frame (#19); snap on LOD change mid-transition (#28, #37); ghost reconcile / fast toggle one-sprite-per-key (#39); settleNow drops ghosts and shows lines (#20 support, #38); 0 frames at rest (#16).

Done = ONLY your files changed; your tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` shows no NEW errors in YOUR files (cross-task seam errors in T-D/T-E files reported but allowed); `npm run lint` passes. Full outputs pasted in the working file.
