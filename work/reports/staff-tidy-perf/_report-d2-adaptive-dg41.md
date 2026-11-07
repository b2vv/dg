# Report — D2 adaptive reserve-space for staff tidy (<100 crossings) — dg41

**Delta from `plan.md` rev.5.** Session 2026-11-06…07. Branch `feat/t126-staff-rust-geometry`. 9 commits, not pushed.
Deployed to cass-13. Engine author this track: Claude (Codex at limit until the reset on 2026-11-07, after which
further staff engine code goes to Codex).

## 1. Done
- **Scale + WASM measurement** of the staff tidy engine (50/99/148): quality breaks at **99** (cross=4); WASM
  crosses the 50 ms budget between 50 and 99. Harness `tidy_cohorts`+`tidy_scale_row` kept (`240f9bd`).
- **<100 crossing investigation** (D0/D1): refuted the cap→fallback hypothesis at <100 (0 fallbacks on 99);
  proved no per-edge routing (penalty ×1000, 64 repair passes, 30 hard-block orders) nor placement reorder
  (barycenter/random/hill-climb, floor ~2) reaches 0 on the synthetic 10×mock3 scene.
- **Owner's reserve-space idea = strongest lever** (99: 4→1, 50→0); residual-1 is a synthetic `cto` cross-dept
  artifact, not a dual parent; real ШПС (0 dual parents, ≤~75) is already 0.
- **D2 shipped:** `compute_staff_tidy_adaptive` — single pass at caller spacing; if the quality tuple is non-zero,
  retry at pad/lane ×{2,3} and return the lexicographically smallest tuple (tie→smallest spacing). Clean scenes
  short-circuit → byte-identical. WASM binding switched to adaptive; built + deployed to cass-13 (`25a934a`,
  `1502d74`, `68de88b`).

## 2. Tested scenarios (vs plan acceptance)
- A1 clean byte-identical (mock3 + 50): PASS (`adaptive_byte_identical_on_clean`, precondition = full zero tuple).
- A3 dense reduced (99 < baseline): PASS (`adaptive_reduces_dense_crossings`).
- A10 determinism: PASS (`adaptive_deterministic`). Full suite: cargo test 211 passed / 0 failed / 5 ignored;
  clippy -D warnings clean; rustfmt clean; check:docs OK.
- Frozen S1 goldens/observers: unchanged (they target the single-pass `compute_staff_tidy_layout`).

## 3. Non-obvious findings
- The <100 crossing problem is a **synthetic 10×mock3 artifact**; real staff data (tree, 0 dual parents, ≤~75)
  is already clean. Reserve-space helps dense synthetic scenes only.
- A **global** pad increase would have been net-negative (spreads every real diagram 3× for no real gain) —
  surfaced and corrected before implementing; adaptive keeps real data compact (1 compute, no perf regression).
- `stats_core` was already production (not test-only); only a thin wrapper was added.

## 4. Screenshots
N/A — Rust engine change; no UI surface. Visual verification on cass-13 is the owner's post-deploy step.

## 5. User-flow walkthrough
Host calls `computeStaffMockupLayout` (unchanged JS name) → WASM `compute_staff_tidy_adaptive`. A clean (real) staff
scene returns the same compact layout as before. A scene with crossings gets more reserved routing space
automatically (best-effort fewer crossings). Matrix role / drag contract unchanged (SDK-derived).

## 6. Risks / limitations
- Best-effort, **NOT guaranteed 0** (spacing non-monotonic; synthetic 99 floors at 1).
- Review backlog (N2/N3): `near` component is pad-dependent across spacings (moot in fixtures; watch at edit-mode);
  the 5-tuple selector is undertested (only `cross` non-zero in fixtures).
- Edit-mode reflow: a future 0→1 crossing flip would jump spacing 2–3× (discrete) — for whoever wires edit-mode.
- Deferred: **1b** (matrix/headless on tidy) and the **legacy-path removal** — staff have no user coordinates yet
  ("future"); matrix scenes are fixtures only, real staff is always tree (already on tidy). spec/plan kept as
  DEFERRED in `work/reports/staff-tidy-matrix/`.

## Post-deploy
Built (`build:wasm` + `build`) and deployed to cass-13 (dist linked). Live post-deploy verification on the stand is
the owner's step (browser/e2e on cass-13). No unilateral live-stand interaction performed.

## Gates (R6 / AI Factory Full)
spec/scale measurement; D0/D1 probes (test-only, reverted); plan rev.3 critique+defense GREEN; D1-model + rev.4
critiques RED→addressed; D2-design critique GREEN; pre-code checkpoint READY; D2 independent code review GREEN
(0 blocking, N1 fixed). All critique/defense/review artifacts in `work/reports/staff-tidy-perf/`.
