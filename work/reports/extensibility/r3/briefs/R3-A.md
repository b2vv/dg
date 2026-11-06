You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. OTHER coders work IN PARALLEL on react/* (R2) and packages/core (R11) — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- nodeViewFactory`. On `listen EPERM` rerun with needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r3/_impl-R3-A.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r3/plan.md (rev.2 §1, §3, §4 R3-A, §6 rows 2,3,8,10,11,12) + spec.md. Code: packages/sdk/src/render/transition/* for the pure-module style; NodeRef/LodLevel/NodeTheme types; Pixi Container.

YOUR FILE (exclusive, NEW): packages/sdk/src/render/nodeViewFactory.ts + render/nodeViewFactory.test.ts. (R3-B wires it into DiagramRenderer; do NOT touch DiagramRenderer/PersonNode here.)

TASK R3-A — PURE node-view-factory types + retained pool manager + mark-and-sweep. TDD: failing tests first, RED, implement, GREEN.

Export:
- Types: `NodeViewInput { kind: 'position'; id: string; data: DiagramPerson | undefined; position: DiagramPosition }`, `NodeViewContext { lod: LodLevel; theme: NodeTheme }` (read-only, NO scene coords), `SimpleNodeView = (node, ctx) => Container`, `RetainedNodeView = { create(node, ctx): { root: Container; update(node, ctx): void; destroy(): void } }`, `NodeView = SimpleNodeView | RetainedNodeView`.
- `normalizeNodeView(v: NodeView): RetainedNodeView` — wrap a simple fn into {create→{root=fn(node,ctx), update=(n,c)=>{ **destroy old root children first** then rebuild via fn}, destroy=()=>root.destroy({children:true})}}. (N3: recreate must destroy old children to avoid Pixi leaks.)
- `class NodeViewPool` — holds `create`d entries by `kind:id` key. Methods: `obtain(key, node, ctx): Container` (create if absent else `update` the existing entry and return its root — AC2: update-not-recreate), `beginPass()` / `markSeen(key)` / `endPass()` doing MARK-AND-SWEEP: on endPass, `destroy()` every pooled entry whose key was NOT seen this pass (N1). `clearAll()` destroys everything (for renderer teardown).
- **Error containment (B2):** every call into host `create`/`update`/simple-fn AND the pooled `destroy()` is wrapped so a throw / null / non-Container return is caught → return null (caller falls back to PersonNodeView) + warn-once-per-key via a Set. A throwing host `destroy()` during sweep must NOT abort the sweep loop (catch per entry).

Tests (nodeViewFactory.test.ts): normalize simple-fn → create/update(destroys old children)/destroy; pool obtain → create first, update second (same instance, root identity stable); mark-and-sweep → unseen key destroyed, seen key kept+updated (not recreated); reappear-after-destroy → new create; a throwing create/update/destroy is caught (returns null / sweep continues), warn once; non-Container return caught. Use lightweight fake Containers/factories. Each red-if-deleted.

Done = your 2 files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
