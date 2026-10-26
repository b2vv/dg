import { describe, expect, it } from '@rstest/core';
import type { DiagramPosition } from '../../data/types.js';
import { layoutStaffCanvas, type StaffCanvasInput } from './canvasLayout.js';
import { aabbOverlap } from './coords.js';
import type { StaffNodeBox } from './types.js';

const currentOrgId = 'org';

function position(id: string, departmentId: string): DiagramPosition {
  return {
    id, departmentId, title: id, organizationId: currentOrgId,
    groupIds: [], status: 'filled', isTemporary: false,
  };
}

const data: StaffCanvasInput = {
  organizations: [{ id: currentOrgId, name: 'Current org', groupIds: [] }],
  positions: [position('a1', 'a'), position('b1', 'b'), position('a2', 'a'), position('b2', 'b')],
  reports: [
    { fromId: 'a1', toId: 'b1', kind: 'admin' },
    { fromId: 'b1', toId: 'a2', kind: 'admin' },
    { fromId: 'a2', toId: 'b2', kind: 'admin' },
  ],
  departments: [
    { id: 'a', name: 'A', organizationId: currentOrgId },
    { id: 'b', name: 'B', organizationId: currentOrgId },
  ],
  groups: [],
  persons: [],
};
const positionById = new Map(data.positions.map((p) => [p.id, p]));

function departmentBounds(nodes: StaffNodeBox[], departmentId: string) {
  const members = nodes.filter((node) => positionById.get(node.id)?.departmentId === departmentId);
  expect(members).toHaveLength(2);
  const x = Math.min(...members.map((node) => node.x));
  const y = Math.min(...members.map((node) => node.y));
  return {
    x, y,
    width: Math.max(...members.map((node) => node.x + node.width)) - x,
    height: Math.max(...members.map((node) => node.y + node.height)) - y,
  };
}

function nodesById(nodes: StaffNodeBox[]) {
  return new Map(nodes.map((n) => [n.id, {
    x: n.x, y: n.y, width: n.width, height: n.height,
    depth: n.depth, role: n.role, tier: n.tier,
  }]));
}

describe('layoutStaffCanvas department grouping', () => {
  it('threads grouping through tier 2 while preserving default-off geometry', async () => {
    const grouped = await layoutStaffCanvas(data, currentOrgId, { deptGrouping: true });
    const legacy = await layoutStaffCanvas(data, currentOrgId);
    expect(grouped.tiers.map((tier) => tier.tier)).toEqual([2]);
    expect(legacy.tiers.map((tier) => tier.tier)).toEqual([2]);
    expect(aabbOverlap(departmentBounds(grouped.positionNodes, 'a'), departmentBounds(grouped.positionNodes, 'b'), 0, 0)).toBe(false);
    expect(aabbOverlap(departmentBounds(legacy.positionNodes, 'a'), departmentBounds(legacy.positionNodes, 'b'), 0, 0)).toBe(true);

    const disabled = await layoutStaffCanvas(data, currentOrgId, { deptGrouping: false });
    expect(nodesById(legacy.positionNodes)).toEqual(nodesById(disabled.positionNodes));
  });
});
