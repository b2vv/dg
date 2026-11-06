claude-opus-4-8

NEXT: read grounding code, run 7 key checks + 5 defense Qs vs plan.md/spec.md.

FACT (D1 hover path): DiagramRenderer.paintInteraction (lines 253-266) and bindInteraction (236-240) are gated on `view instanceof PersonNodeView || OrganizationNodeView`. Line 255 builds positionIds only from PersonNodeView views; 261 skips non-PersonNodeView; 262 calls view.setHovered(); 265-266 apply hover-dim alpha only for PersonNodeView. PersonNodeView's own hover (pointerover/out) is in its ctor (219-226). personInteractions.ts has NO hover handling (grep empty).
DECISION: A plain wrapper Container (plan §1/§2/R3-B) is neither instanceof PersonNodeView nor has setHovered/setHoverHandler → D1 related-dim AND hover-accent do NOT reach host visuals. Plan's claim "акцент на обгортці зберігає D1" has no mechanism. BLOCKING (KEY CHECK 3: hover break = BLOCKING; AC5/acceptance row 6 cannot pass as designed).

FACT (selection): drawSelection (1165-1181) draws a separate overlay Graphics keyed by box geometry (getNodeBox), not on the view. Works for host visuals regardless of wrapper type. OK.
FACT (culling): cullToViewport (902-942) uses scene.listViews + scene.getBox(key) + view.renderable. Generic, works on wrapper IF box remembered. Position boxes remembered via personInteractions.bind → rememberBox (personInteractions.ts:150, called 1484/1616). R3-B must keep binding wrapper. OK if preserved.
FACT (transition/D3): applyTransitionFrame (520-562) uses view.position.set / view.alpha keyed by scene; ghost capture snapshots layer children generically (480-513). Wrapper moves, host visual inside moves with it. Sound.
FACT (export/settle): node boxes remembered independently of view type; stage renders layer tree. Wrapper in layers.persons renders. OK.

FACT (opt-in byte-for-byte): plan §5 + R3-B scope wrapper to nodeView-set only; seam setNodeViewFactory(null)=internal PersonNodeView. Sound; implementation risk if wrapper applied universally. Non-blocking.
FACT (retained pool vs clear): scene.clear() runs every render entry (985). Plan puts pool in new nodeViewFactory.ts (separate from SceneRegistry) — must survive clear. But plan does NOT specify the mark-and-sweep/reconcile (which ids disappeared this render → destroy) nor hook point, nor interaction with async epoch guards (isRenderCurrent). Without sweep: leak or no-retention. AC7 at risk. Non-blocking gap but must be specified.
FACT (malformed factory): plan has NO error containment. create()/update()/simple-fn are called inside the render for-loop (addStaffPositions ~1451). A throwing/null/non-Container return would abort the whole render. No per-node try/catch, no fallback. Host seam (live ШПС on SDK). BLOCKING — defense Q1 OPEN.
FACT (LOCAL coords): ctx = {lod, theme}, no scene coords; SDK does wrapper.position.set. Invariant enforced structurally. OK (AC3).
FACT (union KISS): simple fn → create/update=recreate-root-content/destroy. Reasonable; recreate-content must destroy old children (minor leak risk). Non-blocking.
FACT (ergonomics): NodeViewContext minimal/typed/no DSL; owner-flagged, not blocker. kind:'position' literal fine for scope.

DEFENSE: Q1 malformed OPEN (no containment). Q2 dependency-fail (host destroy throws during sweep) OPEN (unaddressed). Q3 races/repeat OPEN (async epoch + pool reconcile + reappear-after-destroy not explicit). Q4 empty/boundary CLOSED (0 nodes → no create; factory w/ no nodes → noop). Q5 rollback CLOSED (§5 opt-in, revert R3-*, golden).

GATE: RED — 2 blocking (B1 D1 hover mechanism absent; B2 malformed-factory containment), defense Qs 3 OPEN / 2 CLOSED.

## RE-CHECK rev.2 (coordinator)
FACT: PersonNodeView has setHovered (PersonNode.ts:356), setHoverHandler (:351), readonly lod (:101) — satisfies InteractiveNodeView methods. OrganizationNodeView has setHovered (OrganizationNode.ts:600), setHoverHandler (:595), readonly lod (:39) — also satisfies.
FACT: current D1 gate is `instanceof PersonNodeView || OrganizationNodeView` at BOTH :236 and :261; related-dim id-set (:255) is PersonNodeView-only. Paint code derives ref from the scene KEY (parseNodeEntityKey), NOT from view.nodeRef.
DECISION B1: RESOLVED by generalization. Sound. Three implementation notes (non-blocking): (a) interface lists `nodeRef: NodeRef` but both classes hold nodeRef PRIVATE (PersonNode:80, OrganizationNode:37) — a private field does not satisfy a public interface member; since the paint path never reads view.nodeRef (uses the key), drop nodeRef from the interface OR expose a public getter; (b) the rewrite must replace BOTH instanceof branches (:236 AND :261) and declare OrganizationNodeView `implements InteractiveNodeView` so org-node hover is not dropped — it already has the methods, mechanical; (c) related-dim id-set at :255 must also widen to the interface.
DECISION B2: RESOLVED (try/catch → fallback PersonNodeView + warn-once; fallback data available at call site). CLOSED. Note: extend the same try/catch to the reconcile destroy() call (see Q2).
DECISION N1: RESOLVED (mark-and-sweep in nodeViewFactory.ts, survives scene.clear, sweep after build under isRenderCurrent). CLOSED. Note: hook must cover BOTH staff entry paths (addStaffPositions canvas + renderPositionGrid).
DECISION N3: RESOLVED (row 12 — simple-fn recreate destroys old root children). CLOSED.

DEFENSE: Q1 CLOSED (B2, row 10). Q2 CLOSED-with-note (containment established; must also wrap destroy() in sweep — not architecture). Q3 CLOSED (epoch-guarded sweep + id-keyed pool + explicit reappear→create). Q4 CLOSED. Q5 CLOSED.

No remaining BLOCKING findings; 3 non-blocking implementation notes.
GATE: GREEN
