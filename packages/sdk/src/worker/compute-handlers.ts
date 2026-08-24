import type { ContourMagnetConfig, DeptContourResult } from '../contour/bridge.js';
import type { ContourPositionInput } from '../contour/bridge.js';
import { toRustConfig } from '../contour/config.js';
import { initWasmModule } from './wasm-init.js';
import { handleComputeOrgRowTreeLayout } from '../layout/rowTreeLayout.js';
import type { DiagramOrganization } from '../data/types.js';
import type { OrgLayoutOptions } from '../layout/types.js';

export interface ComputeDeptContourPayload {
  departmentId: string;
  positions: ContourPositionInput[];
  config?: ContourMagnetConfig;
}

export interface ComputeAllContoursPayload {
  positions: ContourPositionInput[];
  config?: ContourMagnetConfig;
}

export interface ComputeOrgRowTreeLayoutPayload {
  organizations: DiagramOrganization[];
  expandedRootId: string;
  options?: OrgLayoutOptions;
}

export async function handleComputeDeptContour(
  input: ComputeDeptContourPayload,
): Promise<DeptContourResult[]> {
  const wasm = await initWasmModule();
  const raw = wasm.computeDeptContour(
    input.departmentId,
    input.positions,
    toRustConfig(input.config) as unknown as ContourMagnetConfig,
  );
  return Array.isArray(raw) ? raw : [raw];
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

/** Registry keys for transform.worker.ts */
export const computeHandlerKeys = {
  computeDeptContour: 'computeDeptContour',
  computeAllContours: 'computeAllContours',
  computeOrgRowTreeLayout: 'computeOrgRowTreeLayout',
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
    case computeHandlerKeys.computeOrgRowTreeLayout:
      return handleComputeOrgRowTreeLayout(payload as ComputeOrgRowTreeLayoutPayload);
    default:
      throw new Error(`Unknown compute handler: ${mapperKey}`);
  }
}
