import { describe, expect, it } from '@rstest/core';
import { InteractionError } from '../core/index.js';
import { emptyDiagramData, type DiagramData, type DiagramReportLine } from '../data/types.js';
import { deleteSubtree, transferChildren, transferChildOrgs, deleteOrgSubtree } from './bulkMutations.js';

const admin = (fromId: string, toId: string): DiagramReportLine => ({ fromId, toId, kind: 'admin' });
function fixture(): DiagramData {
  return {
    ...emptyDiagramData(),
    positions: ['a', 'b', 'c1', 'c2', 'g', 's'].map((id) => ({
      id, title: id, organizationId: id === 'b' ? 'other' : 'org',
      groupIds: [], status: 'vacant', isTemporary: false,
    })),
    reportLines: [admin('a', 'c1'), admin('a', 'c2'), admin('c1', 'g')],
  };
}

describe('transferChildren', () => {
  it('A1/A2/A3/A7 moves direct children across orgs, preserving descendants and other relations', () => {
    const data = fixture();
    data.reportLines.push({ fromId: 'a', toId: 's', kind: 'matrix' }, { fromId: 'a', toId: 'g', kind: 'dotted' });
    const before = structuredClone(data);
    const result = transferChildren(data, 'a', 'b');
    expect(result.summary).toEqual({ fromPositionId: 'a', toPositionId: 'b', movedChildIds: ['c1', 'c2'] });
    expect(result.data.reportLines).toEqual(expect.arrayContaining([
      admin('b', 'c1'), admin('b', 'c2'), admin('c1', 'g'),
      { fromId: 'a', toId: 's', kind: 'matrix' }, { fromId: 'a', toId: 'g', kind: 'dotted' },
    ]));
    expect(result.data.reportLines).toHaveLength(5);
    expect(result.data.positions).toEqual(before.positions);
    expect(result.data).not.toBe(data);
    expect(result.data.reportLines).not.toBe(data.reportLines);
    expect(data).toEqual(before);
  });
  it('A4 returns original data without admin children', () => {
    const data = fixture();
    data.reportLines.push({ fromId: 's', toId: 'g', kind: 'matrix' });
    expect(transferChildren(data, 's', 'b').data).toBe(data);
    expect(transferChildren(data, 's', 'b').summary.movedChildIds).toEqual([]);
  });
  it('NB-a treats self-transfer with children as no-op', () => {
    const data = fixture();
    expect(transferChildren(data, 'a', 'a').data).toBe(data);
    expect(transferChildren(data, 'a', 'a').summary.movedChildIds).toEqual([]);
  });
  it.each([['ghost', 'b'], ['a', 'ghost']])('A5 refuses unknown ids %s → %s atomically', (from, to) => {
    const data = fixture();
    const before = structuredClone(data);
    expect(() => transferChildren(data, from, to)).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it.each(['c1', 'g'])('A6 refuses descendant %s atomically', (to) => {
    const data = fixture();
    const before = structuredClone(data);
    expect(() => transferChildren(data, 'a', to)).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it('replaces all incoming admin lines without duplicating children', () => {
    const data = fixture();
    data.reportLines.push(admin('s', 'c1'), admin('a', 'c1'), admin('b', 'c2'));
    const result = transferChildren(data, 'a', 'b');
    expect(result.summary.movedChildIds).toEqual(['c1', 'c2']);
    expect(result.data.reportLines).toEqual(expect.arrayContaining([admin('b', 'c1'), admin('b', 'c2'), admin('c1', 'g')]));
    expect(result.data.reportLines).toHaveLength(3);
  });
  it('walks every admin edge downward even when a second parent masks the descendant', () => {
    const data = fixture();
    data.reportLines.push(admin('s', 'g'));
    expect(() => transferChildren(data, 'a', 'g')).toThrow(InteractionError);
  });
});

describe('deleteSubtree', () => {
  it('D1 deletes a leaf and its exclusive person, preserving unrelated orphans', () => {
    const data = fixture();
    data.positions = data.positions.map((p) => p.id === 'g' ? { ...p, personId: 'person' } : p);
    data.persons = [{ id: 'person', fullName: 'Person' }, { id: 'orphan', fullName: 'Orphan' }];
    const before = structuredClone(data);
    const result = deleteSubtree(data, 'g');
    expect(result.summary).toEqual({ removedPositionIds: ['g'], removedPersonIds: ['person'], removedReportLineCount: 1 });
    expect(result.data.positions.map((p) => p.id)).toEqual(['a', 'b', 'c1', 'c2', 's']);
    expect(result.data.persons).toEqual([{ id: 'orphan', fullName: 'Orphan' }]);
    expect(result.data.reportLines).toEqual([admin('a', 'c1'), admin('a', 'c2')]);
    expect(data).toEqual(before);
  });
  it('D2/D3/D4/N1 cascades admin descendants, removes incident lines and clears department anchors', () => {
    const data = fixture();
    data.positions = data.positions.map((p) => ['a', 's'].includes(p.id) ? { ...p, personId: 'shared' } : p);
    data.persons = [{ id: 'shared', fullName: 'Shared' }];
    data.reportLines.push(
      { fromId: 'g', toId: 's', kind: 'matrix' },
      { fromId: 'b', toId: 'c2', kind: 'dotted' },
      { fromId: 's', toId: 'b', kind: 'matrix' },
      { fromId: 'a', toId: 's', kind: 'dotted' },
    );
    data.departments = [
      { id: 'removed-anchor', name: 'R', organizationId: 'org', parentPositionId: 'g' },
      { id: 'surviving-anchor', name: 'S', organizationId: 'org', parentPositionId: 's' },
      { id: 'no-anchor', name: 'N', organizationId: 'org' },
    ];
    const before = structuredClone(data);
    const result = deleteSubtree(data, 'a');
    expect(result.summary).toEqual({ removedPositionIds: ['a', 'c1', 'c2', 'g'], removedPersonIds: [], removedReportLineCount: 6 });
    expect(result.data.positions.map((p) => p.id)).toEqual(['b', 's']);
    expect(result.data.persons).toEqual(before.persons);
    expect(result.data.reportLines).toEqual([{ fromId: 's', toId: 'b', kind: 'matrix' }]);
    expect(result.data.departments).toEqual([
      { id: 'removed-anchor', name: 'R', organizationId: 'org', parentPositionId: null },
      before.departments[1], before.departments[2],
    ]);
    expect(result.data.positions).not.toBe(data.positions);
    expect(result.data.persons).not.toBe(data.persons);
    expect(result.data.departments).not.toBe(data.departments);
    expect(data).toEqual(before);
  });
  it.each(['a', 'g'])('D5/D6 refuses head %s anywhere in removal set atomically', (head) => {
    const data = fixture();
    data.positions = data.positions.map((p) => p.id === head ? { ...p, isHead: true, organizationId: 'other' } : p);
    const before = structuredClone(data);
    expect(() => deleteSubtree(data, 'a')).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it('D7 refuses an unknown position atomically', () => {
    const data = fixture();
    const before = structuredClone(data);
    expect(() => deleteSubtree(data, 'ghost')).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it('terminates on existing cycles and visits each position once', () => {
    const data = fixture();
    data.reportLines.push(admin('g', 'a'), admin('a', 'a'));
    expect(deleteSubtree(data, 'a').summary).toEqual({ removedPositionIds: ['a', 'c1', 'c2', 'g'], removedPersonIds: [], removedReportLineCount: 5 });
  });
});

function orgFixture(): DiagramData {
  return {
    ...emptyDiagramData(),
    organizations: [
      { id: 'root', name: 'Root', groupIds: [] },
      { id: 'a', name: 'A', parentOrgId: 'root', groupIds: ['exclusive', 'shared', 'seat-group'] },
      { id: 'b', name: 'B', parentOrgId: 'root', groupIds: ['shared'] },
      { id: 'c1', name: 'C1', parentOrgId: 'a', groupIds: [] },
      { id: 'c2', name: 'C2', parentOrgId: 'a', groupIds: [] },
      { id: 'g', name: 'G', parentOrgId: 'c1', groupIds: [] },
    ],
  };
}

describe('transferChildOrgs', () => {
  it('O1 moves only direct child orgs, retaining their descendants and all other data', () => {
    const data = orgFixture();
    const before = structuredClone(data);
    const result = transferChildOrgs(data, 'a', 'b');
    expect(result.summary).toEqual({ fromOrgId: 'a', toOrgId: 'b', movedOrgIds: ['c1', 'c2'] });
    expect(result.data).toEqual({
      ...before,
      organizations: [
        before.organizations[0], before.organizations[1], before.organizations[2],
        { id: 'c1', name: 'C1', parentOrgId: 'b', groupIds: [] },
        { id: 'c2', name: 'C2', parentOrgId: 'b', groupIds: [] },
        before.organizations[5],
      ],
    });
    expect(result.data).not.toBe(data);
    expect(data).toEqual(before);
  });
  it.each(['c1', 'g'])('O2 refuses descendant %s atomically', (to) => {
    const data = orgFixture();
    const before = structuredClone(data);
    expect(() => transferChildOrgs(data, 'a', to)).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it.each([['ghost', 'b'], ['a', 'ghost'], ['ghost', 'ghost']])('O3 refuses unknown %s → %s', (from, to) => {
    const data = orgFixture();
    const before = structuredClone(data);
    expect(() => transferChildOrgs(data, from, to)).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it.each([['b', 'a'], ['a', 'a']])('O3/NB-a returns original data for no-op %s → %s', (from, to) => {
    const data = orgFixture();
    const result = transferChildOrgs(data, from, to);
    expect(result.data).toBe(data);
    expect(result.summary).toEqual({ fromOrgId: from, toOrgId: to, movedOrgIds: [] });
  });
  it('allows moving children upward to an ancestor', () => {
    const result = transferChildOrgs(orgFixture(), 'a', 'root');
    expect(result.data.organizations.filter((org) => org.parentOrgId === 'root').map((org) => org.id))
      .toEqual(['a', 'b', 'c1', 'c2']);
  });
  it('NB-b translates a pre-existing org cycle into InteractionError without mutation', () => {
    const data = orgFixture();
    data.organizations = data.organizations.map((org) => org.id === 'a' ? { ...org, parentOrgId: 'g' } : org);
    const before = structuredClone(data);
    expect(() => transferChildOrgs(data, 'a', 'b')).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
});

function orgDeletionFixture(): DiagramData {
  return {
    ...orgFixture(),
    groups: ['exclusive', 'shared', 'seat-group', 'unused'].map((id) => ({ id, name: id })),
    departments: [
      { id: 'da', name: 'DA', organizationId: 'a' },
      { id: 'dg', name: 'DG', organizationId: 'g' },
      { id: 'db', name: 'DB', organizationId: 'b' },
    ],
    positions: [
      { id: 'pa', title: 'PA', organizationId: 'a', personId: 'only', groupIds: [], status: 'filled', isTemporary: false, isHead: true },
      { id: 'pg', title: 'PG', organizationId: 'g', personId: 'shared-person', groupIds: [], status: 'filled', isTemporary: false },
      { id: 'pb', title: 'PB', organizationId: 'b', personId: 'shared-person', groupIds: ['seat-group'], status: 'filled', isTemporary: false },
      { id: 'pr', title: 'PR', organizationId: 'root', groupIds: [], status: 'vacant', isTemporary: false },
    ],
    persons: ['only', 'shared-person', 'unassigned'].map((id) => ({ id, fullName: id })),
    reportLines: [
      admin('pa', 'pg'),
      { fromId: 'pg', toId: 'pb', kind: 'matrix' },
      { fromId: 'pb', toId: 'pa', kind: 'dotted' },
      admin('pr', 'pb'),
    ],
    orgLinks: [
      { fromOrgId: 'a', toOrgId: 'b', kind: 'administrative' },
      { fromOrgId: 'b', toOrgId: 'g', kind: 'functional' },
      { fromOrgId: 'a', toOrgId: 'g', kind: 'service' },
      { fromOrgId: 'root', toOrgId: 'b', kind: 'functional' },
    ],
  };
}

describe('deleteOrgSubtree', () => {
  it('OD1/OD2 cascades through org descendants and counts each removed incident link once', () => {
    const data = orgDeletionFixture();
    const before = structuredClone(data);
    const result = deleteOrgSubtree(data, 'a');
    expect(result.summary).toEqual({
      removedOrgIds: ['a', 'c1', 'g', 'c2'],
      removedDepartmentIds: ['da', 'dg'], removedPositionIds: ['pa', 'pg'],
      removedPersonIds: ['only'], removedGroupIds: ['exclusive', 'unused'],
      removedReportLineCount: 3, removedOrgLinkCount: 3,
    });
    expect(result.data.organizations.map((org) => org.id)).toEqual(['root', 'b']);
    expect(result.data.positions).toEqual([before.positions[2], before.positions[3]]);
    expect(result.data.departments).toEqual([before.departments[2]]);
    expect(result.data.persons).toEqual([before.persons[1], before.persons[2]]);
    expect(result.data.reportLines).toEqual([admin('pr', 'pb')]);
    expect(result.data.orgLinks).toEqual([{ fromOrgId: 'root', toOrgId: 'b', kind: 'functional' }]);
    expect(result.data.groups).toEqual([before.groups[1], before.groups[2]]);
    expect(result.data).not.toBe(data);
    expect(data).toEqual(before);
  });
  it('OD3/OD4/B1 removes unreferenced groups while retaining org-shared and position-only survivor references', () => {
    const result = deleteOrgSubtree(orgDeletionFixture(), 'a');
    expect(result.summary.removedGroupIds).toEqual(['exclusive', 'unused']);
    expect(result.data.groups.map((group) => group.id)).toEqual(['shared', 'seat-group']);
  });
  it('OD3 removes a group referenced only by a deleted position', () => {
    const data = orgDeletionFixture();
    data.groups.push({ id: 'removed-seat-group', name: 'Removed seat group' });
    data.positions = data.positions.map((p) => p.id === 'pg' ? { ...p, groupIds: ['removed-seat-group'] } : p);
    expect(deleteOrgSubtree(data, 'a').summary.removedGroupIds).toEqual(['exclusive', 'unused', 'removed-seat-group']);
  });
  it('supports absent orgLinks and deletion of an empty leaf org', () => {
    const data = orgFixture();
    delete data.orgLinks;
    const before = structuredClone(data);
    const result = deleteOrgSubtree(data, 'c2');
    expect(result.summary).toEqual({
      removedOrgIds: ['c2'], removedDepartmentIds: [], removedPositionIds: [],
      removedPersonIds: [], removedGroupIds: [], removedReportLineCount: 0, removedOrgLinkCount: 0,
    });
    expect(result.data.organizations.map((org) => org.id)).toEqual(['root', 'a', 'b', 'c1', 'g']);
    expect(result.data.orgLinks).toEqual([]);
    expect(data).toEqual(before);
  });
  it.each(['root', 'ghost'])('OD5/OD6 refuses root or unknown org %s atomically', (id) => {
    const data = orgDeletionFixture();
    const before = structuredClone(data);
    expect(() => deleteOrgSubtree(data, id)).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it('NB-b refuses a pre-existing cycle before collecting descendants', () => {
    const data = orgDeletionFixture();
    data.organizations = data.organizations.map((org) => org.id === 'a' ? { ...org, parentOrgId: 'g' } : org);
    const before = structuredClone(data);
    expect(() => deleteOrgSubtree(data, 'a')).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
  it('translates an unknown parent hierarchy error atomically', () => {
    const data = orgDeletionFixture();
    data.organizations = data.organizations.map((org) => org.id === 'a' ? { ...org, parentOrgId: 'ghost' } : org);
    const before = structuredClone(data);
    expect(() => deleteOrgSubtree(data, 'a')).toThrow(InteractionError);
    expect(data).toEqual(before);
  });
});

// Регрес-гард: org-операції НЕ ведуть matrix активно, але МУСЯТЬ зберігати matrix-поля
// (matrixOrder/matrixRow/matrixCol/inMatrix) незайманими — сітка деривується з них downstream.
// Замок проти тихого дропу, якщо spread/filter заміниться явним списком полів.
describe('matrix-поля організацій зберігаються', () => {
  const MATRIX = { matrixOrder: 3, matrixRow: 1, matrixCol: 2, inMatrix: false } as const;
  const pick = (org: { matrixOrder?: number; matrixRow?: number; matrixCol?: number; inMatrix?: boolean }) => ({
    matrixOrder: org.matrixOrder, matrixRow: org.matrixRow, matrixCol: org.matrixCol, inMatrix: org.inMatrix,
  });

  it('transferChildOrgs зберігає matrix-поля переміщеної org (міняє лише parentOrgId)', () => {
    const data = orgFixture();
    data.organizations = data.organizations.map((org) => (org.id === 'c1' ? { ...org, ...MATRIX } : org));
    const moved = transferChildOrgs(data, 'a', 'b').data.organizations.find((o) => o.id === 'c1')!;
    expect(moved.parentOrgId).toBe('b');
    expect(pick(moved)).toEqual(MATRIX);
  });

  it('deleteOrgSubtree лишає matrix-поля вцілілої org недоторканими', () => {
    const data = orgDeletionFixture();
    data.organizations = data.organizations.map((org) => (org.id === 'b' ? { ...org, ...MATRIX } : org));
    const survivor = deleteOrgSubtree(data, 'a').data.organizations.find((o) => o.id === 'b')!;
    expect(pick(survivor)).toEqual(MATRIX);
  });
});
