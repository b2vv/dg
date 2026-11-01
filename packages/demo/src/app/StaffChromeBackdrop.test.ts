import { describe, expect, it } from '@rstest/core';
import type { DiagramData, StaffLiveGeometry } from '@org-hierarchy/sdk';
import {
  buildStaffChromeGeometry,
  relatedStaffIds,
  staffVisibleData,
} from './StaffChromeBackdrop.js';

/** Minimal live geometry — only the fields `buildStaffChromeGeometry` reads. */
function live(over: Partial<StaffLiveGeometry> = {}): StaffLiveGeometry {
  return {
    frames: [],
    routes: [],
    canvas: { positionNodes: [] },
    ...over,
  } as unknown as StaffLiveGeometry;
}

function data(over: Partial<DiagramData> = {}): DiagramData {
  return {
    organizations: [],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
    ...over,
  } as unknown as DiagramData;
}

describe('buildStaffChromeGeometry', () => {
  it('success: joins dept name + count, maps lines, computes org AABB', () => {
    const geom = buildStaffChromeGeometry(
      live({
        frames: [{ departmentId: 'd1', x: 0, y: 0, width: 100, height: 80 }],
        routes: [
          {
            fromId: 'a',
            toId: 'b',
            kind: 'admin',
            points: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
            x1: 1,
            y1: 2,
            x2: 3,
            y2: 4,
            endsOnDeptTop: true,
          },
        ],
        canvas: {
          positionNodes: [{ id: 'p1', x: 10, y: 10, width: 50, height: 30 }],
        },
      } as unknown as Partial<StaffLiveGeometry>),
      data({
        organizations: [{ id: 'org', name: 'Org X', role: 'current', groupIds: [], collapsed: false }],
        departments: [{ id: 'd1', name: 'Dept One', organizationId: 'org', order: 0 }],
        positions: [
          { id: 'p1', departmentId: 'd1', organizationId: 'org' },
          { id: 'p2', departmentId: 'd1', organizationId: 'org' },
        ] as unknown as DiagramData['positions'],
      }),
      'org',
    );

    expect(geom.depts).toHaveLength(1);
    expect(geom.depts[0]).toMatchObject({ departmentId: 'd1', name: 'Dept One', count: 2 });
    expect(geom.lines).toHaveLength(1);
    expect(geom.lines[0]).toEqual({
      fromId: 'a',
      toId: 'b',
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      endsOnDeptTop: true,
    });
    // Org AABB spans frames (0..100) and nodes (10..60), padded (TOP 44 above).
    expect(geom.org).not.toBeNull();
    expect(geom.org?.name).toBe('Org X');
    expect(geom.org?.y).toBe(-44); // minY 0 minus the TOP label room
    expect(geom.org?.x).toBe(-20);
  });

  it('boundary: no frames and no nodes → org is null, empty depts/lines', () => {
    const geom = buildStaffChromeGeometry(live(), data(), 'org');
    expect(geom.org).toBeNull();
    expect(geom.depts).toEqual([]);
    expect(geom.lines).toEqual([]);
  });

  it('relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself', () => {
    const lines = [
      { fromId: 'ceo', toId: 'cfo' },
      { fromId: 'cfo', toId: 'acc' },
      { fromId: 'cto', toId: 'dev' }, // unrelated to cfo
    ];
    // cfo touches ceo→cfo and cfo→acc → related = {cfo, ceo, acc}, not cto/dev.
    expect([...relatedStaffIds(lines, 'cfo')].sort()).toEqual(['acc', 'ceo', 'cfo']);
    // No line touches a lone node → only itself.
    expect([...relatedStaffIds(lines, 'lonely')]).toEqual(['lonely']);
    expect([...relatedStaffIds([], 'x')]).toEqual(['x']);
  });

  it('staffVisibleData: collapsing a head hides its subtree but keeps the head', () => {
    const d = data({
      positions: [
        { id: 'ceo' },
        { id: 'a' },
        { id: 'a1' },
        { id: 'b' },
      ] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'ceo', toId: 'a', kind: 'admin' },
        { fromId: 'a', toId: 'a1', kind: 'admin' },
        { fromId: 'ceo', toId: 'b', kind: 'admin' },
      ],
    });
    // Collapse 'a' → 'a' stays, 'a1' (its child) is hidden; 'b' untouched.
    const vis = staffVisibleData(d, new Set(['a']));
    expect(vis.positions.map((p) => p.id).sort()).toEqual(['a', 'b', 'ceo']);
    expect(vis.reportLines.map((r) => `${r.fromId}>${r.toId}`).sort()).toEqual([
      'ceo>a',
      'ceo>b',
    ]);
    // Empty collapsed set → everything visible.
    expect(staffVisibleData(d, new Set()).positions).toHaveLength(4);
  });

  it('staffVisibleData: a node with a second live parent stays visible', () => {
    const d = data({
      positions: [{ id: 'ceo' }, { id: 'a' }, { id: 'x' }] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'ceo', toId: 'a', kind: 'admin' },
        { fromId: 'a', toId: 'x', kind: 'admin' },
        { fromId: 'ceo', toId: 'x', kind: 'admin' }, // second parent
      ],
    });
    // Collapse 'a' → 'x' still reachable via ceo→x, so it stays.
    expect(staffVisibleData(d, new Set(['a'])).positions.map((p) => p.id).sort()).toEqual([
      'a',
      'ceo',
      'x',
    ]);
  });

  it('failure/fallback: unknown dept name → departmentId; org name falls back by role', () => {
    const geom = buildStaffChromeGeometry(
      live({ frames: [{ departmentId: 'dX', x: 0, y: 0, width: 10, height: 10 }] } as unknown as Partial<StaffLiveGeometry>),
      data({
        // currentOrgId 'missing' is absent → fall back to the role:'current' org.
        organizations: [{ id: 'real', name: 'Real Org', role: 'current', groupIds: [], collapsed: false }],
        departments: [], // no name for dX
      }),
      'missing',
    );
    expect(geom.depts[0]?.name).toBe('dX'); // fallback to id
    expect(geom.depts[0]?.count).toBe(0);
    expect(geom.org?.name).toBe('Real Org'); // fallback by role
  });
});
