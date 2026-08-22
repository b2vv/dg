import type { DiagramData } from '@org-hierarchy/sdk';
import { DEMO_PLACEHOLDER_PNG } from './demoMedia.js';

/**
 * Flat org matrix demo: a shallow tree that fits a row-major grid
 * (root → layer-1 → layer-2). Matrix admin edges use spine+bus+risers (T63).
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
    // T70 Phase1 fixtures:
    // - org-3: symbol without short-name caption (no-caption box)
    // - org-4: missing symbol → fullName text (E3), no diamond placeholder
    const noCaption = i === 2;
    const missingSymbol = i === 3;
    return {
      id: `org-${i + 1}`,
      name: `Organization ${i + 1}`,
      ...(i === 0
        ? {
            testId: 'root' as const,
            periodStart: '2024-01-01',
            periodEnd: null,
          }
        : {}),
      ...(i === 1
        ? {
            periodStart: '2023-06-15',
            periodEnd: '2025-12-31',
          }
        : {}),
      ...(noCaption ? { showShortName: false as const } : {}),
      ...(missingSymbol
        ? {
            fullName: 'Organization 4 — Official Full Name',
            symbolUrl: undefined,
            symbolUrlLight: undefined,
          }
        : {
            symbolUrl: DEMO_PLACEHOLDER_PNG,
            symbolUrlLight: DEMO_PLACEHOLDER_PNG,
          }),
      parentOrgId,
      groupIds: i % 4 === 0 ? ['g1'] : [],
      collapsed: true,
      matrixOrder: i,
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
