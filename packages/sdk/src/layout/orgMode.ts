import type { DiagramOrganization } from '../data/types.js';
import type { OrgDisplayMode } from './types.js';

/** undefined / true → collapsed (matrix); false → expanded (row-tree) */
export function isOrgCollapsed(org: DiagramOrganization): boolean {
  return org.collapsed !== false;
}

export function detectOrgMode(organizations: DiagramOrganization[]): OrgDisplayMode {
  if (organizations.length === 0) return 'matrix';
  return organizations.some((o) => !isOrgCollapsed(o)) ? 'row-tree' : 'matrix';
}

export function collapseAllOrgs(organizations: DiagramOrganization[]): DiagramOrganization[] {
  return organizations.map((o) => ({ ...o, collapsed: true }));
}

export function expandOrg(
  organizations: DiagramOrganization[],
  orgId: string,
): DiagramOrganization[] {
  return organizations.map((o) => (o.id === orgId ? { ...o, collapsed: false } : o));
}

export function collapseOrg(
  organizations: DiagramOrganization[],
  orgId: string,
): DiagramOrganization[] {
  if (!organizations.some((o) => o.id === orgId)) return organizations;
  const hide = new Set<string>();
  const walk = (id: string) => {
    if (hide.has(id)) return;
    hide.add(id);
    for (const o of organizations) {
      if (o.parentOrgId === id) walk(o.id);
    }
  };
  walk(orgId);
  return organizations.map((o) => (hide.has(o.id) ? { ...o, collapsed: true } : o));
}

export function orgHasChildren(
  organizations: readonly DiagramOrganization[],
  orgId: string,
): boolean {
  return organizations.some((o) => o.parentOrgId === orgId);
}

export function findExpandedRootId(organizations: DiagramOrganization[]): string | null {
  const roots = findExpandedRootIds(organizations);
  return roots[0] ?? null;
}

/**
 * All expanded roots of a forest (T65 / T78-L3).
 * An expanded org is a root when its parent is missing, omitted from this
 * payload, or collapsed. Collapse of a parent must collapse the subtree
 * (`collapseOrg`) so leftover expanded flags do not spawn extra trees
 * (mockup: collapse mid hides peer divisions). Explicitly expanding a nested
 * org while ancestors stay collapsed is a forest root (A12).
 */
export function findExpandedRootIds(organizations: DiagramOrganization[]): string[] {
  const expanded = organizations.filter((o) => !isOrgCollapsed(o));
  if (expanded.length === 0) return [];

  const byId = new Map(organizations.map((o) => [o.id, o]));
  const roots = expanded.filter((o) => {
    if (!o.parentOrgId) return true;
    const parent = byId.get(o.parentOrgId);
    return !parent || isOrgCollapsed(parent);
  });

  const depth = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return Infinity;
    seen.add(id);
    const org = byId.get(id);
    if (!org?.parentOrgId) return 0;
    return 1 + depth(org.parentOrgId, seen);
  };

  return roots
    .sort((a, b) => depth(a.id) - depth(b.id) || a.id.localeCompare(b.id))
    .map((o) => o.id);
}
