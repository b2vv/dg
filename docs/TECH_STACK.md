# Технологічний стек — Org Hierarchy (v1)

> Embed SDK: org matrix/tree + staff. ~50k org, ~2M persons.  
> **Дані in-memory + мапери** (API — опційно зовні host).

---

## Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│  Host: fetch/load → raw data → custom DataMapper            │
├─────────────────────────────────────────────────────────────┤
│  @org-hierarchy/sdk — DiagramData, mappers, worker helpers  │
├─────────────────────────────────────────────────────────────┤
│  Web Worker — mapInWorker, WorkerPool, pipeline (2M chunks)  │
├─────────────────────────────────────────────────────────────┤
│  Rust WASM (worker) — layout, dept tetris pack, smooth hull │
├─────────────────────────────────────────────────────────────┤
│  Pixi.js — OrganizationNode / PersonNode / DepartmentBlob   │
└─────────────────────────────────────────────────────────────┘
```

---

## Дані (не обов'язковий API)

```ts
import { OrgHierarchyDiagram, flatRowsToDiagram, mapInWorker } from '@org-hierarchy/sdk';

// Варіант 1: готові DiagramData
await OrgHierarchyDiagram.create(el, { data: diagramData });

// Варіант 2: сирі дані + mapper
await OrgHierarchyDiagram.create(el, {
  data: myRawRows,
  mappers: { toDiagram: myMapper, normalize: normalizeDiagram },
});

// Варіант 3: worker для 2M rows
const pool = new WorkerPool(() => new Worker(new URL('./transform.worker.js', import.meta.url)));
const chunks = await pool.mapChunks('flatRowsToDiagram', rawRows, 50_000);
```

---

## Компоненти

| Шар | Технологія |
|-----|------------|
| Data | `DiagramData` + `DataMapper<TRaw>` |
| Worker helpers | `mapInWorker`, `WorkerPool`, `createWorkerPipeline` |
| Core | Rust WASM у worker |
| Render | Pixi.js |
| Bundler | **Rsbuild** |
| Contours | Grid pack → polygon → **Chaikin/Bezier** (organic edges) |

**Не v1:** Service Worker, Three.js, вбудований HTTP client.

---

## Пакети

```
packages/
  core/   # Rust WASM
  sdk/    # @org-hierarchy/sdk (data, mappers, worker, future Pixi)
```
