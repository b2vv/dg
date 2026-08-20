/** Pos input for dept contour (grid coords) */
export interface ContourPositionInput {
  id: string;
  departmentId: string;
  col: number;
  row: number;
}

/** Magnetism config — mirrors Rust ContourMagnetConfig */
export interface ContourMagnetConfig {
  paddingCells?: number;
  corridorCells?: number;
  cellWidth?: number;
  cellHeight?: number;
  smoothIterations?: number;
}

export interface ContourPoint {
  x: number;
  y: number;
}

export interface DeptContourResult {
  departmentId: string;
  points: ContourPoint[];
  path: string;
  cornerCount: number;
}

export interface WasmContourModule {
  default: () => Promise<void>;
  computeDeptContour: (
    departmentId: string,
    positions: ContourPositionInput[],
    config?: ContourMagnetConfig,
  ) => DeptContourResult;
  computeAllContours: (
    positions: ContourPositionInput[],
    config?: ContourMagnetConfig,
  ) => DeptContourResult[];
  computeLayout: (...args: unknown[]) => unknown;
  buildFromFlat: (items: unknown) => unknown;
  computeOrgRowTreeLayout: (
    organizations: unknown,
    expandedRootId: string,
    direction?: string | null,
    nodeWidth?: number | null,
    nodeHeight?: number | null,
    hGap?: number | null,
    vGap?: number | null,
    margin?: number | null,
  ) => unknown;
}

import { toRustConfig } from './config.js';

let wasm: WasmContourModule | null = null;

export async function initContourWasm(): Promise<WasmContourModule> {
  if (wasm) return wasm;
  const mod = (await import('../wasm/pkg/org_hierarchy_core.js')) as unknown as WasmContourModule;
  await mod.default();
  wasm = mod;
  return mod;
}

export async function computeDeptContour(
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult> {
  const m = await initContourWasm();
  return m.computeDeptContour(
    departmentId,
    positions,
    toRustConfig(config) as unknown as ContourMagnetConfig,
  );
}

export async function computeAllContours(
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  const m = await initContourWasm();
  return m.computeAllContours(
    positions,
    toRustConfig(config) as unknown as ContourMagnetConfig,
  );
}

/** Demo positions — variant B (canonical sketch) */
export const VARIANT_B_POSITIONS: ContourPositionInput[] = [
  { id: 'P1', departmentId: 'IT', col: 0, row: 0 },
  { id: 'P2', departmentId: 'IT', col: 1, row: 0 },
  { id: 'P3', departmentId: 'IT', col: 2, row: 0 },
  { id: 'P4', departmentId: 'CEO', col: 1, row: 1 },
  { id: 'P5', departmentId: 'IT', col: 0, row: 2 },
  { id: 'P6', departmentId: 'IT', col: 2, row: 2 },
];

export { toRustConfig } from './config.js';
