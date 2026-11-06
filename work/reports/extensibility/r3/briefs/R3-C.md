You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. ⚠️ You are the ONLY coder touching OrgHierarchyDiagram.ts/index.ts/docs/USAGE.md now (coordinator-serialized). Keep edits minimal/localized to R3. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY: `npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.nodeview`. On `listen EPERM` rerun; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r3/_impl-R3-C.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST (R3-A + R3-B LANDED): render/nodeViewFactory.ts (`NodeView`, `NodeViewInput`, `NodeViewContext` types), render/DiagramRenderer.ts `setNodeViewFactory(f: NodeView | null)` (the seam R3-B added — read its exact signature). Plan work/reports/extensibility/r3/plan.md §3/§4 R3-C. Facade: OrgHierarchyDiagram.ts (create/config, how other render config reaches the renderer), index.ts, docs/USAGE.md.

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, packages/sdk/src/index.ts, docs/USAGE.md, packages/sdk/src/OrgHierarchyDiagram.nodeview.test.ts (new).

TASK R3-C — facade config for the node-view factory + public surface. TDD: failing tests first, RED, implement, GREEN. Opt-in: no nodeView → renderer uses PersonNodeView (byte-for-byte).

1. Add `nodeView?: NodeView` to `OrgHierarchyConfig`. In create/mount, call `renderer.setNodeViewFactory(config.nodeView ?? null)` (match R3-B's exact signature). Null → PersonNodeView path (byte-for-byte, AC4).
2. Barrel (index.ts): export the public types `NodeView`, `NodeViewInput`, `NodeViewContext` (and `SimpleNodeView`/`RetainedNodeView` if R3-A exported them) from render/nodeViewFactory.js.
3. docs/USAGE.md: document `nodeView` — the two forms (simple `(node,ctx)=>Container`, retained `{create→{root,update,destroy}}`), that the host returns a LOCAL-coord visual and the SDK does placement, the retained pool updates by id, and that without nodeView the built-in card is used (opt-in). (check:docs: any new public OrgHierarchyDiagram METHOD must be in USAGE — `nodeView` is a config field, not a method, but document it in the config section.)

Tests (OrgHierarchyDiagram.nodeview.test.ts): config.nodeView reaches renderer.setNodeViewFactory (spy/inspect); no nodeView → setNodeViewFactory(null) (byte-for-byte); types exported from barrel. Each red-if-deleted.

Done = your files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass; USAGE additions present. STATUS line last.
