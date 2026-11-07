You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). TWO other coders work IN PARALLEL in the same checkout (T-C on render/DiagramRenderer.ts + friends, T-E on OrgHierarchyDiagram.ts + docs/USAGE.md). Never touch files outside YOUR list. Do NOT switch branches, create worktrees, commit, push, or write anywhere outside the repo except your working file. Prompts and working file in English.

🔴 PROHIBITIONS (hard):
- packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or any emitting tsc.
- Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/sdk -- <yourTestFile>`.
- Rstest needs a localhost listener: on `listen EPERM` rerun with the permission it needs; if a port is busy because another coder's run is active, wait and retry — do NOT change config.
- Do NOT write any checkpoint/state outside this repo. There is no external store for you.
- Package-wide `typecheck -w` may show errors in files owned by T-C/T-E (seams not landed yet). EXPECTED. Report them in the working file; do NOT touch another coder's file.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-D.md
Append AFTER EVERY STEP (append, not rewrite). First entry BEFORE your first tool call: a `NEXT:` line. Labels FACT / DECISION / NEXT / QUESTION. Paste FULL test output (no pipes). Finish with exactly one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

READ FIRST:
- Contract (do NOT modify): packages/sdk/src/render/transition/types.ts (esp. `TransitionFrame`, `FrameBox`). LANDED.
- Plan: work/reports/d3-transitions/plan.md — §1 (tick → overlay part), §4 (T-D row), §5.3 (facade→overlay seam — THIS IS YOUR INPUT), §5.4 (frame-signal isolation), §6 (the `'transition'` reason reaches ALL subscribePromoteSync listeners — your overlays MUST handle it cheaply, not treat it as camera-change rebuild), §10 rows #7 #8 #29 #33 #40.
- Facts: work/reports/d3-transitions/_helper-H3.md (interactions, overlay mount/unmount). work/TDD.md, work/CODING_STANDARDS.md.
- Current overlays: packages/sdk/src/react/createReactPromoteOverlay.ts (note onCameraChange debounce-rebuild ~:515-519 — the trap), createTestAnchorOverlay.ts; packages/sdk/src/render/promoteMath.ts (`PromoteSyncReason` type at :85, currently `'camera' | 'structural' | 'prepare-camera'`).

YOUR FILES (exclusive): packages/sdk/src/react/createReactPromoteOverlay.ts, react/createTestAnchorOverlay.ts, render/promoteMath.ts (ONLY the `PromoteSyncReason` type — add `'transition'`), and their *.test.ts.

TASK T-D — teach the overlays the per-frame `'transition'` signal. TDD: failing success AND failure tests first, RED, implement, GREEN.

1. promoteMath.ts: add `'transition'` to `PromoteSyncReason` (additive, nothing else in that file).
2. React promote overlay (`createReactPromoteOverlay.ts`):
   - On reason `'transition'`: move the HTML cards by CSS transform to match the current frame's Pixi card position per `kind:id` WITHOUT a React re-render of the cards (row #8: same DOM node identity, card-component render count does NOT increase on intermediate frames, only `style.transform` changes). Read the frame via the optional host seam `getTransitionFrame?(): TransitionFrame | null` (plan §5.3) — if absent, behave as today.
   - The backdrop receives the interpolated chrome geometry per frame; on `'structural'` (settle) do the full rebuild as today.
   - Do NOT route `'transition'` into the `onCameraChange` debounce-rebuild path (plan §6 trap).
   - React-chrome lines hidden during motion, shown on settle (row #33 — the renderer's getStaffChromeGeometry already returns `lines: []` during motion; your job is to not fight it).
   - Mount/unmount mid-transition (rows #29, #40): on mount, the HTML card appears at the current frame position (not a stale/target position); on unmount the Pixi card is visible at the frame position — in no frame is a card shown twice or missing.
3. Test-anchor overlay (`createTestAnchorOverlay.ts`): ignore `'transition'` entirely — anchors return FINAL (target) positions, never intermediate (plan Q6). A `'transition'` signal must NOT trigger a DOM rebuild.

Tests (your boundary — do NOT need the renderer or facade): inject a fake `getTransitionFrame` returning a scripted `TransitionFrame`, and drive the overlay with synthetic `'transition'` then `'structural'` signals. Assert: CSS transform tracks the frame (±0.5px, row #8); card DOM node identity stable and render count flat on intermediate frames; test anchors unaffected by `'transition'`; mount/unmount mid-sequence shows exactly one sprite per key (#29); a throwing subscriber is isolated to one console.warn and the next frames still apply (#34 at overlay level, plan §5.4).

Done = ONLY your files changed; your tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` shows no NEW errors in YOUR files; `npm run lint` passes. Full outputs in the working file.
