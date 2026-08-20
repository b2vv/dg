import { describe, expect, it } from 'vitest';
import { buildStaffTreeData } from './staffTree.js';

describe('buildStaffTreeData', () => {
  it('success: ops is child of holding; sales/eng under ops', () => {
    const data = buildStaffTreeData();
    expect(data.organizations.find((o) => o.id === 'ops')?.parentOrgId).toBe('holding');
    expect(data.organizations.filter((o) => o.parentOrgId === 'ops').map((o) => o.id).sort()).toEqual(
      ['eng', 'sales'],
    );
  });

  it('success: ops positions have no coords (tree mode)', () => {
    const data = buildStaffTreeData();
    const ops = data.positions.filter((p) => p.organizationId === 'ops');
    expect(ops.length).toBeGreaterThan(2);
    expect(ops.every((p) => !p.gridCell && !p.layoutCoords && p.layoutX == null)).toBe(true);
  });

  it('failure: missing admin chain for ops head would break layout — fixture has isHead', () => {
    const data = buildStaffTreeData();
    expect(data.positions.some((p) => p.organizationId === 'ops' && p.isHead)).toBe(true);
  });
});
