import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import { DEFAULT_STAFF_LAYOUT_OPTIONS, type StaffLayoutOptions } from '../layout/staff/types.js';
import { buildStaffLayoutInput } from './buildStaffLayoutInput.js';

type StaffData = Pick<DiagramData, 'organizations' | 'positions' | 'reportLines' | 'departments'>;

function sampleData(): StaffData {
  return {
    organizations: [
      { id: 'cur', name: 'Current', parentOrgId: 'parent', groupIds: [] },
      { id: 'parent', name: 'Parent', groupIds: [] },
    ],
    positions: [
      {
        id: 'h',
        title: 'Head',
        organizationId: 'cur',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        isHead: true,
        departmentId: 'd1',
        width: 200,
        height: 100,
      },
      {
        // No isHead, no departmentId, no explicit size.
        id: 'p2',
        title: 'Member',
        organizationId: 'cur',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
    ],
    reportLines: [{ fromId: 'p2', toId: 'h', kind: 'admin' }],
    departments: [{ id: 'd1', name: 'Dept 1', organizationId: 'cur', order: 3 }],
  };
}

describe('buildStaffLayoutInput', () => {
  it('maps DiagramData + options into the Rust StaffLayoutInput contract', () => {
    const options: StaffLayoutOptions = { deptGrouping: true };
    const input = buildStaffLayoutInput({
      data: sampleData(),
      currentOrgId: 'cur',
      options,
      lod: 'near',
      contentPadding: 16,
    });

    expect(input.currentOrgId).toBe('cur');
    expect(input.lod).toBe('near');
    expect(input.expandedOrgIds).toEqual([]);
    expect(input.dockHints).toEqual([]);

    // reports — verbatim, no lead-org synthesis.
    expect(input.reports).toEqual([{ fromId: 'p2', toId: 'h', kind: 'admin' }]);

    // organizations — all orgs, id + parentOrgId only.
    expect(input.organizations).toEqual([
      { id: 'cur', parentOrgId: 'parent' },
      { id: 'parent', parentOrgId: undefined },
    ]);

    // departments — id + order.
    expect(input.departments).toEqual([{ id: 'd1', order: 3 }]);
  });

  it('coerces isHead to a strict boolean and never emits a positions.order key (B2)', () => {
    const input = buildStaffLayoutInput({
      data: sampleData(),
      currentOrgId: 'cur',
      options: {},
      lod: 'near',
      contentPadding: 16,
    });

    expect(input.positions[0]).toEqual({
      id: 'h',
      organizationId: 'cur',
      isHead: true,
      departmentId: 'd1',
    });
    // isHead undefined → false; departmentId stays undefined.
    expect(input.positions[1]).toEqual({
      id: 'p2',
      organizationId: 'cur',
      isHead: false,
      departmentId: undefined,
    });
    // B2: DiagramPosition carries no order; the key must be absent (None ⟺ 0 parity).
    expect('order' in input.positions[0]).toBe(false);
    expect('order' in input.positions[1]).toBe(false);
  });

  it('derives nodeSizes only for positions with an explicit size (Rust falls back to metrics otherwise)', () => {
    const input = buildStaffLayoutInput({
      data: sampleData(),
      currentOrgId: 'cur',
      options: {},
      lod: 'near',
      contentPadding: 16,
    });

    // Only 'h' carries explicit width/height; 'p2' is omitted (Rust metric fallback).
    expect(input.nodeSizes).toEqual([{ id: 'h', width: 200, height: 100 }]);
  });

  it('resolves all 13 metrics via option-or-default, with contentPadding from the argument not options', () => {
    const input = buildStaffLayoutInput({
      data: sampleData(),
      currentOrgId: 'cur',
      options: { deptGrouping: true, tierGap: 99 },
      lod: 'near',
      contentPadding: 16,
    });

    expect(input.options).toEqual({
      nodeWidth: DEFAULT_STAFF_LAYOUT_OPTIONS.nodeWidth,
      nodeHeight: DEFAULT_STAFF_LAYOUT_OPTIONS.nodeHeight,
      refCellWidth: DEFAULT_STAFF_LAYOUT_OPTIONS.refCellWidth,
      refCellHeight: DEFAULT_STAFF_LAYOUT_OPTIONS.refCellHeight,
      horizontalGap: DEFAULT_STAFF_LAYOUT_OPTIONS.horizontalGap,
      verticalGap: DEFAULT_STAFF_LAYOUT_OPTIONS.verticalGap,
      margin: DEFAULT_STAFF_LAYOUT_OPTIONS.margin,
      tierGap: 99,
      orgCardWidth: DEFAULT_STAFF_LAYOUT_OPTIONS.orgCardWidth,
      orgCardHeight: DEFAULT_STAFF_LAYOUT_OPTIONS.orgCardHeight,
      zoneLabelBand: DEFAULT_STAFF_LAYOUT_OPTIONS.zoneLabelBand,
      contentPadding: 16,
      deptGrouping: true,
    });
  });

  it('passes expandedOrgIds and dockHints through when provided', () => {
    const input = buildStaffLayoutInput({
      data: sampleData(),
      currentOrgId: 'cur',
      options: { expandedOrgIds: ['child-a'] },
      lod: 'mid',
      contentPadding: 8,
      dockHints: [{ id: 'h', hint: { layout: 'figma-row', tileX: 1, tileY: 2, tileSize: 3 } }],
    });

    expect(input.expandedOrgIds).toEqual(['child-a']);
    expect(input.dockHints).toEqual([
      { id: 'h', hint: { layout: 'figma-row', tileX: 1, tileY: 2, tileSize: 3 } },
    ]);
    expect(input.lod).toBe('mid');
  });
});
