claude-opus-4-8

NEXT: read full R3 diff (tracked) + untracked new files (nodeViewFactory.ts+test, interactiveNodeView.ts, nodeViewFactory.test.ts), then judge STANDARDS (KISS, .js imports, import type, no ForTests, dead code, WASM) and the CRITICAL D1 generalization (three widenings, implements, red-if-deleted hover tests).

FACT: D1 generalization — all THREE widenings present in DiagramRenderer.ts diff:
  (1) bindInteraction (L263) isInteractiveNodeView(view); (2) positionIds set (L282) isInteractiveNodeView && ref?.kind==='position'; (3) paint loop guard (L289) + hoverAlpha (L292) isInteractiveNodeView / ref?.kind==='position'. Semantics equivalent to old instanceof set (org ref kind filtered out).
FACT: PersonNodeView implements InteractiveNodeView (PersonNode.ts); OrganizationNodeView implements InteractiveNodeView (OrganizationNode.ts). typecheck clean per context enforces lod/setHovered/setHoverHandler.
FACT: isInteractiveNodeView only ever applied to registered views (wrappers/default nodes); bare host root never directly in scene → no false-negative path.
FACT: Default-path hover regression guards are PRE-EXISTING unmodified DiagramRenderer.interaction.test.ts — person hover rings+0.45 dim (L39-82), org hover (L137-148,178-183). Red if default path regresses.
FACT: Generalization itself is red-if-reverted via DiagramRenderer.nodeview.test.ts L85-111 (host wrapper, non-PersonNodeView, must get accent + 0.45 dim — impossible under old instanceof PersonNodeView).
FACT: Fallback (try-catch→default+warn-once, render not aborted) red-if-deleted: nodeview.test L70-83. Sweep red-if-deleted: L39-68 (c.destroy once). No-leak: root survives re-render, destroyed on clearAll.
FACT: personInteractions binder generalized PersonNodeView→Container; body uses only node.on/.x/.y/.position.set — all Container API. Sound.
FACT: opt-in byte-for-byte: setNodeViewFactory(config.nodeView ?? null); nodeview.test L46-49 asserts null when omitted. Pool only built when factory truthy.
FACT: STANDARDS — .js import extensions on all new imports; import type / export type used; no ForTests in barrel (5 type exports); no dead code (requireContainer/HostNodeView/isInteractiveNodeView all used); WASM untouched in R3 scope; lint exit 0; 21 nodeView tests pass.
DECISION: no true-without-feature / masking tests found. normalizeNodeView unifies simple/retained without speculative abstraction; KISS acceptable (dense but minimal).
NOTE(scope): OrgHierarchyDiagram.ts diff also adds isSelected/isHovered/selectNode + USAGE React-overlay section — that is R2 surface, not R3 nodeView; documented in USAGE, check:docs green.
VERDICT: GREEN
