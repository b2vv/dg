claude-opus-4-8

NEXT: read spec.md, plan.md (rev.2 §6 acceptance rows 1-12), ROADMAP §R3 + D2, then the diff + untracked files. Map each acceptance row to a red-if-deleted test.

FACT: spec.md R3 = public staff-node Pixi view-factory, two levels (simple fn + retained {create→{root,update,destroy}}); SDK owns placement/transform/culling; host returns LOCAL coords; opt-in, no-factory = PersonNodeView byte-for-byte.

FACT: new files = render/nodeViewFactory.ts (types + normalizeNodeView union→retained + NodeViewPool mark-and-sweep + try/catch warn-once) and render/interactiveNodeView.ts (InteractiveNodeView interface + isInteractiveNodeView guard + HostNodeView wrapper).

FACT row-by-row (plan §6 table 1-12) → red-if-deleted test:
- #1 simple factory, SDK places wrapper, LOCAL root → DiagramRenderer.nodeview.test.ts:23-36 (factory x3, wrapper≠PersonNodeView, root.parent=wrapper, root.position.x=0, wrapper.x/y==getNodeBox). Both grid+staff.
- #2 retained update by id → .nodeview:40-67 (create x3, a.update x1, same root) + nodeViewFactory.test.ts:51.
- #3 destroy on vanish/clear → .nodeview:62/64 + factory:57/62.
- #4 local coords + SDK placement → .nodeview:33 (root.x=0) + :35 (wrapper=box); AC3 ctx has no coord setters (NodeViewContext = readonly lod+theme only) interactiveNodeView/nodeViewFactory.ts:13-16.
- #5 no nodeView byte-for-byte → .nodeview:113-122 (absent→PersonNodeView, clear restores). Default call args to PersonNodeView.create unchanged in diff (both staff+grid paths) → existing PersonNode golden stays guard.
- #6 hover/selection host visual → .nodeview:85-111 (accent on wrapper, root.position.x=7 preserved, root.alpha=1, selection hides accent).
- #7 transition → .nodeview:136-167 (wrapper moves to box.x, root.x stays 0, update x1).
- #8 type Container → factory:82 toBeInstanceOf(Container).
- #9 B1 hover via InteractiveNodeView + PersonNodeView/org not broken → .nodeview:85 (host) + DiagramRenderer.interaction.test.ts (person dims/related-dim) + OrganizationNode.interaction.test.ts (org hover). Both PersonNodeView & OrganizationNodeView `implements InteractiveNodeView` (typecheck clean); applyInteraction keeps staff-only dim via ref?.kind==='position'.
- #10 B2 throw → fallback, render not aborted → .nodeview:70-83 (per-seat fallback, warn once, 3 children) + :124-134 (retained update throw) + factory:65-75.
- #11 N1 reconcile sweep → .nodeview:40-67 + factory:33-63.
- #12 N3 simple-fn recreate destroys old children → factory:13-31 + :125-135.

FACT: targeted tests green — all 18 R3 cases pass (nodeViewFactory/DiagramRenderer.nodeview/OrgHierarchyDiagram.nodeview). CONTEXT SDK 186/0 confirms refactored instanceof→isInteractiveNodeView keeps existing person+org hover suites green (red-if-broken guards).

FACT owner-decision conformance: two models (SimpleNodeView|RetainedNodeView union normalized at nodeViewFactory.ts:34); host LOCAL / SDK places (wrapper placement DiagramRenderer.ts:1510, root never repositioned); opt-in (nodeView? optional, null→byte-for-byte, OrgHierarchyDiagram.ts:524); return Container (not Graphics); no string DSL. Plan §3 contract matches impl exactly. Ergonomics flagged for owner — code == plan.

FACT: R3-C public surface — index.ts exports 5 types; USAGE.md §"Custom staff-position visuals" documents local-coords invariant, SDK-placement, two forms, retained pool. check:docs green (CONTEXT).

FACT non-blocking observations:
- Export (AC5 sub-claim "export works with host visual") has NO dedicated test. PNG export renders Pixi stage → wrapper renders structurally; SVG export reconstructs from data model (export/*.ts has no PersonNodeView dep) → host visual simply absent from SVG, but that is inherent to the data-driven SVG path, not an R3 regression. Not broken.
- Diff mixes R2 facade methods isSelected/isHovered/selectNode + their USAGE §"Host-created React overlay interaction" — out of R3 scope (R2 overlay), documented, no impact on R3.
- HostNodeView.destroy detaches hostRoot before super.destroy (interactiveNodeView.ts:60-63) so pool owns root lifecycle, wrapper owns accent — clean ownership split; registerMediaView gated to PersonNodeView only (DiagramRenderer.ts:1525/1664).

DECISION: every acceptance row 1-12 has a red-if-deleted test; owner decisions conform; no true-without-feature, no contradiction. VERDICT GREEN.
