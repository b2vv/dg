import { describe, expect, it } from 'vitest';
import type { DiagramData } from '../data/types.js';
import { buildSearchIndex, buildSearchIndexAsync, searchIndex } from './searchIndex.js';
import { revealOrgPath, resolveOrganizationIdForNode } from './revealPath.js';
import { movePositionToCell, shiftPositionBlock, snapToGrid } from './positionMove.js';
import { InteractionError } from './types.js';
import {
  selectNode,
  selectMany,
  replaceSelection,
  toggleInSelection,
  sameSelectionSet,
  isSelectionToggleModifier,
} from './selection.js';

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

  it('success: substring mid-label via byChar seed (lice in Alice)', () => {
    const index = buildSearchIndex(sampleData());
    const hits = searchIndex(index, 'lice');
    expect(hits.some((h) => h.label.includes('Alice'))).toBe(true);
  });

  it('success: buildSearchIndexAsync matches sync index hits', async () => {
    const data = sampleData();
    const sync = buildSearchIndex(data);
    const asyncIdx = await buildSearchIndexAsync(data, { chunkSize: 1 });
    expect(asyncIdx.entries.length).toBe(sync.entries.length);
    expect(searchIndex(asyncIdx, 'Alice').map((h) => h.label)).toEqual(
      searchIndex(sync, 'Alice').map((h) => h.label),
    );
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

describe('multi-select Set API (T67 Phase 1)', () => {
  const a = { kind: 'person' as const, id: 'p1' };
  const b = { kind: 'person' as const, id: 'p2' };
  const c = { kind: 'organization' as const, id: 'o1', organizationId: 'o1' };

  it('success: selectMany dedupes and preserves order', () => {
    expect(selectMany([a, b, a, c])).toEqual([a, b, c]);
  });

  it('success: replaceSelection single-select path', () => {
    expect(replaceSelection([], a)).toEqual({ selections: [a], changed: true });
    expect(replaceSelection([a], a).changed).toBe(false);
    expect(replaceSelection([a, b], a)).toEqual({ selections: [a], changed: true });
    expect(replaceSelection([a], null)).toEqual({ selections: [], changed: true });
    expect(replaceSelection([], null).changed).toBe(false);
  });

  it('success: toggleInSelection add/remove', () => {
    expect(toggleInSelection([], a)).toEqual({ selections: [a], changed: true });
    expect(toggleInSelection([a], b)).toEqual({ selections: [a, b], changed: true });
    expect(toggleInSelection([a, b], a)).toEqual({ selections: [b], changed: true });
    expect(toggleInSelection([b], b)).toEqual({ selections: [], changed: true });
  });

  it('success: clear via replaceSelection(null)', () => {
    const cleared = replaceSelection([a, b, c], null);
    expect(cleared.selections).toEqual([]);
    expect(cleared.changed).toBe(true);
  });

  it('failure: sameSelectionSet detects order/identity mismatch', () => {
    expect(sameSelectionSet([a, b], [a, b])).toBe(true);
    expect(sameSelectionSet([a, b], [b, a])).toBe(false);
    expect(sameSelectionSet([a], [])).toBe(false);
  });

  it('success: isSelectionToggleModifier ctrl/meta/shift', () => {
    expect(isSelectionToggleModifier({ ctrlKey: true, metaKey: false, shiftKey: false })).toBe(
      true,
    );
    expect(isSelectionToggleModifier({ ctrlKey: false, metaKey: true, shiftKey: false })).toBe(
      true,
    );
    expect(isSelectionToggleModifier({ ctrlKey: false, metaKey: false, shiftKey: true })).toBe(
      true,
    );
    expect(isSelectionToggleModifier({ ctrlKey: false, metaKey: false, shiftKey: false })).toBe(
      false,
    );
  });
});
