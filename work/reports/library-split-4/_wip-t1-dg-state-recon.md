
ДАЛІ: git status --short + git diff --stat у ~/projects/dg, щоб зафіксувати повний перелік незакоміченого стану.

ФАКТ: гілка bulk-mutations, HEAD fe48991. Staged — порожньо (нічого в index).
ФАКТ (tracked M, 15):
 .gitignore(+5), AGENTS.md(+5),
 core/examples/depth_probe.rs(+4), core/src/hierarchy.rs(+6), core/src/lib.rs(+4),
 core/src/org_layout.rs(+4), core/src/org_tree.rs(+23/-?), core/src/ploeg_layout.rs(+26), core/src/types.rs(+20),
 sdk/package.json(+1/-1), sdk/.../orgBlockLayout.deptGrouping.test.ts, sdk/.../orgBlockLayout.ts(+21),
 sdk/.../staffDeptGrouping.test.ts, sdk/src/wasm/generated/rust-types.ts(+10), sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm(bin).
ФАКТ (untracked ??):
 docs/diagrams/reingold-tilford-layout.md, sdk/.../_recenterProbe.test.ts, sdk/src/wasm/reingoldTilford.invariants.test.ts,
 scratchpad/, work/reports/host-integration/found-focus-highlight-r1-writer.md, work/reports/library-split-4/.
ДАЛІ: діфи по категоріях — .gitignore, AGENTS.md, package.json (packaging?), core rust-файли, orgBlockLayout*, rust-types.ts (Ф1?).

ФАКТ [Ф1] core rust: types.rs (нові поля width/height у OrgFlatInput/FlatNodeInput/HierarchyNode),
 org_layout.rs (threads o.width/height; fixture None), hierarchy.rs (threads input.width/height; fixtures None),
 lib.rs (fixtures None), depth_probe.rs (fixtures None),
 ploeg_layout.rs (node.width.unwrap_or(opts) + center→left-edge конверсія ТІЛЬКИ для per-node ширин; fixture None) — усе суто Ф1.
ФАКТ [Ф1] rust-types.ts: додано optional width?/height? у OrgFlatInput — регенерований тип після зміни Rust. Ф1-артефакт.
ФАКТ [АМБІГ org_tree.rs = ЗМІШАНИЙ ФАЙЛ]: (a) fixture width:None/height:None — Ф1 compile-follow (інакше cargo test не збереться);
 (b) РЕАЛЬНИЙ fix gap#6: stack.extend(kids.iter().rev()) проти дзеркалення сиблінгів + новий тест extract_subtree_keeps_sibling_order.
 gap#6 — ОКРЕМА зміна (порядок сиблінгів), НЕ per-node w×h. org_tree.rs НЕ був у handoff-списку Ф1. file-granularity: не ділиться git-ом без add -p.
ФАКТ [АМБІГ orgBlockLayout.ts = ЗМІШАНИЙ ФАЙЛ]: (a) ...positionSize(p, geom) — Ф1 (per-node w×h у WASM input);
 (b) блок "ПРОБА (Cass 2, 2026-10-24)" root-centering над повним прольотом піддерева — ОКРЕМА експериментальна зміна (parent-centering), НЕ Ф1.
ФАКТ [gap#6 tests]: orgBlockLayout.deptGrouping.test.ts + staffDeptGrouping.test.ts — ПЕРЕВЕРНУТО expectations x-order через "gap#6 fix (org_tree.rs)".
 Прив'язані до sibling-order fix, НЕ до per-node w×h. Старі коментарі посилались на ploeg_layout.rs:48 node.children.iter().rev().
ФАКТ [packaging Q3]: commit e549827 чіпав ЛИШЕ packages/sdk/.npmignore + scripts/copy-wasm.mjs. НЕ .gitignore, НЕ package.json.
 => поточний .gitignore(+.ai/) і package.json(0.5.1→0.6.0) — НЕ продовження e549827.
 .gitignore(+5)=AI Factory .ai/ local tooling; AGENTS.md(+5)=нотатка про те саме .ai/ tooling. package.json=version bump (release). Жодне НЕ Ф1.
ФАКТ [wasm Q4]: org_hierarchy_core_bg.wasm — ребілд. Містить Ф1 АЛЕ також gap#6 (org_tree.rev) якщо extract_subtree у wasm-шляху → перевірити.
ДАЛІ: прочитати untracked (reingoldTilford.invariants.test.ts, _recenterProbe.test.ts, docs/diagrams/..md, found-focus..md); знайти команду тестів.

ФАКТ [untracked clas]: reingoldTilford.invariants.test.ts=Ф1 тест (докстрінг ЯВНО оминає recenter — «окреме рішення власника»);
 docs/diagrams/reingold-tilford-layout.md=Ф1 doc (post-центрування «не частина алгоритму»);
 _recenterProbe.test.ts=parent-centering probe (НЕ Ф1); found-focus-highlight-r1-writer.md=[found-focus] звіт (фіча вже закомічена в HEAD fe48991);
 scratchpad/=codex-промпти, ephemeral (НІКОЛИ не комітити); work/reports/library-split-4/=[split-recon-docs].
ФАКТ [wasm Q4 підтв.]: lib.rs має `mod org_tree; pub use extract_subtree` → org_tree КОМПІЛЮЄТЬСЯ у wasm. Отже ребілд .wasm містить і Ф1, і gap#6 (.rev).
 Ф1-ONLY wasm у робочому дереві НЕ існує — поточний бінар = Ф1+gap#6.

=== ТЕСТИ (докази-команди) ===
(sdk) cd packages/sdk && npx rstest run reingoldTilford.invariants → tests:11 passed:11 failed:0 (426ms). PASS.
(sdk) cd packages/sdk && npx rstest run orgBlockLayout staffDeptGrouping → passed:12 failed:0. PASS.
(sdk) cd packages/sdk && npx rstest run _recenterProbe → passed:1 failed:0 (probe, НЕ Ф1). PASS.
(core) cd packages/core && cargo test → 25 passed; 0 failed; 0 ignored (вкл. extract_subtree_keeps_sibling_order=gap#6, ploeg/org_layout/hierarchy Ф1). PASS.
Runner: SDK = rstest (@rstest/core), НЕ vitest. Rust = cargo test.

=== ВИСНОВОК ===
(A) ЧИСТО Ф1 (без домішок, беруться повністю):
  packages/core/src/types.rs, org_layout.rs, hierarchy.rs, lib.rs, examples/depth_probe.rs, ploeg_layout.rs,
  packages/sdk/src/wasm/generated/rust-types.ts,
  packages/sdk/src/wasm/reingoldTilford.invariants.test.ts (new), docs/diagrams/reingold-tilford-layout.md (new).
(A-partial) ЗМІШАНІ файли — Ф1 лише частина:
  - orgBlockLayout.ts: Ф1 = рядок `...positionSize(p, geom)`; НЕ-Ф1 = блок "ПРОБА recenter" (parent-centering).
  - org_tree.rs: Ф1-compile-follow = fixture width/height:None; НЕ-Ф1 = `.rev()` + тест (gap#6).
  - wasm pkg: Ф1-ребілд, АЛЕ бінар містить і gap#6 (org_tree у crate) → Ф1-only бінара нема.
(B) НЕ брати в Ф1-коміт:
  - gap#6 (sibling-order): org_tree.rs `.rev()`+тест, orgBlockLayout.deptGrouping.test.ts, staffDeptGrouping.test.ts — ОКРЕМА зміна порядку сиблінгів.
  - parent-centering probe: orgBlockLayout.ts "ПРОБА"-блок, _recenterProbe.test.ts — окремий експеримент власника.
  - .gitignore(.ai/) + AGENTS.md(.ai/ нотатка) — AI Factory local tooling (НЕ e549827, НЕ Ф1).
  - packages/sdk/package.json — version bump 0.5.1→0.6.0 (release/packaging).
  - found-focus-highlight-r1-writer.md — [found-focus], фіча вже в HEAD.
  - work/reports/library-split-4/ — recon-доки. scratchpad/ — ephemeral, НІКОЛИ.
(C) Ф1 тести зелені — див. блок ТЕСТИ (reingold 11/11, orgBlockLayout+staffDept 12/12, cargo 25/25).
(D) ДВОЗНАЧНОСТІ для lead:
  D1. Чистий Ф1-коміт неможливий простим `git add <file>` — org_tree.rs і orgBlockLayout.ts ЗМІШАНІ (треба `git add -p`).
  D2. .wasm уже містить gap#6 → якщо хочемо Ф1-only бінар, треба РЕБІЛД з Ф1-only Rust; інакше source(без rev)↔wasm(з rev) розійдуться.
  D3. Рекомендація: реалістичний фокусний коміт = Ф1 + gap#6 РАЗОМ (gap#6 мала, R-T «естетика 2», уже в wasm, тягне 2 sdk-тести й узгоджує source↔wasm);
      з коміту ЛИШИТИ поза = parent-centering probe (orgBlockLayout ПРОБА-блок + _recenterProbe) + packaging(.ai/, package.json) + докі/scratchpad.
      Якщо lead хоче Ф1 STRICTLY без gap#6 — `git add -p` на обох файлах + ребілд wasm (вартість D2).
