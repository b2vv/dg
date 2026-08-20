import { describe, expect, it } from 'vitest';
import type { DiagramOrganization, DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { positionHasCoords, resolvePositionAABB } from './coords.js';
import { layoutStaffCanvas } from './canvasLayout.js';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import { resolveStaffHead } from './resolveHead.js';
import { StaffLayoutError } from './types.js';

function pos(
  id: string,
  orgId: string,
  extra: Partial<DiagramPosition> = {},
): DiagramPosition {
  return {
    id,
    title: id,
    organizationId: orgId,
    groupIds: [],
    status: 'filled',
    isTemporary: false,
    ...extra,
  };
}

function org(id: string, parent?: string): DiagramOrganization {
  return { id, name: id, groupIds: [], parentOrgId: parent };
}

describe('resolveStaffHead', () => {
  it('success: prefers single isHead', () => {
    const positions = [
      pos('a', 'o1'),
      pos('b', 'o1', { isHead: true }),
      pos('c', 'o1'),
    ];
    expect(resolveStaffHead(positions, 'o1', [])).toBe('b');
  });

  it('success: single parentless when no isHead', () => {
    const positions = [pos('root', 'o1'), pos('child', 'o1')];
    const reports: DiagramReportLine[] = [
      { fromId: 'root', toId: 'child', kind: 'admin' },
    ];
    expect(resolveStaffHead(positions, 'o1', reports)).toBe('root');
  });

  it('failure: multiple isHead throws', () => {
    const positions = [
      pos('a', 'o1', { isHead: true }),
      pos('b', 'o1', { isHead: true }),
    ];
    expect(() => resolveStaffHead(positions, 'o1', [])).toThrow(StaffLayoutError);
  });

  it('failure: no head and no unique parentless throws', () => {
    const positions = [pos('a', 'o1'), pos('b', 'o1')];
    expect(() => resolveStaffHead(positions, 'o1', [])).toThrow(/head|parentless/i);
  });
});

describe('position coords', () => {
  it('success: gridCell resolves AABB with pitch and size', () => {
    const p = pos('p1', 'o1', {
      gridCell: { col: 2, row: 1 },
      width: 80,
      height: 40,
    });
    const box = resolvePositionAABB(p, {
      nodeWidth: 100,
      nodeHeight: 50,
      horizontalGap: 20,
      verticalGap: 10,
      refCellWidth: 100,
      refCellHeight: 50,
    });
    expect(box).toEqual({ x: 240, y: 60, width: 80, height: 40 });
  });

  it('failure: no coords → hasCoords false', () => {
    expect(positionHasCoords(pos('p', 'o1'))).toBe(false);
  });
});

describe('layoutStaffOrgBlock', () => {
  it('success: all coords → matrix mode', async () => {
    const positions = [
      pos('a', 'o1', { gridCell: { col: 0, row: 0 }, isHead: true }),
      pos('b', 'o1', { gridCell: { col: 1, row: 0 } }),
    ];
    const result = await layoutStaffOrgBlock(positions, [], 'o1', { staffCoordMode: 'hybrid' });
    expect(result.mode).toBe('matrix');
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find((n) => n.id === 'b')?.x).toBeGreaterThan(0);
  });

  it('success: no coords → tree mode with depth', async () => {
    const positions = [
      pos('root', 'o1', { isHead: true }),
      pos('c1', 'o1'),
      pos('c2', 'o1'),
    ];
    const reports: DiagramReportLine[] = [
      { fromId: 'root', toId: 'c1', kind: 'admin' },
      { fromId: 'root', toId: 'c2', kind: 'admin' },
    ];
    const result = await layoutStaffOrgBlock(positions, reports, 'o1', {
      staffCoordMode: 'tree',
    });
    expect(result.mode).toBe('tree');
    const root = result.nodes.find((n) => n.id === 'root')!;
    const child = result.nodes.find((n) => n.id === 'c1')!;
    expect(child.y).toBeGreaterThan(root.y);
  });

  it('success: hybrid keeps anchor fixed', async () => {
    const positions = [
      pos('root', 'o1', { isHead: true, layoutX: 10, layoutY: 20, width: 100, height: 40 }),
      pos('float', 'o1'),
    ];
    const reports: DiagramReportLine[] = [
      { fromId: 'root', toId: 'float', kind: 'admin' },
    ];
    const result = await layoutStaffOrgBlock(positions, reports, 'o1', {
      staffCoordMode: 'hybrid',
    });
    expect(result.mode).toBe('hybrid');
    const root = result.nodes.find((n) => n.id === 'root')!;
    expect(root.x).toBe(10);
    expect(root.y).toBe(20);
    const fl = result.nodes.find((n) => n.id === 'float')!;
    expect(fl.y).toBeGreaterThan(root.y);
  });

  it('failure: strict mode rejects mix', async () => {
    const positions = [
      pos('a', 'o1', { isHead: true, gridCell: { col: 0, row: 0 } }),
      pos('b', 'o1'),
    ];
    await expect(
      layoutStaffOrgBlock(positions, [], 'o1', { staffCoordMode: 'strict' }),
    ).rejects.toThrow(/mix|strict/i);
  });
});

describe('layoutStaffCanvas', () => {
  it('success: tier2 full staff, tier3 org cards only', async () => {
    const organizations = [org('current'), org('sub', 'current'), org('mgr')];
    // managing: current.parentOrgId = mgr
    organizations[0] = { ...organizations[0], parentOrgId: 'mgr' };

    const positions = [
      pos('mgr-ceo', 'mgr', { isHead: true, gridCell: { col: 0, row: 0 } }),
      pos('ceo', 'current', { isHead: true }),
      pos('dev', 'current'),
      pos('sub-head', 'sub', { isHead: true }),
      pos('sub-dev', 'sub'),
    ];
    const reports: DiagramReportLine[] = [
      { fromId: 'ceo', toId: 'dev', kind: 'admin' },
      { fromId: 'sub-head', toId: 'sub-dev', kind: 'admin' },
    ];

    const canvas = await layoutStaffCanvas(
      { organizations, positions, reports, groups: [], departments: [], persons: [] },
      'current',
    );

    expect(canvas.tiers.some((t) => t.tier === 1)).toBe(true);
    expect(canvas.tiers.find((t) => t.tier === 2)?.kind).toBe('staff-block');
    const t3 = canvas.tiers.find((t) => t.tier === 3)!;
    expect(t3.kind).toBe('org-cards');
    expect(t3.cards?.map((c) => c.orgId)).toContain('sub');
    expect(canvas.positionNodes.every((n) => n.organizationId !== 'sub')).toBe(true);
    expect(canvas.positionNodes.filter((n) => n.organizationId === 'current').length).toBe(2);
  });

  it('failure: unknown currentOrgId throws', async () => {
    await expect(
      layoutStaffCanvas(
        {
          organizations: [org('a')],
          positions: [pos('p', 'a', { isHead: true })],
          reports: [],
          groups: [],
          departments: [],
          persons: [],
        },
        'missing',
      ),
    ).rejects.toThrow(StaffLayoutError);
  });
});
