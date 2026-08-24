import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { computeOrgRowTreeLayoutWasm } from '../../wasm/layoutBridge.js';
import {
  aabbOverlap,
  positionHasCoords,
  resolveGeom,
  resolvePositionAABB,
  type StaffGeom,
} from './coords.js';
import {
  adminParentMap,
  detachedRootIds,
  resolveStaffHead,
} from './resolveHead.js';
import { adminDescendantIds, visiblePositions } from './positionExpand.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  StaffLayoutError,
  type StaffLayoutOptions,
  type StaffNodeBox,
  type StaffOrgBlockResult,
} from './types.js';

function bounds(nodes: StaffNodeBox[], margin: number): { width: number; height: number } {
  if (nodes.length === 0) return { width: margin * 2, height: margin * 2 };
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { width: maxX + margin, height: maxY + margin };
}

function adminEdges(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  _orgId: string,
): StaffOrgBlockResult['edges'] {
  const ids = new Set(positions.map((p) => p.id));
  return reports
    .filter((r) => r.fromId !== r.toId && ids.has(r.fromId) && ids.has(r.toId))
    .map((r) => ({ fromId: r.fromId, toId: r.toId, kind: r.kind }));
}

/** Layout one connected admin forest with a known root (WASM unique-root). */
async function layoutConnectedTree(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  rootId: string,
  geom: StaffGeom,
  role: StaffNodeBox['role'],
): Promise<StaffNodeBox[]> {
  if (positions.length === 0) return [];
  const parents = adminParentMap(positions, reports, orgId);
  const idSet = new Set(positions.map((p) => p.id));

  const flat = positions.map((p) => ({
    id: p.id,
    parentOrgId: p.id === rootId ? null : (parents.get(p.id) ?? null),
    name: p.title,
  }));

  // Staff *positions*, not organizations. Hanging organization parentOrgId is
  // rejected in validateOrgHierarchy. This only gives WASM a unique tree root
  // for orphan seats (D5); edges stay reportLines-only.
  const rooted = flat.map((f) => {
    if (f.id === rootId) return f;
    if (f.parentOrgId && idSet.has(f.parentOrgId)) return f;
    return { ...f, parentOrgId: rootId };
  });

  const raw = await computeOrgRowTreeLayoutWasm(rooted, rootId, {
    direction: 'vertical',
    nodeWidth: geom.nodeWidth,
    nodeHeight: geom.nodeHeight,
    horizontalGap: geom.horizontalGap,
    verticalGap: geom.verticalGap,
    margin: geom.margin,
  });

  const sizeById = new Map(positions.map((p) => [p.id, p]));
  return raw.nodes.map((n) => {
    const src = sizeById.get(n.id);
    return {
      id: n.id,
      organizationId: orgId,
      x: n.x,
      y: n.y,
      width: src?.width ?? n.width,
      height: src?.height ?? n.height,
      depth: n.depth,
      role,
    };
  });
}

/** Pack node groups into a side column to the right of `anchors` (T65). */
function packSideColumn(
  groups: StaffNodeBox[][],
  anchors: StaffNodeBox[],
  geom: StaffGeom,
): StaffNodeBox[] {
  if (groups.length === 0) return [];
  const anchorMaxX =
    anchors.length === 0 ? 0 : Math.max(...anchors.map((a) => a.x + a.width));
  const offsetX = anchorMaxX + geom.horizontalGap + geom.margin;

  const out: StaffNodeBox[] = [];
  let cursorY = geom.margin;

  for (const group of groups) {
    if (group.length === 0) continue;
    const minFx = Math.min(...group.map((f) => f.x));
    const minFy = Math.min(...group.map((f) => f.y));
    const placed = group.map((f) => ({
      ...f,
      x: f.x - minFx + offsetX,
      y: f.y - minFy + cursorY,
      role: 'detached' as const,
    }));
    for (const box of placed) {
      let guard = 0;
      while (
        (anchors.some((a) => aabbOverlap(box, a, geom.horizontalGap, geom.verticalGap)) ||
          out.some((a) => aabbOverlap(box, a, geom.horizontalGap, geom.verticalGap))) &&
        guard < 50
      ) {
        box.y += geom.nodeHeight + geom.verticalGap;
        guard += 1;
      }
      out.push(box);
    }
    const maxY = Math.max(...placed.map((p) => p.y + p.height));
    cursorY = maxY + geom.verticalGap;
  }

  return out;
}

/**
 * Tree block: staff head forest stays under WASM; detached roots (no admin
 * parent / `detached: true`) and their admin subtrees pack into a side column.
 * Virtual re-parent under head is **not** used for detached seats.
 *
 * `orgHeadId` — org-level head (needed when `positions` is a hybrid floating
 * subset that may omit the head).
 */
async function layoutTreeBlock(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  geom: StaffGeom,
  role: StaffNodeBox['role'],
  orgHeadId?: string,
): Promise<StaffNodeBox[]> {
  if (positions.length === 0) return [];
  const headId = orgHeadId ?? resolveStaffHead(positions, orgId, reports);
  const detRoots = detachedRootIds(positions, reports, orgId, headId);

  const detachedIdSet = new Set<string>();
  for (const rootId of detRoots) {
    for (const id of adminDescendantIds(rootId, positions, reports)) {
      detachedIdSet.add(id);
    }
  }

  const attached = positions.filter((p) => !detachedIdSet.has(p.id));
  let attachedNodes: StaffNodeBox[] = [];
  if (attached.length > 0) {
    const attachedRoot = attached.some((p) => p.id === headId)
      ? headId
      : resolveStaffHead(attached, orgId, reports);
    attachedNodes = await layoutConnectedTree(
      attached,
      reports,
      orgId,
      attachedRoot,
      geom,
      role,
    );
  }

  const detachedGroups: StaffNodeBox[][] = [];
  for (const rootId of detRoots) {
    const componentIds = new Set(adminDescendantIds(rootId, positions, reports));
    const component = positions.filter((p) => componentIds.has(p.id));
    const nodes = await layoutConnectedTree(
      component,
      reports,
      orgId,
      rootId,
      geom,
      'detached',
    );
    detachedGroups.push(nodes);
  }

  const detachedNodes = packSideColumn(detachedGroups, attachedNodes, geom);
  return [...attachedNodes, ...detachedNodes];
}

function layoutMatrixBlock(
  positions: DiagramPosition[],
  orgId: string,
  geom: StaffGeom,
): { nodes: StaffNodeBox[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const nodes: StaffNodeBox[] = positions.map((p) => {
    const box = resolvePositionAABB(p, geom);
    return {
      id: p.id,
      organizationId: orgId,
      ...box,
      role: 'matrix' as const,
    };
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (
        aabbOverlap(nodes[i]!, nodes[j]!, geom.horizontalGap, geom.verticalGap)
      ) {
        diagnostics.push(`Anchor overlap: ${nodes[i]!.id} vs ${nodes[j]!.id}`);
      }
    }
  }
  return { nodes, diagnostics };
}

function packFloatingAwayFromAnchors(
  floating: StaffNodeBox[],
  anchors: StaffNodeBox[],
  geom: StaffGeom,
): StaffNodeBox[] {
  if (floating.length === 0) return [];
  const anchorMaxX =
    anchors.length === 0 ? 0 : Math.max(...anchors.map((a) => a.x + a.width));
  const offsetX = anchorMaxX + geom.horizontalGap + geom.margin;

  const minFx = Math.min(...floating.map((f) => f.x));
  const minFy = Math.min(...floating.map((f) => f.y));

  return floating.map((f) => {
    let x = f.x - minFx + offsetX;
    let y = f.y - minFy + geom.margin;
    const box = { ...f, x, y };
    // eject down if still overlaps any anchor
    let guard = 0;
    while (
      anchors.some((a) => aabbOverlap(box, a, geom.horizontalGap, geom.verticalGap)) &&
      guard < 50
    ) {
      box.y += geom.nodeHeight + geom.verticalGap;
      guard += 1;
    }
    return box;
  });
}

export async function layoutStaffOrgBlock(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  options: StaffLayoutOptions = {},
): Promise<StaffOrgBlockResult> {
  const mode = options.staffCoordMode ?? DEFAULT_STAFF_LAYOUT_OPTIONS.staffCoordMode;
  const geom = resolveGeom(options);
  let inOrg = positions.filter((p) => p.organizationId === orgId);
  if (inOrg.length === 0) {
    return {
      organizationId: orgId,
      mode: 'tree',
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
      diagnostics: [],
    };
  }

  const collapse =
    options.collapseUnexpandedPositions ??
    DEFAULT_STAFF_LAYOUT_OPTIONS.collapseUnexpandedPositions;
  if (collapse) {
    inOrg = visiblePositions(inOrg, reports, orgId, options.expandedPositionIds ?? []);
  }

  const withCoords = inOrg.filter(positionHasCoords);
  const without = inOrg.filter((p) => !positionHasCoords(p));
  const diagnostics: string[] = [];

  if (mode === 'strict' && withCoords.length > 0 && without.length > 0) {
    throw new StaffLayoutError(
      `strict staffCoordMode: mixed coordinates in organization ${orgId}`,
    );
  }

  if (mode === 'tree' || (mode === 'hybrid' && withCoords.length === 0) || withCoords.length === 0) {
    const nodes = await layoutTreeBlock(inOrg, reports, orgId, geom, 'tree');
    const b = bounds(nodes, geom.margin);
    return {
      organizationId: orgId,
      mode: 'tree',
      nodes,
      edges: adminEdges(inOrg, reports, orgId),
      ...b,
      diagnostics,
    };
  }

  if (mode === 'matrix' || without.length === 0) {
    const { nodes, diagnostics: d } = layoutMatrixBlock(
      mode === 'matrix' ? withCoords : inOrg,
      orgId,
      geom,
    );
    const b = bounds(nodes, geom.margin);
    return {
      organizationId: orgId,
      mode: 'matrix',
      nodes,
      edges: adminEdges(
        mode === 'matrix' ? withCoords : inOrg,
        reports,
        orgId,
      ),
      ...b,
      diagnostics: [...diagnostics, ...d],
    };
  }

  // hybrid
  const orgHeadId = resolveStaffHead(inOrg, orgId, reports);
  const { nodes: anchors, diagnostics: ad } = layoutMatrixBlock(withCoords, orgId, geom);
  diagnostics.push(...ad);
  const floatingSrc = without;
  let floatingNodes = await layoutTreeBlock(
    floatingSrc,
    reports,
    orgId,
    geom,
    'floating',
    orgHeadId,
  );

  // If floating reports to an anchor, place below that anchor instead of side pack when single child forest
  const parents = adminParentMap(inOrg, reports, orgId);
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  // T78-L2: siblings under the same parent must not share one (x,y).
  const siblingIndexByParent = new Map<string, number>();
  floatingNodes = floatingNodes.map((f) => {
    const parentId = parents.get(f.id);
    const parentAnchor = parentId ? anchorById.get(parentId) : undefined;
    if (parentAnchor && parentId) {
      const idx = siblingIndexByParent.get(parentId) ?? 0;
      siblingIndexByParent.set(parentId, idx + 1);
      const step = f.width + geom.horizontalGap;
      return {
        ...f,
        x: parentAnchor.x + (parentAnchor.width - f.width) / 2 + idx * step,
        y: parentAnchor.y + parentAnchor.height + geom.verticalGap,
      };
    }
    return f;
  });

  const needsPack = floatingNodes.some((f) => {
    const parentId = parents.get(f.id);
    return !parentId || !anchorById.has(parentId);
  });
  if (needsPack) {
    const attached = floatingNodes.filter((f) => {
      const parentId = parents.get(f.id);
      return parentId && anchorById.has(parentId);
    });
    const free = floatingNodes.filter((f) => {
      const parentId = parents.get(f.id);
      return !parentId || !anchorById.has(parentId);
    });
    floatingNodes = [...attached, ...packFloatingAwayFromAnchors(free, anchors, geom)];
  }

  // final eject pass — against anchors AND previously placed floaters (T78-L2)
  const placedFloaters: typeof floatingNodes = [];
  floatingNodes = floatingNodes.map((f) => {
    const box = { ...f };
    let guard = 0;
    while (
      [...anchors, ...placedFloaters].some((a) =>
        aabbOverlap(box, a, geom.horizontalGap, geom.verticalGap),
      ) &&
      guard < 50
    ) {
      box.y += geom.nodeHeight + geom.verticalGap;
      guard += 1;
    }
    placedFloaters.push(box);
    return box;
  });

  const nodes = [...anchors.map((a) => ({ ...a, role: 'anchor' as const })), ...floatingNodes];
  const b = bounds(nodes, geom.margin);
  return {
    organizationId: orgId,
    mode: 'hybrid',
    nodes,
    edges: adminEdges(inOrg, reports, orgId),
    ...b,
    diagnostics,
  };
}
