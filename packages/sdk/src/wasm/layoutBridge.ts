import { initContourWasm } from '../contour/bridge.js';
import type {
  OrgFlatInput,
  OrgRowTreeLayoutResult,
  StaffGeometryResult,
  StaffLayoutInput,
  StaffTidyInput,
  StaffTidyResult,
} from './generated/rust-types.js';

export type { OrgFlatInput, OrgRowTreeLayoutResult, LayoutNode, LayoutEdge } from './generated/rust-types.js';

// T126 R7 A3 — full staff type closure, so A4 consumers import the Rust
// geometry contract from this bridge rather than reaching into generated/.
export type {
  // Input closure.
  StaffLayoutInput,
  StaffPositionInput,
  StaffEdgeInput,
  StaffOrgInput,
  StaffDepartmentInput,
  StaffNodeSize,
  StaffLayoutMetrics,
  StaffDockHintInput,
  StaffDockHint,
  // Output closure.
  StaffGeometryResult,
  StaffNodeGeo,
  StaffOrgCardGeo,
  StaffNamespace,
  StaffDepartmentFrameGeo,
  StaffEdge,
  StaffRouteSet,
  StaffEdgeRoute,
  StaffRoutePoint,
} from './generated/rust-types.js';

// Alpha staff-layout — окрема версія ліби (порт алгоритму мокапа `shps-links.js`).
export type {
  StaffTidyInput,
  StaffTidyParams,
  StaffTidyNode,
  StaffTidyFrame,
  StaffTidyResult,
} from './generated/rust-types.js';

export interface WasmRowTreeOptions {
  direction?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
}

function requireLayoutMetric(name: string, value: number, allowZero = false): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (allowZero ? value < 0 : value <= 0) {
    throw new Error(`${name} must be ${allowZero ? '≥ 0' : 'greater than 0'}`);
  }
  return value;
}

export async function computeOrgRowTreeLayoutWasm(
  organizations: OrgFlatInput[],
  expandedRootId: string,
  options: WasmRowTreeOptions = {},
): Promise<OrgRowTreeLayoutResult> {
  const wasm = await initContourWasm();
  return wasm.computeOrgRowTreeLayout(
    organizations,
    expandedRootId,
    options.direction ?? 'vertical',
    requireLayoutMetric('nodeWidth', options.nodeWidth ?? 220),
    requireLayoutMetric('nodeHeight', options.nodeHeight ?? 72),
    requireLayoutMetric('horizontalGap', options.horizontalGap ?? 40, true),
    requireLayoutMetric('verticalGap', options.verticalGap ?? 60, true),
    requireLayoutMetric('margin', options.margin ?? 24, true),
  ) as OrgRowTreeLayoutResult;
}

/**
 * T126 R7 A3 — staff geometry over the WASM boundary. Unlike the row-tree entry
 * this is a typed pass-through: the whole `StaffLayoutInput` crosses as one
 * object and metric validation happens in Rust (`StaffLayoutMetrics::validate`),
 * so there is nothing to validate or reshape here. Errors mirror the row-tree
 * style — a failed `compute` throws the Rust `JsValue` as-is; only the loader
 * path wraps into `WasmLoadError`.
 */
export async function computeStaffGeometryWasm(
  input: StaffLayoutInput,
): Promise<StaffGeometryResult> {
  const wasm = await initContourWasm();
  return wasm.computeStaffGeometry(input) as StaffGeometryResult;
}

/**
 * Alpha staff-layout над WASM-межею — окрема версія ліби (порт алгоритму мокапа
 * `shps-links.js` `layout()`): дворівневий tidy-tree з розчепленими LV/BV. Типізований
 * pass-through, як `computeStaffGeometryWasm`: увесь `StaffTidyInput` переходить одним
 * об'єктом, помилки — як Rust `JsValue`.
 */
export async function computeStaffTidyLayoutWasm(
  input: StaffTidyInput,
): Promise<StaffTidyResult> {
  const wasm = await initContourWasm();
  // TODO(dg41): rename to computeStaffTidyLayout at the coordinated build:wasm
  return wasm.computeStaffMockupLayout(input) as StaffTidyResult;
}
