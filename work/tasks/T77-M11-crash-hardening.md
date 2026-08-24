# T77-M11 — Crash hardening (A1, A2, A5, A7–A9, A13–A14)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §2 (решта)  
**Пріоритет:** P1 · **Статус:** ✅ (A5, A7–A9, A13 done; A1/A2 won't-fix wasm boundary; A14 won't-fix)

| ID | Коротко |
|----|---------|
| A1 | duplicate id cycle → wasm trap → `Err` — won't-fix (wasm boundary) |
| A2 | recursive walks → iterative / depth guard — won't-fix (node count bounded) |
| A5 | self `reportLine` — skip in `adminParentMap` / `adminChildrenMap` / `adminEdges` |
| A7 | `expandToDepth` BFS `seen` |
| A8 | fractional matrix index — floor in assign + persist in `placeOrgAtMatrixCell` |
| A9 | `smooth_iterations` clamp `MAX_SMOOTH_ITERATIONS=8` + equality test 20 vs 8 |
| A13 | `print()` popup blocked throws `ExportError` + unit test |
| A14 | `placeOrgAtMatrixCell` OOB returns original array — won't-fix |

## Acceptance

- [x] Кожен ID: фікс або won't-fix з причиною; failure-тест де фікс.
