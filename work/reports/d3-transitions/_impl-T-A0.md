NEXT: Check local guidance, existing changes, and plan section 3 before creating the two transition contract files.
FACT: Existing unrelated working-tree changes are present; they will be preserved. Initial guidance output exceeded the display limit.
NEXT: Read the exact constants section and verify target paths, branch, and no-emit scripts.
FACT: Branch is feat/d3-transitions; transition directory does not exist. SDK typecheck uses noEmit; lint is read-only oxlint.
DECISION: Preserve the supplied contract verbatim and add unit/rationale comments only to constants. The working log is the sole authorized file outside the two source additions.
NEXT: Read plan section 3 and create the two files.
FACT: Created types.ts verbatim from the task and constants.ts with all nine named exports and unit/rationale comments. No public barrel edits.
NEXT: Run the permitted SDK no-emit typecheck and repository lint, appending their complete output directly without pipes.

FACT: Full output of npm run typecheck -w @org-hierarchy/sdk follows.
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
FACT: SDK typecheck exit code: 0.
NEXT: Run repository lint.

FACT: Full output of npm run lint follows.
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
FACT: Repository lint exit code: 0.
NEXT: Inspect the complete check output and confirm the final change scope.
FACT: Both required checks passed with exit 0; their full stdout/stderr is recorded above. Final inspection confirms the supplied types and all constants, with instant absent from the preset map.
FACT: This task wrote only packages/sdk/src/render/transition/types.ts, packages/sdk/src/render/transition/constants.ts, and this authorized append-only working file. Existing unrelated changes were preserved; no build, emitting typecheck, barrel edit, branch change, commit, push, or external checkpoint write was performed.
STATUS: DONE — Both requested source files exist and SDK no-emit typecheck plus repository lint pass.
