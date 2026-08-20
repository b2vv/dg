import type { DiagramData } from '@org-hierarchy/sdk';

export function buildFlatOrgsData(count = 24): DiagramData {
  const organizations = Array.from({ length: count }, (_, i) => ({
    id: `org-${i + 1}`,
    name: `Organization ${i + 1}`,
    parentOrgId: i > 0 ? `org-${Math.ceil(i / 3)}` : undefined,
    groupIds: i % 4 === 0 ? ['g1'] : [],
    collapsed: true,
  }));

  return {
    organizations,
    groups: [{ id: 'g1', name: 'Group Alpha', emblemUrl: undefined }],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: organizations.slice(1).map((org, i) => ({
      fromOrgId: org.parentOrgId ?? organizations[0].id,
      toOrgId: org.id,
      kind: 'administrative' as const,
    })),
  };
}

export function toggleOrgExpanded(data: DiagramData, orgId: string): DiagramData {
  return {
    ...data,
    organizations: data.organizations.map((o) =>
      o.id === orgId ? { ...o, collapsed: !o.collapsed } : o,
    ),
  };
}

export function collapseAllOrgs(data: DiagramData): DiagramData {
  return {
    ...data,
    organizations: data.organizations.map((o) => ({ ...o, collapsed: true })),
  };
}
