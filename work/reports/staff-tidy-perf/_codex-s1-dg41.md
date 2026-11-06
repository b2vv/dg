NEXT: Read approved S1 plan, diagnosis, critique, and repository guidance; inspect existing test module. All code changes restricted to cfg(test).
FACT: Read rev.2 plan and diagnostic evidence; production routing helpers and cfg(test) module located.
NEXT: Read exact routing and fixture construction, verify clean branch and checkpoint scope.
FACT: Correct branch; packages clean. Existing unrelated untracked reports left untouched. Existing 500 fixture is det-only; test module begins at 1652.
DECISION: S1 READY under approved rev.2 GREEN critique; sole source writer, test-only scope, no public/API boundary changes. Use direct private-helper calls for coverage.
NEXT: Build test-only routing reconstruction and coverage fixtures.
FACT: Rev.2 critique GREEN confirmed. cap breaks on pop 250001 (after 250000 processed); goal<0 also follows exhausted search.
NEXT: Add output-derived RouteInput reconstruction and a frozen test search observer, comparing observed routes with production routes.
FACT: Added 491-position shared-CEO scene, retained det-only builder, compact golden helper, metadata reconstruction, and frozen cfg(test) routing/search observers checked against production output.
NEXT: Measure initial scenes; construct explicit repair and cap/fallback scenes.
FACT: mock3 measured nx=452 ny=132 det=42 ast=8 calls=8 pops=44517; det-only nx=4267 ny=67 det=499 ast=0 calls=0. Small scenes generated and passed.
NEXT: Wait for realistic coverage run and repair probe; add synthetic capped search sequence.
DECISION: Cap/fallback coverage uses router-level synthetic full-result scenes: successful call, top-row unreachable target, successful call. All endpoint coordinates exist; large open grid forces cap, small grid exhausts.
NEXT: Validate cap assertions and capture repair candidate once current runs finish.
FACT: First repair candidate mock3 + secondary acc→s1 succeeds: pass0 bad=4, reroutes=9. No further candidates needed; probe replaced by asserted default golden test.
NEXT: Generate repair and cap/fallback goldens, then measure debug cost.
FACT: Repair fixture permanently asserts nonempty pass-0 bad, positive reroute count, and calls=ast+reroutes. Cap fixture asserts pop count 250001 and no_goal, with successful calls before and after.
NEXT: Collect completion and checkpoint current progress.
FACT: Realistic measured nx=3388 ny=132 det=420 ast=80 calls=396 pops=42734845 pass0_bad=225 reroutes=316 caps=82; full observed golden release run passed (73.96s including parallel small tests).
FACT: Synthetic cap sequence pops 222/250001/195, cap only middle; exhausted fallback sequence pops 30/61/29, no cap. Both goldens pass.
DECISION: Separate expensive routing observer from large golden comparisons so debug timing measures golden tests themselves; coverage observer remains explicit release test.
NEXT: Generate repair golden; run combined debug large goldens and apply 3-second rule.
FACT: Native checkpoint succeeded: ab77a59680927cc40399302e6a3789d0-1-e3c4648d1430. Author checks only; independent slice review remains with the plan coordinator.
NEXT: While debug measurement runs, inspect test-only diff and prepare golden red-check.
FACT: Red-check changed one mock3 edge point x by +1; golden_small_scenes failed as required (exit 101), then fixture restored byte-for-byte via finally. Raw log /tmp/dg-s1-red.log.
FACT: Production prefix through cfg(test) module boundary is byte-identical to HEAD (55373 bytes).
NEXT: Finish debug measurement, mark large goldens ignored if required, run full checks and quiescent release harness.
FACT: Red-check restored fixture; clippy launched on current test-only diff. Full raw diff saved /tmp/dg-s1-source.diff.
NEXT: Collect clippy and debug timing; perform release measurements only after all cargo processes finish.
FACT: Current diff hunks start at new lines 1858,1892,1902; cfg(test) module spans 1652–2546, all hunks inside. No production prefix difference.
NEXT: Address any lint findings, then freeze source for final validation.
FACT: cargo clippy --all-targets -- -D warnings passed (exit 0). Debug realistic golden still running; no release timing started.
NEXT: Await combined debug timing, then ignore both large goldens under N8 and run default tests.
FACT: Process inventory finds only our debug golden cargo command as an actual cargo build/test; other substring matches are cargo-named project services. Load at interim check 8.43/9.35/7.93, not an idle machine.
NEXT: Wait for debug golden completion; do not overlap release timing.
DECISION: Combined debug run already exceeds N8 3s threshold; both large golden tests marked ignored with explicit per-slice release-run reason. Measurement continues on previously compiled binary for exact duration.
NEXT: Run default tests, clippy and fmt on final source after measurement completes.
FACT: Final default cargo test/clippy/fmt sequence launched after ignore annotations. Debug threshold run overlaps short validation activity; its timing is a suite-cost decision, not isolated performance evidence.
NEXT: Preserve final gate logs and await debug completion before release preflight.
NEXT: Collect final suite results; prepare durable S1 evidence directory.
FACT: Durable raw coverage/red-check logs copied to s1-evidence/. Golden format is compact serde_json::to_string(full StaffTidyResult), UTF-8, no trailing newline; read from CARGO_MANIFEST_DIR. Explicit regeneration only DG_TIDY_GOLDEN_WRITE=1. S2–S4 must not regenerate/edit fixtures.
FACT: Scene counts captured at unchanged production HEAD 0a2b1a8:

| Scene | positions | nx | ny | det | ast | A* calls | pops | pass-0 bad | reroutes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| det_only_500 | 500 | 4267 | 67 | 499 | 0 | 0 | 0 | 0 | 0 |
| realistic | 491 | 3388 | 132 | 420 | 80 | 396 | 42734845 | 225 | 316 |
| mock3 | 50 | 452 | 132 | 42 | 8 | 8 | 44517 | 0 | 0 |
| repair (mock3 + secondary acc→s1) | 50 | 452 | 132 | 42 | 9 | 18 | 506158 | 4 | 9 |
| empty_departments | 0 | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| single_position | 1 | 14 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| two_departments | 2 | 45 | 29 | 0 | 0 | 0 | 0 | 0 | 0 |
| cap_sequence (router-level) | 3 | 501 | 501 | 0 | 3 direct calls | 3 | 250418 | N/A | N/A |
| goal_fallback_sequence (router-level) | 3 | 5 | 5 | 0 | 3 direct calls | 3 | 120 | N/A | N/A |

DECISION: Synthetic router scenes serialize a complete StaffTidyResult assembled from the explicit cards and real astar output; they are direct private-router unit scenes, not compute_staff_tidy_layout inputs. Endpoint coordinates all exist; target on top row cannot be entered downward. Middle call fails after 250001 pops (250000 processed budget) in cap scene; small scene exhausts after 61 pops. Calls before/after succeed. Frozen S1 observer invokes the same internal helper functions and its output is checked against production astar on every observed call. Full scene observed routes are additionally checked against compute_staff_tidy_layout output.
NEXT: Complete full cargo suite and exact debug measurement; run min-of-seven release baseline after no competing cargo.
FACT: All 208 default unit tests passed, four intentionally ignored (two large goldens, routing coverage observer, perf harness). Existing integration tests are still running.
NEXT: Await integration/debug completion before baseline.
FACT: Final cargo test passed: 208 unit + 8 integration, 4 ignored, 0 failures; unit 7.93s, integration 52.17s. Final clippy/fmt sequence completed.
NEXT: Finish debug large golden measurement and release preflight.
FACT: Final clippy exit 0; rustfmt --check output empty, exit 0. No remaining source fixes required.
NEXT: Await exact large debug timing; benchmark remains pending.
FACT: Combined debug large goldens PASS, test runtime 235.54s (wall 235.62s). Both ignored under N8; release run required every subsequent slice.
FACT: Immediately before perf, pgrep -fl cargo showed only unrelated cargo-name/path matches; pgrep -x cargo found none. Load average 8.00/8.61/7.91; no competing cargo, but background machine load is nonzero.
FACT: Initial pre-perf append used a repo-relative path from packages/core and failed; corrected here immediately. Harness itself launched successfully in packages/core; no concurrent test/build activity started.
NEXT: Await release min-of-seven harness, then finalize evidence and checkpoint.
FACT: Final diff and SHA-256 snapshot persisted in s1-evidence/source-test-only.diff and snapshot.json; production prefix unchanged, all hunks inside cfg(test).
NEXT: Finish performance harness and append final report.
FACT: Release harness det_only_500 min-of-7=354.683ms. Realistic iterations still running; no other agent build/test launched.
NEXT: Collect realistic/mock3 baselines and final exit.
FACT: Release realistic min-of-seven is still running; goldens, red-check, debug decision, and validation complete.
NEXT: Await timing result; preserve constraints unchanged.
NEXT: Complete the specified seven realistic runs without shortening the benchmark; no validation remains pending.
FACT: Release harness completed successfully, exit 0, 170.21s; exact per-scene baselines preserved in s1-evidence/dg-s1-perf.log.
NEXT: Append final six-section report, verify repository scope, checkpoint completion.

## Final S1 report — 2026-11-06

### 1. Done

Implemented S1 only on `feat/t126-staff-rust-geometry`, unchanged HEAD `0a2b1a8af8ca177c78d754ded70c42eebe27de73`. Source edits are exclusively in the existing `#[cfg(test)] mod tests` of `packages/core/src/staff_tidy_layout.rs`; nine golden fixture files added. Existing unrelated untracked reports untouched. No commit/push, branch/worktree operation, dependency change, WASM/build command, SDK/pkg/dist mutation, or production optimization.

`tidy_large_realistic()` has one shared CEO, one organization, ten shared departments, and ten cohorts reusing mock3 department trees and original cross/secondary links: 491 positions, 500 edges. It is not ten isolated organizations. `realistic_routing_coverage` asserts ast≥50 and nx≥2000 (actual 80 and 3388); full measured scene counts are in the table above and raw logs in `s1-evidence/`.

### 2. Tested scenarios / acceptance

- **A1:** Full `StaffTidyResult` byte goldens: `mock3.json`, `det_only_500.json`, `realistic.json`, `repair.json`, `cap_sequence.json`, `goal_fallback_sequence.json`, `empty_departments.json`, `single_position.json`, `two_departments.json`. Compact serde_json, no trailing newline. Fixture directory: `packages/core/tests/fixtures/staff_tidy_golden/`.
- **A6:** `golden_repair`: mock3 + secondary acc→s1; pass-0 bad=4, reroutes=9, initial ast=9, total calls=18. Both pass-0 bad and reroutes explicitly asserted. Test-only frozen routing observer executes remove→A*→add using the real internal helpers and checks resulting edges against production output. First candidate worked; no failed search attempts concealed.
- **A7:** `golden_cap_and_fallback`: synthetic router-level full results, three sequential real A* calls each. Large sequence has middle call capped at pop 250001 (250000-pop processing budget), with successful calls before and after. Small sequence exhausts its search at 61 middle-call pops and reaches goal<0 without cap. All source/target coordinates exist; this is not the earlier missing-coordinate fallback. Every real search result is checked against the frozen counted S1 observer. Both tests remain default.
- **A8/N1:** Regeneration only via `DG_TIDY_GOLDEN_WRITE=1`; module comment forbids regeneration/editing in S2–S4. Golden SHA-256 inventory in `s1-evidence/snapshot.json` freezes this uncommitted S1 snapshot for coordinator review.
- **Red-check:** changed one mock3 edge point x by +1; `cargo test ... golden_small_scenes` failed with exit 101; restored exact original bytes in a `finally` block. Subsequent default suite passed. Log: `s1-evidence/dg-s1-red.log`.
- **N8:** Combined debug large-golden execution: **235.54 s** test runtime / **235.62 s** command wall time, both passed. Therefore both large goldens are ignored with reason strings requiring release execution every S2–S4 slice. Expensive `realistic_routing_coverage` is also explicitly ignored; small, mock3, repair and cap/fallback goldens remain default. Brief validation activity overlapped this debug cost measurement; it is not an isolated perf number, and the >3s decision is unambiguous.

Final validation at the snapshot in `s1-evidence/snapshot.json`:

| Command (packages/core) | Result |
|---|---|
| `cargo test` | PASS: 208 unit + 8 integration, 4 ignored, 0 failures; exit 0 |
| `cargo clippy --all-targets -- -D warnings` | PASS, exit 0 |
| `rustfmt --check src/staff_tidy_layout.rs` | PASS, exit 0 |
| `cargo test --release -- --ignored --nocapture staff_tidy_perf_baseline` | PASS, exit 0; 170.21s harness runtime |

For subsequent slices run both `cargo test --release -- --ignored --nocapture golden_large_` and `cargo test --release -- --ignored --nocapture realistic_routing_coverage` in addition to default tests. No regeneration environment variable.

### 3. Non-obvious findings / baseline

**Release-native S1 baseline, min of N=7:**

| Scene | ms |
|---|---:|
| det-only 500 | 354.683 |
| realistic 491 | 23742.814 |
| mock3 | 31.577 |

Before starting the harness, `pgrep -fl cargo` had no actual cargo build/test command (substring matches were unrelated cargo-named projects/services); `pgrep -x cargo` was empty. Load averages **8.00 / 8.61 / 7.91**. No agent validation/build ran concurrently with the perf harness. This is a baseline on a machine with background load, not an idle-machine or WASM claim.

The realistic scene is repair-heavy: 225 pass-0 bad edges, 316 reroutes, 82 capped searches, 42,734,845 total pops. Its high runtime is genuine baseline behavior, not a speed-up claim. The mandatory repair/cap paths exist and are golden-covered for the later S4 gate. Independent slice review remains the coordinator's responsibility; the checks here are author checks.

### 4. Screenshots / source-scope proof

Screenshots N/A (Rust test/fixture work, no UI change). `git diff -U0 packages/core/src/staff_tidy_layout.rs` is preserved as `s1-evidence/source-test-only.diff`. The cfg(test) module spans **lines 1652–2548**. All three hunks start inside it (1858, 1892, 1902); every hunk is within the module. The entire **55,373-byte production prefix** is byte-identical to HEAD, independently checked by Python against `git show HEAD:...`; SHA-256 recorded in `snapshot.json`. Package status contains only this Rust test-module edit and the new fixture directory. No SDK/pkg/dist change.

### 5. Verification walkthrough

Normal `cargo test` reads frozen files under CARGO_MANIFEST_DIR and compares exact serialized strings. Coverage scenes call private existing routing functions; no production counters or hooks were introduced. Large-scene goldens and the counted realistic observer are run explicitly in release on later slices. The ignored perf harness measures complete compute calls, seven per scene, and prints their minimum. Goldens were captured against the unchanged `0a2b1a8` production implementation.

### 6. Remaining work / decisions

S1 deliverables complete; no unresolved QUESTION. No performance optimization attempted. Next plan slice is S3 after coordinator review. Retain the nine frozen fixtures through S2–S4. The working-tree changes are intentionally uncommitted as requested.

### Post-deploy

N/A: no deployment, WASM build, shared dist write, or user-visible production change authorized or performed.

NEXT: Refresh native checkpoint at completion and hand the uncommitted S1 snapshot to the coordinator.
FACT: Final git diff --check passed. Native completion checkpoint exit 0 / OK: ab77a59680927cc40399302e6a3789d0-2-998cc2683224.
NEXT: Coordinator reviews the uncommitted S1 snapshot; no further S1 implementation pending.
