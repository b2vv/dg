import type {
  ContourMagnetConfig,
  ContourPositionInput,
  DeptContourResult,
  WasmContourModule,
} from './bridge.js';
import { computeAllContours, computeDeptContour } from './bridge.js';
import { toRustConfig } from './config.js';
import { mapInWorker } from '../worker/bridge.js';
import { createTransformWorker } from '../worker/createWorker.js';
import {
  computeHandlerKeys,
  type ComputeAllContoursPayload,
  type ComputeDeptContourPayload,
} from '../worker/compute-handlers.js';

export interface ContourWorkerOptions {
  workerFactory?: () => Worker;
  timeoutMs?: number;
  fallbackToMainThread?: boolean;
}

const DEFAULT_OPTIONS: Required<ContourWorkerOptions> = {
  workerFactory: createTransformWorker,
  timeoutMs: 30_000,
  fallbackToMainThread: true,
};

let options: Required<ContourWorkerOptions> = { ...DEFAULT_OPTIONS };
let sharedWorker: Worker | null = null;

export function configureContourWorker(opts: ContourWorkerOptions): void {
  options = { ...DEFAULT_OPTIONS, ...opts };
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

export function resetContourWorkerForTests(): void {
  options = { ...DEFAULT_OPTIONS };
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

function getWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = options.workerFactory();
  }
  return sharedWorker;
}

export async function computeDeptContourInWorker(
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult> {
  const payload: ComputeDeptContourPayload = { departmentId, positions, config };
  try {
    return await mapInWorker<ComputeDeptContourPayload, DeptContourResult>(
      getWorker(),
      computeHandlerKeys.computeDeptContour,
      payload,
      undefined,
      options.timeoutMs,
    );
  } catch (err) {
    if (options.fallbackToMainThread) {
      return computeDeptContour(departmentId, positions, config);
    }
    throw err;
  }
}

export async function computeAllContoursInWorker(
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  if (positions.length === 0) {
    return [];
  }
  const payload: ComputeAllContoursPayload = { positions, config };
  try {
    return await mapInWorker<ComputeAllContoursPayload, DeptContourResult[]>(
      getWorker(),
      computeHandlerKeys.computeAllContours,
      payload,
      undefined,
      options.timeoutMs,
    );
  } catch (err) {
    if (options.fallbackToMainThread) {
      return computeAllContours(positions, config);
    }
    throw err;
  }
}

/** Re-export for advanced hosts */
export { toRustConfig };
export type { WasmContourModule };
