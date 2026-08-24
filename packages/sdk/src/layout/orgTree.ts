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
    if (org.parentOrgId && !ids.has(org.parentOrgId)) {
      throw new OrgHierarchyError(
        `Unknown parentOrgId: ${org.parentOrgId} (referenced by ${org.id})`,
      );
    }
  }

  // Tri-color DFS: each node is proven acyclic at most once — true O(n) total.
  const byId = new Map(organizations.map((o) => [o.id, o]));
  // 'done' = proven acyclic; 'in-stack' = cycle detected.
  const done = new Set<string>();
  const inStack = new Set<string>();

  for (const org of organizations) {
    if (done.has(org.id)) continue;
    const cycleId = walkParentChain(org.id, byId, done, inStack);
    if (cycleId) {
      throw new OrgHierarchyError(`Cycle detected in parentOrgId at ${cycleId}`);
    }
  }
}

/**
 * Walk the parent chain from `startId`, returning the id where the cycle
 * was detected, or `null` if acyclic. Marks every node along the clean
 * path as `done` so future walks skip it.
 */
function walkParentChain(
  startId: string,
  byId: ReadonlyMap<string, DiagramOrganization>,
  done: Set<string>,
  inStack: Set<string>,
): string | null {
  const path: string[] = [];
  let cur: string | undefined = startId;

  while (cur && !done.has(cur)) {
    if (inStack.has(cur)) return cur;
    inStack.add(cur);
    path.push(cur);
    cur = byId.get(cur)?.parentOrgId;
  }

  // Clean path — mark everything on it as done.
  for (const id of path) {
    inStack.delete(id);
    done.add(id);
  }
  return null;
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
