claude-opus-4-8

# GATE-2 (plan-critique + plan-defense) — R5 marquee multi-select

NEXT: read grounding code (DiagramRenderer stage handlers, selection.ts, OrgHierarchyDiagram selectMany, InteractionStore) to verify plan claims against reality.

## FACTS (verified against code)

FACT: Drag-pan on EMPTY background already exists at stage level — PixiHost.bindPan (packages/sdk/src/render/PixiHost.ts:369-388): `stage.on('pointerdown')` → `Viewport.beginPan`, `globalpointermove` → `movePan`, pointerup/cancel → `endPan`. Left/middle button (e.button 0|1). Nodes stopPropagation so ONLY background reaches stage.
FACT: personInteractions.ts:188-193 comment states explicitly "Falling through without stopPropagation lets the stage pan instead, which is what the same gesture means when there is no card to grab" — i.e. empty-background LEFT-DRAG = camera pan TODAY (host-relied behavior).
FACT: Existing empty-click deselect is layers.root.on('pointertap') → options.onCanvasClick (DiagramRenderer.ts:918-921) → OHD onCanvasClick (OrgHierarchyDiagram.ts:1055-1060) = applySelection(null)+repaintSelection. Pixi pointertap fires on pointerup over same target regardless of drag distance.
FACT: tap-after-drag clobber is a KNOWN problem already solved for person drag via `tapAfterDrag` flag (personInteractions.ts:124-159): "pointertap fires after pointerup ... every completed drag also selected a card ... found in the browser (T91)". Marquee has NO equivalent suppression for the background pointertap/onCanvasClick.
FACT: OHD.selectMany (OrgHierarchyDiagram.ts:1858) is REPLACE-only (applySelections). No additive variant; Shift-union must be computed in the facade. InteractionStore has replaceMany (state/InteractionStore.ts:38) but no selectMany/additive. Plan's §2 reference "InteractionStore.selectMany" is inaccurate — it's OHD.selectMany + manual union.
FACT: Plan cites ONLY `layers.root.on('pointertap')` as grounding; neither plan nor spec mentions panning/camera anywhere. The stage-level pan gesture is invisible to the plan.
FACT: listNodeBoxes → scene.listBoxes() (DiagramRenderer.ts:660-662) returns world boxes independent of LOD → far-LOD hit-test sound (check 4 OK).

## FINDINGS

[BLOCKING] F1 — gesture collision with existing drag-pan. Marquee claims the exact input (left-button drag on empty background) that TODAY pans the camera. Plan has no mechanism to suppress pan under marquee, no acknowledgment of the tradeoff (opting into marquee removes left-drag-pan for the host — a regression for the ШПС host that navigates by pan), and no modifier/alt-gesture decision. If both run, camera pans while rect is drawn AND world-rect geometry corrupts (start captured under old camera, current under moved camera). This is the D1-grade host-visible change the review must catch. R5-B cannot be built correctly until resolved (marquee suppresses pan via stopPropagation on layers.root? pan moves to modifier/middle-button? marquee behind a modifier?).

[BLOCKING] F2 — spec AC6 vs plan contradict on opt-in. Spec AC6: "без host-стилізації рамка невидима, але вибір працює (логіка SDK)" = selection works silently without onMarquee. Plan §5 + acceptance row 6: "без onMarquee → нічого (байт-у-байт)". Opposite contracts. The plan's choice (nothing without onMarquee) is the SAFE one and the correct D1 lesson, but AC6 is left stale — a test writer following AC6 reintroduces the silent host change. Reconcile: update spec AC6 to match opt-in.

[BLOCKING] F3 — pointertap/onCanvasClick clobbers marquee selection. After a real marquee drag ends on empty background, Pixi fires pointertap on layers.root → onCanvasClick → applySelection(null), wiping the just-made marquee selection. The codebase ALREADY hit this (T91 tapAfterDrag). Plan's AC4 covers click→deselect but never states suppressing onCanvasClick after a genuine drag. AC1∩AC4 cannot both hold without this. Addressable inside R5-B but must be in the plan.

[non-blocking] F4 — two competing thresholds. Pixi's internal tap detection is independent of the marquee click-vs-drag threshold (AC4 / R5-A). They can disagree on borderline moves. Plan should make the marquee threshold authoritative and gate onCanvasClick on it.

[non-blocking] F5 — world-start must be captured once in WORLD space. For zoom/pan mid-drag robustness, start point must be stored in world coords at pointerdown and current re-projected each move. Plan says "world-rect із drag" but doesn't pin this; if start is screen-space it corrupts under any camera change.

[non-blocking] F6 — onMarquee not stated as isolated. It fires every frame; a throw mid-drag could strand gesture state. OHD has callHostCallback wrapper (used at :1057); plan should route onMarquee through it.

[non-blocking] F7 — §2 reuse row mislabels OHD.selectMany as additive/InteractionStore. It is replace-only; Shift-union computed in facade. §4.1 onSelect(ids, additive) is fine but the union logic is new code, not pure reuse.

[non-blocking] F8 — §5 internal muddle: first bullet "sink ставиться завжди" then clarification overrides to opt-in. Reads contradictory even though resolved; tidy to one statement.

## DEFENSE 5 Qs
1 malformed (zero-area/off-canvas/NaN): CLOSED-partial — rectFromDrag pure normalize covers zero-area/1px; NaN/off-canvas clamp not stated (minor, F5-adjacent).
2 dependency failure (onMarquee throws mid-drag): OPEN — F6, not isolated in plan.
3 races/repeat (rapid, up-no-move, cancel, zoom mid-drag): OPEN-partial — up-no-move=AC4, cancel=AC5, but zoom/pan-mid-drag geometry (F1/F5) unresolved.
4 empty/boundary (0 nodes, cover-all, 1px): CLOSED — pure hit-test; 0 nodes→empty replace→deselect.
5 rollback (no onMarquee byte-for-byte; revert): CLOSED modulo F2 — gated on sink attachment, revert R5-*.

GATE: RED (F1, F2, F3 blocking open).

## REV.2 RE-CHECK (coordinator request)

F1 (pan collision) — CLOSED. Trigger moved to Shift+left-drag; plain left-drag=pan untouched; pan suppressed (stopPropagation pre-beginPan) only when Shift AND sink≠null. §1 rev.2 cites PixiHost.bindPan:369-388 correctly. Plain-drag pan is never touched. Sound.

F2 (AC6 contradiction) — CLOSED. spec AC6 rewritten to opt-in (nothing without onMarquee; Shift+drag pans byte-for-byte); plan §5 single opt-in formulation; new AC8. Consistent.

F3 (pointertap wipes selection) — CLOSED. §1 + §4 R5-B add tapAfterDrag suppressing onCanvasClick after a genuine marquee drag (T91 precedent personInteractions.ts:124-159); row 12. Addressable at plan level.

[BLOCKING] F1b (NEW — introduced by the F1 fix) — Shift is overloaded as BOTH the marquee trigger AND the additive modifier, making the replace-branch unreachable and the spec self-contradictory.
- Plan §1/§4: "sink.onSelect(ids, additive=Shift)". But AC8 requires Shift held to START a marquee at all → at release additive=Shift is ALWAYS true → marquee is ALWAYS additive, never replace.
- spec AC2 + user-scenario 2 still say "without Shift — replaces / with Shift — adds" (the OLD plain-drag model). spec user-scenario 1 ("тисне на порожнє й тягне", no Shift) is now a PAN per AC8, not a marquee — the scenario is unreachable as written.
- Acceptance rows 1 & 10 ("drag рамкою"/"Shift+drag" → selected = exactly those nodes, replace semantics) contradict row 2 (additive). All three require Shift to even begin, so replace-vs-additive cannot be disambiguated.
- Code basis: isSelectionToggleModifier (selection.ts:72-75) treats ctrl/meta/shift all as toggle; the plan singled out Shift as additive=Shift, but Shift is now consumed by the trigger. A second modifier (Ctrl/Cmd) would be needed to express replace-vs-additive — the plan picks none.
- Resolution needed: either (a) marquee is always additive and AC2/scenario-1-2 are rewritten to drop the replace branch (and owner accepts "marquee can never clear an existing selection"); or (b) a distinct modifier disambiguates (e.g. Shift=trigger+replace, Shift+Ctrl=additive), and AC2/§4 updated; or (c) revisit the trigger. spec user-scenarios 1-2 were NOT updated to the Shift-trigger model and still describe plain-drag marquee — stale and contradictory.

## DEFENSE 5 Qs (rev.2)
1 malformed: CLOSED-partial — F5 world-start captured, rectFromDrag normalize; NaN/clamp still unstated (minor).
2 dependency failure: CLOSED — F6 onMarquee via callHostCallback, row 14 throw isolation.
3 races/repeat: CLOSED-mostly — F5 world-start (row 13) covers mid-pan/zoom; cancel/up-no-move via AC5/AC4 (pointercancel/pointerupoutside wiring implied by AC5 null, not row-explicit).
4 empty/boundary: CLOSED.
5 rollback: CLOSED — §5 opt-in no-op without onMarquee; revert R5-*.

GATE: RED (F1/F2/F3 closed; new F1b blocking — Shift overloaded, AC2⊥AC8, spec scenarios 1-2 stale).

## REV.3 RE-CHECK (F1b)

F1b (Shift overloaded; replace-branch unreachable; stale scenarios/AC2) — CLOSED.
- Resolution: marquee is now ALWAYS additive, roadmap-grounded ("Shift-клік або рамка — мультивибір" = add). There is no replace branch, so nothing is unreachable.
- spec user-scenarios 1-3 rewritten to the Shift-trigger model (1: Shift+empty-drag adds; 2: marquee adds, replace=node-click / clear=empty-click; 3: no-Shift drag=pan). No stale plain-drag scenario remains. Consistent with AC8.
- spec AC2 rewritten: always additive, no replace branch, owner-flagged. Consistent.
- plan §1/§4/§4.1: `sink.onSelect(ids)` — boolean dropped; facade always does Shift-union (F1b/F7). Seam signature consistent across §1, §4 R5-B, §4.1.
- acceptance rows 1 (additive-from-empty → {those 2}), 2 (A + Shift+drag B → {A,B}), 10 (result additive) — mutually consistent; no replace row to contradict.
- Semantics coherent: Shift+click toggles (can remove), Shift+marquee only adds — reasonable asymmetry, roadmap groups both as multi-select; under the owner-review umbrella already flagged.

Residual (non-blocking wording nits, not gate-holding):
- AC1 (spec:20) still says "selectMany/store"; §4 R5-C row still says "selectMany/toggle (Shift→додати)". selectMany is replace-only (F7); the authoritative path is Shift-union (§2/§4.1). Wording is stale but not contradictory (marquee always carries Shift). Tidy at implement time.

Owner-review flags (roadmap-grounded, NOT blocking per gate): F1 gesture model (Shift+drag trigger) and F1b always-additive ("marquee cannot clear selection"). Both explicitly carried to push-time owner review.

## DEFENSE 5 Qs (rev.3) — unchanged from rev.2
1 CLOSED-partial (NaN/clamp minor), 2 CLOSED, 3 CLOSED-mostly, 4 CLOSED, 5 CLOSED.

GATE: GREEN (F1/F2/F3 and F1b all closed; residuals are non-blocking wording nits + two owner-review flags).
