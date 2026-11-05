Model ID: claude-opus-4-8

NEXT: read full `git --no-pager diff` and `git status` untracked R5 files (marquee.ts, DiagramRenderer, OrgHierarchyDiagram, USAGE.md, index.ts).

FACT: marquee.ts (render/marquee.ts:1-41) = 3 pure fns + 1 interface. No WASM, no deps. KISS-clean, no premature abstraction. Inclusive intersection + 4px drag threshold.
FACT: barrel index.ts:1 adds `export type { MarqueeRect }` only — no ForTests, type-only.
FACT: import hygiene OK — `./marquee.js` (.js ext), `type FederatedPointerEvent` inline, `import type { MarqueeRect }` in facade.
FACT: callHostCallback signature changed variadic→(args array, onError?). All 4 call sites updated (OrgHierarchyDiagram.ts:529,751,1089,1495). Private method, only that file. typecheck clean per context.
FACT: OPT-IN verified. Facade installs sink ONLY under `if (config.onMarquee)` (OrgHierarchyDiagram.ts:518). Renderer `down` returns early unless `marqueeSink && e.shiftKey && e.button===0 && target∈{stage,root}` (DiagramRenderer.ts:675-685). No sink / no shift → no stopPropagation → bindPan pans unchanged.
FACT: pan-suppress ordering real. PixiHost.ts:334 renderer.mount() registers marquee pointerdown BEFORE bindPan (line 347) on same stage → stopImmediatePropagation blocks pan. Both listeners confirmed on app.stage.
FACT: Adversarial — pan suppressed Shift+sink (test l47-65 transform unchanged) AND NOT suppressed otherwise (test l67-77 both plain-drag-with-sink and shift-drag-without-sink pan to {30,40,1}). Genuinely distinguishing.
FACT: Adversarial — UNION not replace: facade test l86-100 preselect A, marquee[B,C,B,A]→[A,B,C] dedup+order; then C alone + marquee B →[C,B]. Replace would fail. Real replaceMany→onSelectionChange path.
FACT: Adversarial — tapAfterDrag suppresses deselect: renderer test l91-103 genuine drag → onCanvasClick NOT called (removing guard fails l98); below-threshold l79-89 → onCanvasClick called once (guard specific not blanket). Flag reset at top of every `down` handles missing-tap case.
FACT: throw-isolation test l68-84 — warnOnce once, console.error not called, selection still runs. onSelect independent of onRect throw.
FACT: destroy clears sink (OrgHierarchyDiagram.ts:2658 setMarqueeSink(null) guarded by marqueeWired); renderer destroy detaches listeners + nulls sink (DiagramRenderer.ts:1090-1093). Facade test l53-66 confirms retained cbs inert after destroy.
FACT: No lint-disable / @ts-ignore / as any in any R5 file. lint exit 0, 0 warnings. 47 marquee tests pass, 0 fail.
NONBLOCKING: USAGE.md §9 edit replaced a Ukrainian sentence with English inside an otherwise-Ukrainian paragraph (next sentence stays UA) — mixed-language paragraph. New §6 marquee block is fully English (consistent with being new). Cosmetic, not a gate.
NONBLOCKING: USAGE doc says rect emitted "every frame during the drag" — actually per `globalpointermove`, not per rAF frame. Behaviorally harmless imprecision.
OBSERVATION: marquee stage listeners are registered in mount() unconditionally (even without opt-in); sink-null gate makes them no-ops. Simplest design, KISS-acceptable, negligible cost, pan byte-for-byte preserved.

DECISION: VERDICT GREEN. No blocking standards findings. Opt-in byte-for-byte preserved and tested on both the no-sink and shift-without-sink paths; tests are real (live Viewport, real event dispatch, real store) and the three adversarial guards each have a test that would catch their removal.
