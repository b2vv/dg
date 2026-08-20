import type { DiagramOrganization } from '../data/types.js';
import { expandOrg } from '../layout/orgMode.js';

/**
 * Expand every ancestor of `orgId` (and the org itself) so the node is visible in row-tree.
 * Returns organizations with collapsed flags cleared along the path.
 */
export function revealOrgPath(
  organizations: DiagramOrganization[],
  orgId: string,
): DiagramOrganization[] {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  if (!byId.has(orgId)) return organizations;

  const path: string[] = [];
  let cur: string | undefined = orgId;
  const guard = new Set<string>();
  while (cur && byId.has(cur) && !guard.has(cur)) {
    path.push(cur);
    guard.add(cur);
    cur = byId.get(cur)?.parentOrgId;
  }

  let next = organizations;
  // Expand from root toward leaf so parents are open first
  for (const id of path.reverse()) {
    next = expandOrg(next, id);
  }
  return next;
}

/** Resolve organization id for a person/position/org node id. */
export function resolveOrganizationIdForNode(
  data: {
    organizations: DiagramOrganization[];
    positions: Array<{ id: string; organizationId: string; personId?: string }>;
    persons: Array<{ id: string }>;
  },
  nodeId: string,
): string | undefined {
  if (data.organizations.some((o) => o.id === nodeId)) return nodeId;
  const byPosition = data.positions.find((p) => p.id === nodeId);
  if (byPosition) return byPosition.organizationId;
  const byPerson = data.positions.find((p) => p.personId === nodeId);
  if (byPerson) return byPerson.organizationId;
  return undefined;
}
