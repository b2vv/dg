import { describe, expect, it } from '@rstest/core';
import type { DiagramData, DiagramPosition, DiagramReportLine } from '../data/types.js';
import { DEFAULT_STAFF_LAYOUT_OPTIONS, type StaffLayoutOptions } from '../layout/staff/types.js';
import { buildStaffLayoutInput, staffExpandCeilingDiagnostics } from './buildStaffLayoutInput.js';

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

// ── A4.2a fixtures ───────────────────────────────────────────────────────────
// Managing org `parent` (head mh → m2 → m3), current org `cur` (head ch → c2 → c3),
// children `childA` (a1), `childB` (b1), `childC` (no positions). Admin edges are
// {fromId: manager, toId: subordinate}. This lets collapse (visiblePositions) and the
// leadership_of trim be exercised with unambiguous single heads.
function pos(
  id: string,
  organizationId: string,
  isHead = false,
): DiagramPosition {
  return { id, title: id, organizationId, groupIds: [], status: 'filled', isTemporary: false, isHead };
}

function admin(fromId: string, toId: string): DiagramReportLine {
  return { fromId, toId, kind: 'admin' };
}

function collapseData(): StaffData {
  return {
    organizations: [
      { id: 'parent', name: 'Parent', groupIds: [] },
      { id: 'cur', name: 'Current', parentOrgId: 'parent', groupIds: [] },
      { id: 'childA', name: 'Child A', parentOrgId: 'cur', groupIds: [] },
      { id: 'childB', name: 'Child B', parentOrgId: 'cur', groupIds: [] },
      { id: 'childC', name: 'Child C', parentOrgId: 'cur', groupIds: [] },
    ],
    positions: [
      pos('mh', 'parent', true),
      pos('m2', 'parent'),
      pos('m3', 'parent'),
      pos('ch', 'cur', true),
      pos('c2', 'cur'),
      pos('c3', 'cur'),
      pos('a1', 'childA', true),
      pos('b1', 'childB', true),
    ],
    reportLines: [admin('mh', 'm2'), admin('m2', 'm3'), admin('ch', 'c2'), admin('c2', 'c3')],
    departments: [],
  };
}

const idsIn = (input: ReturnType<typeof buildStaffLayoutInput>, orgId: string): string[] =>
  input.positions.filter((p) => p.organizationId === orgId).map((p) => p.id);

describe('buildStaffLayoutInput — collapse pre-filter (T66 V2a)', () => {
  it('collapse OFF (default) emits every position unchanged', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: {},
      lod: 'near',
      contentPadding: 16,
    });
    expect(input.positions.map((p) => p.id)).toEqual([
      'mh', 'm2', 'm3', 'ch', 'c2', 'c3', 'a1', 'b1',
    ]);
  });

  it('collapse ON strips hidden positions to visible per org (head only when nothing expanded)', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true },
      lod: 'near',
      contentPadding: 16,
    });
    // managing leadership collapsed to head; current collapsed to head; no expanded child.
    expect(idsIn(input, 'parent')).toEqual(['mh']);
    expect(idsIn(input, 'cur')).toEqual(['ch']);
    expect(idsIn(input, 'childA')).toEqual([]);
    expect(idsIn(input, 'childB')).toEqual([]);
  });

  it('collapse ON reveals direct reports of an expanded current head', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true, expandedPositionIds: ['ch'] },
      lod: 'near',
      contentPadding: 16,
    });
    expect(idsIn(input, 'cur')).toEqual(['ch', 'c2']); // c3 stays hidden (c2 not expanded)
    expect(idsIn(input, 'parent')).toEqual(['mh']);
  });

  it('collapse ON managing uses visiblePositions(leadershipOf), never the full subtree (U2)', () => {
    // Both mh and m2 expanded. leadership_of(mh) = {mh, m2}; m3 is depth-2, outside
    // leadership, so it must NOT appear — proving leadership-first, not full-mgr.
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true, expandedPositionIds: ['mh', 'm2'] },
      lod: 'near',
      contentPadding: 16,
    });
    expect(idsIn(input, 'parent')).toEqual(['mh', 'm2']);
    expect(idsIn(input, 'cur')).toEqual(['ch']);
  });

  it('collapse ON managing with multiple isHead emits raw positions without throwing', () => {
    const data = collapseData();
    data.positions.push(pos('mh2', 'parent', true)); // second head in managing org
    expect(() =>
      buildStaffLayoutInput({
        data,
        currentOrgId: 'cur',
        options: { collapseUnexpandedPositions: true },
        lod: 'near',
        contentPadding: 16,
      }),
    ).not.toThrow();
    const input = buildStaffLayoutInput({
      data,
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true },
      lod: 'near',
      contentPadding: 16,
    });
    // Rust tier1 will skip (multiple isHead); raw positions are inert but present.
    expect(idsIn(input, 'parent').sort()).toEqual(['m2', 'm3', 'mh', 'mh2']);
  });

  it('collapse ON managing with no isHead emits raw positions without throwing', () => {
    const data = collapseData();
    data.positions = data.positions.map((p) => (p.id === 'mh' ? { ...p, isHead: false } : p));
    expect(() =>
      buildStaffLayoutInput({
        data,
        currentOrgId: 'cur',
        options: { collapseUnexpandedPositions: true },
        lod: 'near',
        contentPadding: 16,
      }),
    ).not.toThrow();
    const input = buildStaffLayoutInput({
      data,
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true },
      lod: 'near',
      contentPadding: 16,
    });
    expect(idsIn(input, 'parent').sort()).toEqual(['m2', 'm3', 'mh']);
  });
});

describe('buildStaffLayoutInput — report filter (collapse)', () => {
  it('drops matrix/dotted edges to hidden endpoints but keeps admin and visible-to-visible', () => {
    const data = collapseData();
    data.reportLines.push(
      { fromId: 'ch', toId: 'c2', kind: 'dotted' }, // c2 hidden → drop
      { fromId: 'ch', toId: 'mh', kind: 'matrix' }, // both visible → keep
    );
    const input = buildStaffLayoutInput({
      data,
      currentOrgId: 'cur',
      options: { collapseUnexpandedPositions: true },
      lod: 'near',
      contentPadding: 16,
    });
    const has = (fromId: string, toId: string, kind: string) =>
      input.reports.some((r) => r.fromId === fromId && r.toId === toId && r.kind === kind);
    expect(has('ch', 'c2', 'dotted')).toBe(false); // dropped: c2 collapsed away
    expect(has('ch', 'mh', 'matrix')).toBe(true); // kept: both endpoints visible
    expect(has('ch', 'c2', 'admin')).toBe(true); // admin kept (Rust guards)
  });

  it('collapse OFF leaves all report lines intact', () => {
    const data = collapseData();
    data.reportLines.push({ fromId: 'ch', toId: 'c2', kind: 'dotted' });
    const input = buildStaffLayoutInput({
      data,
      currentOrgId: 'cur',
      options: {},
      lod: 'near',
      contentPadding: 16,
    });
    expect(input.reports.some((r) => r.kind === 'dotted')).toBe(true);
  });
});

describe('buildStaffLayoutInput — expand cap (closes the cap-gap)', () => {
  it('caps expandedOrgIds children to maxExpandedOrgCards (default 1)', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { expandedOrgIds: ['childA', 'childB', 'childC'] },
      lod: 'near',
      contentPadding: 16,
    });
    expect(input.expandedOrgIds).toEqual(['childA']);
  });

  it('respects an explicit maxExpandedOrgCards', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { expandedOrgIds: ['childA', 'childB', 'childC'], maxExpandedOrgCards: 2 },
      lod: 'near',
      contentPadding: 16,
    });
    expect(input.expandedOrgIds).toEqual(['childA', 'childB']);
  });

  it('keeps non-child ids (Rust emits the not-a-child diagnostic) and preserves order', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: { expandedOrgIds: ['childA', 'notAChild', 'childB'], maxExpandedOrgCards: 1 },
      lod: 'near',
      contentPadding: 16,
    });
    // childA (capped in) + notAChild (preserved); childB is the over-cap child, dropped.
    expect(input.expandedOrgIds).toEqual(['childA', 'notAChild']);
  });

  it('cap also gates which expanded children contribute collapse positions', () => {
    const input = buildStaffLayoutInput({
      data: collapseData(),
      currentOrgId: 'cur',
      options: {
        collapseUnexpandedPositions: true,
        expandedOrgIds: ['childA', 'childB'],
        maxExpandedOrgCards: 1,
      },
      lod: 'near',
      contentPadding: 16,
    });
    expect(idsIn(input, 'childA')).toEqual(['a1']); // capped in → its visible staff emitted
    expect(idsIn(input, 'childB')).toEqual([]); // over-cap → no staff emitted
  });
});

describe('staffExpandCeilingDiagnostics', () => {
  it('returns the exact cap diagnostic for over-cap children', () => {
    expect(
      staffExpandCeilingDiagnostics(collapseData(), 'cur', {
        expandedOrgIds: ['childA', 'childB', 'childC'],
      }),
    ).toEqual(['Tier3 expand ignored (exceeds maxExpandedOrgCards=1): childB, childC']);
  });

  it('is empty when the request is within the cap', () => {
    expect(
      staffExpandCeilingDiagnostics(collapseData(), 'cur', { expandedOrgIds: ['childA'] }),
    ).toEqual([]);
  });

  it('ignores non-children (Rust diagnoses those, not the cap)', () => {
    expect(
      staffExpandCeilingDiagnostics(collapseData(), 'cur', {
        expandedOrgIds: ['notAChild'],
        maxExpandedOrgCards: 1,
      }),
    ).toEqual([]);
  });
});
