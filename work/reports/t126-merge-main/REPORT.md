# In-progress merge resolution

## Done

Scope: merge `main` (`0a42daa`) into `feat/t126-staff-rust-geometry` (`9d8c6ea`), without committing.
Preserve main's per-card sizes and visibility pruning, feature's Tidy naming and adaptive wrapper.
Resolved Rust input and SDK input-builder conflicts. Adapted feature routing observation helpers to
per-card dimensions and main's stats signature. Retained both distinct golden fixture suites,
renaming the per-card fixture reader to avoid duplicate `golden` definitions. Added empty sizes
to the three feature fixture constructors. Generated bindings and WASM were rebuilt with npm run build:wasm, never hand-edited.
Cargo fmt also normalized indentation in packages/core/tests/multi_source_parent.rs.

## Tested scenarios

All requested checks passed:
- cargo test: 224 unit + 9 integration passed; 6 existing ignored tests; no failures.
- All three adaptive tests and both golden fixture suites passed. tidy_cohorts and the ignored
  tidy_scale_row timing harness retained; timing harness was not run.
- cargo clippy --all-targets -- -D warnings: passed.
- cargo fmt, then cargo fmt -- --check: passed.
- npm run build:wasm and npm run build: passed.
- npm run typecheck: passed (SDK, demo, E2E types).
- npm test: SDK 1596 passed, demo 135 passed, no failures.
- npm run check:docs: passed.
Logs: /tmp/dg-merge-{cargo,clippy,wasm,build,typecheck,npm-test,docs}.log.
WASM tooling and Rstest needed sandbox escalation (cache/tooling access and localhost binding).
The generated ts-rs declaration retains generator-produced trailing whitespace; not hand-edited.

## Non-obvious findings

Feature observation/cap-budget tests had old cw/ch routing fields even though production routing
had merged to dims. Both must use the same model for characterization tests to remain meaningful.
The wasm JS export name computeStaffMockupLayout is intentionally unchanged.

## Screenshots

Not applicable: merge integration; no new UI design.

## User-flow walkthrough

Existing staff geometry keeps per-card sizes and expanded-position visibility; adaptive layout
and scale/cohort characterization remain in the Tidy engine.

## Remaining work

No implementation work remains. Resolutions are staged for review; merge is uncommitted.
Unrelated tracked edits and pre-existing untracked WIP are preserved.

## Post-deploy

Not deployed; explicitly leave merge uncommitted for review.
