export type {
  WorkerRequest,
  WorkerResponse,
} from './types.js';

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
  createPooledItemMapper,
  mapArrayInPool,
  mapArrayItems,
  type PooledArrayMapperConfig,
  type PooledItemMapperConfig,
  type PooledMapOptions,
  type PooledMapResult,
  type ChunkMapperFn,
  type ChunkMergeFn,
  type ItemMapperFn,
} from './mapArrayFacade.js';

export { mapFlatRowsInPool, type FlatRowsPoolResult } from './flatRowsPool.js';

export { createTransformWorker } from './createWorker.js';
export { computeHandlerKeys } from './compute-handlers.js';
