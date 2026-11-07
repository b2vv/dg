# spec — 1b: matrix/headless coverage on the tidy staff engine

> 🟡 **DEFERRED (owner, 2026-11-07): staff positions have NO user coordinates yet — "this will happen in the
> future."** Matrix/headless staff scenes (authored-coord seats, no hierarchy) are therefore only interaction/
> contract **fixtures**, not real data; every REAL staff scene is a tree, already covered by the tidy engine.
> Building matrix coverage now is premature (YAGNI). This spec/plan is kept valid for **when staff coordinates
> actually land** (edit-mode / authored placement). GATE 2 was not completed (stopped on this premise change).
> Consequence: the legacy-path removal (which this unblocked) is also deferred — see the live note reassessment.

**Topic:** staff-tidy-matrix · **Umbrella:** T126 · **Branch:** `feat/t126-staff-rust-geometry`
**Threshold:** ABOVE (new subsystem path in `packages/core` + WASM↔TS contract change) → full spec-flow.
**Intent only (WHAT/WHY); HOW arrives in plan.md.** Research: `_1b-matrix-tidy-scope-dg41.md`.

## Problem
The tidy staff engine (`staff_tidy_layout`) is **tree-only**: it lays positions out from the admin hierarchy.
**Matrix/headless** staff scenes — positions with authored coordinates (`gridCell`) and **no hierarchy** (no
`isHead`, no admin reporting line among the seats; drag = *move to a cell*, not re-parent) — are served ONLY by the
legacy `computeViaTs` (`layoutStaffCanvas`). This is removal-gate (2) of four in `staffLiveGeometry.ts:211-213`:
the legacy path (and the deprecated Rust modules) cannot be deleted until matrix/headless is proven on tidy.
History: the FORK2 migration routed everything through tree-only Rust and broke matrix fixtures with
"cannot resolve staff head" — this feature must not repeat that.

Why now: the tidy engine is the canonical direction (owner dg41); D2 adaptive reserve-space is deployed; matrix
coverage is the one prerequisite blocking tidy from becoming the single staff engine and the legacy path from
being removed.

## User scenarios
1. **Headless-matrix scene** (interaction/contract fixtures: authored-coord seats, no hierarchy): rendered via the
   tidy path, seats at their authored grid cells, drag = move. Today only `computeViaTs` does this.
2. **Genuine-tree scene** (golden demo tabs, real hierarchy): unchanged — already on tidy/Rust; must stay
   byte-identical (no regression from adding the matrix branch).
3. **Mixed/headless org with no resolvable head:** the engine must not throw ("cannot resolve staff head"); it
   produces a matrix placement instead.
4. **Host (cassiopeia) staff scenes** that are matrix today: identical observable layout after the switch.

## Acceptance criteria (observable; detailed table in plan.md via acceptance-spec)
- A matrix/headless scene laid out by the tidy path places every seat at its authored coordinate (same grid as
  `layoutStaffCanvas` produces), within tolerance to be fixed in plan.
- A genuine-tree scene's tidy output is **byte-identical** to before this feature (no regression; existing goldens
  unchanged).
- A headless scene (no resolvable head) does **not** panic/throw; it returns a matrix placement.
- Determinism: two runs of a matrix scene are byte-identical.
- The SDK can route matrix/headless to the tidy path and obtain a result whose seats carry the **matrix** role
  (drag = move) — role derivation per R1 (below).
- §10 quality on matrix scenes: matrix/headless scenes typically have 0 admin edges → routing is trivial or
  decorative; any edges present meet the same quality gate as tree scenes (0 crossings-through-cards, etc.).

## Out of scope
- Removing the legacy path / deleting the deprecated Rust modules (that is the *next* step, after this + golden
  rebaseline + cassiopeia coordination + enable-default; removal-gates 1/3/4).
- Enabling the tidy path as the host default (removal-gate 1 — a separate owner/deploy step).
- Org-level matrix (`computeMatrixLayout` for organizations) — unrelated subsystem.
- A* routing redesign, perf @500 (separate backlog).
- Edit-mode live reflow (separate feature).

## Open questions
- **R1 — RESOLVED at GATE 1 (owner, 2026-11-07): SDK-derived.** Clarified that "matrix" here is NOT the org-diagram
  grid (`computeMatrixLayout`, a separate subsystem) but the **staff-scene** matrix (positions with authored
  coords, no hierarchy, drag=move) — "another value". Owner's rule: "if matrix has another value, do the first
  variant" → the engine computes **coordinates only** (T126 mandate); the matrix role stays an **SDK derivation**
  from scene shape (`isGenuineTreeScene`). `StaffTidyNode` gains NO role field; tree-scene output stays
  byte-identical.
- **R2:** how are authored coordinates carried into the engine — a new optional field on `StaffPositionInput`
  (`gridCell`/x-y), or a separate matrix-scene input? (HOW — resolved in plan.)
- **R3:** how many matrix/headless golden/fixture scenes exist, and what is the exact tolerance for "same grid"
  (byte-identical vs within ε)? Needed to size the golden rebaseline.
- **R4:** does "headless" imply any seats without departments/edges that the current tidy invariants assume present?
