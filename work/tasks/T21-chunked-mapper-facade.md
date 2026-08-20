# T21 — Chunked mapper facade (WorkerPool)

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** worker pool ✅, flatRowsToDiagram ✅

---

## TDD

### Success
- [x] `recommendWorkerPoolSize` caps at 4 and leaves a core
- [x] `recommendChunkSize` / `adaptChunkSize` stay within min/max
- [x] `createPooledArrayMapper` chunks + merges on main (`useWorker: false`)
- [x] worker path via mock pool doubles items and preserves order
- [x] `mapFlatRowsInPool` falls back to main on worker error

### Failure
- [x] empty array → merge `[]`, chunkCount 0
- [x] non-finite sizing inputs → safe floors

---

## Delivered

```ts
const mapRows = createPooledArrayMapper({
  mapperKey: 'flatRowsToDiagram',
  mapChunk: flatRowsToDiagram,
  merge: (parts) => parts.reduce(mergeDiagramData, emptyDiagramData()),
});
const { data, recommendedNextChunkSize } = await mapRows(halfMillionRows);
```

- `recommendWorkerPoolSize` / `recommendChunkSize` / `adaptChunkSize`
- `createPooledArrayMapper` / `mapArrayInPool` (generics facade)
- `mapFlatRowsInPool` convenience
- `WorkerPool` default size = `recommendWorkerPoolSize()`

## Out of scope

- Nested worker-inside-worker coordinator
- TD07 promote overlay
