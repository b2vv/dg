import type { DiagramOrganization } from '../data/types.js';

export class OrgHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrgHierarchyError';
  }
}

export function validateOrgHierarchy(organizations: DiagramOrganization[]): void {
  const ids = new Set<string>();
  for (const org of organizations) {
    if (ids.has(org.id)) {
      throw new OrgHierarchyError(`Duplicate organization id: ${org.id}`);
    }
    ids.add(org.id);
  }

  for (const org of organizations) {
    if (org.parentOrgId && hasCycle(org.id, organizations)) {
      throw new OrgHierarchyError(`Cycle detected in parentOrgId at ${org.id}`);
    }
  }
}

function hasCycle(startId: string, organizations: DiagramOrganization[]): boolean {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  const visited = new Set<string>();
  let cur: string | undefined = startId;

  while (cur) {
    if (visited.has(cur)) return true;
    visited.add(cur);
    cur = byId.get(cur)?.parentOrgId;
  }
  return false;
}

export function extractSubtree(
  organizations: DiagramOrganization[],
  rootId: string,
): DiagramOrganization[] {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  if (!byId.has(rootId)) {
    throw new OrgHierarchyError(`Unknown organization: ${rootId}`);
  }

  const result: DiagramOrganization[] = [];
  const walk = (id: string) => {
    const org = byId.get(id);
    if (!org) return;
    result.push(org);
    organizations.filter((o) => o.parentOrgId === id).forEach((c) => walk(c.id));
  };
  walk(rootId);
  return result;
}

export function subtreeToFlatNodes(
  subtree: DiagramOrganization[],
  rootId: string,
): Array<{ id: string; parentId: string | null; label: string }> {
  return subtree.map((o) => ({
    id: o.id,
    parentId: o.id === rootId ? null : (o.parentOrgId ?? null),
    label: o.name,
  }));
}

/**
 * @deprecated No in-repo consumers (REVIEW D7). Prefer multi-root forest layout (T65).
 * Kept as a public utility for hosts that still need a single WASM root.
 */
export function orgsToSingleRootTree(
  organizations: DiagramOrganization[],
): DiagramOrganization[] {
  if (organizations.length === 0) return [];
  validateOrgHierarchy(organizations);

  const roots = organizations.filter((o) => !o.parentOrgId);
  if (roots.length === 1) return organizations;

  const virtualRootId = '__virtual_root__';
  return [
    {
      id: virtualRootId,
      name: 'Root',
      groupIds: [],
      collapsed: true,
    },
    ...organizations.map((o) =>
      !o.parentOrgId ? { ...o, parentOrgId: virtualRootId } : o,
    ),
  ];
}
