# Інвентар гілок перед прибиранням — 2026-08-27

Знято перед видаленням 47 віддалених гілок. Кожен рядок — **вказівник**, не копія:
гілку можна підняти назад однією командою навіть після того, як GitHub забуде її в UI.

```bash
git push origin <SHA>:refs/heads/<ім’я-гілки>   # відновити
```

## Не були в `main` (перевірено `git cherry` + вміст)

| Гілка | SHA | Остання правка | Вердикт |
|---|---|---|---|
| `cursor/cto-product-research-7acb` | `c30acc9` | 2026-08-24 | `work/CTO-RESEARCH.md` у `main` **новіший** (25.08 проти 24.08) |
| `cursor/figma-mcp-local-babc` | `c8ffbd5` | 2026-08-23 | еквівалентний коміт уже в `main` (сквош-мердж) |
| `cursor/gojs-node-chrome-parity-20bb` | `02290ec` | 2026-08-23 | PR #46 закритий; GoJS-хром у `main` — вкладений у `PersonNode.ts` |
| `cursor/staff-edge-fallback-census-20bb` | `8b8fd25` | 2026-08-24 | еквівалентний коміт уже в `main` (сквош-мердж) |
| `cursor/t38-contour-edge-audit-plan-babc` | `ad31b7c` | 2026-08-21 | план аудиту; **усі 10 пунктів у `main`** (перевірено по коду, PR #72) |
| `cursor/t50-chebyshev-pad-rect-babc` | `c02bb98` | 2026-08-21 | 🔴 **несла втрачені правки за рев'ю** — відновлено в PR #71 |
| `cursor/t51-zoom-mid-button-group-babc` | `b08f3e5` | 2026-08-22 | еквівалентний коміт уже в `main` (сквош-мердж) |
| `cursor/t77-m09-dead-code-purge-babc` | `ca95f9f` | 2026-08-24 | еквівалентний коміт уже в `main` (сквош-мердж) |
| `cursor/t78-p1-option-b-20bb` | `ac9e7be` | 2026-08-24 | еквівалентний коміт уже в `main` (сквош-мердж) |

## Були в `main`

| Гілка | SHA |
|---|---|
| `cursor/card-in-cell-tighten-babc` | `2239781` |
| `cursor/ci-td01-babc` | `a66d08b` |
| `cursor/demo-audit-plan-babc` | `e1d5ae6` |
| `cursor/demo-github-pages-babc` | `8460c9a` |
| `cursor/fitview-context-babc` | `2ab408a` |
| `cursor/fix-node-rightclick-babc` | `a9d24da` |
| `cursor/g6-far-side-babc` | `1749af5` |
| `cursor/g8-contour-drag-babc` | `bf21a29` |
| `cursor/gojs-migration-tasks-babc` | `8388723` |
| `cursor/gojs-mockup-parity-babc` | `a93b13b` |
| `cursor/incremental-contours-babc` | `c22fa4f` |
| `cursor/layout-diagnostics-babc` | `39655ae` |
| `cursor/main-sync-setup-babc` | `bef47c3` |
| `cursor/matt-pocock-skills-babc` | `2a8897b` |
| `cursor/mockup-visual-fixes-babc` | `3789ba9` |
| `cursor/node-interactions-contract-babc` | `76c678b` |
| `cursor/staff-expand-inplace-babc` | `c11d50b` |
| `cursor/t33-p0-contour-edges-babc` | `ac2837e` |
| `cursor/t37-variant-b-edge-gaps-babc` | `7fe2d11` |
| `cursor/t40-g7-notch-punchout-babc` | `39a620a` |
| `cursor/t42-svg-contour-parity-babc` | `a3b7e02` |
| `cursor/t43-rust-g7-peel-babc` | `29fec27` |
| `cursor/t47-magnet-radius-canonical-babc` | `2df1775` |
| `cursor/t48-100k-tree-matrix-babc` | `2050f36` |
| `cursor/t53-root-click-e2e-testid-babc` | `c5ea0c5` |
| `cursor/t65-detached-placement-babc` | `038c090` |
| `cursor/t67-multi-select-babc` | `98f5f69` |
| `cursor/t69-dblclick-babc` | `242881f` |
| `cursor/t70-org-symbol-box-babc` | `41c5c09` |
| `cursor/t70-phase2-chrome-babc` | `48509f5` |
| `cursor/t77-hanging-parent-org-babc` | `8895509` |
| `cursor/t77-m10-silent-lies-babc` | `e8d0c51` |
| `cursor/t77-remaining-nits-babc` | `1d24ea0` |
| `cursor/t78-p0-option-b-finish-20bb` | `5992e40` |
| `cursor/tests-zoom-100k-review-babc` | `1377611` |
| `cursor/ux-edges-contour-zoom-babc` | `04b7ab9` |
| `cursor/viewport-contour-fix-babc` | `e138fd6` |
| `cursor/visual-polish-babc` | `41718bb` |
