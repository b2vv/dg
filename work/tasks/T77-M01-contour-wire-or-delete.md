# T77-M01 — Contour: wire `_results` або delete pipeline

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §1.1, §1.4, §6  
**Пріоритет:** P0 (decision) · **Статус:** 📋

## Проблема

`applyContourResults(_results, …)` ігнорує WASM-результат; фарбує `buildPaintRingsByDept()` (AABB button-group). G5–G7 на канвасі немає; worker round-trip даремний.

## Рішення (обрати одне)

| Опція | Дія |
|-------|-----|
| **A — Wire** | Малювати з `DeptContourResult` (path → world via `contourWorld`); AABB лише fallback |
| **B — Delete** | Прибрати compute await + `contour.rs` pipeline споживачів; лишити TS paint (~200 LOC) |

## Acceptance

- [ ] Зафіксоване рішення A або B у цьому файлі.
- [ ] Немає «compute then ignore».
- [ ] SPEC/status узгоджені з тим, що реально на екрані.
