claude-opus-4-8

NEXT: Read the 3 failing tests in packages/core/tests/multi_source_parent.rs (assertions + intent), then R11-A's git diff to staff_router.rs (frame obstacles + containment self-exclusion), then judge each.

FACT: Confirmed 3 failures via `cargo test -p org-hierarchy-core --test multi_source_parent` (native, no WASM). 5 pass, 3 fail — the exact ones in the brief.
FACT: git diff — only packages/core/src/staff_router.rs changed in core; staff_layout.rs (the multi-source selection argmin) is UNTOUCHED.
FACT: `crossings()` helper measures LINE-vs-LINE crossings only (route_stats with empty cards & empty frames) → it cannot by itself prove frame validity.
FACT: Built out-of-repo validator (scratchpad/val, path-dep on the crate) running compute_staff_geometry on the real fixture.
  - Production diagnostic on A* path: "A*: cross=0 over=0 card=0 near8=0 dept=0 ... marked=0 edges=50" → dept=0 (zero foreign-frame intrusions), marked=0 (zero residuals).
  - Independent dense sampler (exemption = full endpoint-card containment, same rule as R11): 0 foreign-frame violations; 55 ancestor-frame proximities (expected, routes legitimately exit their own nested frames).
  - Over-exclusion check: 0 suspicious cross-dept containments (no frame encloses a card that is not its own dept / ancestor) → containment self-exclusion only exempts legitimate ancestors in this layout.
FACT: Selection score = (cross, turns, combo) argmin with strict `<`; combo breaks exact ties lexicographically (h00 < h01). Unchanged by R11.
FACT: synthetic(&[2]) scene now: A* near → d0=h00, clean (cross=0 dept=0 excess=0 turns=6 marked=0); reversed input → d0=h00 (deterministic); detour (useAstar=false) → d0=h00. A* now CONVERGES with detour.

DECISION per test:
1. chooses_clean_attachment: baseline crossings 1→0, routes valid → IMPROVEMENT (rebaseline). Stale comment: "parent evaluation still improves the remaining crossing to zero" — baseline is now already 0.
2. tree_block_default_mock3: crossings 1→0, routes valid → IMPROVEMENT (rebaseline). Rationale comment "cross 6 → 1" now "→ 0".
3. prefers_fewer_turns_before_lexicographic: h01→h00. Rule-consistent (argmin unchanged; both heads now tie on (cross,turns) so lex picks h00; impossible for code to pick a worse-turns head). NOT a regression. CAVEAT: test loses its turns-before-lex discriminating power; rebaseline should re-purpose or reshape the scene.

VERDICT: REBASELINE-OK (with doc/intent caveat on test 3 and stale comments on 1 & 2).
