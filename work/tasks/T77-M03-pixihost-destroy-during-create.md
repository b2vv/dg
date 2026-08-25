# T77-M03 — PixiHost destroy during create (A4)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A4  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `packages/sdk/src/render/PixiHost.ts`

## Проблема

`destroy()` під час `await app.init()` → WebGL leak; після 8–16 циклів (StrictMode) канвас чорніє.

## Acceptance

- [x] Після кожного `await` у `create` — `if (host.destroyed) throw 'PixiHost destroyed during create'` з teardown.
- [x] Повторний `destroy()` ідемпотентний.
- [x] Test: `PixiHost.test.ts` — «abort during Application.init rejects and leaves no canvas».
