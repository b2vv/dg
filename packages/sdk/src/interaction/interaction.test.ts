import { describe, expect, it } from 'vitest';
import type { DiagramData } from '../data/types.js';
import { buildSearchIndex, searchIndex } from './searchIndex.js';
import { revealOrgPath, resolveOrganizationIdForNode } from './revealPath.js';
import { movePositionToCell, shiftPositionBlock, snapToGrid } from './positionMove.js';
import { InteractionError } from './types.js';
import { selectNode } from './selection.js';

function sampleData(): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root Co', groupIds: [], collapsed: true },
      { id: 'child', name: 'Child Org', groupIds: [], parentOrgId: 'root', collapsed: true },
    ],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'child' }],
    persons: [{ id: 'p1', fullName: 'Alice Smith' }],
    positions: [
      {
        id: 'pos1',
        title: 'CEO',
        organizationId: 'child',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 2 },
        hierarchyLevel: 1,
      },
      {
        id: 'pos2',
        title: 'Dev',
        organizationId: 'child',
        departmentId: 'IT',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
        gridCell: { col: 2, row: 2 },
        hierarchyLevel: 1,
      },
      {
        id: 'pos3',
        title: 'Other',
        organizationId: 'child',
        departmentId: 'IT',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 0, row: 5 },
        hierarchyLevel: 2,
      },
    ],
    reportLines: [],
  };
}

describe('searchIndex', () => {
  it('success: search Alice returns person hit', () => {
    const index = buildSearchIndex(sampleData());
    const hits = searchIndex(index, 'Alice');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.label.includes('Alice'))).toBe(true);
  });

  it('failure: empty query → []', () => {
    expect(searchIndex(buildSearchIndex(sampleData()), '')).toEqual([]);
    expect(searchIndex(buildSearchIndex(sampleData()), '   ')).toEqual([]);
  });

  it('failure: no index → []', () => {
    expect(searchIndex(null, 'Alice')).toEqual([]);
    expect(searchIndex(undefined, 'Alice')).toEqual([]);
  });
});

describe('revealOrgPath', () => {
  it('success: expands child and ancestors', () => {
    const data = sampleData();
    const next = revealOrgPath(data.organizations, 'child');
    expect(next.find((o) => o.id === 'child')?.collapsed).toBe(false);
    expect(next.find((o) => o.id === 'root')?.collapsed).toBe(false);
  });

  it('failure: unknown org → unchanged', () => {
    const data = sampleData();
    expect(revealOrgPath(data.organizations, 'missing')).toBe(data.organizations);
  });
});

describe('resolveOrganizationIdForNode', () => {
  it('success: person id → org', () => {
    expect(resolveOrganizationIdForNode(sampleData(), 'p1')).toBe('child');
  });
});

describe('positionMove', () => {
  it('success: snapToGrid', () => {
    expect(snapToGrid(150, 90, 100, 80)).toEqual({ col: 2, row: 1 });
  });

  it('success: movePositionToCell updates grid', () => {
    const next = movePositionToCell(sampleData().positions, 'pos1', 3, 4);
    expect(next.find((p) => p.id === 'pos1')?.gridCell).toEqual({ col: 3, row: 4 });
  });

  it('failure: invalid cell throws', () => {
    expect(() => movePositionToCell(sampleData().positions, 'pos1', -1, 0)).toThrow(
      InteractionError,
    );
  });

  it('success: block shift moves same level+dept', () => {
    const { positions, positionIds } = shiftPositionBlock(sampleData().positions, 'pos1', 1);
    expect(positionIds.sort()).toEqual(['pos1', 'pos2']);
    expect(positions.find((p) => p.id === 'pos1')?.gridCell?.row).toBe(3);
    expect(positions.find((p) => p.id === 'pos3')?.gridCell?.row).toBe(5);
  });
});

describe('selectNode', () => {
  it('success: selects and deselects', () => {
    const a = { kind: 'person' as const, id: 'p1' };
    expect(selectNode(null, a)).toEqual({ selection: a, changed: true });
    expect(selectNode(a, null)).toEqual({ selection: null, changed: true });
    expect(selectNode(a, a).changed).toBe(false);
  });
});
