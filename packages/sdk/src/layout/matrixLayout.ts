import type { DiagramOrganization, DiagramOrgLink } from '../data/types.js';
import {
  DEFAULT_ORG_LAYOUT_OPTIONS,
  type OrgLayoutEdge,
  type OrgLayoutNode,
  type OrgLayoutOptions,
  type OrgLayoutResult,
} from './types.js';

export function computeMatrixLayout(
  organizations: DiagramOrganization[],
  orgLinks: DiagramOrgLink[] = [],
  options: OrgLayoutOptions = {},
): OrgLayoutResult {
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };
  if (organizations.length === 0) {
    return { mode: 'matrix', nodes: [], edges: [], width: 0, height: 0 };
  }

  const sorted = [...organizations].sort(
    (a, b) => (a.matrixOrder ?? 0) - (b.matrixOrder ?? 0) || a.id.localeCompare(b.id),
  );

  const cols =
    opts.matrixColumns > 0 ? opts.matrixColumns : Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const cellW = opts.nodeWidth + opts.horizontalGap;
  const cellH = opts.nodeHeight + opts.verticalGap;

  const nodes: OrgLayoutNode[] = sorted.map((org, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      id: org.id,
      orgId: org.id,
      x: opts.margin + col * cellW,
      y: opts.margin + row * cellH,
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      depth: 0,
      parentId: org.parentOrgId,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.orgId, n]));
  const edges = buildMatrixEdges(organizations, orgLinks, nodeMap, opts);

  const maxX = Math.max(...nodes.map((n) => n.x + n.width), 0);
  const maxY = Math.max(...nodes.map((n) => n.y + n.height), 0);

  return {
    mode: 'matrix',
    nodes,
    edges,
    width: maxX + opts.margin,
    height: maxY + opts.margin,
  };
}

function buildMatrixEdges(
  organizations: DiagramOrganization[],
  orgLinks: DiagramOrgLink[],
  nodeMap: Map<string, OrgLayoutNode>,
  opts: Required<OrgLayoutOptions>,
): OrgLayoutEdge[] {
  const edges: OrgLayoutEdge[] = [];
  const seen = new Set<string>();

  const addEdge = (fromId: string, toId: string, kind: OrgLayoutEdge['kind']) => {
    const key = `${fromId}->${toId}`;
    if (seen.has(key)) return;
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return;
    seen.add(key);
    edges.push({
      fromId,
      toId,
      kind,
      path: orthogonalPath(from, to, opts),
    });
  };

  for (const org of organizations) {
    if (org.parentOrgId) {
      addEdge(org.parentOrgId, org.id, 'admin');
    }
  }

  for (const link of orgLinks) {
    addEdge(link.fromOrgId, link.toOrgId, 'link');
  }

  return edges;
}

function orthogonalPath(
  from: OrgLayoutNode,
  to: OrgLayoutNode,
  opts: Required<OrgLayoutOptions>,
): string {
  const x1 = from.x + from.width / 2;
  const y1 = from.y + from.height;
  const x2 = to.x + to.width / 2;
  const y2 = to.y;
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`;
}

export function swapMatrixOrder(
  organizations: DiagramOrganization[],
  orgId: string,
  newIndex: number,
): DiagramOrganization[] {
  const sorted = [...organizations].sort(
    (a, b) => (a.matrixOrder ?? 0) - (b.matrixOrder ?? 0) || a.id.localeCompare(b.id),
  );
  const currentIndex = sorted.findIndex((o) => o.id === orgId);
  if (currentIndex < 0) return organizations;

  const clamped = Math.max(0, Math.min(newIndex, sorted.length - 1));
  const [item] = sorted.splice(currentIndex, 1);
  sorted.splice(clamped, 0, item);

  const orderById = new Map(sorted.map((o, i) => [o.id, i]));
  return organizations.map((o) => ({
    ...o,
    matrixOrder: orderById.get(o.id) ?? o.matrixOrder ?? 0,
  }));
}
