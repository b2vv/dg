# T77-M09 — Dead code purge (§6)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §6  
**Пріоритет:** P1 · **Статус:** ✅  
**Блокер:** [M01](./T77-M01-contour-wire-or-delete.md) ✅

## Зроблено

| Що | Дія |
|----|-----|
| `WorkerPipeline` / `createWorkerPipeline` / `createContourPipeline` | видалено (+ `pipeline.test.ts`) |
| `NodeVisualKind` | видалено |
| `inflateClosedRing` | видалено |
| `layout.rs` + `wasm_compute_layout` + `wasm_tree_stats` + `wasm_build_from_flat` | видалено |
| Worker keys `computeLayout` / `buildFromFlat` | видалено |
| `runMapper` / `composeMappers` / `identityMapper` / `MapResult` | видалено |

## Навмисно лишається (живе)

| Кандидат | Чому |
|----------|------|
| `contour.rs` + incremental + worker-bridge | SVG export / G6–G7 / incremental cache |
| `mapArrayFacade` | demo + `mapFlatRowsInPool` |
| `placeOrgAtMatrixCell` / matrix bounded | public API (N1) |
| RAF camera tweens | `Viewport` live |
| `searchIndex.byChar` | M08 perf |
| PixiHost viewport wrappers | public camera API |
| `layoutX/Y` | staff hybrid coords |

`cargo test --lib` + SDK vitest після purge.
