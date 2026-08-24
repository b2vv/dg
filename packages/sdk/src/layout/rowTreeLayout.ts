import type { DiagramOrganization, DiagramOrgLink } from '../data/types.js';
import { computeMatrixLayout } from './matrixLayout.js';
import { detectOrgMode, findExpandedRootId, isOrgCollapsed } from './orgMode.js';
import { validateOrgHierarchy } from './orgTree.js';
import { OrgHierarchyError } from './orgTree.js';
import {
  DEFAULT_ORG_LAYOUT_OPTIONS,
  assertOrgLayoutMetrics,
  type OrgLayoutOptions,
  type OrgLayoutResult,
} from './types.js';
import {
  computeOrgRowTreeLayoutWasm,
  type OrgFlatInput,
} from '../wasm/layoutBridge.js';

function toOrgFlatInput(organizations: DiagramOrganization[]): OrgFlatInput[] {
  return organizations.map((o) => ({
    id: o.id,
    parentOrgId: o.parentOrgId ?? null,
    name: o.name,
  }));
}

function visibleOrgsForRowTree(
  organizations: DiagramOrganization[],
  expandedRootId: string,
): DiagramOrganization[] {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  const visible = new Set<string>();
  const walk = (id: string) => {
    if (!byId.has(id)) return;
    visible.add(id);
    const org = byId.get(id)!;
    if (isOrgCollapsed(org)) return;
    for (const child of organizations) {
      if (child.parentOrgId === id) walk(child.id);
    }
  };
  walk(expandedRootId);
  return organizations.filter((o) => visible.has(o.id));
}

export async function computeOrgRowTreeLayout(
  organizations: DiagramOrganization[],
  expandedRootId: string,
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  validateOrgHierarchy(organizations);
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };
  assertOrgLayoutMetrics(opts);
  if (!organizations.some((o) => o.id === expandedRootId)) {
    throw new OrgHierarchyError(`Unknown organization: ${expandedRootId}`);
  }
  const visible = visibleOrgsForRowTree(organizations, expandedRootId);

  const raw = await computeOrgRowTreeLayoutWasm(toOrgFlatInput(visible), expandedRootId, {
    direction: 'vertical',
    nodeWidth: opts.nodeWidth,
    nodeHeight: opts.nodeHeight,
    horizontalGap: opts.horizontalGap,
    verticalGap: opts.verticalGap,
    margin: opts.margin,
  });

  return {
    mode: 'row-tree',
    nodes: raw.nodes.map((n) => ({
      id: n.id,
      orgId: n.orgId,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      depth: n.depth,
      parentId: n.parentId ?? undefined,
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
