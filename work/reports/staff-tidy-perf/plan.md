# plan — staff tidy <100 zero-crossing redesign (dg41, rev.5)

## rev.5 (2026-11-07) — D2 = ADAPTIVE reserve-space (owner choice B); pre-code checkpoint
Owner picked **B (adaptive)** after the impact finding that a *global* pad increase would spread every real diagram
3× for no real benefit (real data ≤~75 is already 0 crossings at pad=8; crossings only appear ≥~80 on synthetic
10×mock3). Adaptive = add space ONLY when crossings are detected.

**D2 design (adaptive reserve-space, engine-internal, no API change):**
- In `compute_staff_tidy_layout`: produce the layout at base spacing, **count the quality tuple** on the final
  `StaffTidyResult`. (Correction per critic: `stats_core` is ALREADY production — called in the repair pass at
  `:1190`; the **test-only** piece is the `tidy_stats` wrapper `:1238`. D2 adds only a thin production wrapper that
  runs the same `stats_core` over the final result. Router signature unchanged → A7 observer-lockstep risk is low.)
  If the base tuple is **all-zero → return as-is** (real data, compact, byte-identical to today). If **any component
  >0 → recompute over the fixed deterministic spacing set pad/lane ×{1, 2, 3}** (exactly three, no more) and return
  the layout whose quality tuple is **lexicographically smallest (cross, over, card, near, dept); tie → smallest
  spacing** (compactness). **Select on the full 5-tuple, not cross alone** (critic #2: a larger spacing could cut
  cross while worsening another component; the acceptance is 5-dimensional).
- **Honest bound:** best-effort, NOT guaranteed 0 — spacing is non-monotonic (pad=64 was worse) and synthetic-99
  floors at 1. Guarantee is "quality tuple ≤ baseline lexicographically, and clean scenes unchanged", not "0".
- **Perf (critic #1 — A4 not hidden):** adaptive does NOT fix perf. Clean scenes (all real data ≤~75) = 0 crossings
  = **1 compute → no perf regression**. Only scenes that already have crossings (synthetic ≥~80) pay ≤3 full computes
  (~2.5 s at synthetic 99). A4 (WASM ≤50 ms) is therefore unaffected for real data and **not gated by D2**; the
  @500 perf item stays a separate backlog item. This is stated, not silently dropped.
- **Edit-mode reflow risk (critic #4):** if denser future real data or live-edit flips a scene 0→1 crossing, the
  whole diagram would jump 2–3× in spacing (discrete reflow). Host does not consume the Tidy path yet and edit-mode
  is a separate feature → non-blocking, recorded as a risk for whoever wires edit-mode.
- **A1 holds for free:** clean scenes (mock3, ≤~75, all real data) have 0 crossings at base → no retry → output
  byte-identical → mock3/small goldens unchanged. This is the key safety property.
- **Determinism (A10):** bounded deterministic spacing set + deterministic tie-break. **Perf:** real = 1 compute
  (unchanged); dense = ≤3 computes, only when crossings exist (rare, synthetic). **No-panic (A9)** preserved.
- **Blast radius:** `stats_core` becomes production (was test-only); frozen S1 observers must stay in lockstep (A7).
- **Delivery:** Rust change → WASM rebuild needed to reach the host = an **announced cass-13 deploy** (later step,
  not unilateral; handoff forbids building into the shared dist without announcing). Tests do not deploy.

### Pre-code checkpoint (AI Factory Full, before first product mutation) — READY pending critic
| Field | Content |
|---|---|
| Scope/acceptance | Engine self-heals spacing when it detects its own crossings; clean scenes byte-identical; dense scenes ≤ baseline. Acceptance A1/A8/A9/A10 + "dense cross ≤ baseline"; A3's "0 at 99" is **dropped** (best-effort, per owner B + evidence). |
| Grilling/decisions | Owner decisions logged: Б over А (A/B matrix), then B (adaptive) over A′ (no-op) / global-pad (net-negative, disputed and corrected). Author inference: engine-internal vs SDK-retry → engine (one place, no API change, deterministic). |
| Dependencies/writers | Task branch `feat/t126-staff-rust-geometry`, one writer (this session), Codex at limit until 2026-11-11 → Claude writes. No foreign WIP touched. |
| Scoped impact | `compute_staff_tidy_layout` (`staff_tidy_layout.rs:1295`): add a thin production wrapper that runs the already-production `stats_core` (:1190/:983) over the final result + the ×{1,2,3} retry/select loop. `tidy_stats` (:1238) is the test-only wrapper, unaffected. Frozen observers (A7) low-risk (router signature unchanged). SDK default pad/lane (`staffLiveGeometry.ts:368`) UNCHANGED. |
| Planning gate | Blind `plan-critique` on this D2 design BEFORE code (R6) → **GREEN, 0 blocking** (`_critique-d2-adaptive-dg41.md`); 5 non-blocking folded into the design above. |
| Readiness | **READY.** Delivery (WASM build → cass-13) is a separate announced step, not part of this checkpoint. Implementation is test-first (TDD): tests do not deploy. |

---

## rev.4 (2026-11-07) — PIVOT to placement after D0/D1 evidence
D0/D1 are **done** (test-only, revert-proven; findings in `_redesign-spike-dg41.md`, `_design-d1-model-dg41.md`).
What the probes established, superseding rev.3's routing framing:
- **cap→fallback refuted at <100:** on the 99-scene there are **0 fallback edges** — crossings are between
  *successfully routed* paths, not straight-line fallbacks (that was a 491-scale phenomenon). §0's "same cause"
  framing holds only at 500.
- **No per-edge routing fixes it:** crossings are insensitive to penalty (×1→×1000, 6 M per crossing), repair passes
  (4→64), and order (30 hard-block orders). A **joint** batch rip-up made it **worse**.
- **A/B across 5 cases (owner: not one case):** baseline vs track А (joint router) vs track Б (placement):

  | positions | baseline | А joint | Б placement | winner |
  |---|---|---|---|---|
  | 60 | 0 | 0 | 0 | easy |
  | 75 | 0 | 2 | 0 | easy (А added crossings) |
  | 85 | 5 | 6 | **0** | Б |
  | 99 | 4 | 7 | **2** | Б |
  | 124 | 6 | 13 | **3** | Б |

- **Owner decision (2026-11-07): track Б — placement redesign** is the primary direction. Routing (even joint) is
  harmful or neutral; placement is the lever.
- **⚠️ Honest bound (rev.4 critique RED, `_critique-plan-rev4-dg41.md`, closed below):** placement is proven only to
  **reduce** crossings, NOT to reach 0 at the target. Random search (a strong explorer, 80 perms) hit 0 only at ≤85;
  at 99 best=2, at 124 best=3. So existence of a zero-crossing placement at 99/124 is **unproven**, and a principled
  (deterministic) ordering cannot be assumed better than the sampled minimum (crossing-min is NP-hard; Sugiyama is
  local). Therefore D2 is gated on **P0** — a test-only placement-existence prototype that must demonstrate the result
  before any ADR or production code. A3 is conditional on P0 (§3 D2 acceptance). The channel+dogleg router stays a
  **secondary** fallback only (evidence is against it; not a safety net).
- **rev.4 critique (R6/Factory gate):** blind `plan-critique` returned RED (B1 unproven 0 / B2 no-op mechanism /
  B3 order-authority / B4 prototype-before-ADR). All closed here: P0 inserted before ADR/code (B1/B4), no-op
  mechanism defined + tested (B2), B3 handed to P0 as two tested variants, N3 synthetic caveat and N4 124-stress
  folded into acceptance. Re-critique pending.
- **Process:** AI Factory **Full** route; a **pre-code checkpoint is mandatory before D2** (first product mutation).
  Carries forward unchanged: target §1, gates §4/§6 (quality 0/0/0/0/0 primary; determinism A10; no-panic A9;
  mock3/≤50 byte-frozen; large goldens regenerated only at the D2 commit).

---

# (below: rev.3 record — routing framing, superseded by the pivot above but kept for history)

# plan — staff tidy routing redesign under ≤100 (dg41, rev.3)

**Base:** `feat/t126-staff-rust-geometry` @ `f632ecc` · **Owner (2026-11-06):** choice **Б** — domain routing
**redesign** targeting **<100 positions** (not identical speed-ups); real ШПС still being populated, small now
(~1 cohort), will grow but stays <100 on the working horizon. 500+ and the identical-speedup track → backlog.
**Threshold:** internal, non-public Rust module (`staff_tidy_layout.rs`, no `docs/USAGE.md` surface; Tidy path opt-in,
`staffAlphaMockup` default false; pkg/dist not rebuilt) → below the spec-flow threshold → lightweight plan + owner
rule **R6** (critic BEFORE each slice, independent review AFTER each step).
**Gate provenance (R6, both gates run before D0):** blind `plan-critique` first returned RED (blocker B1 + N1–N5);
after revision, re-critique (`_critique-plan-rev3-v2-dg41.md`) = **GREEN, 0 blocking**. `plan-defense`
(`_defense-plan-rev3-dg41.md`) returned RED with 3 gaps (Q1 malformed-input tolerance, Q3 new-router determinism, Q4
exactly-100); all three closed here — §3 D1 invariants (Q1 no-panic / Q3 total-order + byte-identical runs, A9/A10),
§1 (Q4), §5 (Q5 harden: goldens in the D2 commit). Non-blocking refinements carried to §7.

## 0. Why rev.3 (what the measurement changed)
rev.1/rev.2 assumed a **pure speed-up @500 with byte-identical output**. The dg41 scale+WASM measurement
(`_scale-wasm-dg41.md`) killed that frame for the product target:

| positions | #ast | quality (cross/over/card/near/dept) | native min7 | WASM min7 | ≤50 ms? |
|---|---|---|---|---|---|
| 50 | 8 | **0/0/0/0/0** | 31.75 ms | 40.80 ms | ✅ (82% of budget) |
| 99 | 16 | **cross=4** | 693.7 ms | 819.7 ms | ❌ |
| 148 | 24 | **cross=24** | 2747 ms | 3201 ms | ❌ |

- **Quality breaks first, at 99 positions** (`cross=4`) — before any perf ceiling matters. Identical speed-ups
  (rev.2 S2–S4) would only make a **wrong** (crossing) output faster. ⇒ byte-identity invariant is **dropped**.
- **Root cause is single and measured** (`_codex-capdiag-dg41.md`): 82 cap-storms sit on exactly two edge families
  that multiply per cohort — `ceo→da-k` (secondary CEO→department fan) and `cto-k→bi-k` / `cto-k→ib-k` (long
  cross-dept links). Each edge runs an **independent A\* over one shared, congested routing grid**; occupancy
  penalties = 99.2% of path cost ⇒ A\* ≈ Dijkstra, explodes to the 250 k pop cap, falls back to `simp(fallback())`
  (a straight line) → that straight-line fallback is what crosses other cards. So the pop-storm and the crossings
  have **the same cause**. No failure is an endpoint/disconnection problem (buckets a/b/c = 0).

## 1. Target (rev.3)
- **Range:** 0 … <100 positions (design for ~99; the mock3 scene and the 50-position 1-cohort scene must not
  regress — distinct scenes, §0). **Exactly 100 is out of target** (the horizon is strictly <100): degradation at
  100 is not a regression (Q4 / plan-defense).
- **Quality:** 0/0/0/0/0 (§10.4) across the whole range — this is the primary acceptance, ahead of speed.
- **Perf:** WASM ≤50 ms (min-of-7, scratchpad build) across the range; native is only a proxy.
- Out of scope (backlog, with facts already captured): 500+, and the identical-speedup hybrid track
  (`_research-ds-hybrid-dg41.md` — confirmed it yields "seconds, not ≤50 ms"; only problem-statement changes help).

## 2. Posture — design-first, owner-gated
Owner said «Б, дивимось»: this is exploratory. The routing model is **not yet decided** — corridors / bundling /
lane-reservation / hierarchical routing are candidate shapes, not a settled algorithm. So rev.3 does **not**
pre-commit an implementation; it runs a design spike, brings a concrete model back to the owner, and only then
slices implementation. **No output-changing production code is written before the owner signs off the model (D1).**

## 3. Slices

**D0 — pin the <100 failure (measurement + design spike, NO production change).**
- On the 99-position scene (2 cohorts) specifically — not the 491 extrapolation — record **which** edges produce the
  4 crossings, and confirm each is a `fallback()` straight line from a capped/forced route (reuse the frozen S1
  observer; instrument in `mod tests` only, revert-proven as in dg41 diagnostics).
- **First-crossing location (N5):** `tidy_cohorts` only builds whole cohorts (50/99/148); locating the first
  `cross>0` between 50 and 99 needs a **partial-cohort constructor** (add the first `k` positions of a cohort, in
  the fixed mock3 order). D0 adds that constructor (test-only) and sweeps 50 → 99 to find the first crossing size.
  Until it exists, the only constructible points are 50 and 99 — the plan uses those and says so.
- **Operational router-vs-layout criterion (N1):** card-avoidance reachability (capdiag buckets a/b/c = 0) does NOT
  answer the crossing question — line-cross is a different predicate than card-hit. D0 must decide by a **measurable**
  test: for each crossing edge, does an orthogonal route exist that is simultaneously `seg_usable` (no card-hit) AND
  line-cross-free against the already-placed edges, within the available channel? If yes → the router failed to find
  it under cap (a **router** fix). If no such route exists at the current spacing → the **layout** is too tight (a
  spacing/placement fix, ADR-0002 geometry source — a different owner decision). D0 reports which, per edge.
- Output: a one-page mechanism note (`_redesign-spike-dg41.md`) — exact edge set, first-crossing size, and the
  router-vs-layout verdict per the criterion above.
- Gate: revert proof (`git status` clean on `packages/`), goldens untouched.

**D1 — routing model proposal + OWNER GATE (design doc, NO production change).**
- Propose ONE concrete model grounded in D0 (likely: reserve vertical/horizontal **corridors** for the recurring
  cross-dept families and **bundle** parallel same-family edges into a shared lane, so per-edge search is bounded to
  a corridor instead of the full grid). State: the routing contract change, what output changes, how 0/0/0/0/0 is
  guaranteed, expected pop bound, and the blast radius on the S1 frozen observers
  (`observed_routes`/`observed_astar`/`characterize` repeat `route_astar` logic — `_research-ds-hybrid-dg41.md` §S4 —
  and MUST move with any signature change or A6/A7 check a stale copy).
- **No-op-on-non-congested constraint (N4):** mock3 and small scenes stay byte-frozen (A1), yet the router changes
  output at scale — the only way both hold is that the new model is a **no-op on scenes with no capped/congested
  edge** (the current A\* already returns 0/0/0/0/0 there). D1 must state this explicitly and show the model reduces
  to the current routes when no corridor is contended; otherwise mock3 moves to a quality gate instead of byte-freeze.
- **Infeasibility exit (N2):** WASM ≤50 ms @99 needs ~16× fewer pops (820 ms → ≤50 ms) **together with** perfect
  quality. If D0/D1 show no reasonable model reaches both at once, the spike does **not** loop: it stops and
  re-negotiates target/scope with the owner (e.g. a lower position ceiling, or quality-first with a looser perf bar).
- **Malformed-input tolerance must not regress (Q1 / plan-defense).** `compute_staff_tidy_layout` returns
  `Result<_,String>` but production never returns `Err` — bad input is handled implicitly: an edge to a missing
  position indexes a `HashMap` → panic; an admin cycle recurses width/placement → stack overflow (not caught across
  the WASM boundary). The sibling engine has `tree_block_cycle_does_not_panic_and_places_all` + a missing-parent
  test; the Tidy path has **none**. A routing redesign re-architects the search and can silently drop that implicit
  tolerance. D1 must state the invariant: **the new model does not regress tolerance to cycle / duplicate-parent /
  broken-edge input — a cycle yields a visible no-panic result** — and D2 adds a Tidy panic-safety test mirroring the
  sibling's. (Full input *validation* with real `Err` returns is a separate, explicitly out-of-scope feature.)
- **Determinism of the new router must be asserted (Q3 / plan-defense).** Today determinism is tested only on fixed
  small scenes (`output_is_deterministic`, `mock3_astar_deterministic`) and the old path relies on total sort keys
  (`.then(a.to_id.cmp(...))`). A corridor/bundling/lane model can introduce tie-break nondeterminism via `HashMap`
  iteration over contended edges that no quality assert would catch. D1 must require a **total order on contended
  edges/corridors**, and D2 adds an acceptance: **two runs of a scale scene (99) serialize byte-identically**.
  (Incremental/edit-mode recompute caching is a separate feature → out of scope here.)
- **Blind critic BEFORE any code (R6):** `plan-critique` on the D1 model; RED blocks implementation.
- **Owner decision:** the model changes routing output → owner signs off (or an ADR under `docs/adr/`) before D2.

**P0 — placement-existence prototype (test-only, revert-proven, BEFORE any ADR or production code).** Closes rev.4
critique B1/B4: prove (or refute) that a *principled* ordering reaches the target, before committing D2/ADR.
- Implement principled crossing-minimizing ordering as INPUT transforms fed to the real engine (reuse the probe
  approach, but with deterministic keys, not random): department-column order and within-parent sibling order keyed
  by the **barycenter/median** of each node's cross-structure (ast) edge endpoints (classic Sugiyama ordering).
- **B3 variants to TEST (owner handed this to testing, not a question):** (a) declarative input order is an
  authoritative contract → ordering may only **tie-break**, never override; (b) input order is a default →
  ordering may fully reorder siblings within a parent. Measure both.
- Measure cross on 60/75/85/99/124 for each variant. **Decision rule (BN2 fix: gate on ≤99, the horizon; 124 is a
  reported stress above <100, not a gate):** if a principled variant reaches **0 at 99** → existence proven, D2
  proceeds with A3=0 and that variant's authority rule. If not → placement only reduces; record the minimum and
  **escalate** (A3 lowered to `min < baseline`, or placement + secondary router, or re-scope) rather than claim 0.
- **BN1 (P0↔D2 must test the SAME mechanism):** the guard is **whole-output** (accept a full ordering only if its
  total cross is strictly lower), NOT per-move — a per-move guard greedily stuck above 0 would make P0=0 fail to
  translate to D2=0. P0 tests exactly the guarded whole-output mechanism D2 would ship.
- Gate: revert proof (`git status` clean on `packages/`), goldens untouched. This is stage-2/3 research → pre-code
  checkpoint N/A (no product mutation), same exemption as D0/D1.

**🔴 P0 OUTCOME (ran 2026-11-07, `_design-d1-model-dg41.md` §5c) — existence NOT proven → D2 BLOCKED on owner scope.**
Principled barycenter ordering (FREE and whole-output GUARDED, 8 sweeps) did **not** reach 0: 85 → 1, **99 → 2**,
124 → 6. It only *reduces* (99: 4→2), and is **not better** than the random 80-perm search (which hit 85→0 as an
unstable sample but 99→2, 124→3). So on the synthetic 10×mock3 scene, **0/0/0/0/0 at <100 is not achieved by any
tested lever** — routing (harmful/neutral) nor placement (reduces to 2 at 99). Per the decision rule → **escalate**.
Two explanations, both a **scope decision reserved to the owner** (not an autonomous fork):
(1) the synthetic 10×mock3 scene is a pathological topology a real <100 ШПС (still being populated; real = 11
positions, 0 crossings) never creates → the target on it is the wrong goal; or (2) an irreducible crossing floor on
dense cross-dept topologies → re-agree A3 (`min < baseline`, exact solver, or a data-shape constraint). **D2 stays
BLOCKED until the owner picks a scope.** (BN1/BN2 above are now moot for this cycle — P0 ran and refuted existence —
but kept as the rule if the track revives on real data.)

**P0b follow-up (hill-climb, `_design §5d`):** a stronger search than barycenter/80-perm (hill-climb, 120×2) still
floors at **2** at both 85 and 99 — the random 85→0 was a one-off fluke, not reproduced. Three independent methods
(barycenter / random / hill-climb) converge on a crossing-floor ~2 at 99. This strengthens the BLOCKED verdict: 0 is
not readily reachable by placement on the synthetic scene. Escalation options for the owner are in `_design §5d`
((1) deem the synthetic scene unrepresentative → pause until real <100 data; (2) re-agree A3; (3) exact solver —
disproportionate). **Not an autonomous decision; the track is paused on this scope call.**

**P0c — owner's reserve-space idea (`_design §5e`) is the BEST lever found.** Giving routing more reserved space
(params pad=24 / lane=24) drops 99 from 4→**1** and keeps 50 at **0** — beating placement-reorder (floor 2) and
routing (≥4, harmful), and it is the cheapest (a layout-param change, no extra A*). The single residual at 99 is
`cto-0→ib-0 × cto-1→bi-1` — from `cto`'s cross-dept children (ana+sec), NOT a dual parent (dup edges=0; the 2
dual-parent nodes da-0/da-1 were resolved by the space). Real ШПС has 0 dual parents → the da-type crossings are a
synthetic artifact; at the real ~11–50 scale the engine already gives 0. **Quality ranking (99): reserve-space 1 >
placement-reorder 2 > baseline 4 > routing 4/7/12.** D2 mechanism candidate = reserve-space; the residual-1 is a
synthetic cto-pattern (owner to decide: accept real→0, or targeted cto-lane reservation to crack the last one).

**D2 — PLACEMENT redesign (rev.4 primary track; GATED on P0 reaching 0; first product mutation → pre-code checkpoint).**
Goal: a **principled crossing-minimizing sibling/column ordering** in the Rust layout calculation so cross-dept
and secondary edges (`ceo→da`, `cto→bi`/`ib`, `cfo→ah`) do not end up interleaved. Grounded in A/B evidence
(placement reached 0 at 85 by random search; routing cannot). Likely a Sugiyama-style ordering pass over siblings
within a parent and/or department-column order, driven by the edge set that would otherwise cross.
- **Contract/output:** changes card x/y (placement), hence ast edge geometry, by design; det tree unchanged in shape.
  Governed by ADR-0002 (geometry in the Rust calculation) → an **ADR** is required (new lasting decision: placement
  now considers cross-structure edges, not just the primary tree). Author drafts; owner/operator accepts (Factory §4).
- **No-op mechanism (B2 — the hard part, defined, not assumed):** declarative order is the **base**; the ordering
  pass reorders a sibling/column **only when the move strictly reduces the global crossing count**. On a scene that
  already has 0 crossings (mock3, ≤50), no move strictly reduces → the pass is a **no-op** → placement unchanged →
  byte-identical output. This is a required invariant, tested directly: a test asserts the reorder pass is a no-op
  (byte-identical) on mock3 and the 50-position scene. (A plain barycenter/median pass does NOT preserve input order,
  so the strict-reduction guard is load-bearing, not cosmetic.)
- **Acceptance (carries rev.3 gates):** mock3 and the 50-position scene **byte-frozen** (A1) via the no-op mechanism
  above; quality **0/0/0/0/0 on 60/75/85/99 — CONDITIONAL on P0** (if P0 shows 0 unreachable, A3 becomes
  `cross < baseline` + owner re-agreement, B1); **124 is a stress case above the <100 horizon — reported, not a hard
  gate** (N4); determinism — two runs byte-identical + total order on reordered siblings (A10); no-panic on
  cycle/dup/broken (A9); large goldens regenerated **only** in the D2 commit (A8). **Synthetic-scene caveat (N3):**
  the A/B cases are 10×mock3 cohorts; 0 on them proves the mechanism for that topology, not for a real <100 ШПС of
  different shape — acceptance states this and defers real-data validation to when such data exists.
- **Perf:** placement is cheap (ordering, not search); re-measure WASM ≤50 on the range (A4). The build_grid mask cost
  (separate perf item, `_scale-wasm-dg41.md`) stays a backlog item, not gated by D2.
- **Secondary (only if residual):** channel+dogleg router (`_design-d1-model-dg41.md` §2) if principled placement
  leaves crossings on some case; its own D-slice with its own gate.
- **Protocol:** dg41 temporary (Claude writes while Codex at limit until 2026-11-11): working file, no commit without
  independent coordinator verification, blind critic per R6 **before** code, independent review AFTER each step.

**Before D2 — pre-code checkpoint (Factory Full route, mandatory).** In this record: scope/acceptance (above),
proportional grilling + owner decisions (the pivot, logged), dependencies/one-writer (task branch, this checkout),
scoped impact (which Rust placement fns change, file:line), the independent planning gate (blind critic on rev.4),
READY/BLOCKED. Probes were stage-2/3 research (checkpoint N/A); D2 is the first product mutation and needs it.

## 4. Goldens & gate (changed by rev.3)
**B1 — the gate must actually assert and actually run.** The scale harness as it stands is NOT a gate: `tidy_scale_row`
is `#[ignore]` + `println!` only (no assert), the large goldens are `#[ignore]` too, and CI / `test:rust` run
`cargo test` **without `--ignored`** (`.github/workflows/ci.yml:40`, `package.json:23`). So today the only enforced
quality gate is `mock3_astar_zero_crossings_and_card_hits` (~11 positions). rev.3 therefore specifies gates by phase:
- **Pre-D2 (D0/D1, engine known-broken >50):** the only enforced quality gate is **mock3** (CI default). The scale
  harness stays measurement-only (`println`) on purpose — asserting `0/0/0/0/0` at 99 would fail on today's engine,
  which is expected, not a regression. No false gate is claimed in this phase.
- **At the D2 slice that lands the new router** (when 99 becomes 0/0/0/0/0): add an **asserting** scale test
  (`cross==over==card==near==dept==0` at 50 and 99, plus the first-crossing size D0 found) and a WASM/native perf
  bound, AND wire them into CI — either a dedicated `cargo test --release -- --ignored` step or a mid-size scene
  small enough to run in the default suite. From D2 on, the <100 range is CI-guarded; before that it is not, and the
  plan does not pretend otherwise. (CI-workflow edit is part of the D2 slice, not D0/D1.)
- The S1 large-scene goldens (`realistic`, `det_only_500`) encode the **current broken** output (cross=1350). Under
  Б the new router changes them **by design** → they stop being byte-identity gates and are regenerated
  (`DG_TIDY_GOLDEN_WRITE=1`) **once, at the D2 router slice**; their gate becomes the quality metric + perf above.
- **mock3 and the small/adversarial scenes stay byte-frozen** and remain hard correctness gates across every phase.

## 5. Side effects · migration · rollback
- Side effects: output of the Tidy path **changes by design** at scale; but the path is opt-in (`staffAlphaMockup`
  default false) and pkg/dist are not rebuilt → no host-visible change until a coordinated `build:wasm` (announce
  first — shared dist = host deploy). mock3-and-under output is held identical.
- Migration: none (internal; host not yet consuming the Tidy path).
- Rollback: revert the D2 slice commit. The regenerated large-scene goldens live **in that same D2 commit**, so one
  revert restores code + goldens together (Q5 harden / plan-defense); mock3/small goldens + the scale harness stay
  as the regression guard.

## 6. Acceptance
| # | Scenario | Check |
|---|---|---|
| A1 | mock3 + small/adversarial goldens byte-identical after every slice | cargo test |
| A2 | §10.4 0/0/0/0/0 on mock3 | cargo test |
| A3 | scale quality = 0/0/0/0/0 at 50, 99 and the first-crossing size (primary acceptance) | **asserting** scale test added at D2 + CI step (not the println-only `tidy_scale_row`) |
| A4 | scale 99 **WASM** ≤50 ms (min-of-7, scratchpad build); node is a proxy, **browser is the decisive measure** (N3) | node timing + ignored test; browser check before declaring A4 |
| A5 | no clippy warnings, rustfmt clean on changed files | CI parity |
| A6 | D0/D1 produce no production diff (revert-proven) before owner sign-off | git status on packages/ |
| A7 | frozen S1 observers updated in lockstep with any `route_astar`/`astar` signature change | cargo test (observer == production) |
| A8 | large-scene goldens regenerated ONLY at the D2 router slice, never silently in D0/D1 | git diff on fixtures dir |
| A9 | Tidy path does not panic on cycle / duplicate-parent / broken-edge input (mirrors sibling's cycle test) | cargo test (added at D2) |
| A10 | two runs of the 99-position scene serialize byte-identically (new router is deterministic) | cargo test (added at D2) |

## 7. Open (owner, at D1)
- Corridor/bundle vs. an alternative routing model — decided at D1 on D0 evidence.
- If D0 shows the **layout** is too tight for any clean route at <100 (not just the router failing under cap), the
  fix moves to spacing/placement (ADR-0002 geometry source) — a different owner decision than routing.

### Non-blocking carry-list for D1/D2 (from both gates, GREEN-after-fix)
- **Browser WASM-measurement method (N3, strongest):** A4 names the browser as decisive but neither plan nor repo
  defines a browser-timing harness; the CI perf bound will be native/node proxy. Name the browser method before
  declaring A4 at D2.
- **Contended-edge reference order (N1):** the D0 "already-placed edges" set is pass-dependent (routing runs 5
  passes); D0 must fix which pass/order the non-crossing criterion is evaluated against.
- **First-crossing size caveat (N5):** a partial cohort breaks report integrity (orphan parent/lead/member) and
  `cto-k→bi-k` appears only at specific positions, so the swept "first-crossing size" may be a sampling artifact —
  the core diagnosis stands on the full 99-scene; treat the swept size as indicative only.
- **CI step scope:** `cargo test --release -- --ignored` runs ALL ignored (perf@500, 148-cohort ~3.2 s) → use a
  named filter for the scale gate, not a blanket `--ignored`.
