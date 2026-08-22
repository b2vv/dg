import { describe, expect, it } from 'vitest';
import { computeMatrixLayout } from './matrixLayout.js';
import { buildSpineBusPaths } from './spineBusEdges.js';
import type { DiagramOrganization } from '../data/types.js';

function org(
  id: string,
  order?: number,
  parent?: string,
): DiagramOrganization {
  return { id, name: id, groupIds: [], matrixOrder: order, parentOrgId: parent };
}

describe('buildSpineBusPaths', () => {
  it('success: N children in one row → 1 spine + 1 bus + N risers', () => {
    const parent = { id: 'p', x: 200, y: 0, width: 100, height: 40 };
    const children = [
      { id: 'a', x: 0, y: 100, width: 100, height: 40, matrixRow: 1 },
      { id: 'b', x: 150, y: 100, width: 100, height: 40, matrixRow: 1 },
      { id: 'c', x: 300, y: 100, width: 100, height: 40, matrixRow: 1 },
    ];
    const paths = buildSpineBusPaths(parent, children, { busGap: 14 });
    const roles = paths.map((p) => p.role);
    expect(roles.filter((r) => r === 'spine')).toHaveLength(1);
    expect(roles.filter((r) => r === 'bus')).toHaveLength(1);
    expect(roles.filter((r) => r === 'riser')).toHaveLength(3);

    const bus = paths.find((p) => p.role === 'bus')!;
    expect(bus.points[0]!.y).toBe(bus.points[1]!.y);
    expect(bus.points[0]!.x).toBeLessThan(bus.points[1]!.x);

    const spine = paths.find((p) => p.role === 'spine')!;
    expect(spine.points[0]!.x).toBe(250);
    expect(spine.points[1]!.x).toBe(250);
  });

  it('success: two rows → two buses and continuing spine', () => {
    const parent = { id: 'p', x: 100, y: 0, width: 100, height: 40 };
    const children = [
      { id: 'a', x: 0, y: 80, width: 80, height: 40, matrixRow: 1 },
      { id: 'b', x: 120, y: 80, width: 80, height: 40, matrixRow: 1 },
      { id: 'c', x: 60, y: 160, width: 80, height: 40, matrixRow: 2 },
    ];
    const paths = buildSpineBusPaths(parent, children, { busGap: 12 });
    expect(paths.filter((p) => p.role === 'bus')).toHaveLength(2);
    expect(paths.filter((p) => p.role === 'spine').length).toBeGreaterThanOrEqual(2);
    expect(paths.filter((p) => p.role === 'riser')).toHaveLength(3);
  });

  it('failure: no children → empty', () => {
    expect(
      buildSpineBusPaths({ id: 'p', x: 0, y: 0, width: 10, height: 10 }, []),
    ).toEqual([]);
  });
});

describe('computeMatrixLayout spine-bus', () => {
  it('success: default spine-bus shares geometry for siblings', () => {
    const orgs = [
      org('root', 0),
      org('a', 1, 'root'),
      org('b', 2, 'root'),
      org('c', 3, 'root'),
    ];
    const layout = computeMatrixLayout(orgs, []);
    expect(layout.mode).toBe('matrix');
    const risers = layout.edges.filter(
      (e) => e.toId === 'a' || e.toId === 'b' || e.toId === 'c',
    );
    expect(risers.length).toBeGreaterThanOrEqual(3);
    // Shared bus/spine means more than 3 segments total, not 3 full per-link paths only.
    expect(layout.edges.length).toBeGreaterThan(3);
  });

  it('success: per-link opt-out keeps one edge per parent→child', () => {
    const orgs = [
      org('root', 0),
      org('a', 1, 'root'),
      org('b', 2, 'root'),
    ];
    const layout = computeMatrixLayout(orgs, [], { orgEdgeStyle: 'per-link' });
    const admin = layout.edges.filter((e) => e.kind === 'admin');
    expect(admin).toHaveLength(2);
    expect(admin.map((e) => e.toId).sort()).toEqual(['a', 'b']);
  });

  it('success: orgLinks stay per-link under spine-bus mode', () => {
    const orgs = [org('a', 0), org('b', 1), org('c', 2, 'a')];
    const layout = computeMatrixLayout(
      orgs,
      [{ fromOrgId: 'a', toOrgId: 'b', kind: 'functional' }],
      { orgEdgeStyle: 'spine-bus' },
    );
    const link = layout.edges.find((e) => e.kind === 'link');
    expect(link).toBeTruthy();
    expect(link!.fromId).toBe('a');
    expect(link!.toId).toBe('b');
  });
});
