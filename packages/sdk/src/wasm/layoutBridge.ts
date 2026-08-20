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
    options.nodeWidth ?? 220,
    options.nodeHeight ?? 72,
    options.horizontalGap ?? 40,
    options.verticalGap ?? 60,
    options.margin ?? 24,
  ) as OrgRowTreeLayoutResult;
}
