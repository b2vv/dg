# T77-M01 — Contour: wire `_results` або delete pipeline

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §1.1, §1.4, §6  
**Пріоритет:** P0 (decision) · **Статус:** ✅ (рішення B)  
**Дата:** 2026-08-24

## Рішення: **B — Delete from paint path**

Canvas лишає TS button-group / `buildPaintRingsByDept` (AABB + polish).  
`DiagramRenderer` **більше не** `await compute*` і не ігнорує `_results`.

| Залишається | Видаляється з hot path |
|-------------|------------------------|
| `contourCluster` + `contourPolish` + paint | Worker/WASM round-trip у `paintContours` / drag preview |
| Public `computeAllContours*` API (export/tests) | Споживання compute у renderer |

Повний purge `contour.rs` / pipeline → [M09](./T77-M09-dead-code-purge.md).

**Оновлення 2026-08-25 ([T79](./T79-g2-m2-paint-notch.md)):** продукт замовив G2/M2 на екрані.
Рішення B не скасовано — round-trip не повертали; виїмку навколо foreign рахує синхронний
`render/contourNotch.ts` у world-space. Rust лишається референсом для export/tests.

## Acceptance

- [x] Зафіксоване рішення B у цьому файлі.
- [x] Немає «compute then ignore» у `DiagramRenderer`.
- [ ] SPEC/status узгоджені з тим, що реально на екрані (follow-up docs).
