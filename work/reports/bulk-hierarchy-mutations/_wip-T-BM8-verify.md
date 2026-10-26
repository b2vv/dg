claude-opus-4-8

ДАЛІ: прогнати повний гейт-світ T-BM8 (typecheck / check:docs / oxlint / rstest / cargo), розділити
результати по зонах відповідальності (фіча vs бранч vs експеримент), звітувати власнику. Коміт — лише після «го».

---

ФАКТ — гейт-світ (working tree, branch bulk-mutations @ 530d24c, ahead origin 22):
- `npm run typecheck` → exit 0 ✅
- `npm run check:docs` → exit 0 ✅ (адвайзорі: `setTheme` тепер задокументовано — прибрати з
  UNDOCUMENTED_BASELINE у scripts/check-docs.mjs, 8→7; брифінг 17/25 — у межах)
- `npm test` → SDK: 1175 passed / 0 failed ✅ (включно з bulkMutations.test.ts + bulkMutations.fasade.test.ts);
  demo: 103 passed / **1 failed** ⚠️
- `npx oxlint --max-warnings 0` → exit 1, **4 errors** ❌
- `npm run test:rust` → 25 passed / 0 failed ✅

ФАКТ — демо-фейл НЕ від фічі й НЕ від проби:
- `packages/demo/src/scenarios/staffEdgeFallbackCensus.test.ts` «Staff · GoJS»: inline-snapshot
  forced 2→3, dotted.forced 0→1.
- Причинність доведена: застешив ЛИШЕ orgBlockLayout.ts (проба) → тест падає ІДЕНТИЧНО. Жодна інша
  tracked-зміна не чіпає edge-routing. Отже — дрейф на коміті `1a34034` (per-node w×h + gap#6
  sibling-order) змінив staff-геометрію, одне ребро GoJS-таба стало forced, але committed inline-snapshot
  (востаннє чіпався у `3aa647a`, механічний «move to rstest») не оновили. Бранч ahead-22 не пушився →
  CI жодного разу не ганяв → ніхто не зловив.

ФАКТ — oxlint 4 errors теж pre-existing, не від фічі:
- усі 4 у `packages/sdk/src/wasm/reingoldTilford.invariants.test.ts:63-64` (no-negated-condition,
  eslint+unicorn на `width !== undefined ? {width} : {}`). Файл unchanged у working tree, committed у `1a34034`.
  package.json diff — лише bump 0.5.1→0.6.0, не зачіпає oxlint. Файли фічі — lint-clean.

ФАКТ — проба НЕ впливає на цей census (її bbox-центр == наявний центр на GoJS-табі); _recenterProbe.test.ts
  проходить у SDK-світі. Проба — окремий експеримент 2026-10-24, не в scope фічі.

РІШЕННЯ — working tree = ТРИ незалежні концерни (+ untracked звіти/scratchpad):
  1. bulk-mutations (review PASS): callbacks.ts, index.ts, interaction/index.ts, OrgHierarchyDiagram.ts,
     docs/USAGE.md, package.json(bump), bulkMutations.ts/test/fasade.test — ВСІ власні гейти зелені.
  2. recenter probe (експеримент): orgBlockLayout.ts + _recenterProbe.test.ts.
  3. `.ai/` tooling: .gitignore + AGENTS.md.
  → НЕ змішувати в один коміт. Проба НЕ має потрапити в коміт фічі.

ПИТАННЯ до власника (коміт — лише після «го»):
  A) bulk-mutations — комітити як є (всі власні гейти зелені)?
  B) 2 pre-existing червоні гейти бранчу (oxlint ×4, census-snapshot ×1) з `1a34034` — фіксити
     окремим комітом (обидва тривіальні) чи лишити?
  C) recenter probe — лишити / окремий коміт / викинути?
  D) `.ai/` gitignore+AGENTS — окремий tooling-коміт?

---
ВИКОНАНО (owner «го»):
- Коміт 1 `715559d` feat(sdk): bulk-мутації — лише 9 файлів фічі (probe/tooling/reports НЕ в коміті).
- Коміт 2 `5de3de3` fix(sdk): 2 pre-existing reds — oxlint свап тернарників + census-snapshot regen
  (проти committed-геометрії, probe застешено на час regen).
- Фінал (working tree, probe present): npm test exit 0 → SDK 1175/0, demo 104/0; oxlint 0. CI-стан
  (probe-absent) теж зелений — snapshot генерувався без проби.
- Лишилося в дереві СВІДОМО (рішення власника): recenter probe (orgBlockLayout.ts + _recenterProbe.test.ts);
  .ai/ tooling (.gitignore + AGENTS.md); untracked звіти/scratchpad. Коміти по них — пізніше/окремо.
- Адвайзорі не закрито (поза scope reds): check:docs просить прибрати setTheme з UNDOCUMENTED_BASELINE (8→7).
