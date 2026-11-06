# plan — perf staff tidy engine @500 (dg41)

**Base:** `feat/t126-staff-rust-geometry` @ `0a2b1a8` · **Owner:** «1 → 2» (2026-11-06) · **Threshold:** internal perf refactor of
a non-public Rust module (no `docs/USAGE.md` surface) → below the spec-flow threshold → lightweight plan + owner rule R6
(critic BEFORE the slice, independent review AFTER each step).
**Diagnosis (facts):** `work/reports/staff-tidy-perf/_codex-diag-dg41.md`.

## 1. Problem (measured)
- Budget coverage §8.4: ≤50 ms @ 500 positions (product, i.e. browser/WASM).
- Release-native today: **370 ms** on the 500 fixture — of which **354 ms (96%) = mh/mv mask loops in `build_grid`**
  (O(nx·ny·cards); grid 4267×67 = 285,889 nodes; 275.8 M segment×card predicates).
- That fixture has **0 A*-edges** (499 det / 0 ast): A* never ran. It is unrepresentative.
- mock3 (50 positions, 8 ast): 32 ms = 68% A* search, 25% masks, 4% g/pv init. Repair passes: not exercised on either.

## 2. Invariant (non-negotiable)
**Byte-identical output**: the full serialized `StaffTidyResult` (nodes, frames, edges incl. every point, f32 values,
order) must equal the baseline captured at `0a2b1a8` for every characterization scene. Pure speed-up: same routes,
same A* heap order (comparator f,g,k; strict `<` relaxation), same neighbour order, same edge/reroute order, same
float operation order. §10.4 zero-gate stays green as a consequence.
Anything that changes routes (bbox/window A*, grid resolution, pop cap, heuristic/penalties, skipping repair when ast
non-empty, edge reordering) is **out of scope → owner decision** only if identical speed-ups do not reach budget.

## 3. Slices
> **rev.2 (2026-11-06)** after blind critique RED (`_critique-plan-dg41.md`): blocker B1 closed by requiring
> path-coverage scenes (repair + cap) in S1 and gating S4 on them; non-blocking N1–N8 folded in below.

**S1 — characterization + representative fixture (no production change).**
- **Realistic large scene `tidy_large_realistic` (N2 — composition specified):** ONE root (CEO) over 10 departments in
  one org (NOT 10 isolated replicas). Each department reuses mock3's internal department shapes; cross-department
  edges reproduce mock3's ast-producing patterns (central staff → department heads, secondary links) at mock3's
  ratio. Acceptance measured, not assumed: record nx, ny, #det, #ast, A* calls, pops; require **#ast ≥ 50** and
  nx ≥ 2,000. Keep the existing det-only 500 fixture.
- **Path-coverage scenes (B1 — mandatory, not "if possible"):**
  (a) **repair scene**: a scene whose pass-0 `stats_core` returns non-empty `bad`, so ≥1 reroute runs (occ remove →
  re-astar → re-add); verified by a counter/assert in the test, not by eye;
  (b) **cap / fallback scene**: a direct `astar` unit test (or scene) that hits the `250_000`-pop cap (e.g. a
  forced ast edge to an unreachable/enclosed target on a large grid), plus one hitting the `goal < 0` fallback.
  If (a) cannot be constructed, S4 is **descoped** (see S4).
- Golden: serialize full `StaffTidyResult` (serde_json) for: mock3, det-only 500, realistic, repair, cap/fallback,
  plus small adversarial scenes (empty departments, single position, two depts no cross edge). Store under
  `packages/core/tests/fixtures/staff_tidy_golden/*.json`; test asserts equality. Generated at `0a2b1a8` code.
- **Golden freeze (N1):** goldens are generated ONLY in S1; S2–S4 must not regenerate or edit them (any golden diff
  in S2–S4 = fail). S1's commit must git-diff-prove it touches only test/fixture code.
- **CI cost (N8):** small/adversarial/repair/cap goldens run in the default (debug) suite. Measure debug runtime of the
  two ~500 goldens in S1: if < 3 s combined they stay default; else `#[ignore]` + coordinator runs them in release
  on every slice (recorded in the slice report).
- Red-check: perturb one point → test red → revert.
- Perf harness: ignored test printing per-scene release ms, **N = 7 runs, min-of-N, quiescent machine**
  (`pgrep -fl cargo` empty; note load avg) (N7).
- Gate: cargo test, clippy -D warnings, rustfmt (changed).

**Order (N3): S1 → S3 → S2 → S4.** S3 first because it is cheap and removes the det-only grid; S2 is then measured
and credited ONLY on scenes that still build a grid (realistic, mock3, repair, cap) — never on det-only 500.

**S3 — skip grid/occ construction when `ast` is empty.** Output-sound (critic traced: with empty ast, occ is read only
inside `astar`, never called; pass-0 `stats_core` uses cards/depts/pts only; reroute touches ast indices only). Must
skip BOTH `build_grid` and the det→occ population loop (~:1147-1150). Keep the stats check.

**S2 — spatial broad phase for masks (H1) — scope decided AFTER S1 measurement (N2).** Only if the realistic scene's
mask phase is still material. Uniform bucket grid over padded card rects; per segment enumerate **ALL buckets the
segment crosses** (not just endpoints), candidate selection **boundary-inclusive** (N4); exact `seg_hits` kept
(strict-interior, :384 ⇒ any candidate superset is safe); boolean `any` is order-independent ⇒ identical masks.

**S4 — A* search cost — GATED on S1 path-coverage scenes (B1).**
- Allowed only if the repair scene (S1-a) AND cap/fallback scenes (S1-b) exist and are golden-covered.
- g/pv reuse: **generation stamps, not a touched-list** (a touched-list can miss cells written on the capped
  early-break path); EVERY `g[k]`/`pv[k]` read incl. the staleness check (~:880) must be generation-guarded; u32
  generation wrap → full reinit guard (N5).
- Dense occupancy: preserve per-key multiplicities and first-match removal order (`occ_edit` remove, ~:715);
  must be validated on the repair scene (that is the only path where removal order matters).
- Dense per-call segment cache (Vec + generation instead of HashMap) — pure memo, covered by mock3's 8 A* calls.
- **If S1-a cannot be constructed: descope S4 to the segment-cache memo only** (+ g/pv generation reuse only if the
  cap scene exists).

Each slice: separate commit; Codex writes; coordinator verifies independently (golden, §10.4, clippy, perf).

## 4. Measurement & target
- Native release is a proxy. Target **native ≤25 ms** on the realistic ~500 scene as a working target only.
- **WASM calibration is MANDATORY (N6), once, before declaring A3:** `wasm-pack build --release --out-dir <scratchpad>`
  (never the tracked `packages/sdk/src/wasm/pkg` nor dist) + a node script timing the same realistic input, N=7
  min-of-N. Record the native→WASM ratio; A3 is judged on the WASM number vs ≤50 ms, not on native.
- If after S2–S4 native > budget headroom → stop, report, owner decides on output-changing options.

## 5. Side effects · migration · rollback
- Side effects: none on output by construction (golden). Tidy path is opt-in (`staffAlphaMockup` default false) and
  pkg/dist are not rebuilt → no host-visible change until the coordinated build.
- Migration: none (internal).
- Rollback: revert the slice commit; golden + fixtures from S1 stay as regression guard.

## 6. Acceptance
| # | Scenario | Check |
|---|---|---|
| A1 | Golden identity for every characterization scene after each slice | cargo test |
| A2 | §10.4 0/0/0/0/0 on mock3 | cargo test |
| A3 | realistic ~500 **WASM** ≤50 ms (min of 7, scratchpad build); native ≤25 ms as working target | node timing + ignored perf test |
| A4 | det-only 500 native release ≤25 ms | ignored perf test |
| A5 | no clippy warnings, rustfmt clean on changed files | CI parity |
| A6 | repair scene: pass-0 `bad` non-empty and ≥1 reroute executed (asserted) | cargo test |
| A7 | cap scene hits 250,000 pops; fallback scene hits `goal < 0` (asserted) | cargo test |
| A8 | goldens unchanged since S1 commit (no regeneration in S2–S4) | git diff on fixtures dir |
