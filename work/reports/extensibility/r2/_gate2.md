claude-opus-4-8

NEXT: verify D1 InteractionStore + facade seam + AC3 mechanism against actual re-render path.

FACT: seam primitives all exist and match plan §4.1.
- InteractionStore (state/InteractionStore.ts): handlePointerSelect(50), setHovered(54, dedups on same ref), subscribe(65). Single source.
- Facade: subscribeInteraction (OrgHierarchyDiagram.ts:1840), setHovered (1846), handlePointerSelect via handleNodeSelect (797), select (1886). All present.
- Renderer reads the SAME store via setInteractionSource (1827) + subscribe paint (1832). onSelect/onHover from card → facade → this store → Pixi reflects. KEY CHECK 2 = SOUND (single source confirmed).
- InteractionState = {selected, primary, hovered} ONLY (interactionState.ts). No found/highlight → KEY CHECK 6 PASS (no emphasis duplication).

FACT: KEY CHECK 1 PASS (opt-in byte-for-byte). KEY CHECK 4 PASS (YAGNI). Scoping FAITHFUL.

=== RE-CHECK rev.2: AC3 mechanism — CLOSED ===
§1/§4.1 rev.2 name per-slot subscription + imperative refresh (FrameBackdrop pattern); interaction does NOT route through notifyPromoteSync('structural')→sync(). O(N) cheap id-checks, no listPromoteCandidates re-resolve. All defense Qs CLOSED. GATE: GREEN (rev.2).

=== RE-CHECK: HOST-WIRED topology correction ===

NEXT: verify who constructs the overlay + public primitives for the host-built seam.

FACT: topology correction is ACCURATE.
- createReactPromoteOverlay is constructed ONLY by the demo HOST (packages/demo/src/app/App.ts:701). SDK never constructs it; react/index.ts only re-exports. So rev.1's "facade passes interaction at overlay creation" had NO home — confirmed.
- R2-A is SHIPPED and matches the GREEN'd mechanism: seam type (createReactPromoteOverlay.ts:142-149: isSelected(id)/isHovered(id)/subscribe/select(id,mods?)/hover(id,on) | null), and InteractionSlot (198-228): per-slot subscribe, refresh only on own-id change (dedup 216), unsubscribe on unmount (225 — covers dispose + error-boundary drop). Absent interaction → passive card.

FACT (1) host-wired topology SOUND; single-source holds.
- Host builds the seam from facade public primitives: subscribeInteraction (1840), setHovered (1846), select (1886), getSelection (1852), getSelections — all read/write the SAME InteractionStore the renderer reads (setInteractionSource 1827). As long as the host wires through these (not a parallel store), single-source holds. Topology is sound.

FACT (2) AC3 clarification ACCEPTABLE.
- "hover adds no full rebuild": the new cheap path is InteractionSlot per-slot refresh; hover never reached the overlay before (setHovered → paint subscriber only, 1832). Confirmed new + cheap.
- "selection unchanged": onSelectionChange (353-358) → notifyPromoteSync() default 'structural' → sync() is PRE-EXISTING; the overlay already rebuilt on selection. R2 adds typed props on that existing rebuild and a per-slot accent refresh; it does NOT add a new full rebuild. At most one extra cheap per-slot refresh per selection (dedup'd). Accurate and acceptable.

FACT (3) R2-B / R2-C-demo — NON-BLOCKING items, nothing blocks:
- [non-blocking A] isSelected(ref)/isHovered(ref) are NOT public yet. R2-B must add them OR document deriving from InteractionState (via subscribeInteraction + getSelections/getSelection + hovered). Either keeps single-source. Plan §4 R2-B lists docs/USAGE.md — and check:docs REQUIRES any new public OrgHierarchyDiagram method in USAGE, so if isSelected/isHovered are added they MUST be documented or CI fails. Accounted for.
- [non-blocking B — mods path] The shipped seam carries select(id, mods?: SelectionPointerMods), but the mods-aware store method handlePointerSelect is PRIVATE (via handleNodeSelect 797); public select(node) (1886) is replace-only, no mods. So a host wiring additive/shift-select from a card must either (b1) get a NEW public mods-aware select from R2-B, or (b2) compose host-side via getSelections()+selectMany(). (b2) re-implements SelectionStore.handlePointerSelect logic host-side — a DX wart against R2's purpose. Not blocking (a public path exists and AC2 basic select works), but R2-B should prefer exposing the mods-aware select since the SDK already has it.
- [non-blocking C — plan text drift] plan.md §4 R2-B (line 33 "передати overlay'у interaction-sink … під opt-in") and §4.1 (line 39 "Фасад дає його під opt-in") still read FACADE-passes-to-overlay — the stale topology. Capability is correct (host-wired), but the plan artifact misdescribes seam ownership. Update to: R2-B = expose public primitives + USAGE wiring guidance; host builds & passes the seam; R2-C-demo = demo wiring. Library carries the capability (R2-A seam + R2-B primitives), so host-visible behaviour lives in the lib (AGENTS rule) — demo-only R2-C is fine.

DECISION: host-wired topology sound, single-source holds, AC3 clarification accurate. No blocking findings in R2-B/R2-C-demo. Three non-blocking items (expose isSelected/isHovered or document derivation; prefer public mods-aware select; correct plan §4/§4.1 topology wording).

GATE: GREEN.
