/** Pos input for dept contour (grid coords) */
export interface ContourPositionInput {
  id: string;
  departmentId: string;
  col: number;
  row: number;
}

/** Magnetism config — mirrors Rust ContourMagnetConfig (TD03 / SPEC §4.6.1) */
export interface ContourMagnetConfig {
  /** Max Manhattan distance between own cells in one component (default 1.5) */
  magnetRadius?: number;
  paddingCells?: number;
  corridorCells?: number;
  cellWidth?: number;
  cellHeight?: number;
  /** Chaikin iterations; clamped to 8 at compute time (A9, OOM above ~18). */
  smoothIterations?: number;
  /** Prefer notch around foreign (documented; flood enforces G2/G5) */
  preferNotch?: boolean;
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
  ) => DeptContourResult[];
  computeAllContours: (
    positions: ContourPositionInput[],
    config?: ContourMagnetConfig,
  ) => DeptContourResult[];
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

/** Thrown when the WASM contour module cannot be loaded or initialized. */
export class WasmLoadError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WasmLoadError';
    this.cause = cause;
  }
}

export type ContourWasmLoader = () => Promise<WasmContourModule>;

const defaultContourWasmLoader: ContourWasmLoader = async () => {
  const mod = (await import('../wasm/pkg/org_hierarchy_core.js')) as unknown as WasmContourModule;
  await mod.default();
  return mod;
};

let contourWasmLoader: ContourWasmLoader = defaultContourWasmLoader;
let wasm: WasmContourModule | null = null;
let wasmPromise: Promise<WasmContourModule> | null = null;

export async function initContourWasm(): Promise<WasmContourModule> {
  if (wasm) return wasm;
  if (!wasmPromise) {
    wasmPromise = (async () => {
      try {
        const mod = await contourWasmLoader();
        wasm = mod;
        return mod;
      } catch (err) {
        wasmPromise = null;
        wasm = null;
        if (err instanceof WasmLoadError) throw err;
        throw new WasmLoadError(
          'Failed to load Org Hierarchy WASM. Run `npm run build:wasm` and ensure packages/sdk/src/wasm/pkg exists.',
          err,
        );
      }
    })();
  }
  return wasmPromise;
}

/** Test helper — clear cached module so the next init reloads. */
export function resetContourWasmForTests(): void {
  wasm = null;
  wasmPromise = null;
}

/** Test helper — inject a failing/successful loader. Pass `null` to restore default. */
export function setContourWasmLoaderForTests(loader: ContourWasmLoader | null): void {
  contourWasmLoader = loader ?? defaultContourWasmLoader;
  resetContourWasmForTests();
}

/** One or more contours for a department (M4 components). */
export async function computeDeptContour(
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  const m = await initContourWasm();
  const raw = m.computeDeptContour(
    departmentId,
    positions,
    toRustConfig(config) as unknown as ContourMagnetConfig,
  );
  return normalizeContourResults(raw);
}

export async function computeAllContours(
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): Promise<DeptContourResult[]> {
  const m = await initContourWasm();
  const raw = m.computeAllContours(
    positions,
    toRustConfig(config) as unknown as ContourMagnetConfig,
  );
  return normalizeContourResults(raw);
}

/** Accept array or legacy single object from older wasm builds. */
function normalizeContourResults(
  raw: DeptContourResult[] | DeptContourResult,
): DeptContourResult[] {
  if (Array.isArray(raw)) return raw.map((one) => normalizeOne(one));
  if (raw && typeof raw === 'object') return [normalizeOne(raw)];
  return [];
}

function normalizeOne(r: DeptContourResult & { corner_count?: number }): DeptContourResult {
  return {
    departmentId: r.departmentId,
    points: r.points ?? [],
    path: r.path ?? '',
    cornerCount: r.cornerCount ?? r.corner_count ?? 0,
  };
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

export { toRustConfig, MAX_SMOOTH_ITERATIONS } from './config.js';
