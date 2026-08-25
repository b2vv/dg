# T77-M02 — Worker bridge: `error` / `messageerror` (A3)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A3  
**Пріоритет:** P0 · **Статус:** ✅
**Файли:** `packages/sdk/src/worker/bridge.ts`

## Проблема

`mapInWorker` слухає лише `message`. 404 chunk / CSP → Promise висить **120 с**, потім timeout.

## Acceptance

- [x] На `error` / `messageerror` Promise reject негайно — `worker/bridge.ts` (`onMessageError` → `settle(reject)`).
- [x] Слухачі знімаються на settle — `removeEventListener` для `message` / `error` / `messageerror`.
- [x] Unit: `contour/worker-bridge.test.ts` — success через воркер, fallback на main thread, reject на timeout.
