# T18 — Worker-built search index (2M scale)

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T04 search ✅, T16 chunked async ✅, worker pool ✅

---

## TDD

### Success
- [x] `mergeSearchIndexes` remaps `byChar` offsets; substring search still works
- [x] DTO round-trip preserves hits
- [x] `buildSearchIndexInWorker` via mock worker returns Alice hits
- [x] `buildSearchIndexInPool` merges position chunks + org entries on main
- [x] Large `setData` path uses `buildSearchIndexForScale` (pool → worker → async)

### Failure
- [x] merge of empty parts → empty index
- [x] worker error + `fallbackToMainThread` → async main build

---

## Delivered

- `PositionSearchRow` denormalization (chunks without shipping full `persons` each time)
- `SearchIndexDTO` for structured-clone transfer
- Worker keys: `buildSearchIndex`, `buildSearchIndexPositions`
- `buildSearchIndexInWorker` / `buildSearchIndexInPool` / `buildSearchIndexForScale`
- Diagram wires worker search above 10k orgs+positions

## Out of scope

- TD07 promote overlay
- Persistent indexedDB search cache
