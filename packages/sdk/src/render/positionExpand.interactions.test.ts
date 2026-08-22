import { describe, expect, it, vi } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from '../data/types.js';

function treeData(): DiagramData {
  return {
    organizations: [{ id: 'o1', name: 'Ops', groupIds: [] }],
    groups: [],
    departments: [],
    persons: [
      { id: 'p-root', fullName: 'Root' },
      { id: 'p-mid', fullName: 'Mid' },
      { id: 'p-leaf', fullName: 'Leaf' },
    ],
    positions: [
      {
        id: 'root',
        title: 'Head',
        organizationId: 'o1',
        groupIds: [],
        personId: 'p-root',
        status: 'filled',
        isTemporary: false,
        isHead: true,
      },
      {
        id: 'mid',
        title: 'Lead',
        organizationId: 'o1',
        groupIds: [],
        personId: 'p-mid',
        status: 'filled',
        isTemporary: false,
      },
      {
        id: 'leaf',
        title: 'IC',
        organizationId: 'o1',
        groupIds: [],
        personId: 'p-leaf',
        status: 'filled',
        isTemporary: false,
      },
    ],
    reportLines: [
      { fromId: 'root', toId: 'mid', kind: 'admin' },
      { fromId: 'mid', toId: 'leaf', kind: 'admin' },
    ],
  };
}

async function mount(extra: { maxExpandedPositions?: number } = {}) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const onPositionExpandChange = vi.fn();
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: treeData(),
    staffCurrentOrgId: 'o1',
    useWorker: false,
    staffLayout: {
      staffCoordMode: 'tree',
      collapseUnexpandedPositions: true,
      maxExpandedPositions: extra.maxExpandedPositions,
    },
    callbacks: { onPositionExpandChange },
  });
  return { container, diagram, onPositionExpandChange };
}

describe('OrgHierarchyDiagram position expand (T66)', () => {
  it('success: togglePositionExpand reveals admin children', async () => {
    const { container, diagram, onPositionExpandChange } = await mount();
    expect(diagram.getStaffExpandedPositionIds()).toEqual([]);
    expect(await diagram.togglePositionExpand('root')).toBe(true);
    expect(diagram.getStaffExpandedPositionIds()).toContain('root');
    expect(diagram.getData().positions.find((p) => p.id === 'root')?.expanded).toBe(true);
    expect(onPositionExpandChange).toHaveBeenCalledWith(
      expect.objectContaining({ positionId: 'root', expanded: true }),
    );
    expect(await diagram.togglePositionExpand('root')).toBe(false);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: expandToDepth(1) expands head only', async () => {
    const { container, diagram } = await mount();
    await diagram.expandToDepth({ depth: 1 });
    expect(diagram.getStaffExpandedPositionIds().sort()).toEqual(['root']);
    await diagram.expandToDepth({ depth: 2 });
    expect(diagram.getStaffExpandedPositionIds().sort()).toEqual(['mid', 'root']);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: collapsePositionSubtree clears descendants', async () => {
    const { container, diagram } = await mount();
    await diagram.expandToDepth({ depth: 2 });
    await diagram.collapsePositionSubtree('root');
    expect(diagram.getStaffExpandedPositionIds()).toEqual([]);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: unknown id and leaf with no children → false', async () => {
    const { container, diagram } = await mount();
    expect(await diagram.togglePositionExpand('nope')).toBe(false);
    expect(await diagram.togglePositionExpand('leaf')).toBe(false);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: maxExpandedPositions caps interactive toggle', async () => {
    const { container, diagram } = await mount({ maxExpandedPositions: 1 });
    expect(await diagram.togglePositionExpand('root')).toBe(true);
    expect(await diagram.togglePositionExpand('mid')).toBe(true);
    expect(diagram.getStaffExpandedPositionIds()).toEqual(['mid']);
    diagram.destroy();
    document.body.removeChild(container);
  });
});
