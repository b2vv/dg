You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Another coder (R5-B) works IN PARALLEL on render/DiagramRenderer.ts — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.marquee`. On `listen EPERM` rerun with needed permission; busy port → wait+retry. No external store. Package typecheck may error until R5-B lands its `setMarqueeSink` — call it by the §4.1 signature; report cross-task errors, don't fix R5-B.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r5/_impl-R5-C.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST (R5-A LANDED): packages/sdk/src/render/marquee.ts (`MarqueeRect`). Plan: work/reports/extensibility/r5/plan.md (§3 contract, §4 R5-C, §4.1 seam, §5 opt-in, §6 rows 1,2,5,6,11,14) + spec.md (AC2 always-additive, AC5, AC6 opt-in). Code: packages/sdk/src/OrgHierarchyDiagram.ts (host-callback pattern + callHostCallback for throw isolation; InteractionStore — `list`/`replaceMany`/`toggle`; selectMany ~:1858 is REPLACE-only, do NOT use it for union; the interaction opt-in ensureInteractionWired pattern from D1), index.ts barrel, docs/USAGE.md.

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, docs/USAGE.md, packages/sdk/src/index.ts, packages/sdk/src/OrgHierarchyDiagram.marquee.test.ts (new).

TASK R5-C — facade marquee wiring + public surface. TDD: failing tests first (RED), implement, GREEN. OPT-IN: full marquee only when the host provides `onMarquee` (no silent host change — D1 lesson).

1. Config `onMarquee?: (rect: MarqueeRect | null) => void` in OrgHierarchyConfig. When (and only when) it is provided, call `renderer.setMarqueeSink({ onRect, onSelect })`:
   - `onRect(rect)` → invoke the host's `onMarquee` via `callHostCallback` (throw isolation, F6; fires every frame during drag).
   - `onSelect(ids)` → **Shift-union**: add these ids to the current selection (NEVER replace). Build the union from `InteractionStore.list` + the marquee ids (dedup, preserve order) and apply via `replaceMany(union)` (selectMany/replaceMany are replace-of-set; you compute the union yourself — F7). Marquee is ALWAYS additive (F1b).
   - When `onMarquee` is absent → do NOT call setMarqueeSink (sink stays null → renderer marquee off, Shift+drag pans byte-for-byte).
2. `setMarqueeSink(null)` on destroy / teardown (no leak).
3. Barrel: export `MarqueeRect` type from render/marquee.js. USAGE: document `onMarquee` (world-rect callback, fires per frame during a Shift+drag marquee; host draws the rubber-band; marquee is additive multi-select; no behavior change unless provided).

Tests (OrgHierarchyDiagram.marquee.test.ts): with onMarquee → setMarqueeSink called; onRect forwards to onMarquee (and a throwing onMarquee is isolated — one warn, gesture continues); onSelect(ids) unions with existing selection (existing {A} + marquee {B,C} → {A,B,C}, never replaces); without onMarquee → setMarqueeSink NOT called (byte-for-byte); destroy clears sink. Use a fake/spy renderer seam if R5-B not yet landed, and note the deferral; otherwise the real renderer. Each red-if-deleted.

Done = your files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` (cross-task R5-B errors reported, not fixed) + `npm run lint` pass; USAGE additions present for check:docs. STATUS line last.
