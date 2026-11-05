import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { emptyDiagramData, type DiagramData, type DiagramPosition } from './data/types.js';

function position(id: string, organizationId = 'org'): DiagramPosition {
  return {
    id,
    title: id,
    organizationId,
    groupIds: [],
    status: 'vacant',
    isTemporary: false,
    expanded: false,
  };
}
function data(): DiagramData {
  return {
    ...emptyDiagramData(),
    organizations: [
      { id: 'org', name: 'Org', groupIds: [] },
      { id: 'sub', name: 'Sub', parentOrgId: 'org', groupIds: [] },
    ],
    positions: [
      { ...position('a'), isHead: true },
      position('b'),
      { ...position('s', 'sub'), isHead: true },
    ],
    persons: [{ id: 'a', fullName: 'Person with the same id' }],
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
  };
}
const diagrams: OrgHierarchyDiagram[] = [];
async function setup(): Promise<OrgHierarchyDiagram> {
  const diagram = new OrgHierarchyDiagram();
  diagrams.push(diagram);
  await diagram.setData(data());
  return diagram;
}
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
});

describe('DiagramNode', () => {
  it('success: reads a shallow copy of one entity by kind and id, with computed counts', async () => {
    const diagram = await setup();
    const whole = diagram.getData();
    const clone = rstest.spyOn(globalThis, 'structuredClone');
    const node = diagram.getNode({ kind: 'position', id: 'a' });
    expect(node?.getData()).toEqual(whole.positions[0]);
    const first = node?.getData();
    const second = node?.getData();
    expect(first).not.toBe(second);
    expect(first && 'groupIds' in first && first.groupIds).toBe(
      second && 'groupIds' in second && second.groupIds,
    );
    if (first && 'title' in first) first.title = 'external edit';
    expect(node?.getData()).toMatchObject({ title: 'a', childrenCount: 1, allDescendantCount: 1 });
    expect(diagram.getNode({ kind: 'organization', id: 'org' })?.getData()).toEqual(
      whole.organizations[0],
    );
    expect(diagram.getNode({ kind: 'person', id: 'a' })?.getData()).toEqual(whole.persons[0]);
    expect(clone).not.toHaveBeenCalled();
    clone.mockRestore();
  });
  it('failure: unknown kind/id returns null; retained accessors read current data after removal', async () => {
    const diagram = await setup();
    expect(diagram.getNode({ kind: 'position', id: 'org' })).toBeNull();
    expect(diagram.getNode({ kind: 'organization', id: 'missing' })).toBeNull();
    const node = diagram.getNode({ kind: 'position', id: 'a' });
    await diagram.setData(emptyDiagramData());
    expect(node?.getData()).toBeNull();
  });
  it('success: position state follows selection, highlight and expansion; leaf/person are not collapsed', async () => {
    const diagram = await setup();
    const node = diagram.getNode({ kind: 'position', id: 'a' });
    expect(node?.getState()).toEqual({
      selected: false,
      hovered: false,
      expanded: false,
      collapsed: true,
    });
    await diagram.selectMany([
      { kind: 'person', id: 'a' },
      { kind: 'position', id: 'a' },
    ]);
    diagram.highlightPath('a');
    await diagram.togglePositionExpand('a');
    expect(node?.getState()).toEqual({
      selected: true,
      hovered: true,
      expanded: true,
      collapsed: false,
    });
    await diagram.clearSelection();
    diagram.highlightPath(null);
    await diagram.togglePositionExpand('a');
    expect(node?.getState()).toEqual({
      selected: false,
      hovered: false,
      expanded: false,
      collapsed: true,
    });
    expect(diagram.getNode({ kind: 'position', id: 'b' })?.getState()).toMatchObject({
      expanded: false,
      collapsed: false,
    });
    expect(diagram.getNode({ kind: 'person', id: 'a' })?.getState()).toMatchObject({
      expanded: false,
      collapsed: false,
    });
    await diagram.setData({
      ...data(),
      positions: data().positions.map((p) => ({ ...p, expanded: true })),
    });
    expect(node?.getState()).toMatchObject({ expanded: true, collapsed: false });
  });
  it('success: org expansion follows the last drawn frame', async () => {
    const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
      data: data(),
      theme: 'light',
      useWorker: false,
      staffCurrentOrgId: 'org',
    });
    diagrams.push(diagram);
    const node = diagram.getNode({ kind: 'organization', id: 'sub' });
    expect(node?.getState()).toMatchObject({ expanded: false, collapsed: true });
    const expanding = diagram.toggleStaffOrgExpand('sub');
    expect(node?.getState()).toMatchObject({ expanded: false, collapsed: true });
    await expanding;
    expect(node?.getState()).toMatchObject({ expanded: true, collapsed: false });
    await diagram.toggleStaffOrgExpand('sub');
    expect(node?.getState()).toMatchObject({ expanded: false, collapsed: true });
  });
});
