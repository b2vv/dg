import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { computeOrgRowTreeLayoutWasm } from '../../wasm/layoutBridge.js';
import {
  aabbOverlap,
  positionHasCoords,
  resolveGeom,
  resolvePositionAABB,
  type StaffGeom,
} from './coords.js';
import { adminParentMap, resolveStaffHead } from './resolveHead.js';
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
  orgId: string,
): StaffOrgBlockResult['edges'] {
  const ids = new Set(positions.map((p) => p.id));
  return reports
    .filter((r) => ids.has(r.fromId) && ids.has(r.toId))
    .map((r) => ({ fromId: r.fromId, toId: r.toId, kind: r.kind }));
}

async function layoutTreeBlock(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  geom: StaffGeom,
  role: StaffNodeBox['role'],
): Promise<StaffNodeBox[]> {
  if (positions.length === 0) return [];
  const headId = resolveStaffHead(positions, orgId, reports);
  const parents = adminParentMap(positions, reports, orgId);

  const flat = positions.map((p) => ({
    id: p.id,
    parentOrgId: p.id === headId ? null : (parents.get(p.id) ?? null),
    name: p.title,
  }));

  // Ensure unique root for wasm: orphans re-parented under head
  const rooted = flat.map((f) => {
    if (f.id === headId) return f;
    if (f.parentOrgId && flat.some((x) => x.id === f.parentOrgId)) return f;
    return { ...f, parentOrgId: headId };
  });

  const raw = await computeOrgRowTreeLayoutWasm(rooted, headId, {
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
  const inOrg = positions.filter((p) => p.organizationId === orgId);
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
  const { nodes: anchors, diagnostics: ad } = layoutMatrixBlock(withCoords, orgId, geom);
  diagnostics.push(...ad);
  const floatingSrc = without;
  let floatingNodes = await layoutTreeBlock(floatingSrc, reports, orgId, geom, 'floating');

  // If floating reports to an anchor, place below that anchor instead of side pack when single child forest
  const parents = adminParentMap(inOrg, reports, orgId);
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  floatingNodes = floatingNodes.map((f) => {
    const parentId = parents.get(f.id);
    const parentAnchor = parentId ? anchorById.get(parentId) : undefined;
    if (parentAnchor) {
      return {
        ...f,
        x: parentAnchor.x + (parentAnchor.width - f.width) / 2,
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

  // final eject pass
  floatingNodes = floatingNodes.map((f) => {
    const box = { ...f };
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
