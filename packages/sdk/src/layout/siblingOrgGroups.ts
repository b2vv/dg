import type { DiagramOrganization } from '../data/types.js';
import type { OrgLayoutNode } from './types.js';
import { isOrgCollapsed } from './orgMode.js';

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

export interface SiblingOrgGroupOptions {
  /** Only frame siblings collapsed into a matrix box (GoJS parity). Default false = all ≥2 siblings. */
  collapsedMatrixOnly?: boolean;
  /** Org records keyed by id — required when collapsedMatrixOnly is true. */
  orgById?: ReadonlyMap<string, DiagramOrganization>;
}

function isCollapsedMatrixSibling(org: DiagramOrganization | undefined): boolean {
  if (!org) return false;
  // Use isOrgCollapsed (undefined/true → collapsed) — same rule as orgMode.ts.
  return isOrgCollapsed(org);
}

/**
 * Sibling org groups for dashed chrome (B8c / GoJS matrix).
 * One AABB per parent that has ≥2 laid-out children.
 * When `collapsedMatrixOnly`, skips expanded tree rows (GoJS O11).
 */
export function siblingOrgGroupBounds(
  nodes: readonly OrgLayoutNode[],
  padding = 12,
  options: SiblingOrgGroupOptions = {},
): Array<{ parentId: string; bounds: WorldRect }> {
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
    if (options.collapsedMatrixOnly) {
      const allCollapsed = kids.every((k) =>
        isCollapsedMatrixSibling(options.orgById?.get(k.orgId)),
      );
      if (!allCollapsed) continue;
    }
    const bounds = unionBoxes(
      kids.map((k) => ({ x: k.x, y: k.y, width: k.width, height: k.height })),
      padding,
    );
    if (bounds) out.push({ parentId, bounds });
  }
  return out;
}
