# T77-M09 — Dead code purge (§6)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §6  
**Пріоритет:** P1 · **Статус:** ✅ (часткове; важкі видалення відкладені)  
**Блокер:** [M01](./T77-M01-contour-wire-or-delete.md) ✅

## Зроблено

| Що | Дія |
|----|-----|
| `WorkerPipeline` / `createWorkerPipeline` / `createContourPipeline` | `@deprecated` |
| `NodeVisualKind` | `@deprecated` (0 внутрішніх readers) |
| `inflateClosedRing` | вже `@deprecated` (тільки тести) |

## Відкладено (наступний major або окремий тікет)

| Кандидат | LOC | Ризик видалення |
|----------|-----|-----------------|
| `contour.rs` pipeline + incremental (§1.1) | ~2 300 | render/export тести використовують `computeAllContours` прямо |
| `layout.rs` + `wasm_compute_layout` (§1.2) | ~580 | wasm pkg поставляється в repo; rebuild потрібен |
| `mapArrayFacade` overkill | ~300 | search worker вживає |
| matrix `bounded` no-ops (`placeOrgAtMatrixCell`) | ~250 | public API |
| RAF twiners | ~80 | camera tweens |
| dead export symbols (8) | ~35 | minor cleanup |

`npm run test:verify` зелений після депрекацій.
