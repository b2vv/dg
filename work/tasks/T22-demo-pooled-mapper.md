# T22 — Demo: pooled mapper facade

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T21 ✅

---

## Goal

Wire `mapFlatRowsInPool` / `mapArrayItems` / `recommendWorkerPoolSize` into the demo so mapper upload and the worker bench use the T21 facade (bounded pool + chunks) instead of a single `mapInWorker` path.

---

## Done

- [x] Mapper JSON load → `mapFlatRowsInPool` then `OrgHierarchyDiagram.create` with `DiagramData`
- [x] Worker bench → 5k synthetic rows via `mapFlatRowsInPool` + `mapArrayItems` for ids
- [x] `workerPoolSize: recommendWorkerPoolSize()` in demo config
- [x] Status / toast show pool size, chunk count, duration
- [x] Bench button label updated (5k orgs)

## Out of scope

- Worker-registry `mapperKey` path for custom closures (closures stay on main in chunks)
- TD07 promote overlay
