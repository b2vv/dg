You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel`. On `listen EPERM` rerun with needed permission. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r4/_impl-R4-B.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST (R4-A LANDED, do not modify): packages/sdk/src/render/wheelConfig.ts (`WheelConfig`, `WheelBehavior`, `resolveWheelConfig`) and the Viewport wheel-config entry point R4-A added (read Viewport.ts to see HOW the resolved config / raw WheelConfig enters the Viewport — match that API). Plan: work/reports/extensibility/r4/plan.md (§3 contract, §4 R4-B, §6 row 12). spec.md. Code: OrgHierarchyDiagram.ts (how it constructs the renderer/PixiHost/Viewport and passes options like wheelIntensity today — follow the same plumbing path), index.ts barrel, docs/USAGE.md.

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, docs/USAGE.md, packages/sdk/src/index.ts, packages/sdk/src/OrgHierarchyDiagram.wheel.test.ts (new). Do NOT touch Viewport.ts / wheelConfig.ts.

TASK R4-B — facade wheel config + public surface. TDD: failing tests first, RED, implement, GREEN.

1. Add `wheel?: WheelConfig` to `OrgHierarchyConfig`. Plumb it through the create/mount path to the Viewport (same route as the existing `wheelIntensity`/viewport options). No config → Viewport uses its default ('zoom-modifier', panHorizontal:false) → behavior = current minus the removed Shift+wheel horizontal pan (owner-flagged, expected).
2. Barrel (index.ts): `export type { WheelConfig, WheelBehavior }` from render/wheelConfig.js.
3. docs/USAGE.md: document `wheel` config — the behavior modes ('zoom-modifier' default | 'zoom' | 'pan'), gestures.zoom ('ctrl' default | 'meta' | 'none'; on **Mac both ctrl and ⌘ zoom so trackpad pinch works, ⌘ recommended** — NOT an exclusive remap), panHorizontal (false default | 'shift'), keyboard zoom (Ctrl/⌘ +/−), and that the SDK exposes a STABLE gesture contract so a host's on-screen legend/hint stays accurate (the hint overlay itself is the host's responsibility). State the default-behavior change: Shift+wheel no longer horizontal-pans by default (opt-out via panHorizontal:'shift').

Tests (OrgHierarchyDiagram.wheel.test.ts): config.wheel reaches the Viewport (spy/inspect the plumbing); no wheel config → Viewport gets undefined/default; WheelConfig/WheelBehavior exported from barrel (type-level or a runtime re-export check). Each red-if-deleted. If the Viewport plumbing point from R4-A is unclear, read Viewport.ts to find it; only QUESTION+stop if R4-A genuinely exposed no way to pass the config.

Done = your files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass; USAGE additions present for check:docs. STATUS line last.
