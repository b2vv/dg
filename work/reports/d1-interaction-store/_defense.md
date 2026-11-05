model: claude-opus-4-8

NEXT: GATE-2 plan-defense of D1 interaction-store plan. Five fixed questions, each must be closed by a concrete plan.md line/mechanism or marked OPEN. Independent reviewer, not author. Read plan.md, spec.md, SelectionStore.ts, selection.ts done. NEXT: inspect OrgHierarchyDiagram selection wiring + near-hover (installStaffHoverHighlight / personInteractions) to ground the five questions.

FACT: Grounding confirmed.
- notifyPromoteSync (OrgHierarchyDiagram.ts:664-678) is the D3 isolation precedent: ONLY reason==='transition' listeners are wrapped in try/catch with warn-once-per-listener dedup (warnedTransitionListeners); non-transition listeners are NOT isolated (a throw propagates). callHostCallback (681-692) wraps host callbacks in try/catch + console.error. So the repo has two concrete isolation patterns the new subscribe-emit should mirror.
- Current near-hover lives in demo installStaffHoverHighlight (StaffChromeBackdrop.ts:71), DOM-imperative, related-dimming via relatedStaffIds — this is the host-visible behavior Q4 says migrates into the library in D1.
- Pixi nodes already have local per-node hoverRing on pointerover/out (PersonNode.ts:215, OrganizationNode.ts:174) — not store-driven.
- highlightedNode (viewState) is the highlightPath/found channel = emphasis, correctly kept out of D1.
- plan.md grep: NO "throw/try/catch/isolation" language anywhere; "set-of-listeners" named (line 33); "unsubscribe припиняє" (row 9) but NO unsubscribe-during-emit / double-subscribe guarantee; hovered validation worded as setData/removal-triggered (line 24/56, row 11), NOT setHovered-call-time.

DECISION Q1 (malformed input): OPEN. Invalid hovered via node removal IS covered (line 24/84, row 11); stale-select is parity (§6 byte-for-byte). BUT "setHovered on a non-existent node" at call time is not pinned: validation is specified only as setData/removal-triggered. Injected data-provider (§9 line 98) exists but plan never states the setHovered(unknownRef) policy (ignore vs accept-then-clear) — accent could render on a ghost until next setData. Needs one line in §4 D1-A / §1 line 24.

DECISION Q2 (dependency failure / subscriber throws during emit): OPEN — the central gap. Plan §1 line 19 / §4 D1-A define subscribe/emit but say NOTHING about a subscriber throwing. With a SINGLE subscribe feeding BOTH shaders, one throwing listener (near) must not kill the other (far) or the diagram. Repo precedent exists (notifyPromoteSync transition try/catch + warn-once; callHostCallback console.error) and spec/caller explicitly asks to mirror it. Needs a line in §4 D1-A: emit isolates each listener. (Note: WASM/worker/network N/A — pure TS store.)

DECISION Q3 (races / repeated invocation): OPEN. 0-change=0-emit covered (line 19, row 10, AC6). rapid-hover = last-wins single field, fine. BUT double subscribe/unsubscribe and unsubscribe-DURING-emit are unaddressed; row 9 only covers plain unsubscribe. The emit loop must snapshot listeners (or document Set-iteration safety) so a listener unsubscribing during emit does not skip/crash; double-subscribe multiplicity must be defined. Needs a line in §4 D1-A / §9.

DECISION Q4 (empty/boundary): CLOSED. hovered===selected → row 15 + line 124 (defined accent priority); setData clearing while hovered → row 11 + line 24/84; 0 nodes/removal → validation (§4 D1-A); dedup → row 4. Strongest boundary (setData wipes while hovered) is explicit.

DECISION Q5 (rollback): CLOSED. §7: runtime (no subscriber/no setHovered → behavior = current), code (revert D1 commits isolated), invalid hovered cleared; §6 additive migration; row 13 onSelectionChange compat. Nothing data-irreversible (pure in-memory TS, additive API). Caveat worth one line: once a host adopts the D1-shipped public subscribeInteraction (Q6), rollback becomes a breaking API removal — §7 implies this ("if host doesn't subscribe") but doesn't say it. Not blocking.

GATE: RED — 3 open rows (Q1, Q2, Q3). Q2 is the primary blocker (subscriber-throw isolation across the single two-shader subscribe).

=== RE-CHECK rev.2 (delta) ===
NEXT: verify Q1/Q2/Q3 close against plan.md rev.2.

FACT Q2 CLOSED: §1 lines 22-23 + §3 line 60 + §10 row Q2 (line 171). emit ISOLATES each listener (try/catch, warn-once-per-listener), citing the exact precedent notifyPromoteSync OrgHierarchyDiagram.ts:664-678; a throwing listener cannot kill the others or the diagram. This was the primary blocker — now pinned in a plan line, with the owner it lands in (§4 D1-A, line 71). CLOSED.

FACT Q3 CLOSED: §1 line 24 + §3 line 61 + §10 row Q3 (line 172) + §4 D1-A ("snapshot-ітерацією"). emit iterates a SNAPSHOT of the listener set → unsubscribe-during-emit is safe; unsubscribe is idempotent. Double-subscribe multiplicity: "set-of-listeners" (§2 line 42) defines the container; the policy is pinned. CLOSED.

FACT Q1 CLOSED: §1 lines 32-33 + §3 line 56 + §10 row Q1 (line 170). Policy explicit: store is pure and accepts any ref (no data coupling); RENDER paints an accent only for a node present in the current frame (unknown ref → visual no-op); reconcile(data) clears stale hovered on facade.setData. No accent renders on a ghost node. Row 11 (setData/removal) + new reconcile mechanism (§3 line 57, §4 D1-B line 72) back it. CLOSED.

FACT Q5 (non-blocking) now documented: §7 lines 108-110 — once public subscribeInteraction ships, removing it is a breaking API change (semver-major), not a silent no-op; runtime no-op (not subscribing) still holds. CLOSED.

DECISION: All three open rows close in plan lines (not chat). No new gaps introduced by rev.2 (the added D1-C/D1-D task split for B1/B2 and the reconcile/N1 emit wiring are consistent with the five questions). 

GATE: GREEN — 0 open rows. Plan rev.2 may proceed into tasks.
