claude-opus-4-8

NEXT: read `git --no-pager diff` of packages/core/src/staff_router.rs and packages/core/tests/multi_source_parent.rs; confirm types.rs untouched.

FACT: types.rs NOT in diff (grep count 0) → WASM boundary untouched, no build:wasm needed. CONFIRMED.
FACT: cargo test -p org-hierarchy-core = 218 unit + 9 integration pass; clippy --all-targets clean (no -D warnings firing). Matches CONTEXT.
FACT: frame_intrusion_count removed from router import but STILL used by staff_routes.rs:644/863 and staff_clearance.rs:68 → not dead code. Router now does its own frame loop with containment exemption + clearance.
FACT: MIN_CLEARANCE_PX=8.0 (pub const, line 34). Code clearance uses MIN_CLEARANCE_PX everywhere (route_stats_detailed:241, build_corridor_grid:436-439, astar pad:1080). No test-only clearance module. Tests use literal 8.0 == the const (acceptable).
FACT: valid_frame (line ~353): no unwrap/panic; NaN rejected via is_finite + ordered comparisons false; overflow guarded via abs<MAX/4 on derived x+w,y+h. Idiomatic. contains_endpoint: full-card containment, before padding.
FACT: astar obstacle slice: pc built from cards then wrappers appended; `if matrix_blocked &pc[..] else &pc[cards.len()..]` → wrapper-only slice when card matrix clear. cards.len() == card Pc count. Correct.

SPEC MAP (frames scope), each red-if-deleted:
1 detour: wrappers_foreign_container_detour_has_clearance (foreign 150,180,100x100 intersects straight x=200 route; neither endpoint contained → detour; asserts !failed, all_ortho, route != empty-baseline, every seg >=8px).
2 single self-excl: wrappers_single_and_nested count=1 (outer contains card a fully).
3 nested self-excl: same test count=2,3 (inner nested in outer, both contain a; target contains b).
4 clearance margin: foreign_container (>=8px) + internal_elbow (>=8px).
5 NaN/degenerate skip: wrappers_invalid_geometry 7 cases (NaN x/y, Inf w, -Inf h, zero w, neg h, MAX x+w overflow) assert exact parity w/ no-frame baseline. MAX+overflow case is feature-dependent (would corrupt grid without valid_frame) → anchors red-if-deleted.
6 parity-no-wrappers: wrappers_no_frames_preserves_straight_route + invalid-parity.
7 honest failure: wrappers_straddling_endpoint (frame 190,60,40x80 contains start PORT but not full card a[180..220] → not self-excluded → boxes source → failed=true). Defends full-card (not point) containment semantics.
8 internal elbow proximity rip-up: wrappers_internal_elbow_near_foreign_frame_is_rerouted (bus y=240, foreign y=244 4px below → proximity flags → rerouted, >=8px after).

FACT: through_foreign doc updated to "penetrates a foreign frame or violates its minimum clearance" — matches new proximity behaviour (doc fixed in same diff).

REBASELINE: crossings 1→0 in two integration tests — per CONTEXT already REBASELINE-OK by geometry judgment (frame-aware A* routes baseline at 0 crossings); not redone.
TURNS-BEFORE-LEX: reshaped multi_source_parent_prefers_fewer_turns_before_lexicographic_order genuinely has UNEQUAL turns (h00=16, h01=14) and eval selects h01 (lex-LATER, fewer turns) → proves turns dominates lex, not true-without-feature. Renamed *_astar_converges_on_lexicographic_tie covers the equal-turns tie (d0=h00). Split is honest; coverage preserved.

SCOPE: T113-collapsed-grid not referenced anywhere in the diff → cleanly deferred, no half-implementation. Frames-only scope; parity holds.

No true-without-feature assertion found. All new asserts compute from real geometry or exercise selection that only passes with the feature.

VERDICT: GREEN.
