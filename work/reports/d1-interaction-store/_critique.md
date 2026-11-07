
---
RE-CHECK rev.2 (delta) — claude-opus-4-8

NEXT: verify B1, B2, N1-N3 closed against plan.md rev.2.

FACT: cited line refs verified real — PersonNode.ts:215 pointerover, :338 setHovered far early-return, OrganizationNode.ts:174 pointerover, OrgHierarchyDiagram.ts:664-678 notifyPromoteSync warn-once precedent (cited for Q2).

B1 — CLOSED. §1 lines 27-30 name PersonNode:215/OrganizationNode:174 pointerover as the source D1-C MIGRATES to write the store (hoverRing then rendered from state = single source, near/mid). far-LOD painting (PersonNode:338 early-return) explicitly NOT added, deferred to R1. §4 D1-C files updated accordingly; §4 lines 79-80 spell out per-node pointerover ≠ R1 pointermove hit-test. AC3 narrowed: scenario #7 (near/mid single-source) + new #7f (far deferred). All three sub-parts of B1 addressed.

B2 — CLOSED. New task D1-D owns packages/demo/src/app/StaffChromeBackdrop.ts + ShpsStaffCard.ts: removes DOM-imperative installStaffHoverHighlight, routes near pointer→setHovered via subscribeInteraction. relatedStaffIds relocated into SDK render/staffRelated.ts (reused, not re-authored). AC4 reassigned D1-C→D1-D (scenario #8). Dependency D1-D after D1-B (needs public subscribeInteraction). No file overlap: D1-C owns staffRelated.ts, D1-D imports it.

N1 — CLOSED. §1 line 17 + §3 line 62(г): selection change via delegates also emits subscribe; onSelectionChange kept.
N2 — CLOSED. §1 line 19 + §3 line 57 reconcile(data); §4 D1-B calls store.reconcile on setData.
N3 — CLOSED. relatedStaffIds moved to SDK render/staffRelated.ts.

Also addressed (defense, not my findings): Q1 setHovered(unknownRef) pure+render-noop, Q2 listener isolation warn-once, Q3 snapshot-iteration/idempotent unsubscribe, Q5 rollback breaking-removal documented (§7).

Residual (non-blocking, pre-existing not a rev.2 regression): scenario #15 "defined accent priority" for hovered==selected is asserted but the priority rule is not specified in the plan — an integ-test detail for D1-C, not a gate blocker.

No new blockers introduced by rev.2. All 4 critique lenses satisfied.

GATE: GREEN
