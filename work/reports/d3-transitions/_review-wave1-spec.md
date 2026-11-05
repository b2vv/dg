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

## Delta review T-A1

NEXT: verify scope SHA-256 of _review-T-A1-scope.txt; read git diff of TransitionController.ts/.test.ts/animators.ts; read plan row #13/#13a; read mutation "T-A1 delta"; check tick() behaviour, re-entry teeth, new issues.

FACT: all 3 delta scope SHA-256 match _review-T-A1-scope.txt.
FACT: tick() change (TransitionController.ts:199-201) — old `if (acc>=FIXED_DT || allSettled()) snap` replaced by `if (acc>=FIXED_DT) acc=0;` then `if (allSettled()) snap`. Leftover owed time is dropped, transition CONTINUES; snap only via allSettled(), or L184 cap/non-finite guard (unchanged). Matches owner decision + row #13a.
FACT: row #13a added (plan.md:233). 5s case still owned by cap (row #13) — new "5 s frame gap" test snaps via L184. 200ms "drops owed steps and continues" test asserts 6 steps, acc dropped, isActive true, no backlog catch-up on next frame, finishes at target.
FACT: re-entry test (TransitionController.test.ts:118-120) now captures made.length before re-entry and asserts unchanged → absorption has teeth. Mutation M24/M24b/M22 killed; M22 now by the re-entry test itself.
FACT: other diff hunks (import '.js' extensions; eslint→oxlint directive) are non-semantic; mutation note confirms oxlint max-classes rule is active.
FACT: focused suite 59/59 passed, 0 failed.
DECISION: finding (2) CLOSED; finding (1) CLOSED; no new spec issue. Delta GATE: GREEN.
