import type { DiagramData } from '@org-hierarchy/sdk';
import { VARIANT_B_POSITIONS } from '@org-hierarchy/sdk';
import { DEMO_AVATAR_PNG, DEMO_PLACEHOLDER_PNG } from './demoMedia.js';

const PEOPLE: Record<string, { name: string; title: string }> = {
  P1: { name: 'Олена IT', title: 'Developer' },
  P2: { name: 'Тарас IT', title: 'Developer' },
  P3: { name: 'Марія IT', title: 'Analyst' },
  P4: { name: 'Ігор CEO', title: 'CEO' },
  P5: { name: 'Наталя IT', title: 'QA' },
  P6: { name: 'Сергій IT', title: 'DevOps' },
};

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
      fullName: PEOPLE[p.id]?.name ?? `Person ${p.id}`,
      photoUrl: DEMO_AVATAR_PNG,
    })),
    positions: VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      title: PEOPLE[p.id]?.title ?? `Position ${p.id}`,
      organizationId: 'org1',
      departmentId: p.departmentId,
      groupIds: [],
      personId: `person-${p.id}`,
      status: 'filled' as const,
      isTemporary: p.id === 'P4',
      isHead: p.id === 'P4',
      gridCell: { col: p.col, row: p.row },
    })),
    reportLines: [
      { fromId: 'P4', toId: 'P2', kind: 'admin' },
      { fromId: 'P2', toId: 'P1', kind: 'admin' },
      { fromId: 'P2', toId: 'P3', kind: 'admin' },
      { fromId: 'P4', toId: 'P5', kind: 'admin' },
      { fromId: 'P4', toId: 'P6', kind: 'admin' },
    ],
  };
}
