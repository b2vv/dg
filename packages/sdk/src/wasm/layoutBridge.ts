import { initContourWasm } from '../contour/bridge.js';
import type { OrgFlatInput, OrgRowTreeLayoutResult } from './generated/rust-types.js';

export type { OrgFlatInput, OrgRowTreeLayoutResult, LayoutNode, LayoutEdge } from './generated/rust-types.js';

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
    throw new Error(`${name} must be a finite number`);
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
