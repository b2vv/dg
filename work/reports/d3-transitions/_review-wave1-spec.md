model: claude-opus-4-8

NEXT: read pinned scope file _review-wave1-scope.txt, verify SHA-256 of the 6 untracked files; then read plan.md rev 6 (§1,§3,§5,§10 listed rows), briefs T-A.md/T-B.md, mutation evidence; then read the 6 source+test files.

FACT: all 8 SHA-256 match _review-wave1-scope.txt (shasum verified). Scope files unmodified.

FACT: Q2 tick() L180-208. Step loop clamps to MAX_STEPS_PER_FRAME=6 (100ms). L199: `if (this.accumulator >= FIXED_DT || this.allSettled()) { this.snapToTarget(); return; }` — if leftover accumulator still >= FIXED_DT (i.e. a single frame owed >~117ms/7 steps), WHOLE transition snaps to target. Background-tab (S9) is already handled earlier by L184 settleCapMs(750ms) check. So the L199 snap specifically fires on a FOREGROUND single-frame hitch >117ms mid-transition → all nodes teleport to final. Brief row#13: "remainder is dropped and state snaps forward safely" — standard fixed-timestep reading = drop leftover accumulator, keep animating. Snapping the whole animation is an over-eager reading → visible pop on any GC/jank hitch.

FACT: Q1 teeth. Mutation 22/22 killed. M22 note: re-entry absorption (row#39) test (L110-124) cannot distinguish absorb vs recreate — createEntry reseeds opacity/x from current frame values, and on exiting→re-entry x/y were snapped (velocity 0), so absorb and recreate yield identical values. size==1 is structural (Map key + `next.has(key)` continue guard L71). Killed only incidentally by velocity test (made.length L103). Row#39 test lacks teeth; impl behavior correct though.

FACT: T-B RED = "Cannot find module './TransitionController'" (_impl-T-B.md:94,122) — module-not-found, not assertion failure. Caller note accurate. Teeth established only post-hoc via mutation 22/22.
FACT: Focused suite run read-only: 58 passed, 0 failed, 0 skipped. Matches mutation baseline.
FACT: plan row#13 expected visible result = "виконано ≤6 кроків; картки в КІНЦЕВИХ позиціях; жодного NaN" for a 5s background-tab gap. So snapping-to-final on a LARGE gap is what the plan asks. The defect is the THRESHOLD: L199 snaps on any single frame owing >~117ms; the 5s case is already owned by settleCapMs(750ms, L184). In default config L199 fires only on a foreground hitch >117ms within first 750ms of a transition.
DECISION: Q2 = defensible literal reading (matches brief + plan row#13 + passing test) but over-eager threshold → latent UX pop. Non-blocking for the SPEC gate (no spec VIOLATION), flagged design concern.
DECISION: Q1 = tests have teeth overall (mutation 22/22); EXCEPTION row#39 re-entry absorption test lacks teeth. Non-blocking (impl correct, runner already flagged).
DECISION: No scope creep; no missing requirement at unit/controller level. GATE: GREEN (no blocking findings).
