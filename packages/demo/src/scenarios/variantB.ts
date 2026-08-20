import type { DiagramData } from '@org-hierarchy/sdk';
import { VARIANT_B_POSITIONS } from '@org-hierarchy/sdk';
import { DEMO_AVATAR_PNG, DEMO_PLACEHOLDER_PNG } from './demoMedia.js';

export function buildVariantBData(): DiagramData {
  return {
    organizations: [
      {
        id: 'org1',
        name: 'Demo Org',
        groupIds: [],
        collapsed: true,
        symbolUrl: DEMO_PLACEHOLDER_PNG,
        symbolUrlLight: DEMO_PLACEHOLDER_PNG,
      },
    ],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'CEO', name: 'CEO Office', organizationId: 'org1' },
    ],
    persons: VARIANT_B_POSITIONS.map((p) => ({
      id: `person-${p.id}`,
      fullName: `Person ${p.id}`,
      photoUrl: DEMO_AVATAR_PNG,
    })),
    positions: VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      title: `Position ${p.id}`,
      organizationId: 'org1',
      departmentId: p.departmentId,
      groupIds: [],
      personId: `person-${p.id}`,
      status: 'filled' as const,
      isTemporary: p.id === 'P4',
      gridCell: { col: p.col, row: p.row },
    })),
    reportLines: [],
  };
}
