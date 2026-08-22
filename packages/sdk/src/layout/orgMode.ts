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
  return organizations.map((o) => (o.id === orgId ? { ...o, collapsed: true } : o));
}

export function orgHasChildren(
  organizations: readonly DiagramOrganization[],
  orgId: string,
): boolean {
  return organizations.some((o) => o.parentOrgId === orgId);
}

export function findExpandedRootId(organizations: DiagramOrganization[]): string | null {
  const expanded = organizations.filter((o) => !isOrgCollapsed(o));
  if (expanded.length === 0) return null;

  const expandedIds = new Set(expanded.map((o) => o.id));
  const byId = new Map(organizations.map((o) => [o.id, o]));

  const depth = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return Infinity;
    seen.add(id);
    const org = byId.get(id);
    if (!org?.parentOrgId) return 0;
    return 1 + depth(org.parentOrgId, seen);
  };

  return expanded.sort((a, b) => depth(a.id) - depth(b.id))[0].id;
}
