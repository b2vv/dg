Rust test rebaseline in packages/core. Branch feat/extensibility. English. No build:wasm. Allowed: cargo test/clippy, read. No external store. Append to work/reports/extensibility/r11/_impl-R11-rebase.md (append; first line NEXT:, labels; full cargo output no pipes; end STATUS line).

CONTEXT: R11-A made the A* router frame-aware (staff_router.rs). An independent review VALIDATED that 3 integration expectations in packages/core/tests/multi_source_parent.rs now legitimately changed (improvements, routes geometrically valid — dept=0, marked=0, no over-exclusion). Rebaseline them.

YOUR FILE (exclusive): packages/core/tests/multi_source_parent.rs (+ any new focused test there).

TASK:
1. multi_source_parent_chooses_clean_attachment_deterministically — the crossings assertion 1 → 0. Update the now-stale comment ("improves the remaining crossing to zero" / "6→1") to reflect baseline is now 0.
2. tree_block_default_mock3_head_is_ah_under_fin_deterministically — crossings assertion 1 → 0; fix the "dg38 … cross 6 → 1" comment to "→ 0".
3. multi_source_parent_prefers_fewer_turns_before_lexicographic_order — the selection d0 == h01 → h00 (A* and the detour router now converge; with both heads tied on (cross,turns) the lexicographic branch correctly picks h00). BUT this test was meant to prove "turns weighed BEFORE lexicographic" and now both heads tie on turns → it no longer exercises that branch. PRESERVE the coverage: reshape the scene (or add a NEW focused test) so one head genuinely has FEWER turns than the other and assert that head wins REGARDLESS of lexicographic order (turns-before-lex). If reshaping proves infeasible, rename this test to reflect it now asserts lexicographic convergence and add a clear comment that turns-before-lex coverage moved to the new test. Do NOT leave the ordering rule uncovered silently.

Run the FULL `cargo test -p org-hierarchy-core` → GREEN (paste full output). `cargo clippy` clean. Do NOT touch staff_router.rs or any non-test file. STATUS line last.
