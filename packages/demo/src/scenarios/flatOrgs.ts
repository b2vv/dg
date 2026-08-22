import type { DiagramData } from '@org-hierarchy/sdk';
import { DEMO_PLACEHOLDER_PNG } from './demoMedia.js';

/**
 * Flat org matrix demo: a shallow tree that fits a row-major grid
 * (root → layer-1 → layer-2) so parent edges read top→down instead of a bus mesh.
 */
export function buildFlatOrgsData(count = 24): DiagramData {
  const organizations = Array.from({ length: count }, (_, i) => {
    let parentOrgId: string | undefined;
    if (i === 0) parentOrgId = undefined;
    else if (i <= 4) parentOrgId = 'org-1';
    else parentOrgId = `org-${1 + Math.ceil((i - 4) / 4)}`;
    // Clamp parent into existing range
    if (parentOrgId) {
      const pIdx = Number(parentOrgId.replace('org-', '')) - 1;
      if (pIdx < 0 || pIdx >= i) parentOrgId = 'org-1';
    }
    return {
      id: `org-${i + 1}`,
      name: `Organization ${i + 1}`,
      ...(i === 0 ? { testId: 'root' as const } : {}),
      parentOrgId,
      groupIds: i % 4 === 0 ? ['g1'] : [],
      collapsed: true,
      matrixOrder: i,
      symbolUrl: DEMO_PLACEHOLDER_PNG,
      symbolUrlLight: DEMO_PLACEHOLDER_PNG,
    };
  });

  return {
    organizations,
    groups: [{ id: 'g1', name: 'Group Alpha', emblemUrl: DEMO_PLACEHOLDER_PNG }],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    // parentOrgId already drives matrix edges — avoid duplicate orgLinks.
    orgLinks: [],
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
