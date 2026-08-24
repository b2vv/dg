import type { DiagramData } from '../data/types.js';

/**
 * Resolve staff focus when host omitted `currentOrgId` (T78-L4).
 * Matches live canvas: single position-org, single org, unique head, else first.
 */
export function inferStaffCurrentOrgId(data: DiagramData): string | undefined {
  const orgIds = [...new Set(data.positions.map((p) => p.organizationId))];
  if (orgIds.length === 1) return orgIds[0];
  if (data.organizations.length === 1) return data.organizations[0]!.id;
  const withHead = data.positions.filter((p) => p.isHead).map((p) => p.organizationId);
  if (withHead.length === 1) return withHead[0];
  return orgIds[0];
}
