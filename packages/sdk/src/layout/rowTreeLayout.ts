import type { DiagramOrganization, DiagramOrgLink } from '../data/types.js';
import { computeMatrixLayout } from './matrixLayout.js';
import { detectOrgMode, findExpandedRootIds, isOrgCollapsed } from './orgMode.js';
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
  const ids = new Set(organizations.map((o) => o.id));
  return organizations.map((o) => ({
    id: o.id,
    // Visible subtree may omit ancestors; that is not a hanging parent in the
    // host data. Null them so WASM validate sees a forest, not UnknownParent.
    parentOrgId: o.parentOrgId && ids.has(o.parentOrgId) ? o.parentOrgId : null,
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

  const rootIds = findExpandedRootIds(organizations);
  if (rootIds.length === 0) {
    return computeMatrixLayout(organizations, orgLinks, options);
  }

  if (rootIds.length === 1) {
    return computeOrgRowTreeLayout(organizations, rootIds[0]!, options);
  }

  // T78-L3: forest — layout each expanded root and place side-by-side.
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };
  const trees = await Promise.all(
    rootIds.map((id) => computeOrgRowTreeLayout(organizations, id, options)),
  );
  const gap = opts.horizontalGap;
  let cursorX = 0;
  const nodes: OrgLayoutResult['nodes'] = [];
  const edges: OrgLayoutResult['edges'] = [];
  let height = 0;
  for (const tree of trees) {
    for (const n of tree.nodes) {
      nodes.push({ ...n, x: n.x + cursorX });
    }
    for (const e of tree.edges) {
      if (!e.path) {
        edges.push(e);
        continue;
      }
      // Shift absolute M/L coordinates in the SVG path by cursorX.
      const shifted = e.path.replace(
        /([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
        (_m, cmd: string, xs: string, ys: string) =>
          `${cmd}${Number(xs) + cursorX} ${ys}`,
      );
      edges.push({ ...e, path: shifted });
    }
    height = Math.max(height, tree.height);
    cursorX += tree.width + gap;
  }
  return {
    mode: 'row-tree',
    nodes,
    edges,
    width: Math.max(0, cursorX - gap),
    height,
  };
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
