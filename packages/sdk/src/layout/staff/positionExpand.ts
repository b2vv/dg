import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { resolveStaffHead } from './resolveHead.js';

/** Admin children: reportLines fromId = manager, toId = report. */
export function adminChildrenMap(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
): Map<string, string[]> {
  const ids = new Set(positions.filter((p) => p.organizationId === orgId).map((p) => p.id));
  const children = new Map<string, string[]>();
  for (const r of reports) {
    if (r.kind !== 'admin') continue;
    if (!ids.has(r.fromId) || !ids.has(r.toId)) continue;
    const list = children.get(r.fromId);
    if (list) list.push(r.toId);
    else children.set(r.fromId, [r.toId]);
  }
  return children;
}

export function positionHasAdminChildren(
  positionId: string,
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
): boolean {
  const orgId = positions.find((p) => p.id === positionId)?.organizationId;
  if (!orgId) return false;
  const kids = adminChildrenMap(positions, reports, orgId).get(positionId);
  return (kids?.length ?? 0) > 0;
}

export function isPositionExpanded(
  position: DiagramPosition,
  expandedPositionIds: ReadonlySet<string> | readonly string[] = [],
): boolean {
  if (position.expanded === true) return true;
  if (expandedPositionIds instanceof Set) return expandedPositionIds.has(position.id);
  return (expandedPositionIds as readonly string[]).includes(position.id);
}

/**
 * BFS from staff head along admin edges. When a node is not expanded,
 * its children are not enqueued (hidden from layout).
 */
export function visiblePositions(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  expandedPositionIds: ReadonlySet<string> | readonly string[] = [],
): DiagramPosition[] {
  const inOrg = positions.filter((p) => p.organizationId === orgId);
  if (inOrg.length === 0) return [];

  const byId = new Map(inOrg.map((p) => [p.id, p]));
  const children = adminChildrenMap(inOrg, reports, orgId);
  const headId = resolveStaffHead(inOrg, orgId, reports);

  const visible: DiagramPosition[] = [];
  const seen = new Set<string>();
  const queue: string[] = [headId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    const node = byId.get(id);
    if (!node) continue;
    seen.add(id);
    visible.push(node);
    if (!isPositionExpanded(node, expandedPositionIds)) continue;
    for (const childId of children.get(id) ?? []) {
      if (!seen.has(childId)) queue.push(childId);
    }
  }

  return visible;
}

/**
 * Ids that must be expanded so nodes at depth ≤ `depth` are visible.
 * Depth 0 → only head (no expands). Depth 1 → expand head only.
 */
export function expandIdsForDepth(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  depth: number,
): string[] {
  const d = Math.max(0, Math.floor(depth));
  if (d === 0) return [];

  const inOrg = positions.filter((p) => p.organizationId === orgId);
  if (inOrg.length === 0) return [];

  const children = adminChildrenMap(inOrg, reports, orgId);
  const headId = resolveStaffHead(inOrg, orgId, reports);
  const expanded: string[] = [];
  let frontier = [headId];
  let level = 0;

  while (level < d && frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const kids = children.get(id) ?? [];
      if (kids.length > 0) expanded.push(id);
      next.push(...kids);
    }
    frontier = next;
    level += 1;
  }

  return [...new Set(expanded)];
}

/** Apply depth expand flags onto positions (org-scoped). */
export function assignExpandToDepth(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
  depth: number,
): { expandedIds: string[]; positions: DiagramPosition[] } {
  const expandedIds = expandIdsForDepth(positions, reports, orgId, depth);
  const expandSet = new Set(expandedIds);
  return {
    expandedIds,
    positions: positions.map((p) => {
      if (p.organizationId !== orgId) return p;
      const next = expandSet.has(p.id);
      if (p.expanded === next) return p;
      return { ...p, expanded: next };
    }),
  };
}

/** Self + admin descendants within the same org. */
export function adminDescendantIds(
  positionId: string,
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
): string[] {
  const orgId = positions.find((p) => p.id === positionId)?.organizationId;
  if (!orgId) return [];
  const children = adminChildrenMap(positions, reports, orgId);
  const out: string[] = [];
  const stack = [positionId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const c of children.get(id) ?? []) stack.push(c);
  }
  return out;
}
