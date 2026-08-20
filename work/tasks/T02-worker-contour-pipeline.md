# T02 — Web Worker: contour + layout pipeline

**Пріоритет:** P1  
**Статус:** done  
**Оцінка складності:** середня  
**Залежності:** T01 (optional для тесту), worker helpers ✅, WASM ✅

---

## TDD (обов'язково — перед кодом)

> Політика: [`work/TDD.md`](../TDD.md)

### Success tests
- [x] `computeDeptContourInWorker('IT', VARIANT_B)` → `path` starts with `M`, ends with `Z`
- [x] `mapInWorker(flatRowsToDiagram, 1000 rows)` → DiagramData з очікуваною кількістю org
- [x] pipeline `.step('contours')` повертає масив contours для кожного dept

### Failure tests
- [x] worker timeout → Promise reject з message
- [x] WASM init failure → fallback main thread або reject
- [x] invalid worker message payload → error response, не silent hang
- [x] empty positions array → reject / empty result за spec

---

## Мета

Перенести важкі обчислення (**contour**, **layout**, **mappers**) off main thread через існуючий worker infrastructure.

---

## Реалізовано

| Комponent | Main thread | Worker |
|-----------|-------------|--------|
| `flatRowsToDiagram` | ✅ | ✅ `transform.worker.ts` |
| `WorkerPool.mapChunks` | ✅ | ✅ |
| `createWorkerPipeline.runInWorker` | — | ✅ |
| `computeDeptContour` | ✅ bridge | ✅ `computeDeptContourInWorker` |
| `computeAllContours` | ✅ bridge | ✅ `computeAllContoursInWorker` |
| `computeLayout` | ✅ WASM | ✅ registry key `computeLayout` |
| `buildFromFlat` | ✅ WASM | ✅ registry key `buildFromFlat` |

### Файли

```
packages/sdk/src/
  contour/config.ts           — toRustConfig, diagramPositionsToContourInputs
  contour/worker-bridge.ts    — compute*InWorker, configureContourWorker
  worker/wasm-init.ts         — lazy WASM init у worker
  worker/compute-handlers.ts  — contour/layout WASM handlers
  worker/createWorker.ts      — createTransformWorker()
  worker/transform.worker.ts  — extended registry
  worker/pipeline.ts          — stepKey(), runInWorker(), createContourPipeline()
```

### API

```ts
import {
  computeAllContoursInWorker,
  configureContourWorker,
  createTransformWorker,
  createContourPipeline,
} from '@org-hierarchy/sdk';

await OrgHierarchyDiagram.create(el, {
  data,
  useWorker: true,        // default: true у browser
  workerPoolSize: 4,      // WorkerPool для mapChunks
  workerFactory: createTransformWorker,
});
```

---

## Acceptance criteria

- [x] `computeAllContours` працює в dedicated worker
- [x] `mapInWorker(flatRowsToDiagram, 1000 rows)` — тест з mock worker
- [x] OrgHierarchyDiagram опція `workerPoolSize` використовується
- [x] Graceful fallback main thread (`fallbackToMainThread: true`)
- [x] Unit/integration test з mock worker (24 SDK tests)

---

## Референси

- `packages/sdk/src/worker/pipeline.ts`
- `packages/sdk/src/worker/transform.worker.ts`
- `packages/core/src/lib.rs` — WASM exports
