import type { DiagramOrganization } from '../data/types.js';
import { isOrgCollapsed } from './orgMode.js';
import type { OrgLayoutNode } from './types.js';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function unionBoxes(
  boxes: readonly { x: number; y: number; width: number; height: number }[],
  padding = 0,
): WorldRect | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Sibling org groups for dashed chrome (GoJS matrix / Figma preview).
 * One AABB per parent that has ≥2 laid-out children **all collapsed**.
 */
export function siblingOrgGroupBounds(
  nodes: readonly OrgLayoutNode[],
  organizations: readonly DiagramOrganization[],
  padding = 12,
): Array<{ parentId: string; bounds: WorldRect }> {
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  const byParent = new Map<string, OrgLayoutNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = byParent.get(n.parentId);
    if (list) list.push(n);
    else byParent.set(n.parentId, [n]);
  }
  const out: Array<{ parentId: string; bounds: WorldRect }> = [];
  for (const [parentId, kids] of byParent) {
    if (kids.length < 2) continue;
    const allCollapsed = kids.every((k) => {
      const org = orgById.get(k.orgId);
      return org ? isOrgCollapsed(org) : true;
    });
    if (!allCollapsed) continue;
    const bounds = unionBoxes(
      kids.map((k) => ({ x: k.x, y: k.y, width: k.width, height: k.height })),
      padding,
    );
    if (bounds) out.push({ parentId, bounds });
  }
  return out;
}
