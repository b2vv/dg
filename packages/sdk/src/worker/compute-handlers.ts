import type { ContourMagnetConfig, DeptContourResult } from '../contour/bridge.js';
import type { ContourPositionInput } from '../contour/bridge.js';
import { toRustConfig } from '../contour/config.js';
import { initWasmModule } from './wasm-init.js';

export interface ComputeDeptContourPayload {
  departmentId: string;
  positions: ContourPositionInput[];
  config?: ContourMagnetConfig;
}

export interface ComputeAllContoursPayload {
  positions: ContourPositionInput[];
  config?: ContourMagnetConfig;
}

export interface ComputeLayoutPayload {
  root: unknown;
  direction?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
}

export async function handleComputeDeptContour(
  input: ComputeDeptContourPayload,
): Promise<DeptContourResult> {
  const wasm = await initWasmModule();
  return wasm.computeDeptContour(
    input.departmentId,
    input.positions,
    toRustConfig(input.config) as unknown as ContourMagnetConfig,
  );
}

export async function handleComputeAllContours(
  input: ComputeAllContoursPayload,
): Promise<DeptContourResult[]> {
  const wasm = await initWasmModule();
  return wasm.computeAllContours(
    input.positions,
    toRustConfig(input.config) as unknown as ContourMagnetConfig,
  );
}

export async function handleComputeLayout(input: ComputeLayoutPayload): Promise<unknown> {
  const wasm = await initWasmModule();
  return wasm.computeLayout(
    input.root,
    input.direction ?? 'vertical',
    input.nodeWidth ?? 200,
    input.nodeHeight ?? 72,
    input.horizontalGap ?? 40,
    input.verticalGap ?? 60,
    input.margin ?? 24,
  );
}

export async function handleBuildFromFlat(items: unknown): Promise<unknown> {
  const wasm = await initWasmModule();
  return wasm.buildFromFlat(items);
}

/** Registry keys for transform.worker.ts */
export const computeHandlerKeys = {
  computeDeptContour: 'computeDeptContour',
  computeAllContours: 'computeAllContours',
  computeLayout: 'computeLayout',
  buildFromFlat: 'buildFromFlat',
} as const;

export async function dispatchComputeHandler(
  mapperKey: string,
  payload: unknown,
): Promise<unknown> {
  switch (mapperKey) {
    case computeHandlerKeys.computeDeptContour:
      return handleComputeDeptContour(payload as ComputeDeptContourPayload);
    case computeHandlerKeys.computeAllContours:
      return handleComputeAllContours(payload as ComputeAllContoursPayload);
    case computeHandlerKeys.computeLayout:
      return handleComputeLayout(payload as ComputeLayoutPayload);
    case computeHandlerKeys.buildFromFlat:
      return handleBuildFromFlat(payload);
    default:
      throw new Error(`Unknown compute handler: ${mapperKey}`);
  }
}
