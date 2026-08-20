import { initContourWasm } from '../contour/bridge.js';
import type { DiagramOrganization, DiagramOrgLink } from '../data/types.js';
import { computeMatrixLayout } from './matrixLayout.js';
import { detectOrgMode, findExpandedRootId } from './orgMode.js';
import { extractSubtree, subtreeToFlatNodes, validateOrgHierarchy } from './orgTree.js';
import {
  DEFAULT_ORG_LAYOUT_OPTIONS,
  type OrgLayoutOptions,
  type OrgLayoutResult,
} from './types.js';

interface WasmLayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
}

interface WasmLayoutResult {
  nodes: WasmLayoutNode[];
  edges: Array<{ fromId: string; toId: string; path: string }>;
  width: number;
  height: number;
  direction: string;
}

export async function computeOrgRowTreeLayout(
  organizations: DiagramOrganization[],
  expandedRootId: string,
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  validateOrgHierarchy(organizations);
  const subtree = extractSubtree(organizations, expandedRootId);
  const flat = subtreeToFlatNodes(subtree, expandedRootId);

  const wasm = await initContourWasm();
  const root = wasm.buildFromFlat(flat) as { children?: unknown[] };
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };

  const raw = wasm.computeLayout(
    root,
    'vertical',
    opts.nodeWidth,
    opts.nodeHeight,
    opts.horizontalGap,
    opts.verticalGap,
    opts.margin,
  ) as WasmLayoutResult;

  const depthById = computeDepths(subtree, expandedRootId);

  return {
    mode: 'row-tree',
    nodes: raw.nodes.map((n) => ({
      id: n.id,
      orgId: n.id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      depth: depthById.get(n.id) ?? 0,
      parentId: n.parentId,
    })),
    edges: raw.edges.map((e) => ({
      fromId: e.fromId,
      toId: e.toId,
      path: e.path,
      kind: 'admin' as const,
    })),
    width: raw.width,
    height: raw.height,
  };
}

function computeDepths(
  organizations: DiagramOrganization[],
  rootId: string,
): Map<string, number> {
  const depths = new Map<string, number>();
  const walk = (id: string, d: number) => {
    depths.set(id, d);
    organizations.filter((o) => o.parentOrgId === id).forEach((c) => walk(c.id, d + 1));
  };
  walk(rootId, 0);
  return depths;
}

export async function computeOrgLayout(
  organizations: DiagramOrganization[],
  orgLinks: DiagramOrgLink[] = [],
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  validateOrgHierarchy(organizations);
  const mode = detectOrgMode(organizations);

  if (mode === 'matrix') {
    return computeMatrixLayout(organizations, orgLinks, options);
  }

  const rootId = findExpandedRootId(organizations);
  if (!rootId) {
    return computeMatrixLayout(organizations, orgLinks, options);
  }

  return computeOrgRowTreeLayout(organizations, rootId, options);
}

export async function computeOrgRowTreeLayoutInWorker(
  organizations: DiagramOrganization[],
  expandedRootId: string,
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  const { mapInWorker } = await import('../worker/bridge.js');
  const { createTransformWorker } = await import('../worker/createWorker.js');
  const worker = createTransformWorker();
  try {
    return await mapInWorker(
      worker,
      'computeOrgRowTreeLayout',
      { organizations, expandedRootId, options },
      undefined,
      30_000,
    );
  } finally {
    worker.terminate();
  }
}

/** Worker handler body — also registered in compute-handlers */
export async function handleComputeOrgRowTreeLayout(payload: {
  organizations: DiagramOrganization[];
  expandedRootId: string;
  options?: OrgLayoutOptions;
}): Promise<OrgLayoutResult> {
  return computeOrgRowTreeLayout(
    payload.organizations,
    payload.expandedRootId,
    payload.options,
  );
}
