import { describe, expect, it } from 'vitest';
import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import {
  adminChildrenMap,
  adminDescendantIds,
  assignExpandToDepth,
  expandIdsForDepth,
  isPositionExpanded,
  positionHasAdminChildren,
  visiblePositions,
} from './positionExpand.js';

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

const treePositions = [
  pos('root', 'o1', { isHead: true }),
  pos('mid', 'o1'),
  pos('leaf-a', 'o1'),
  pos('leaf-b', 'o1'),
];

const treeReports: DiagramReportLine[] = [
  { fromId: 'root', toId: 'mid', kind: 'admin' },
  { fromId: 'mid', toId: 'leaf-a', kind: 'admin' },
  { fromId: 'mid', toId: 'leaf-b', kind: 'admin' },
  { fromId: 'leaf-a', toId: 'leaf-b', kind: 'matrix' },
];

describe('visiblePositions', () => {
  it('success: depth 0 — only head when nothing expanded', () => {
    const visible = visiblePositions(treePositions, treeReports, 'o1', []);
    expect(visible.map((p) => p.id)).toEqual(['root']);
  });

  it('success: expanding root reveals mid only', () => {
    const visible = visiblePositions(treePositions, treeReports, 'o1', ['root']);
    expect(visible.map((p) => p.id).sort()).toEqual(['mid', 'root']);
  });

  it('success: position.expanded flag counts as expanded', () => {
    const positions = [
      pos('root', 'o1', { isHead: true, expanded: true }),
      pos('mid', 'o1', { expanded: true }),
      pos('leaf-a', 'o1'),
      pos('leaf-b', 'o1'),
    ];
    const visible = visiblePositions(positions, treeReports, 'o1', []);
    expect(visible.map((p) => p.id).sort()).toEqual(['leaf-a', 'leaf-b', 'mid', 'root']);
  });

  it('failure: matrix edges do not reveal children', () => {
    const visible = visiblePositions(treePositions, treeReports, 'o1', ['leaf-a']);
    // leaf-a expanded but not reachable until ancestors expanded
    expect(visible.map((p) => p.id)).toEqual(['root']);
  });
});

describe('expandIdsForDepth / assignExpandToDepth', () => {
  it('success: depth 0 → no expands', () => {
    expect(expandIdsForDepth(treePositions, treeReports, 'o1', 0)).toEqual([]);
  });

  it('success: depth 1 → expand head only', () => {
    expect(expandIdsForDepth(treePositions, treeReports, 'o1', 1)).toEqual(['root']);
  });

  it('success: depth 2 → expand head + mid', () => {
    expect(expandIdsForDepth(treePositions, treeReports, 'o1', 2).sort()).toEqual([
      'mid',
      'root',
    ]);
  });

  it('success: assignExpandToDepth mutates expanded flags in org', () => {
    const { expandedIds, positions } = assignExpandToDepth(
      treePositions,
      treeReports,
      'o1',
      1,
    );
    expect(expandedIds).toEqual(['root']);
    expect(positions.find((p) => p.id === 'root')?.expanded).toBe(true);
    expect(positions.find((p) => p.id === 'mid')?.expanded).toBe(false);
  });
});

describe('adminDescendantIds / helpers', () => {
  it('success: descendants include self', () => {
    expect(adminDescendantIds('mid', treePositions, treeReports).sort()).toEqual([
      'leaf-a',
      'leaf-b',
      'mid',
    ]);
  });

  it('failure: unknown id → empty', () => {
    expect(adminDescendantIds('nope', treePositions, treeReports)).toEqual([]);
    expect(positionHasAdminChildren('nope', treePositions, treeReports)).toBe(false);
  });

  it('success: isPositionExpanded reads set or flag', () => {
    expect(isPositionExpanded(pos('a', 'o1'), ['a'])).toBe(true);
    expect(isPositionExpanded(pos('a', 'o1', { expanded: true }), [])).toBe(true);
    expect(isPositionExpanded(pos('a', 'o1'), [])).toBe(false);
  });
});

describe('layoutStaffOrgBlock + collapseUnexpandedPositions', () => {
  it('success: filters hidden descendants before tree layout', async () => {
    const result = await layoutStaffOrgBlock(treePositions, treeReports, 'o1', {
      staffCoordMode: 'tree',
      collapseUnexpandedPositions: true,
      expandedPositionIds: ['root'],
    });
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['mid', 'root']);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ fromId: 'root', toId: 'mid' });
  });

  it('success: default keeps full tree (opt-in collapse)', async () => {
    const result = await layoutStaffOrgBlock(treePositions, treeReports, 'o1', {
      staffCoordMode: 'tree',
    });
    expect(result.nodes).toHaveLength(4);
  });

  it('success: detached roots stay visible under collapse (T65+T66)', async () => {
    const positions = [
      ...treePositions,
      pos('orphan', 'o1'),
    ];
    const visible = visiblePositions(positions, treeReports, 'o1', []);
    expect(visible.map((p) => p.id).sort()).toEqual(['orphan', 'root']);

    const result = await layoutStaffOrgBlock(positions, treeReports, 'o1', {
      staffCoordMode: 'tree',
      collapseUnexpandedPositions: true,
      expandedPositionIds: [],
    });
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['orphan', 'root']);
    expect(result.edges).toHaveLength(0);
    const head = result.nodes.find((n) => n.id === 'root')!;
    const orphan = result.nodes.find((n) => n.id === 'orphan')!;
    expect(orphan.x).toBeGreaterThan(head.x + head.width);
  });
});

describe('expandIdsForDepth — A7 Infinity + cycle guard', () => {
  it('success: expandToDepth(Infinity) terminates on acyclic tree', () => {
    const positions = [
      pos('root', 'o1', { isHead: true }),
      pos('a', 'o1'),
      pos('b', 'o1'),
    ];
    const reports: DiagramReportLine[] = [
      { fromId: 'root', toId: 'a', kind: 'admin' },
      { fromId: 'root', toId: 'b', kind: 'admin' },
    ];
    const ids = expandIdsForDepth(positions, reports, 'o1', Infinity);
    expect(ids).toContain('root');
    expect(ids).not.toContain('a');
  });

  it('failure: cyclic reportLines do not hang expandIdsForDepth (A7)', () => {
    const positions = [
      pos('root', 'o1', { isHead: true }),
      pos('a', 'o1'),
    ];
    const reports: DiagramReportLine[] = [
      { fromId: 'root', toId: 'a', kind: 'admin' },
      { fromId: 'a', toId: 'root', kind: 'admin' }, // self-cycle back
    ];
    // Must not hang or throw stack overflow.
    const ids = expandIdsForDepth(positions, reports, 'o1', Infinity);
    expect(Array.isArray(ids)).toBe(true);
  });

  it('failure: self reportLine is not an admin child (A5)', () => {
    const positions = [pos('root', 'o1', { isHead: true }), pos('a', 'o1')];
    const reports: DiagramReportLine[] = [
      { fromId: 'a', toId: 'a', kind: 'admin' },
      { fromId: 'root', toId: 'a', kind: 'admin' },
    ];
    expect(adminChildrenMap(positions, reports, 'o1').get('a')).toBeUndefined();
    expect(adminChildrenMap(positions, reports, 'o1').get('root')).toEqual(['a']);
  });
});
