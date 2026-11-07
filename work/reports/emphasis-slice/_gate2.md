claude-opus-4-8

# GATE-2 (plan-critique + plan-defense) — Emphasis-slice

NEXT: read grounding code (DiagramRenderer foundFocus/emphasisAlpha/repaintHighlight, OrgHierarchyDiagram setFoundFocus/highlightPath/clear-on-setData, D1 InteractionStore) to verify plan claims against reality.

FACT: InteractionStore (state/InteractionStore.ts) — subscribe isolation via entry objects (:66-69), emit try/catch + warnedListeners WeakSet (:71-83), setHovered 0-change guard via sameNodeRef (:54-59), reconcile(isPresent) clears only vanished hover (:61-63). Pattern copy is sound.
FACT: InteractionState = {selected, primary, hovered} (interactionState.ts:4-8). Barrel exports it as type (index.ts:315). D1 separation verifiable.
FACT: Current emphasis state lives in ViewStateStore: highlightedNode: string|null (:11), foundFocus: ReadonlySet<string>|null (:12). => highlight is a STRING id, NOT a NodeRef.
FACT: Facade highlightPath(nodeId: string|null) :1930 writes viewState.highlightedNode; setFoundFocus :1937 normalizes keys, empty->null (:1949); both call private repaintHighlight :1953 (direct call renderer.repaintHighlight + host.requestPaint). No store, no subscription today.
FACT: setData/ingest path :1489-1490 clears BOTH highlightedNode & foundFocus UNCONDITIONALLY (null), not reconcile-conditionally. renderer.render() :1002 also nulls foundFocus each render.
FACT: renderer.repaintHighlight(highlightedNode:string|null, foundFocus, lines, theme) :1085 keeps its OWN filtered foundFocus cache (:1095-1096) that paintInteraction (:291) depends on; found=null when no view matches (:1095). foundDimAlpha 0.38 default.
FACT: hover->related dimming = staffDimmedIds computed at paint time (:285), already a derived selector, not stored. => AC5 already satisfied by current code.
FACT: D1 paint-subscription (unsubscribeInteractionPaint :1836) exists because hover ORIGINATES in views via interactionSource. Emphasis writes originate in the HOST via facade methods, so facade already knows when to repaint — no internal subscription needed.

DECISION: BLOCKING-1 — contract type wrong. Plan §1/§3 + spec define EmphasisState.highlight: NodeRef|null, but grounding is string|null (ViewStateStore:11, highlightPath param, repaintHighlight param). Making it NodeRef is a gratuitous representation change risking AC1 and gives subscribeEmphasis a wrong public shape. Must be `highlight: string|null`.
DECISION: BLOCKING-2 — reconcile vs unconditional clear. Plan §1 "setData -> store.reconcile" + AC3 "reconcile чистить застарілі" contradicts current UNCONDITIONAL clear (:1489-1490) AND AC1 byte-for-byte. Reconcile keeps surviving found/highlight ids across setData; in staff edit-mode (frequent setData with overlapping ids) found would persist instead of clearing — observable behavior change. Must clear unconditionally (store.clearEmphasis on setData) to honor AC1, or explicitly drop byte-for-byte + get owner sign-off. As written the plan is self-contradictory.
DECISION: non-blocking — public subscribeEmphasis is YAGNI. No host listener exists (host only WRITES via setFoundFocus/highlightPath); spec itself recommends internal-only (spec:44). D1-symmetry is aesthetic, not a need. Recommend internal-only now; add public subscribe when a listener appears. Owner decides.
DECISION: non-blocking — drop internal paint-subscription. Facade can read emphasisStore.state in its existing private repaintHighlight and keep calling it directly from delegates. The D1 "підписка фасаду -> repaint" pattern is unneeded here (writes are host-initiated) and adds indirection against KISS.
DECISION: non-blocking — 0-change=0-emit needs set-equality for `found` (ReadonlySet), undefined in plan. InteractionStore's sameNodeRef only covers single refs. E-A must specify set comparison. Low risk (no current emit to match).
DECISION: non-blocking — acceptance row 8 ("auto-highlight selector (якщо є)") is non-falsifiable with the "if any" hedge; AC5 is really "don't regress staffDimmedIds". Rows 1-7 are red-if-deleted; row 8 weak.

DEFENSE Qs:
Q1 malformed (unknown ids / highlight non-existent): CLOSED by byte-for-byte — renderer guards (found=null if no view matches :1095; reportPath empty => no accent). Not stated in plan but behavior preserved.
Q2 dependency failure (subscriber throws): CLOSED — pattern copy includes try/catch+warnedListeners isolation (:71-83); plan §1 "ізоляцією слухача".
Q3 races/repeat: PARTIAL — setData mid-emphasis covered IF BLOCKING-2 resolved to unconditional clear; rapid setFound 0-emit depends on undefined set-equality (non-blocking gap); double-subscribe OK (entry objects).
Q4 empty/boundary (empty set vs null, 0 nodes): CLOSED — facade normalizes empty->null (:1949) before store; renderer early-returns views.length===0 (:1094). Plan should keep normalization in delegate.
Q5 rollback: CLOSED — additive; revert E-* returns delegates to viewState fields (plan §5).

GATE: RED — BLOCKING-1 (contract type NodeRef vs string) and BLOCKING-2 (reconcile vs unconditional clear contradicts AC1) both open.

== RE-GATE рев.2 ==
FACT: plan.md рев.2 §1/§3 — EmphasisState.highlight: string|null, found: ReadonlySet<string>|null. Matches ViewStateStore:11-12 / highlightPath:1930 / repaintHighlight:1085. => B1 CLOSED.
FACT: plan §2/§4 + spec §3/AC3 — setData → store.clearEmphasis() = UNCONDITIONAL null of found+highlight, mirrors :1489-1490 + :1002; "НЕ утримує вцілілі id". Byte-for-byte restored. => B2 CLOSED.
FACT: internal-only accepted — no public subscribeEmphasis, no USAGE/barrel change (plan §3), no self-subscription (delegates call repaintHighlight directly). => matches my non-blocking recs.
DECISION: Q3 — zero new public surface => AGENTS.md "public API = what USAGE.md describes" is untouched => genuinely sub-threshold internal refactor. Light inline path (single E-A Codex task) is correct; full cycle not required. AGREE.
NOTE (trivial, non-blocking): AC6 set-equality skip must only suppress a REDUNDANT repaintHighlight (output identical); it adds no visible change. There is no subscribe now so "0-emit" is moot — fine.
GATE: GREEN — B1 + B2 closed, no residual blockers.
