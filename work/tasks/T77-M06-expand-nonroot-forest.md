# T77-M06 — Expand non-root org не стирає forest (A12)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A12  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `rowTreeLayout.ts`, `orgMode.ts` → facade `expandOrg` uses `revealOrgPath`

## Проблема

Розкриття не-кореневої org стирає решту діаграми (перевірено виконанням у critique).

## Acceptance

- [x] Expand дитини зберігає гілки — `revealOrgPath` розкриває шлях від кореня, `T78-L3` тримає collapse-семантику.
- [x] Regression: `layout/flatOrgRootExpand.test.ts` + `e2e/flat-orgs.spec.ts`.
