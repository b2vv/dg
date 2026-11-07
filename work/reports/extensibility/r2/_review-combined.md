Model ID: claude-opus-4-8

NEXT: read spec.md, plan.md (rev.2 §6), then the R2 diff + untracked files.

FACT: R2 production surface verified.
- PromoteSlotProps gains selected/hovered/onSelect/onHover (createReactPromoteOverlay.ts:95-98); interaction?: seam added (139-147), null/absent keeps cards passive.
- InteractionSlot (createReactPromoteOverlay.ts:198-228): per-slot subscribe; `check` compares this slot's id only, refresh via local useReducer; NO sync()/listPromoteCandidates call. OverlayRoot renders InteractionSlot only when interaction present else plain component (285-291).
- buildSlots defaults selected/hovered=false, onSelect/onHover call options.interaction?.select/hover → no-op without seam (532-539).
- Facade: isSelected (OrgHierarchyDiagram.ts:1856), isHovered (1861) read interactionStore.list / state.hovered (same store renderer reads via setInteractionSource:1831-1834). selectNode (1906) → handleNodeSelect → interactionStore.handlePointerSelect + repaintSelection. subscribeInteraction (1844) emits on BOTH selection and hover (InteractionStore emit on setHovered:57 and selection change:17).
- Demo App.ts:701-708 builds interaction from public primitives (isSelected/isHovered/subscribeInteraction/selectNode/setHovered) and passes to createReactPromoteOverlay — facade does NOT create overlay.
- Pointer semantics (selection.ts:73 isSelectionToggleModifier) = ctrl|meta|shift → toggle else replace; matches USAGE wording "Shift does not select a range".

FACT: CRITICAL checks.
(1) AC3 per-slot: overlay test asserts resolve(listPromoteCandidates) NOT called + setPromotedNodeIds NOT called + only changed card re-renders on emit. Genuine, red-if-broken.
(2) opt-in byte-for-byte: passive test (undefined/null) — innerHTML identical, diagram.select not called.
(3) single source: r2 test — interaction.hover → rendererSource.getHovered() reflects; selectNode → repaintSelection([ref]). One store.
(4) host-wired topology: demo seam from facade primitives; overlay host-constructed. Confirmed.
(5) docs: isSelected/isHovered/selectNode documented USAGE.md §14 (1541-1569) with backticks.
(6) YAGNI: only selected/hovered/onSelect/onHover; no emphasis.

FACT: Tests green — SDK r2 3/3, overlay 44/44 (incl per-slot + 2 passive), demo 1/1. subscription cleanup verified: listeners 2→1 on setMaxPromoted(1), →0 on dispose.
FACT: Standards — import type used, .js extensions present, no ForTests in barrel (0), no dead code.

NON-BLOCKING: diff mixes a SECOND feature into R2-scoped files — nodeView (OrgHierarchyDiagram.ts:1,151,524; index.ts:1; USAGE §nodeView). It is the nodeViewFactory feature (untracked nodeViewFactory.ts + tests), NOT R2. Not an R2 defect; flag only so caller knows the diff is not R2-only.
NON-BLOCKING: demo seam hardcodes kind:'position' (App.ts:701). Acknowledged in plan §4.1; fine for staff-position near-view (only kind promoted). candidate.kind available if a kind-aware map is later needed.

DECISION: VERDICT GREEN. All 6 critical checks pass; AC3 cheapness and single-source are proven by genuine (not vacuous) assertions; opt-in is byte-for-byte; docs gate satisfied.
