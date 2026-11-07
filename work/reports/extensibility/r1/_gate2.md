Model ID: claude-opus-4-8

NEXT: re-read plan rev.2 to verify B1 and B2 close.

FACT (rev.2): §1 lines 6-11 + §3 line 24/26 now DIM-ONLY — removes ONLY `view.lod !== 'far'` at :254; explicitly states setHovered/PersonNode/OrganizationNode NOT touched (files scoped to DiagramRenderer.ts only); no far hoverRing. This removes the legacy-path leak (B2) AND preserves success test interaction.test.ts:48 (setHovered untouched → ring still false at far).
FACT (rev.2): §3 lines 28-31 name DiagramRenderer.interaction.test.ts:186-206, flip far [1,1,1]→[1,1,0.45] as intended AC4, plus null-source far-hover test (B1). Line 24 names the interactionLines far-fallback (:257/:900, not null lastStaffChrome) — N1.
FACT (rev.2): acceptance rows added — #7 (0-related far, N2), #8 (unselected hovered near→far, N5), #3b (null-source far guard = real AC3, N3).

DECISION B2 CLOSED: dim-only, setHovered/node files untouched. Non-opt-in legacy path byte-for-byte; success test :48 preserved.
DECISION B1 CLOSED: flipped test named with new values as intended contract; null-source guard added.
DECISION Q5 (rollback) CLOSED: dim-only makes revert byte-for-byte for non-subscribers; §5 valid.
DECISION N1/N2/N3/N5 all handled (fallback named; rows 7/8/3b added).

Residual: none blocking. Minor — row 8 partly overlaps row 2 but distinct (unselected vs. selected); acceptable.

GATE: GREEN.
