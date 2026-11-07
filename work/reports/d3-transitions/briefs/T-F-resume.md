T-F RESUME — your BLOCKED question is resolved. The idle assertion used the wrong instrument; fix ONLY that assertion and finish the test. Everything else in briefs/T-F-e2e.md still applies. Continue appending to work/reports/d3-transitions/_impl-T-F.md (do not rewrite). Same file ownership (only OrgHierarchyDiagram.transitions.e2e.test.ts), same prohibitions.

## Resolution of your QUESTION (the zero-rAF mismatch)
You correctly found that after settle the TRANSITION is null (getTransitionFrame()===null) but Pixi's EventSystem ticker (EventTicker.mjs:39 → Ticker.mjs:128) keeps scheduling global requestAnimationFrame on the fully mounted host. That is AMBIENT Pixi event-polling, PRE-EXISTING and unrelated to the D3 transition layer — it is NOT in scope here and is NOT a D3 defect. Do NOT try to suppress Pixi's ticker, do NOT touch production code.

Acceptance #16 ("zero idle cost") for D3 means the TRANSITION requests no further work after settle — it does NOT mean the global rAF counter is zero on a host whose Pixi event system legitimately polls. The renderer-level test already proves the controller side (it never mounts the Pixi event system). At the e2e level, measure the D3-SPECIFIC idle contract instead of raw global rAF.

## The fix (test only)
Replace the raw-global-rAF idle assertion with a D3-specific one. After the transition has settled, step several more frames and assert:
- `diagram.getTransitionFrame()` stays `null`, AND
- NO further `'transition'` promote-sync signals are emitted on those extra steps (subscribe via subscribePromoteSync and count 'transition' emissions — they originate ONLY from the controller's onTransitionFrame, so zero new ones = the transition is truly idle), AND
- no new transition frame is produced (e.g. onTransitionFrame / the moving-card position does not change across the extra steps).
That is the host-observable "transition adds no idle cost" guarantee. The ambient Pixi EventTicker rAF is expected and must NOT fail the test.

Keep ALL the other assertions from briefs/T-F-e2e.md: first render does not animate (#27); real interpolation of a moving card between start and target during motion; after-settle parity with an animate-OFF render of the same tree (±0.5px, #3/#6); `'transition'` during motion then `'structural'` at settle; and the #11 unchanged-tree → zero NEW transition frames through the whole stack (same instrument: zero new 'transition' emissions, not raw rAF).

Done = your one test file GREEN (paste full output), `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass. STATUS line last. If a DIFFERENT real seam genuinely does not line up (not the Pixi-ticker one, which is now resolved), record a QUESTION with both file:line sides and stop.
