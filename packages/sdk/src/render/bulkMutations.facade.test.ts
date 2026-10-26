import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { InteractionError, OrgHierarchyDiagram } from '../index.js';
import type { DiagramData, DiagramPosition } from '../data/types.js';

function makeData(headPositionId: 'from' | 'to' = 'from'): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: true },
      { id: 'a', name: 'A', parentOrgId: 'root', groupIds: [], collapsed: true },
      { id: 'b', name: 'B', parentOrgId: 'root', groupIds: [], collapsed: true },
      { id: 'child', name: 'Child', parentOrgId: 'a', groupIds: [], collapsed: true },
    ],
    groups: [], departments: [], persons: [],
    positions: [
      ...['from', 'to', 'c1', 'c2'].map<DiagramPosition>((id) => ({
        id, title: id, organizationId: 'a', groupIds: [], status: 'vacant', isTemporary: false,
        isHead: id === headPositionId,
      })),
      ...['root', 'b', 'child'].map<DiagramPosition>((organizationId) => ({
        id: `${organizationId}-head`, title: 'Head', organizationId, groupIds: [],
        status: 'vacant', isTemporary: false, isHead: true,
      })),
    ],
    reportLines: [
      { fromId: 'from', toId: 'c1', kind: 'admin' },
      { fromId: 'from', toId: 'c2', kind: 'admin' },
    ],
  };
}

const mounted: { diagram: OrgHierarchyDiagram; container: HTMLDivElement }[] = [];
afterEach(() => {
  for (const { diagram, container } of mounted) {
    diagram.destroy();
    container.remove();
  }
  mounted.length = 0;
});

async function mount(data = makeData()) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const onLayoutChange = rstest.fn();
  const diagram = await OrgHierarchyDiagram.create(container, {
    data, staffCurrentOrgId: 'root', useWorker: false, callbacks: { onLayoutChange },
  });
  mounted.push({ diagram, container });
  onLayoutChange.mockClear();
  return { diagram, onLayoutChange };
}

describe('OrgHierarchyDiagram bulk mutations', () => {
  it('success: transfers position children and emits one complete patch', async () => {
    const { diagram, onLayoutChange } = await mount();
    expect(await diagram.transferChildren('from', 'to')).toEqual({
      fromPositionId: 'from', toPositionId: 'to', movedChildIds: ['c1', 'c2'],
    });
    expect(diagram.getData().reportLines).toEqual([
      { fromId: 'to', toId: 'c1', kind: 'admin' },
      { fromId: 'to', toId: 'c2', kind: 'admin' },
    ]);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenCalledWith({
      type: 'bulk-transfer-children', fromPositionId: 'from', toPositionId: 'to',
      movedChildIds: ['c1', 'c2'],
    });
  });

  it('success: deletes a position subtree and emits one complete patch', async () => {
    // Keep the head outside the subtree being deleted.
    const { diagram, onLayoutChange } = await mount(makeData('to'));
    expect(await diagram.deleteSubtree('from')).toEqual({
      removedPositionIds: ['from', 'c1', 'c2'], removedPersonIds: [], removedReportLineCount: 2,
    });
    expect(diagram.getData().positions.map((p) => p.id)).toEqual([
      'to', 'root-head', 'b-head', 'child-head',
    ]);
    expect(diagram.getData().reportLines).toEqual([]);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenCalledWith({
      type: 'subtree-delete', positionId: 'from', removedPositionIds: ['from', 'c1', 'c2'],
    });
  });

  it('success: transfers child organizations and emits one complete patch', async () => {
    const { diagram, onLayoutChange } = await mount();
    expect(await diagram.transferChildOrgs('a', 'b')).toEqual({
      fromOrgId: 'a', toOrgId: 'b', movedOrgIds: ['child'],
    });
    expect(diagram.getData().organizations.find((o) => o.id === 'child')?.parentOrgId).toBe('b');
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenCalledWith({
      type: 'org-transfer-children', fromOrgId: 'a', toOrgId: 'b', movedOrgIds: ['child'],
    });
  });

  it('success: deletes an organization subtree and emits one complete patch', async () => {
    const { diagram, onLayoutChange } = await mount();
    expect(await diagram.deleteOrgSubtree('a')).toEqual({
      removedOrgIds: ['a', 'child'], removedDepartmentIds: [],
      removedPositionIds: ['from', 'to', 'c1', 'c2', 'child-head'], removedPersonIds: [],
      removedGroupIds: [], removedReportLineCount: 2, removedOrgLinkCount: 0,
    });
    const data = diagram.getData();
    expect(data.organizations.map((o) => o.id)).toEqual(['root', 'b']);
    expect(data.positions.map((p) => p.id)).toEqual(['root-head', 'b-head']);
    expect(data.reportLines).toEqual([]);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenCalledWith({
      type: 'org-subtree-delete', orgId: 'a', removedOrgIds: ['a', 'child'],
    });
  });

  const invalidCalls = [
    { name: 'transferChildren source', run: (d: OrgHierarchyDiagram) => d.transferChildren('ghost', 'to') },
    { name: 'transferChildren target', run: (d: OrgHierarchyDiagram) => d.transferChildren('from', 'ghost') },
    { name: 'deleteSubtree', run: (d: OrgHierarchyDiagram) => d.deleteSubtree('ghost') },
    { name: 'transferChildOrgs source', run: (d: OrgHierarchyDiagram) => d.transferChildOrgs('ghost', 'b') },
    { name: 'transferChildOrgs target', run: (d: OrgHierarchyDiagram) => d.transferChildOrgs('a', 'ghost') },
    { name: 'deleteOrgSubtree', run: (d: OrgHierarchyDiagram) => d.deleteOrgSubtree('ghost') },
  ];
  for (const { name, run } of invalidCalls) {
    it(`failure: ${name} rejects unknown id without changing data or emitting a patch`, async () => {
      const { diagram, onLayoutChange } = await mount();
      const before = JSON.stringify(diagram.getData());
      await expect(run(diagram)).rejects.toThrow(InteractionError);
      expect(JSON.stringify(diagram.getData())).toBe(before);
      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  }

  for (const { from, to } of [{ from: 'to', to: 'from' }, { from: 'from', to: 'from' }]) {
    it(`success: position transfer ${from} to ${to} is a no-op without a patch`, async () => {
      const { diagram, onLayoutChange } = await mount();
      const before = JSON.stringify(diagram.getData());
      expect(await diagram.transferChildren(from, to)).toEqual({
        fromPositionId: from, toPositionId: to, movedChildIds: [],
      });
      expect(JSON.stringify(diagram.getData())).toBe(before);
      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  }

  for (const { from, to } of [{ from: 'b', to: 'a' }, { from: 'a', to: 'a' }]) {
    it(`success: organization transfer ${from} to ${to} is a no-op without a patch`, async () => {
      const { diagram, onLayoutChange } = await mount();
      const before = JSON.stringify(diagram.getData());
      expect(await diagram.transferChildOrgs(from, to)).toEqual({
        fromOrgId: from, toOrgId: to, movedOrgIds: [],
      });
      expect(JSON.stringify(diagram.getData())).toBe(before);
      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  }
});
