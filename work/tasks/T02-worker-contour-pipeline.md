# T02 — Web Worker: contour + layout pipeline

**Пріоритет:** P1  
**Статус:** todo  
**Оцінка складності:** середня  
**Залежності:** T01 (optional для тесту), worker helpers ✅, WASM ✅

---

## TDD (обов'язково — перед кодом)

> Політика: [`work/TDD.md`](../TDD.md)

### Success tests
- [ ] `computeDeptContourInWorker('IT', VARIANT_B)` → `path` starts with `M`, ends with `Z`
- [ ] `mapInWorker(flatRowsToDiagram, 1000 rows)` → DiagramData з очікуваною кількістю org
- [ ] pipeline `.step('contours')` повертає масив contours для кожного dept

### Failure tests
- [ ] worker timeout → Promise reject з message
- [ ] WASM init failure → fallback main thread або reject
- [ ] invalid worker message payload → error response, не silent hang
- [ ] empty positions array → reject / empty result за spec

---

## Мета

Перенести важкі обчислення (**contour**, **layout**, **mappers**) off main thread через існуючий worker infrastructure.

---

## Поточний стан

| Комponent | Main thread | Worker |
|-----------|-------------|--------|
| `flatRowsToDiagram` | ✅ | ✅ `transform.worker.ts` |
| `WorkerPool.mapChunks` | ✅ | ✅ |
| `createWorkerPipeline` | ✅ skeleton | ✅ |
| `computeDeptContour` | ✅ bridge | ❌ |
| `computeLayout` (WASM) | ❌ не exposed SDK | ❌ |

---

## Scope

### 1. WASM у worker

**Проблема:** WASM module init (`initContourWasm`) зараз на main thread.

**Рішення:**

```
packages/sdk/src/worker/
  contour.worker.ts    — import wasm pkg, computeDeptContour/All
  layout.worker.ts     — computeLayout, buildFromFlat
  wasm-init.ts         — shared init helper
```

- Кожен worker: `await default()` один раз
- Transferable для великих position arrays (optional phase 2)

### 2. Pipeline step для contour

```ts
createWorkerPipeline<DiagramData, RenderPayload>()
  .step('normalize', normalizeDiagram)
  .step('layout', computeLayoutWasm)
  .step('contours', computeAllContoursWasm)
  .step('toRender', toRenderPayload);
```

### 3. WorkerPool для 2M rows

```
chunk size: 50_000 rows (configurable)
parallel workers: navigator.hardwareConcurrency || 4
merge: mergeDiagramData partials
```

### 4. Main thread bridge

```ts
// packages/sdk/src/contour/worker-bridge.ts
export async function computeDeptContourInWorker(
  deptId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult>;
```

- Fallback на main thread якщо worker unavailable
- Timeout + error propagation

---

## Message protocol (draft)

```ts
type WorkerRequest =
  | { type: 'contour'; id: string; departmentId: string; positions: ContourPositionInput[]; config?: ContourMagnetConfig }
  | { type: 'contours-all'; id: string; positions: ContourPositionInput[]; config?: ContourMagnetConfig }
  | { type: 'layout'; id: string; root: HierarchyNode; options: LayoutOptions };

type WorkerResponse =
  | { type: 'result'; id: string; data: unknown }
  | { type: 'error'; id: string; message: string };
```

---

## Performance targets

| Operation | Target (indicative) |
|-----------|---------------------|
| 100 positions, 5 depts contour | < 16 ms worker |
| 50k flat rows map | < 500 ms worker pool |
| Main thread frame budget | 0 ms compute during pan/zoom |

---

## Acceptance criteria

- [ ] `computeAllContours` працює в dedicated worker
- [ ] `mapInWorker(flatRowsToDiagram, 200k rows)` не блокує UI > 50ms chunks
- [ ] OrgHierarchyDiagram опція `workerPoolSize` використовується
- [ ] Graceful fallback main thread
- [ ] Unit/integration test з mock worker

---

## Референси

- `packages/sdk/src/worker/pipeline.ts`
- `packages/sdk/src/worker/transform.worker.ts`
- `packages/core/src/lib.rs` — WASM exports
