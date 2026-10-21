import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * Visual check for §3.2: department grouping and routing around foreign frames.
 * Tree mode: no position coordinates; one org keeps the scene in tier 2.
 */
export function buildStaffDeptRoutingData(): DiagramData {
  return {
    organizations: [{ id: 'unit', name: 'Unit', groupIds: [] }],
    groups: [],
    departments: [
      { id: 'alpha', name: 'Alpha', organizationId: 'unit' },
      { id: 'beta', name: 'Beta', organizationId: 'unit' },
    ],
    persons: [
      { id: 'p-head', fullName: 'Unit Head' },
      { id: 'p-a1', fullName: 'Alpha Lead' },
      { id: 'p-a2', fullName: 'Alpha Specialist' },
      { id: 'p-b1', fullName: 'Beta Lead' },
      { id: 'p-b2', fullName: 'Beta Specialist' },
      { id: 'p-b3', fullName: 'Beta Specialist 2' },
    ],
    positions: [
      {
        id: 'u-head',
        title: 'Head',
        organizationId: 'unit',
        departmentId: 'alpha',
        groupIds: [],
        personId: 'p-head',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
      {
        id: 'a1',
        title: 'Alpha Lead',
        organizationId: 'unit',
        departmentId: 'alpha',
        groupIds: [],
        personId: 'p-a1',
        status: 'filled',
        isTemporary: false,
      },
      {
        id: 'a2',
        title: 'Alpha Spec',
        organizationId: 'unit',
        departmentId: 'alpha',
        groupIds: [],
        personId: 'p-a2',
        status: 'filled',
        isTemporary: false,
      },
      {
        id: 'b1',
        title: 'Beta Lead',
        organizationId: 'unit',
        departmentId: 'beta',
        groupIds: [],
        personId: 'p-b1',
        status: 'filled',
        isTemporary: false,
      },
      {
        id: 'b2',
        title: 'Beta Spec',
        organizationId: 'unit',
        departmentId: 'beta',
        groupIds: [],
        personId: 'p-b2',
        status: 'filled',
        isTemporary: false,
      },
      {
        id: 'b3',
        title: 'Beta Spec 2',
        organizationId: 'unit',
        departmentId: 'beta',
        groupIds: [],
        personId: 'p-b3',
        status: 'filled',
        isTemporary: false,
      },
    ],
    reportLines: [
      { fromId: 'u-head', toId: 'a1', kind: 'admin' },
      { fromId: 'u-head', toId: 'a2', kind: 'admin' },
      { fromId: 'u-head', toId: 'b1', kind: 'admin' },
      { fromId: 'b1', toId: 'b2', kind: 'admin' },
      { fromId: 'b1', toId: 'b3', kind: 'admin' },
      // Last admin parent wins for tree placement; both report edges remain.
      // Put Beta's b2 under Alpha's a1 to interleave the legacy dept bounds.
      { fromId: 'a1', toId: 'b2', kind: 'admin' },
    ],
  };
}
