NEXT: Inspect repository instructions, baseline source state, and measurement entry points before temporary instrumentation.
FACT: Correct branch; packages initially clean. Diagnosis only: skill fix/minimization phases excluded by explicit scope; use both prescribed fixtures.
NEXT: Read routing boundaries and test harness; establish release baseline without concurrent cargo.
FACT: Routing loops match H1–H4; sandbox process listing failed, retrying outside sandbox. No source modifications yet.
DECISION: Measure phase-level timers plus counters first; targeted per-segment timing separately to quantify observer overhead.
NEXT: Baseline release run and temporary probes.
FACT: Baseline cargo process is still running (session 81131); no concurrent measurement started.
NEXT: Await baseline completion before touching source.
FACT: No actual cargo build in process inventory; matches were cargo-named project services. Baseline command run; output /tmp/dg41-baseline.log.
DECISION: READY, small diagnosis scope, sole writer of staff_tidy_layout.rs; no product changes, no further owner decisions needed. Preserve original bytes before probes.
NEXT: Instrument phase boundaries, per-call counters, and mock3 ignored harness.
FACT: Uninstrumented 500 baseline 367.823 ms (7.36× budget), release test passed. Temporary probes added in one backed-up source file.
NEXT: Compile and run both fixtures sequentially three times; retain raw logs.
FACT: First instrumented run launched; timing output is buffered until compute ends to avoid per-call terminal I/O distortion.
NEXT: Check compilation and collect repeat runs.
FACT: Session checkpoint requested using current registered native identity and runtime.
NEXT: Finish repeated measurements.
FACT: First measured run completed; runs 2 and 3 executed sequentially. Checkpoint helper blocked by filesystem sandbox (no checkpoint claimed).
NEXT: Aggregate phase rows and counters, then target remaining search costs.
FACT: 500 has det=499 ast=0, no reroutes, 275829919 grid card tests; mask phase dominates. Mock3 has 50 positions, det=42 ast=8, no reroutes.
DECISION: H2/H3 cannot explain 500 fixture; targeted nested timers only needed for mock3. Preserve coarse probe version for evidence.
NEXT: Three targeted mock3 runs; quantify timer overhead versus coarse measurements.
FACT: Coarse measurements aggregated in /tmp/dg41-data.json; process check found no cargo/rustc competitor. Machine load average before repeats 7.51/6.46/6.33.
NEXT: Finish targeted probe and compare baseline-only timings.
FACT: All three coarse runs identical in counters: mock3 44517 heap pops, 45331 seg_usable calls, 787 masked calls; zero caps.
NEXT: Restore production implementation bytes and retain only a temporary total-time mock3 harness for baseline comparison.
FACT: Targeted search timers completed; baseline harness run underway. Checkpoint retried with authorized filesystem access.
NEXT: Finalize baseline comparison and source restoration.
FACT: Original source restored byte-for-byte using saved baseline (cmp exit 0). git diff --stat -- packages/ and git status --short packages/ both empty.
FACT: Session checkpoint succeeded: d0a00b0b821fa932fbf71d5dd5efb182-1-5bc88846fa71.
NEXT: Preserve raw measurement logs, append final report, and verify restored source with canonical tests.

## Final diagnostic report — 2026-11-06

### Done / scope

Measured release-native only at `0a2b1a8af8ca177c78d754ded70c42eebe27de73`, branch `feat/t126-staff-rust-geometry`. No optimization implemented. Only `packages/core/src/staff_tidy_layout.rs` was temporarily edited, then restored byte-for-byte. No dependency changes, build/wasm commands, branch changes, worktrees, commits or pushes.

### Tested scenarios / method

Three sequential runs of both fixtures using `cargo test --manifest-path packages/core/Cargo.toml --release wall_clock -- --ignored --nocapture --test-threads=1`. A temporary ignored harness called canonical `mock3_scene()` (50 positions). Additional three mock3 runs timed hot inner regions; additional three runs used original implementation plus harness-only total timing. All runs passed. Raw logs: `dg41-evidence/` beside this report.

Initial uninstrumented 500 baseline: **367.823 ms**. Later uninstrumented 500 min/median: **397.045 / 399.671 ms**; mock3 **31.906 / 33.445 ms**. Coarse probes gave 500 **364.226 / 366.892 ms**, mock3 **31.952 / 32.402 ms**. Timing drift (~9% for 500) means observer overhead cannot be isolated by subtraction; code generation, cache state and background load can contribute. No cargo/rustc competitor found in process checks; machine was not idle (load averages **7.51 / 6.46 / 6.33**). Do not interpret these as isolated-machine precision or WASM timings.

Timers use `Instant`; counters use local or thread-local storage. Rows were buffered and emitted with `eprintln!` after the internal total timestamp. Internal total spans entry through routing completion, excluding diagnostic printing and final Result construction; external harness times complete calls. Coordinates includes coordinate sets/maps and PCard construction; masks includes vector allocation and both mh/mv loops. Occ init includes ID interning and deterministic-edge occupancy. Initial loop includes sorting, A*, occ edits; allocation and search rows are nested in it. Search includes cache/heap setup and loop, excludes path reconstruction and buffer destruction. Stats includes EdgeView creation and stats_core. Percentages use each phase median / total median; nested rows must not be added to parents. Independent medians need not sum exactly.

### 500-position fixture

| Phase | Min ms | Median ms | % total |
|---|---:|---:|---:|
| Total compute (internal) | 364.226 | 366.892 | 100.00% |
| Before route_astar (layout + RouteInput) | 0.582 | 0.643 | 0.18% |
| route_astar (inclusive) | 363.645 | 366.227 | 99.82% |
| build_grid (inclusive) | 351.623 | 353.992 | 96.48% |
| ↳ Coordinates + PCard | 0.384 | 0.416 | 0.11% |
| ↳ mh/mv masks | 351.194 | 353.530 | 96.36% |
| Occupancy + ID init | 2.528 | 2.760 | 0.75% |
| Initial A* loop (inclusive) | 0.000 | 0.000 | 0.00% |
| ↳ g/pv allocation + init | 0.000 | 0.000 | 0.00% |
| ↳ A* search | 0.000 | 0.000 | 0.00% |
| Repair check 0: views + stats_core | 8.850 | 8.909 | 2.43% |
| Repair reroute | 0 | 0 | 0% |

### Canonical mock3 (50 positions)

| Phase | Min ms | Median ms | % total |
|---|---:|---:|---:|
| Total compute (internal) | 31.952 | 32.402 | 100.00% |
| Before route_astar (layout + RouteInput) | 0.135 | 0.142 | 0.44% |
| route_astar (inclusive) | 31.817 | 32.260 | 99.56% |
| build_grid (inclusive) | 8.163 | 8.301 | 25.62% |
| ↳ Coordinates + PCard | 0.062 | 0.064 | 0.20% |
| ↳ mh/mv masks | 8.095 | 8.230 | 25.40% |
| Occupancy + ID init | 0.139 | 0.141 | 0.44% |
| Initial A* loop (inclusive) | 23.249 | 23.529 | 72.62% |
| ↳ g/pv allocation + init | 1.135 | 1.301 | 4.01% |
| ↳ A* search | 21.957 | 22.010 | 67.93% |
| Repair check 0: views + stats_core | 0.191 | 0.200 | 0.62% |
| Repair reroute | 0 | 0 | 0% |

### Counters / non-obvious findings

Counters were identical across all three coarse runs.

| Counter | 500 fixture | mock3 |
|---|---:|---:|
| nx × ny = n | 4267 × 67 = 285889 | 452 × 132 = 59664 |
| Cards | 500 | 50 |
| det / ast edges | 499 / 0 | 42 / 8 |
| A* calls: initial / repair | 0 / 0 | 8 / 0 |
| Repair checks entered | 1 | 1 |
| bad at pass 0 | 0 | 0 |
| Actual reroute passes | 0 | 0 |
| Passes 1–3 | Not entered | Not entered |
| Grid card predicate tests | 275829919 | 5609561 |
| Heap pops total | 0 | 44517 |
| Pops average / max per A* | N/A (no calls) | 5564.625 / 17519 |
| Calls hitting 250000 cap | 0 | 0 |
| seg_usable calls | 0 | 45331 |
| Masked branch calls | 0 | 787 (1.736%) |
| Masked card predicate tests | 0 | 19608 |

Mock3 per-A* calls, in unchanged routing order (no repair calls):

| Call | Heap pops | seg_usable | Masked | Masked card tests |
|---|---:|---:|---:|---:|
| 1 | 1416 | 1662 | 95 | 1883 |
| 2 | 394 | 564 | 21 | 870 |
| 3 | 684 | 932 | 39 | 1454 |
| 4 | 17519 | 18003 | 262 | 6719 |
| 5 | 13092 | 13193 | 192 | 5842 |
| 6 | 791 | 877 | 63 | 903 |
| 7 | 770 | 916 | 60 | 1372 |
| 8 | 9851 | 9184 | 55 | 565 |

Targeted mock3 nested probes (three runs, min / median): masked card branch **0.140 / 0.142 ms**; cache entry + seg_usable inclusive **11.001 / 11.292 ms**; occupancy lookups + own/foreign reductions **6.191 / 6.332 ms**. With these high-frequency clocks, search rose to **29.454 / 29.951 ms**, versus coarse **21.957 / 22.010 ms**. Thus these are perturbed measurements, not additive baseline attribution. Cache timing includes department checks and allocation, not just hashing; no claim that HashMap churn alone costs 11 ms. Masked-branch scan remains tiny even with timer overhead.

### Ranked hotspots and hypothesis verdicts

1. **500: grid masks, 353.530 ms / 96.36%. H1 confirmed.** 567444 grid segments × 500 cards gives worst-case 283722000 tests; measured 275829919 (~97.2% of bound). Code short-circuits on hits but most work still scans cards. Complexity is O(nx × ny × cards) worst case. This fixture builds the grid despite ast being empty.
2. **mock3: A* search, 22.010 ms / 67.93%. H5 partially confirmed.** Calls 4, 5 and 8 account for 40462 of 44517 pops (~90.9%). Cache/occupancy operations are significant in targeted probes, but exact hashing vs heap vs department cost is not separately established.
3. **mock3: grid masks, 8.230 ms / 25.40%.** Same H1 mechanism, 5.61 million predicates.
4. **500: one stats check, 8.909 ms / 2.43%; occ init 2.760 ms / 0.75%. H4 reroute hypothesis refuted for both fixtures.** Both exit immediately on empty bad. The quality check remains measurable; repeated repair cost is not exercised.
5. **mock3: g/pv initialization, 1.301 ms / 4.01%. H2 exists but is secondary; refuted as cause for 500.** Each call initializes 178992 entries in each vector (~2.864 MB combined); eight calls ~22.9 MB cumulative initialization. No such allocations occur in the 500 fixture.
6. **H3 is not a dominant hotspot.** No calls in 500. Mock3 masked branch is only 787 calls / 19608 card predicates and ~0.142 ms with nested clocks. Layout is also small: median 0.643 ms at 500 and 0.142 ms at mock3.

### OUTPUT-IDENTICAL proposals — estimates, not implemented

Estimates are engineering ranges from measured phase budgets, not benchmarked gains. They overlap and must not be summed. Preserve point simplification, floating-point operations, neighbor order, heap comparator (f,g,k), strict relaxation comparison and edge/reroute order; validate full serialized output across both fixtures and adversarial cases before adopting.

| Rank / proposal | Why output can remain identical | Estimated saving |
|---|---|---|
| 1. Defer grid/ID/occ construction until at least one ast edge exists | With ast empty no search or reroute can consume grid/occ. Keep identical det creation, final conversion and sorting. Retaining stats initially avoids changing quality-check execution. | 500 ~354–357 ms (~97%); remaining ~10–13 ms. mock3 ≈0. |
| Optional extension: skip repair checks when ast is empty | stats_core has no output side effects; bad det edges cannot be rerouted by this loop. Needs explicit equivalence coverage including bad det cases. | Additional ~8.9 ms at 500, potentially total <2 ms; not measured. |
| 2. Spatial broad phase over cards for masks | Return a conservative superset of segment-intersecting padded rectangles, retain exact seg_hits predicate and boundaries. No false negatives; candidate order can retain original sorted card order. | Assuming 80–95% reduction of mask phase after index overhead: 500 ~283–336 ms; mock3 ~6.6–7.8 ms. Does not stack with skipping the grid. |
| 3. Dense/generation cache and indexed occupancy lookups | Grid segment/node keys are integers; current maps are used for keyed lookups, not iteration-dependent route order. Preserve occupancy vector multiplicities and mutation order and exact cost arithmetic. | mock3 speculative ~3–7 ms (9–22% total) from coarse 22 ms search budget; targeted timers justify investigation, not a precise prediction. 500 no search saving; dense occupancy may cost more on sparse use. |
| 4. Reuse g/pv, touched-list or generation reset | Unvisited values must still read infinity/-1; reset every modified state including start and failed/capped searches. Same heap pushes and comparator. Reuse alone still fills all n×3 entries. | mock3 ~0.5–1.2 ms; allocation-only phase ceiling 1.30 ms. 500 zero. Generation checks may erase the gain. |
| 5. Broad-phase stats candidate enumeration | Enumerate every actually intersecting pair/card, retain exact tests and bad membership; preserve repair ordering. | 500 speculative ~4–7 ms of 8.9 ms; mock3 <0.2 ms. Redundant if no-ast repair check is skipped. |
| 6. Spatial index for masked seg_usable | Same raw/padded parent/child exceptions and department checks, conservative card candidates. | mock3 at most ~0.14 ms gross, likely <0.1 ms net; 500 zero. Low priority. |

**CHANGES OUTPUT — needs owner decision:** bounding-box/local-window A* pruning; reducing grid lanes/resolution; reducing pop cap; changing heuristic, penalties or neighbor/heap tie order; skipping repair when ast is nonempty; reordering independent-looking ast edges (occupancy makes order meaningful). No such change was made.

### Screenshots / flow / risks / post-deploy

Screenshots: N/A, native diagnostic. Flow: fixture → layout → deterministic edges → grid/occupancy → initial A* → one quality check → output. In 500, the A* step is empty; in mock3 it has eight calls. No deployment requested or performed; post-deploy N/A. These fixtures do not characterize scenes with actual repair passes or capped searches. No scaling sweep was performed; H1 complexity follows the measured operation count plus source loops, not an empirical asymptotic fit. The ≤50 ms budget fails at baseline; no optimization or budget compliance is claimed.

### Revert evidence

`cmp /tmp/dg41-original.rs packages/core/src/staff_tidy_layout.rs` exited 0. Both `git diff --stat -- packages/` and `git status --short packages/` emitted no output. Source instrumentation and mock3 harness were removed. The detailed logs retained in this report directory are evidence only.

FACT: Final diagnostic tables, counters, hypotheses and estimated proposals appended; raw logs retained under dg41-evidence/.
NEXT: Record restored-source test result and final clean-package check.
FACT: Report generation completed without changing packages.
NEXT: Await restored-source verification.
FACT: Restored-source release staff_tidy_layout suite passed (see dg41-evidence/dg41-restored-tests.log); packages diff/status remain empty; no DG41 probes remain; branch unchanged.
DECISION: Diagnosis complete; no optimizations implemented. No remaining owner question for this measurement task.
NEXT: Final session checkpoint and concise handoff to user.
FACT: Final checkpoint requested after source restoration and successful verification; all requested deliverables are in this file.
NEXT: No further source work; hand off diagnosis.
