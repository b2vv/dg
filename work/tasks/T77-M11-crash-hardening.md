# T77-M11 — Crash hardening (A1, A2, A5, A7–A9, A13–A14)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §2 (решта)  
**Пріоритет:** P1 · **Статус:** 📋

| ID | Коротко |
|----|---------|
| A1 | duplicate id cycle → wasm trap → `Err` |
| A2 | recursive walks → iterative / depth guard |
| A5 | self `reportLine` → порожнє полотно |
| A7 | `expandToDepth` BFS `seen` |
| A8 | fractional matrix index |
| A9 | `smooth_iterations` clamp |
| A13 | `print()` window fail |
| A14 | `placeOrgAtMatrixCell` no-op success |

## Acceptance

- [ ] Кожен ID: фікс або won't-fix з причиною; failure-тест де фікс.
