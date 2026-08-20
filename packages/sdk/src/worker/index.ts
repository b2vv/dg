export type {
  WorkerRequest,
  WorkerResponse,
  PipelineStepDef,
  PipelineRunOptions,
  PipelineResult,
} from './types.js';

export { WorkerPipeline, createWorkerPipeline, createContourPipeline } from './pipeline.js';
export type { StepFn } from './pipeline.js';

export {
  mapInWorker,
  chunkArray,
  WorkerPool,
  createWorkerMessageHandler,
  type WorkerBridgeOptions,
  type MapperRegistry,
} from './bridge.js';

export {
  recommendWorkerPoolSize,
  recommendChunkSize,
  adaptChunkSize,
  type ChunkSizeOptions,
} from './poolSizing.js';

export {
  createPooledArrayMapper,
  mapArrayInPool,
  type PooledArrayMapperConfig,
  type PooledMapOptions,
  type PooledMapResult,
  type ChunkMapperFn,
  type ChunkMergeFn,
} from './mapArrayFacade.js';

export { mapFlatRowsInPool, type FlatRowsPoolResult } from './flatRowsPool.js';

export { createTransformWorker } from './createWorker.js';
export { computeHandlerKeys } from './compute-handlers.js';
