# Recovered 4-library vision — from closed session fb501e75 (2026-10-24)

> Recovered by reading the closed Claude transcript
> `~/.claude/projects/-Users-strelia-projects-cassiopeia-cassiopeia-admin-ui/fb501e75-2828-46e6-b30e-9b2a33de518d.jsonl`
> (cassiopeia-admin-ui session, 2026-10-24 22:06, 5.4 MB). Line refs below are JSONL line numbers.
> NOTE: the transcript-mining subagent searched dg-Claude + codex and returned negative — it did
> NOT have this cassiopeia transcript in scope. Found via distinctive-phrase grep over cassiopeia transcripts.

## Owner's own words (line 1567, verbatim)
«от того я хотів зробити бібліотеку для діаграми яка б складалась з [4] частин
1 аналог dagre/elk
2 аналог react Flow
3 canvas підкладка коли великий зум
4 оркестратор який буде цим всім керувати
ми може розбити проєкт на такі частини аля бібліотеки в бібліотеці
але спочатку [AI Factory connection task pasted]»

→ This is why THIS session (6dbecb0f) opened with the AI Factory task: the 4-lib split was parked behind "але спочатку". "Повертаємось" = resume the split.

## Agreed interpretation (line 1573, assistant restatement accepted in that session)
The split RESOLVES the A/B render-model tension (canvas vs DOM): have BOTH, switch by zoom.
1. **#1 layout (dagre/elk analog) = our own `dg-tidy` WASM layout, ALREADY EXISTS**, made size-aware by the Ф1 per-node w×h work. NOT "adopt dagre/elk" — our headless layout plays that role. (React Flow does not lay out trees itself; it needs an external layout — ours.)
2. **#2 React (React Flow analog) = DOM/React nodes for CLOSE zoom**: pixel-parity with mockup + a11y.
3. **#3 canvas підкладка = FAR zoom / large tree** where DOM can't cope (the existing Pixi renderer).
4. **#4 orchestrator = decides who draws NOW + feeds layout with sizes.**
- "бібліотека в бібліотеці" = monorepo packages. (Matches this session's decision: one repo for now.)

## Arc of the discussion (source lines)
- 1235 (USER): layout recomputes on every mutation; node set is DYNAMIC (expand/collapse, lazy-load, redraw new) → re-layout per expand is the norm; sizes needed for NEW nodes as they appear. Offered to record video of GoJS + React Flow behaviour.
- 1261/1281 (asst): persistent measured-size cache with reconciliation; measured element MUST equal drawn element (React cards, ResizeObserver) → removes the "two SSOT" problem of HTML-twin + Pixi.
- 1490 (asst): ADR-0079 (Draft) assembled. Videos showed ШПС/org hierarchies: ortho connectors, per-node expand/collapse (footer `N [M]` + chevron), lazy-load pagination, re-layout per expand, variable-height/uniform-width cards, pan/zoom. ⚠️ ШПС video was GoJS 3.1 **evaluation license** ("Not for distribution or production use") → real ship blocker → move off GoJS justified by license, not just parity; already swapped to dg (ADR-0078).
- 1510 (USER, context-continuation summary): task 4311 origin — push per-node w×h into Rust tidy layout so ШПС matches mockup; standing constraints (respond UA; push-hold ALL Ф1 — nothing committed/pushed without explicit "go"; off-center visualEdgeBox bug separate & owner-gated; Cass2=writer, shared HEAD/node_modules/Storybook:6006 with Cass1; vendored dg swap temporary, must be restored).
- 1535 (USER): "Простіше взяти бібліотеку для розрахунку координат + react flow" — the seed that became the 4-part vision.
- 1554 (asst): A/B/C in plain terms — A=keep Pixi-canvas (compute sizes); B=React-DOM nodes + coordinate lib (React Flow does measure/virtualize/pan-zoom; dg-tidy feeds coordinates); C=A then B.
- 1573 (asst): the accepted 4-part restatement (above) + "lands in ADR-0079 as chosen direction".

## Links / supersession
- ADR-0079 (Draft) `docs/adr/0079-shps-node-render-model-and-card-size-source.md` (in cassiopeia-admin-ui) — variants A/B/C of render-model & card-size-source. The 4-lib split is the "both + switch by zoom" answer that unifies A+B. → fold this vision in as the chosen direction.
- ADR-0078: dg stays an external library (not under modules/); GoJS→dg swap.
- ADR-0034 (stay on GoJS) superseded by 0078 + the eval-license finding.
- dg-tidy = `computeOrgRowTreeLayout` (pure Data→positions, WASM) — the headless size-aware layout brain that survives any renderer change; Ф1 per-node w×h channel is exactly what carries React-measured sizes into it.

## Caveat
Owner framed #1 as "аналог dagre/elk" but the agreed mechanism is OUR dg-tidy, not adopting ELK/dagre. ELK.js was separately considered ONLY for ШПС line ROUTING (Variant B of a different decision), not as the layout lib here — do not conflate.
