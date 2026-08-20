import type { DiagramData } from '../data/types.js';

/** Filter diagram to an organization subtree (org + descendants + their positions). */
export function filterDiagramSubtree(data: DiagramData, rootOrgId: string): DiagramData {
  const byParent = new Map<string, string[]>();
  for (const org of data.organizations) {
    if (!org.parentOrgId) continue;
    const list = byParent.get(org.parentOrgId) ?? [];
    list.push(org.id);
    byParent.set(org.parentOrgId, list);
  }

  const keep = new Set<string>();
  const stack = [rootOrgId];
  while (stack.length) {
    const id = stack.pop()!;
    if (keep.has(id)) continue;
    keep.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child);
  }

  if (!keep.has(rootOrgId) && !data.organizations.some((o) => o.id === rootOrgId)) {
    return {
      ...data,
      organizations: [],
      positions: [],
      persons: [],
      departments: [],
      groups: [],
      reportLines: [],
      orgLinks: [],
    };
  }

  const organizations = data.organizations.filter((o) => keep.has(o.id));
  const positions = data.positions.filter((p) => keep.has(p.organizationId));
  const positionIds = new Set(positions.map((p) => p.id));
  const personIds = new Set(positions.map((p) => p.personId).filter(Boolean) as string[]);
  const deptIds = new Set(positions.map((p) => p.departmentId).filter(Boolean) as string[]);
  const groupIds = new Set(organizations.flatMap((o) => o.groupIds));

  return {
    organizations,
    groups: data.groups.filter((g) => groupIds.has(g.id)),
    departments: data.departments.filter((d) => deptIds.has(d.id) || keep.has(d.organizationId)),
    persons: data.persons.filter((p) => personIds.has(p.id)),
    positions,
    reportLines: data.reportLines.filter(
      (r) => positionIds.has(r.fromId) && positionIds.has(r.toId),
    ),
    orgLinks: (data.orgLinks ?? []).filter(
      (l) => keep.has(l.fromOrgId) && keep.has(l.toOrgId),
    ),
  };
}
