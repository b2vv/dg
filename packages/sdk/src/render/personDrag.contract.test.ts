import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { PersonNodeView } from './PersonNode.js';
import { snapWorldToCell } from '../interaction/positionMove.js';
import type { DiagramData } from '../data/types.js';

/**
 * T77-M05 — the drag contract: a click must not read as a drop, and the snap
 * must use the layout pitch (cell + gap), not the bare cell.
 */
function gridData(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: [{ id: 'p1', fullName: 'Alice Chen' }],
    positions: [
      {
        id: 'pos1',
        title: 'Engineer',
        organizationId: 'org1',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 0, row: 0 },
      },
    ],
    reportLines: [],
  };
}

function pointerEvent(local: { x: number; y: number }, pointerId = 1) {
  return {
    pointerId,
    button: 0,
    stopPropagation: () => {},
    preventDefault: () => {},
    getLocalPosition: () => local,
    global: { x: local.x, y: local.y },
    clientX: local.x,
    clientY: local.y,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };
}

async function mountDraggable(onPersonDragEnd: () => void) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: gridData(),
    staffCurrentOrgId: 'org1',
    useWorker: false,
    callbacks: { onPersonDragEnd },
    render: { cellWidth: 140, cellHeight: 160 },
  });
  const host = (diagram as unknown as { host: { renderer: { layers: { persons: { children: unknown[] } } } } }).host;
  const node = host.renderer.layers.persons.children.find(
    (c): c is PersonNodeView => c instanceof PersonNodeView,
  );
  if (!node) throw new Error('expected a person node');
  return { container, diagram, node };
}

describe('person drag contract (T77-M05)', () => {
  it('failure: a click without movement never reports a drop', async () => {
    const onPersonDragEnd = rstest.fn();
    const { container, diagram, node } = await mountDraggable(onPersonDragEnd);

    const start = { x: node.x + 10, y: node.y + 10 };
    node.emit('pointerdown', pointerEvent(start));
    // Same spot, one pixel of jitter — below the 4px threshold.
    node.emit('globalpointermove', pointerEvent({ x: start.x + 1, y: start.y + 1 }));
    node.emit('pointerup', pointerEvent({ x: start.x + 1, y: start.y + 1 }));

    expect(onPersonDragEnd).not.toHaveBeenCalled();
    diagram.destroy();
    container.remove();
  });

  it('success: the node returns to its origin after a click', async () => {
    const { container, diagram, node } = await mountDraggable(rstest.fn());
    const originX = node.x;
    const originY = node.y;

    node.emit('pointerdown', pointerEvent({ x: originX + 5, y: originY + 5 }));
    node.emit('globalpointermove', pointerEvent({ x: originX + 7, y: originY + 6 }));
    node.emit('pointerup', pointerEvent({ x: originX + 7, y: originY + 6 }));

    expect(node.x).toBe(originX);
    expect(node.y).toBe(originY);
    diagram.destroy();
    container.remove();
  });
});

describe('snap uses layout pitch, not the bare cell (T77-M05)', () => {
  // Staff layout with gaps: pitch = cell + gap, and cards are inset in the cell.
  const grid = { pitchX: 164, pitchY: 188, originX: 40, originY: 24, insetX: 2, insetY: 2 };

  it('success: a card centre lands on its own cell at every column', () => {
    for (const col of [0, 1, 5]) {
      for (const row of [0, 2]) {
        const x = grid.originX + col * grid.pitchX + grid.insetX;
        const y = grid.originY + row * grid.pitchY + grid.insetY;
        expect(snapWorldToCell(x, y, grid)).toEqual({ col, row });
      }
    }
  });

  it('failure: snapping with the cell size instead of the pitch drifts away', () => {
    const cellOnly = { ...grid, pitchX: 140, pitchY: 160 };
    const col = 5;
    const x = grid.originX + col * grid.pitchX + grid.insetX;
    const y = grid.originY + grid.insetY;
    expect(snapWorldToCell(x, y, cellOnly).col).not.toBe(col);
  });
});
