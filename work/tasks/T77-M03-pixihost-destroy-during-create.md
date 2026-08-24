# T77-M03 — PixiHost destroy during create (A4)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A4  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `packages/sdk/src/render/PixiHost.ts`

## Проблема

`destroy()` під час `await app.init()` → WebGL leak; після 8–16 циклів (StrictMode) канвас чорніє.

## Acceptance

- [ ] Після кожного `await` у `init` — check `destroyed`; teardown якщо так.
- [ ] Повторний `destroy()` ідемпотентний (вже є).
- [ ] Test: destroy mid-init не лишає живий `Application`.
