import { afterEach, describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { emptyDiagramData, type DiagramPosition } from './data/types.js';
import { formatPositionCountsBadge } from './render/orgCardChrome.js';

function position(id: string): DiagramPosition {
  return {
    id,
    title: id,
    organizationId: 'unknown',
    groupIds: [],
    status: 'vacant',
    isTemporary: false,
  };
}

const diagrams: OrgHierarchyDiagram[] = [];
function diagram(): OrgHierarchyDiagram {
  const instance = new OrgHierarchyDiagram();
  diagrams.push(instance);
  return instance;
}
afterEach(() => {
  for (const instance of diagrams.splice(0)) instance.destroy();
});

describe('subordinate counts ingestion', () => {
  it('success: setData supplies counts shared by getData and the card badge', async () => {
    const instance = diagram();
    await instance.setData({
      ...emptyDiagramData(),
      positions: [position('a'), position('b')],
      reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
    });
    const [parent, leaf] = instance.getData().positions;
    expect(parent).toMatchObject({ childrenCount: 1, allDescendantCount: 1 });
    expect(formatPositionCountsBadge(parent)).toBe('1 [1]');
    expect(leaf.childrenCount).toBeUndefined();
    expect(leaf.allDescendantCount).toBeUndefined();
    expect(formatPositionCountsBadge(leaf)).toBeUndefined();
  });
  it('success: the first scene from create() carries counts without any setData', async () => {
    const instance = await OrgHierarchyDiagram.create(document.createElement('div'), {
      data: {
        ...emptyDiagramData(),
        organizations: [{ id: 'org', name: 'Org', groupIds: [] }],
        positions: [
          { ...position('a'), organizationId: 'org', isHead: true },
          { ...position('b'), organizationId: 'org' },
        ],
        reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
      },
      theme: 'light',
      useWorker: false,
    });
    diagrams.push(instance);
    const [parent, leaf] = instance.getData().positions;
    expect(parent).toMatchObject({ childrenCount: 1, allDescendantCount: 1 });
    expect(leaf.childrenCount).toBeUndefined();
  });
  it('failure: stale host counts are overwritten, including removal from leaves', async () => {
    const instance = diagram();
    const positions = ['a', 'b'].map((id) => ({
      ...position(id),
      childrenCount: 99,
      allDescendantCount: 999,
    }));
    await instance.setData({
      ...emptyDiagramData(),
      positions,
      reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
    });
    const [parent, leaf] = instance.getData().positions;
    expect(parent).toMatchObject({ childrenCount: 1, allDescendantCount: 1 });
    expect(leaf).not.toHaveProperty('childrenCount');
    expect(leaf).not.toHaveProperty('allDescendantCount');
    expect(formatPositionCountsBadge(leaf)).toBeUndefined();
  });
  it('success: appendData recomputes the full tree and turns a leaf into a parent', async () => {
    const instance = diagram();
    await instance.setData({
      ...emptyDiagramData(),
      positions: [position('a'), position('b')],
      reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
    });
    expect(instance.getData().positions[1].childrenCount).toBeUndefined();
    await instance.appendData(null, {
      append: () => ({
        positions: [{ ...position('c'), childrenCount: 44, allDescendantCount: 44 }],
        reportLines: [{ fromId: 'b', toId: 'c', kind: 'admin' }],
      }),
    });
    const [a, b, c] = instance.getData().positions;
    expect(a).toMatchObject({ childrenCount: 1, allDescendantCount: 2 });
    expect(b).toMatchObject({ childrenCount: 1, allDescendantCount: 1 });
    expect(c.childrenCount).toBeUndefined();
    expect(c.allDescendantCount).toBeUndefined();
  });
  it('failure: rejected append mapper preserves computed counts', async () => {
    const instance = diagram();
    await instance.setData({ ...emptyDiagramData(), positions: [position('a')] });
    const before = instance.getData();
    await expect(
      instance.appendData(null, {
        append: () => {
          throw new Error('mapping failed');
        },
      }),
    ).rejects.toThrow('mapping failed');
    expect(instance.getData()).toEqual(before);
  });
});
