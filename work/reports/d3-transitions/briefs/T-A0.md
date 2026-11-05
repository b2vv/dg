You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). Do NOT switch branches, create worktrees, commit or push.

🔴 packages/sdk/dist is shared LIVE with another project through a link. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or any tsc that emits. Allowed type check: `npm run typecheck -w @org-hierarchy/sdk` (it uses tsconfig.check.json with noEmit). Do not write outside the repo and the working file (no external checkpoint/handoff stores).

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-A0.md
Append AFTER EVERY STEP (append, not rewrite). First entry before your first tool call: a line `NEXT:` with what you will check. Labels FACT / DECISION / NEXT / QUESTION. English. Finish with exactly one status line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

TASK T-A0 — create the shared type contract for the transition module. Create exactly two files and nothing else:

1. packages/sdk/src/render/transition/types.ts — copy this contract verbatim (you may add TSDoc comments, no other changes):
```ts
export interface FrameClock { now(): number; requestFrame(cb: (t: number) => void): number; cancelFrame(id: number): void }

/** advance(dt) by a fixed step; settled = at rest by threshold (|Δ|<ε, |v|<ε), not by time. */
export interface Animator { readonly value: number; readonly settled: boolean;
  retarget(target: number): void; snap(value?: number): void; advance(dtSeconds: number): void }

export type AnimatePreset = 'smooth' | 'snappy' | 'gentle' | 'instant';
export type AnimateOption = boolean | AnimatePreset
  | { duration: number; bounce?: number }               // perceptual form (seconds, 0..1)
  | { stiffness: number; damping: number; mass?: number }; // physical form
/** Normalized result; null = no animation (off, 'instant', reduced motion, invalid). */
export interface ResolvedAnimate { stiffness: number; damping: number; mass: number; fadeMs: number }

export type TransitionPhase = 'entering' | 'updating' | 'exiting' | 'idle';
export interface TargetBox { key: string; x: number; y: number; w: number; h: number }
export interface FrameBox extends TargetBox { scale: number; opacity: number; phase: TransitionPhase }
export type TransitionFrame = ReadonlyMap<string, FrameBox>;

/** How a controller obtains animators (lets the controller be tested with fakes). */
export type AnimatorFactory = (kind: 'spring' | 'tween', initial: number, resolved: ResolvedAnimate) => Animator;
```

2. packages/sdk/src/render/transition/constants.ts — named exports:
`FIXED_DT = 1 / 60`, `MAX_STEPS_PER_FRAME = 6`, `EPS_POS = 0.5` (px), `EPS_VEL = 1` (px/s), `ENTER_SCALE_FROM = 0.9`, `SETTLE_CAP_MS = 750`, `ANIMATE_MAX_NODES = 2000`, `FADE_MS = 200` (opacity tween duration), and
`ANIMATE_PRESETS` = `{ smooth: { duration: 0.4, bounce: 0.1 }, snappy: { duration: 0.25, bounce: 0.25 }, gentle: { duration: 0.6, bounce: 0.15 } } as const` ('instant' means no animation and is not in the map). Each constant gets a one-line comment stating its unit and why (see work/reports/d3-transitions/plan.md §3).

Do not export these from the public barrel (packages/sdk/src/index.ts) — that is a later task.

Done = both files exist, `npm run typecheck -w @org-hierarchy/sdk` passes (paste the FULL output into the working file, no pipes), `npm run lint` passes (full output). No other file changed.
