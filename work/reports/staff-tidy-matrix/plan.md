# plan — 1b: matrix/headless coverage on the tidy staff engine (HOW)

> 🟡 **DEFERRED (owner, 2026-11-07):** staff have no user coordinates yet (future capability). Matrix/headless =
> test fixtures only; real staff is always tree → already on tidy. This plan is kept for when staff coords land.
> GATE 2 not completed. Do NOT implement now.

**Spec:** `spec.md` (GATE 1 passed; R1 resolved = SDK-derived role). **Umbrella:** T126 · **Branch:** `feat/t126-staff-rust-geometry`.
**Implementation author:** **Codex** (`codex exec`, limit reset 2026-11-07) — Claude plans + reviews.

## Placement
- **Engine:** `packages/core/src/staff_tidy_layout.rs` (new matrix-placement path) + `packages/core/src/types.rs`
  (`StaffPositionInput` gains an optional coordinate field). Geometry stays in Rust (T126 mandate).
- **SDK:** `packages/sdk/src/render/staffLiveGeometry.ts` (route matrix/headless to the tidy path) +
  `packages/sdk/src/render/buildStaffLayoutInput.ts` (carry gridCell into the tidy input). Matrix **role** stays
  SDK-derived (R1) — no engine output change.

## Reuse-first
| Reuse | What | Why it fits |
|---|---|---|
| `isGenuineTreeScene` logic | the matrix-vs-tree decision (authored coords + no hierarchy) | port the SAME predicate to Rust so routing matches the SDK exactly; no new heuristic |
| `StaffPositionInput` (`types.rs`) | add optional `grid_cell` like the existing optional `order` | additive, serde `skip_serializing_if = None`; tree scenes never set it → byte-identical |
| `GridCell` (TS `data/types.ts:150`) | the authored cell shape | already the host's coord model; mirror `{row,col}` (or x/y) in Rust |
| `adaptStaffGeometry` / SDK role derivation | matrix role (drag=move) | unchanged — R1 keeps role in the SDK |
| tidy output `StaffTidyNode` | id/x/y/w/h | **no change** — engine returns coords only |

**New:** (1) `grid_cell` field on `StaffPositionInput`; (2) a matrix branch in `compute_staff_tidy_layout` that, when
the scene is headless-matrix, places each seat at its authored cell→pixel coordinate (via the same metrics the tree
path uses) instead of running the tree layout; (3) a Rust matrix-scene predicate mirroring `isGenuineTreeScene`;
(4) SDK wiring to pass `gridCell` and route matrix/headless to tidy.

**Why not extend the tree path:** matrix seats have no hierarchy; forcing them through tree layout is exactly the
FORK2 regression ("cannot resolve staff head"). A distinct, guarded branch is required.

## Open questions resolved
- **R2:** coords enter via a new **optional** `grid_cell` on `StaffPositionInput` (additive; `None` for tree).
- **R3 (measure in T1):** count the matrix/headless fixtures/goldens that currently go through `computeViaTs`;
  define the "same grid" tolerance (target: seat coords equal to `layoutStaffCanvas` within ε, ε fixed in T1 from
  the actual outputs). Sizes the golden rebaseline.
- **R4:** headless = no resolvable head → the matrix branch must NOT call head resolution; it places purely by
  authored coords. A headless scene with missing coords is an input error (documented), not a panic.

## Side effects
- Tree scenes: **none** — `grid_cell` absent → tree path unchanged → existing goldens byte-identical (hard gate A1).
- Matrix scenes: output now comes from tidy instead of `computeViaTs`; must match `layoutStaffCanvas` within ε
  (A2). The SDK still derives the matrix role, so the drag contract (move, not re-parent) is unchanged.
- WASM↔TS contract: `StaffPositionInput` gains an optional field → regen `rust-types.ts` (additive; no breaking change).
- Delivery: reaching the host needs a WASM build → cass-13 (announced step, as for D2).

## Migration plan
1. Add `grid_cell` to the Rust input + regen TS types (additive).
2. Add the Rust matrix branch + predicate; tree path untouched.
3. SDK: pass `gridCell`, route matrix/headless to tidy; keep `computeViaTs` in place (dual) until A2 proves parity.
4. Golden rebaseline of matrix fixtures (only after parity measured). `computeViaTs` removal is OUT OF SCOPE (the
   next step, removal-gate).

## Rollback
- Revert the slice commit(s). `grid_cell` is additive (unused if reverted). `computeViaTs` stays live throughout, so
  a revert leaves matrix scenes served by the legacy path exactly as today — no host regression window.

## Constitution (manifest)
- `packages/core` judged by general Rust practice + CI gates (`cargo fmt --check`, `clippy -D warnings`, `cargo test`);
  no TS-Pocock rules on `.rs`. SDK TS by oxlint. Geometry single-source in Rust (ADR-0002). Determinism preserved.

## Acceptance (delegate `acceptance-spec`; table before tasks)
| # | Scenario | Precondition | Action | Expected | Verify |
|---|---|---|---|---|---|
| A1 | Tree scene unchanged | genuine-tree fixture | run tidy | output byte-identical to pre-1b | cargo test (frozen goldens) |
| A2 | Matrix seat placement | headless-matrix fixture (authored cells) | run tidy matrix branch | each seat at its authored cell coord, = `layoutStaffCanvas` within ε | cargo test vs captured TS coords |
| A3 | Headless no panic | scene with no resolvable head | run tidy | returns a matrix placement, no error | cargo test |
| A4 | Determinism | matrix fixture | run tidy twice | byte-identical | cargo test |
| A5 | SDK routing + role | matrix scene via SDK | computeStaffLiveGeometry | routed to tidy; seats carry matrix role (drag=move) | SDK test |
| A6 | Standards | changed Rust/TS | CI gates | fmt/clippy/oxlint clean | CI parity |
| A7 | Additive contract | — | regen types | `rust-types.ts` diff additive only (optional field) | git diff review |

## Tasks (outline; detailed in tasks.md after GATE 2)
T1 measure matrix fixtures + ε (research, no code) · T2 `grid_cell` field + types regen · T3 Rust matrix predicate +
placement branch (TDD) · T4 SDK routing + gridCell wiring · T5 golden rebaseline (matrix only) · T6 review.
Implementation by Codex; Claude reviews each.
