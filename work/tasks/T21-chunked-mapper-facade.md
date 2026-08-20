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
- [x] `mapArrayItems` / `createPooledItemMapper` — array + mapItem
- [x] `mapFlatRowsInPool` falls back to main on worker error

### Failure
- [x] empty array → merge `[]`, chunkCount 0
- [x] non-finite sizing inputs → safe floors

---

## Usage

```ts
// What you wanted: array + mapItem
const { data } = await mapArrayItems(rows500k, (row) => transform(row));

// Or reusable facade
const mapPeople = createPooledItemMapper({
  mapItem: (row) => ({ id: row.id, name: row.label }),
});
await mapPeople(rows500k);

// Chunk-level (DiagramData partials, etc.)
const mapRows = createPooledArrayMapper({
  mapperKey: 'flatRowsToDiagram',
  mapChunk: flatRowsToDiagram,
  merge: (parts) => normalizeDiagram(parts.reduce(mergeDiagramData, emptyDiagramData())),
});
```

Note: `mapItem` is a closure → runs on main in chunks (still non-blocking between chunks).
Pass `mapperKey` only when the worker registry has an equivalent `TItem[] → TOut[]` handler.

## Out of scope

- Nested worker-inside-worker coordinator
- TD07 promote overlay
