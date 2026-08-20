import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { StaffLayoutError } from './types.js';

/** Admin parent: reportLines fromId = manager, toId = report */
export function adminParentMap(
  positions: DiagramPosition[],
  reports: DiagramReportLine[],
  orgId: string,
): Map<string, string> {
  const ids = new Set(positions.filter((p) => p.organizationId === orgId).map((p) => p.id));
  const parents = new Map<string, string>();
  for (const r of reports) {
    if (r.kind !== 'admin') continue;
    if (!ids.has(r.fromId) || !ids.has(r.toId)) continue;
    parents.set(r.toId, r.fromId);
  }
  return parents;
}

export function resolveStaffHead(
  positions: DiagramPosition[],
  orgId: string,
  reports: DiagramReportLine[],
): string {
  const inOrg = positions.filter((p) => p.organizationId === orgId);
  if (inOrg.length === 0) {
    throw new StaffLayoutError(`No positions in organization ${orgId}`);
  }

  const heads = inOrg.filter((p) => p.isHead === true);
  if (heads.length === 1) return heads[0]!.id;
  if (heads.length > 1) {
    throw new StaffLayoutError(`Multiple isHead positions in ${orgId}`);
  }

  const parents = adminParentMap(inOrg, reports, orgId);
  const parentless = inOrg.filter((p) => !parents.has(p.id));
  if (parentless.length === 1) return parentless[0]!.id;
  throw new StaffLayoutError(
    `Cannot resolve staff head for ${orgId}: need one isHead or one parentless position`,
  );
}
