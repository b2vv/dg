# T77-M09 — Dead code purge (§6)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §6  
**Пріоритет:** P1 · **Статус:** 📋 · **Блокер:** [M01](./T77-M01-contour-wire-or-delete.md)

## Кандидати (~4.4k LOC)

Контурний worker pipeline, `layout.rs` (якщо delete), `pipeline.ts`, `contourClearance` dead half, `mapArrayFacade` overkill, matrix bounded no-ops, RAF twiners, dead options/exports.

## Acceptance

- [ ] Після M01: список «видалено» з LOC у цьому файлі.
- [ ] `npm run test:verify` зелений.
