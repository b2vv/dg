# Critique: staff-tidy-perf plan (dg41)

Model: claude-opus-4-8

NEXT: read plan.md, _codex-diag-dg41.md, staff_tidy_layout.rs (key fns), standards.md.

## Read complete — findings

FACT: Output = StaffTidyResult serialized via serde_json; points are f32 (`x as f32`), width/height f32. Node/frame sorted by id (:1530,:1549); edges sorted by (from_id,to_id) (:1233,:1117). `bad` is HashSet<usize> (membership, order-free). scene_w/h via `.fold(0.0,f32::max)` over HashMap iter — max is order-independent (:1551-1560). coords built per-id, no float accumulation over HashMap (:1514-1529). Existing tests output_is_deterministic (:1745) + mock3_astar_deterministic (:1918) pass. No transcendental fns in geometry (abs/round/min/max/+/-/*). ⇒ cross-platform/cross-seed byte golden is PLAUSIBLE.

FACT: classify (:470) — Int edge (same dept, both Some) ALWAYS gets by=Some ⇒ det, never ast (:496-497). ast edges come only from cross-dept, ext (parent no dept, non-block-root child), and ALL secondary parents (:529-548). mock3 ast=8, 500-det ast=0.

FACT: Diagnosis: NEITHER fixture exercises repair passes (bad=0 at pass0 for both) NOR capped searches (0 hit 250000 cap). mock3 runs 8 A* calls; 500 runs 0.

FACT: route_astar (:1123) — when ast empty: det routed w/o grid (:1126-1134); grid+occ built (:1136-1150) but occ only READ inside astar (:1171,:1208); repair pass0 stats_core uses cards/depts/pts only, NOT grid/occ (:1189); reroute only touches ast indices (:1197-1199) ⇒ empty when ast empty. ⇒ S3 (skip grid/occ when ast empty) is OUTPUT-SOUND: nothing consumes them. Verified.

FACT: seg_hits (:384) uses strict `>`/`<` (boundary-exclusive). ⇒ S2 broad phase safe as long as candidate set is a SUPERSET (extra candidates fail exact test anyway); danger is only EXCLUDING a hitting card (long segment crossing un-enumerated buckets, or boundary-exclusive bucket). Implementation discipline, golden-covered on both grids (pre-S3).

FACT: occ_edit (:709) stores Vec<u32> per key; add=push, remove=position()+remove (first match, preserves multiplicity). `own=contains`, `foreign_e=any !=mkey` (:921-922). Multiplicity matters only across remove (repair re-route). S4 "dense occupancy" must preserve this.

FACT: astar (:855-856) allocates g=vec![INF;n*3], pv=vec![-1;n*3] fresh per call; cache HashMap per call (:857). it capped at 250000 (:872). goal<0 → fallback (:957). These are S4's reuse/generation targets.

### LENS 1 — Invariant soundness
- FINDING (BLOCKING, S4 only): No characterization scene exercises repair passes or capped/failed A* exits (diag counters: bad=0 both fixtures, 0 caps; mock3×10 with per-replica dept namespaces stays isolated ⇒ still bad=0, still no repair). S4 explicitly claims correctness on "failed/capped searches" with buffer reuse + generation reset — exactly the paths a reuse/reset bug hides in (stale g[k] read after early-break `it>250000`, or after goal<0, or on the 2nd reroute of the same edge in a repair pass). A golden that never runs those paths is a FALSE GREEN for S4's most dangerous change. Fix: S1 MUST construct (a) a scene with non-empty bad at pass0 (forces ≥1 repair reroute) AND (b) a scene/unit-test forcing the 250000 cap (tiny grid + unreachable target, or direct astar call) — not the plan's optional "else record repair is not covered". Until both exist, S4's cap/fail/repair reset logic is unverifiable by golden.
- FINDING (NON-BLOCKING): Golden regeneration risk. Golden is frozen "from 0a2b1a8" in S1; a later slice that genuinely changes output could be silently "fixed" by regenerating the JSON. Plan has no guard. Fix: forbid golden regeneration in S2–S4; any golden diff = stop + owner sign-off; S1 commit must `git diff` prove it touches only test/fixture code (build_grid/astar/route_astar/stats_core bytes == 0a2b1a8).
- Checked and OK: f32/f64 determinism, HashMap-seed independence of output, serde_json f32 (ryu) stability — all supported by code structure + existing determinism tests. Not a blocker.

### LENS 2 — Representativeness
- FINDING (NON-BLOCKING, but load-bearing for S2): Plan does not specify HOW mock3 is replicated ×10 (10 disconnected trees? common super-root? side-by-side vs stacked?). This determines grid shape (nx/ny) and ast density. The 500-det fixture is pathologically WIDE (nx=4267) because of 10×4×11 flat teams; mock3 is bushy (nx=452). If replicas stack/isolate, the realistic fixture's grid may be far smaller than the real pathology — making S2 (mask broad-phase) look unjustified. Conversely S3 ALREADY kills 97% of the 500-det cost by skipping its grid, so S2's ENTIRE justification rests on the realistic fixture being BOTH large-grid AND ast-bearing. If it is not, S2 adds complexity/risk for ~0 gain. Fix: specify replica composition; after S1 record the realistic fixture's (nx, ny, ast count, per-A* pop distribution) and confirm they resemble a real ~500 org; ideally shape the fixture from host ШПС dimensions. Decide S2 scope AFTER that measurement, not before.
- Checked and OK: replication DOES produce ast edges IF each replica keeps its own cross-dept topology + own dept namespace (~8 ast/replica → ~80), matching the plan's estimate.

### LENS 3 — Slice correctness traps
- S2: FINDING (NON-BLOCKING) broad phase must (i) enumerate ALL buckets a segment crosses (long axis-aligned segments span many cells — endpoint-only bucketing misses middle cards → false negative → changed mask → changed route), (ii) be boundary-inclusive in candidate selection (seg_hits is strict-interior, so superset is always safe; only exclusion is fatal). Golden covers mock3 grid always and 500-det grid only PRE-S3 — see S2×S3 interaction below.
- S2×S3 interaction: FINDING (NON-BLOCKING) once S3 lands, the 500-det fixture skips grid construction entirely, so the only large grid left for S2 is the realistic fixture. Measure S2 on the realistic fixture, NOT on 500-det (whose mask cost S3 already removed). Do not credit S2 with the 500-det mask reduction.
- S3: OUTPUT-SOUND (verified above). Must skip BOTH build_grid AND the det→occ population loop (:1147-1150). Keeping stats pass0 is output-neutral (returns bad; no output side effect) — conservative, fine.
- S4 occupancy: FINDING (BLOCKING via Lens1) dense occupancy replacing HashMap<usize,Vec<u32>> must preserve multiplicity (same mkey pushed >1×) and first-match removal order — these only matter on repair re-route (occ_edit add=false then re-add), which NO golden exercises. Tie to the repair-coverage blocker.
- S4 g/pv reset: FINDING (NON-BLOCKING, conditional on blocker fix) prefer generation-stamp over touched-list: a touched-list that misses a cell written on the capped early-break path = stale read, uncaught (no cap scene). Every read of g[k]/pv[k] incl. the staleness check `item.g > g[k]+1e-6` (:880) must be gen-guarded. Generation overflow (u32 wrap) is negligible at these call counts but needs the standard reinit-on-wrap guard (costs nothing).

### LENS 4 — Measurement
- FINDING (NON-BLOCKING): ≤25 ms native target assumes native→WASM ≈2×; WASM is often 2–3×, so 25 ms native could be 50–75 ms WASM — the whole 50 ms budget rests on an unmeasured factor. Plan makes WASM measurement OPTIONAL. Fix: make one WASM calibration mandatory (scratchpad build) to pin the factor before accepting ≤25 ms as sufficient headroom.
- FINDING (NON-BLOCKING): diag measured under load avg 7.5 with ~9% drift; a 25 ms target ±2.25 ms near threshold risks false pass/fail. Fix: specify N, quiescent machine / pinned threads; min-of-N is the right estimator.
- OK: WASM-to-scratchpad (`--out-dir <scratchpad>`) does not touch tracked pkg/dist — safe per task constraint.
- POSITIVE: perf harness is `#[ignore]` / not a CI gate — correctly aligns with standards.md §measure (clock tests out of default suite; CI must not gate on wall clock).

### LENS 5 — Missing
- FINDING (NON-BLOCKING): CI/test-runtime cost of golden. CI rust job runs `cargo test` in DEBUG. The realistic ~500 scene (grid + ~80 A* searches) and 500-det scene in debug could add several seconds each (release 370 ms × ~15–30× debug). mock3/adversarial goldens are cheap. Fix: either run the two large goldens in release (adjust rust job) or keep them `#[ignore]`+run in coordinator's per-slice release verify, keeping small/adversarial goldens in the default suite. Decide explicitly; plan is silent.
- FINDING (NON-BLOCKING): golden fixtures add committed JSON (~100s KB each for 500-node scenes). Acceptable; note repo cost.
- OK: rollback (revert slice commit; S1 golden/fixtures survive as 0a2b1a8 guard) is realistic. Determinism across platforms: supported (Lens 1).

### VERDICT: RED
Blocker (open): S4 optimises exactly the A* reuse / occupancy-reset / repair / capped-search paths that NO characterization scene exercises — golden is a false green for S4. Gate stays RED until S1 adds (a) a repair-forcing scene (non-empty bad at pass0) and (b) a cap/fail-forcing scene or direct astar unit test, and S4's dense-occupancy change is gated on the repair scene. S1, S2, S3 are sound (S2/S3 subject to the NON-BLOCKING disciplines above). If S4 is descoped to ONLY the per-call segment-cache (pure memo, covered by mock3's 8 calls) and g/pv gen-reset validated against a cap scene, the blocker closes.

## Re-check rev.2 (2026-11-06)

### B1 (S4 false-green) — CLOSED
- S1 now makes BOTH coverage scenes mandatory, not "if possible": (a) repair scene with pass-0 `bad` non-empty and ≥1 reroute, asserted by counter not eye (plan :33-38, A6 :98); (b) cap scene hitting the 250_000 cap + a `goal<0` fallback scene, asserted (plan :36-37, A7 :99). S4 is explicitly gated on their existence and golden-coverage (:64-65), with a correct descope path (:72-73).
- Correctness mapping verified against code:
  - Dense occupancy removal-order/multiplicity only matters on repair (occ_edit remove is reached only via the reroute at route_astar:1206; the initial ast loop only adds, :1175). Plan ties dense occupancy validation specifically to the repair scene (:69-70) — correct.
  - g/pv reuse across the initial ast loop is ALREADY byte-exercised by mock3's 8 sequential A* calls (a reset bug would turn mock3 golden A1 and §10.4 gate A2 red) — so g/pv reuse is safe to allow even on the descope branch where only the cap scene exists (:72-73). The plan's split (dense-occ needs repair; g/pv+memo do not) is precise and correct.
  - Cap scene exercises gen-guarding of every g[k]/pv[k] read on the capped path (the staleness check `item.g > g[k]` at :880 runs up to the cap). With the mandated generation-stamp design (:66-68, chosen over touched-list), a stale post-cap buffer is harmless by construction.
- Residual (NON-BLOCKING refinement): ideally the cap occurs MID-sequence in a multi-edge golden scene so "buffer reuse AFTER a capped call" is byte-checked, not only a standalone single-call astar unit test. Mitigated by the gen-stamp choice + "EVERY read gen-guarded" requirement; not blocking.

### N1–N8 fold — all correct
- N1 (golden freeze): :42-43 + A8 :100 — goldens generated only in S1, any S2–S4 diff = fail, S1 git-diff-proves test-only. ✓
- N2 (composition + representativeness): :28-32 — ONE CEO over 10 depts (not isolated replicas), cross-dept/secondary patterns reproduced, with MEASURED asserts #ast≥50 and nx≥2000, and S2 scope decided only after S1 measurement (:59). The asserts make a non-representative fixture self-correcting (S1 fails if the shape is wrong). Note (not a defect): CEO→dept-head edges classify as Ext and get `by=Some` via the block-root branch (build_edges :498-510) ⇒ they become det, not ast; so the ≥50 ast must come from genuine cross-dept/secondary links inside the structure — the #ast≥50 assert guards exactly this. ✓
- N3 (order S1→S3→S2→S4): :52-53 — S3 first removes the det-only grid; S2 credited only on grid-building scenes (realistic/mock3/repair/cap), never det-only 500. Realistic scene has #ast≥50 so it still builds a grid ⇒ S2 still has a large grid to optimise. No new trap. ✓
- N4 (S2 broad phase): :60-62 — enumerate ALL buckets a segment crosses, boundary-inclusive candidates, exact strict-interior seg_hits kept (superset-safe). ✓
- N5 (gen-stamp): :66-68 — generation stamps not touched-list; every read incl. staleness check gen-guarded; u32-wrap reinit guard. ✓
- N6 (mandatory WASM calibration): :79-81 + A3 :95 — wasm-pack --release --out-dir <scratchpad> (never tracked pkg/dist), node timing N=7 min, ratio recorded, A3 judged on WASM vs ≤50 ms. Scratchpad keeps the task's no-tracked-write constraint. ✓
- N7 (measurement): :48-49 — N=7, min-of-N, quiescent (`pgrep -fl cargo` empty, load avg noted). ✓
- N8 (CI/debug runtime): :44-46 — small/adversarial/REPAIR/CAP goldens stay in the default debug suite (so the B1-critical coverage always runs in CI); only the two ~500 goldens are subject to the 3 s rule (else #[ignore] + coordinator release-run per slice, recorded). Correctly keeps the cheap correctness-critical goldens unconditional. ✓
  - Residual (NON-BLOCKING): if the realistic ~500 golden is #[ignore]'d, CI loses that large-scene regression guard and relies on coordinator discipline per R6 — acceptable, not blocking.

### VERDICT: GREEN
B1 is closed (mandatory repair + cap/fallback scenes, S4 gated with a correct descope split that matches where each optimisation's risk actually lives in the code). N1–N8 are all folded in correctly and the rev.2 changes (new slice order, one-root composition, 3 s debug rule, generation-stamp wording, mandatory WASM calibration) introduce no new trap. Two residual NON-BLOCKING refinements noted (mid-sequence cap golden; CI guard on an #[ignore]'d large golden) — neither gates the plan.
