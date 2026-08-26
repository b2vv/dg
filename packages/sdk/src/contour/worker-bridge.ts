import type {
  ContourMagnetConfig,
  ContourPositionInput,
  DeptContourResult,
  WasmContourModule,
} from './bridge.js';
import { computeAllContours, computeDeptContour } from './bridge.js';
import { toRustConfig } from './config.js';
import { createTransformWorker } from '../worker/createWorker.js';
import { WorkerChannel, type WorkerChannelOptions } from '../worker/WorkerChannel.js';
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

/**
 * Process-wide channel for hosts that call the module functions directly.
 * A host running two diagrams should build its own {@link createContourWorkerClient}
 * instead — this one is shared, and configuring it drops its worker.
 */
const defaultChannel = new WorkerChannel(DEFAULT_OPTIONS);

export function configureContourWorker(opts: ContourWorkerOptions): void {
  defaultChannel.reconfigure(DEFAULT_OPTIONS, opts as WorkerChannelOptions);
}

export function resetContourWorkerForTests(): void {
  defaultChannel.reconfigure(DEFAULT_OPTIONS);
}

/** An isolated contour worker: own factory, own worker, own lifetime. */
export function createContourWorkerClient(opts?: ContourWorkerOptions) {
  const channel = new WorkerChannel(DEFAULT_OPTIONS, opts as WorkerChannelOptions);
  return {
    computeDeptContour: (departmentId: string, positions: ContourPositionInput[], config?: ContourMagnetConfig) =>
      runDeptContour(channel, departmentId, positions, config),
    computeAllContours: (positions: ContourPositionInput[], config?: ContourMagnetConfig) =>
      runAllContours(channel, positions, config),
    dispose: () => channel.dispose(),
  };
}

export async function computeDeptContourInWorker(
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  return runDeptContour(defaultChannel, departmentId, positions, config);
}

async function runDeptContour(
  channel: WorkerChannel,
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  const payload: ComputeDeptContourPayload = { departmentId, positions, config };
  const raw = await channel.run<ComputeDeptContourPayload, DeptContourResult[] | DeptContourResult>(
    computeHandlerKeys.computeDeptContour,
    payload,
    () => computeDeptContour(departmentId, positions, config),
  );
  return Array.isArray(raw) ? raw : [raw];
}

export async function computeAllContoursInWorker(
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  return runAllContours(defaultChannel, positions, config);
}

async function runAllContours(
  channel: WorkerChannel,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  if (positions.length === 0) return [];
  const payload: ComputeAllContoursPayload = { positions, config };
  return channel.run<ComputeAllContoursPayload, DeptContourResult[]>(
    computeHandlerKeys.computeAllContours,
    payload,
    () => computeAllContours(positions, config),
  );
}

/** Re-export for advanced hosts */
export { toRustConfig };
export type { WasmContourModule };
