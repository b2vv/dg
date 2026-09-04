import type { FederatedPointerEvent } from 'pixi.js';
import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { PersonNodeView } from './PersonNode.js';
import { snapWorldToCell } from '../interaction/positionMove.js';
import type { DiagramData } from '../data/types.js';
import type { LayoutPatch } from '../callbacks.js';

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

/** Stub pointer event — see the note in nodeInteractions.contract.test.ts. */
function pointerEvent(
  local: { x: number; y: number },
  pointerId = 1,
): FederatedPointerEvent {
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
  } as unknown as FederatedPointerEvent;
}

/**
 * `onPersonDragEnd` is an internal renderer hook, not a public callback — the
 * diagram turns a drop into `onLayoutChange({ type: 'position-move' })`. Passing
 * it through `callbacks` wired it to nothing, so the "never reports a drop"
 * assertions below could never have failed. They watch the real callback now.
 */
async function mountDraggable(onDrop: (patch: LayoutPatch) => void) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: gridData(),
    staffCurrentOrgId: 'org1',
    useWorker: false,
    callbacks: {
      onLayoutChange: (patch) => {
        if (patch.type === 'position-move') onDrop(patch);
      },
    },
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
    const onDrop = rstest.fn();
    const { container, diagram, node } = await mountDraggable(onDrop);

    const start = { x: node.x + 10, y: node.y + 10 };
    node.emit('pointerdown', pointerEvent(start));
    // Same spot, one pixel of jitter — below the 4px threshold.
    node.emit('globalpointermove', pointerEvent({ x: start.x + 1, y: start.y + 1 }));
    node.emit('pointerup', pointerEvent({ x: start.x + 1, y: start.y + 1 }));

    // Awaited since T104: the patch is deferred to after the frame, so a bare
    // assertion here would pass because nothing had run yet, not because
    // nothing was reported.
    await new Promise((r) => { setTimeout(r, 80); });
    expect(onDrop).not.toHaveBeenCalled();
    diagram.destroy();
    container.remove();
  });

  it('success: a real drag does report a drop — the negative tests need a positive', async () => {
    // Without this, "never reports a drop" could pass because nothing ever
    // reports one. That is exactly how the old wiring failed silently.
    const onDrop = rstest.fn();
    const { container, diagram } = await mountDraggable(onDrop);
    // Drag is offered only in the `near` band, and the node views are replaced
    // when the band changes — so zoom first, then take the node.
    diagram.setZoom(1.4);
    await new Promise((r) => { setTimeout(r, 80); });
    const host = (
      diagram as unknown as {
        host: { renderer: { layers: { persons: { children: unknown[] } } } };
      }
    ).host;
    const node = host.renderer.layers.persons.children.find(
      (c): c is PersonNodeView => c instanceof PersonNodeView,
    )!;
    const start = { x: node.x + 5, y: node.y + 5 };
    node.emit('pointerdown', pointerEvent(start));
    node.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));
    node.emit('pointerup', pointerEvent({ x: start.x + 160, y: start.y }));

    // Awaited since T104: the patch is announced *after* the frame that draws
    // it, not before. The drop is still reported exactly once — what changed is
    // that it is no longer reported for a move the render might yet refuse.
    await new Promise((r) => { setTimeout(r, 80); });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0]).toMatchObject({ type: 'position-move' });
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

describe('drag is only offered where the card is worth dragging', () => {
  /**
   * Below the `near` band a seat is a compressed strip (mid) or a dot (far), so
   * a drag there aims at something the user cannot actually see. Pressing and
   * moving pans the scene instead, which is what the gesture means when the card
   * is not a card yet.
   */
  async function dragAt(zoom: number): Promise<{ moved: boolean; cleanup: () => void }> {
    const drops: unknown[] = [];
    const { container, diagram } = await mountDraggable(() => drops.push(1));
    diagram.setZoom(zoom);
    // Crossing an LOD band re-renders the scene and replaces the node views, so
    // the node has to be looked up after the zoom, not before it.
    await new Promise((r) => { setTimeout(r, 80); });
    const host = (
      diagram as unknown as {
        host: { renderer: { layers: { persons: { children: unknown[] } } } };
      }
    ).host;
    const node = host.renderer.layers.persons.children.find(
      (c): c is PersonNodeView => c instanceof PersonNodeView,
    );
    if (!node) throw new Error('expected a person node after zoom');
    const originX = node.x;
    node.emit('pointerdown', pointerEvent({ x: originX + 5, y: node.y + 5 }));
    node.emit('globalpointermove', pointerEvent({ x: originX + 120, y: node.y + 5 }));
    const moved = node.x !== originX;
    node.emit('pointerup', pointerEvent({ x: originX + 120, y: node.y + 5 }));
    return {
      moved,
      cleanup: () => {
        diagram.destroy();
        container.remove();
      },
    };
  }

  it('success: at near the card follows the pointer', async () => {
    const { moved, cleanup } = await dragAt(1.4);
    expect(moved).toBe(true);
    cleanup();
  });

  it('failure: at mid the card does not move', async () => {
    const { moved, cleanup } = await dragAt(0.8);
    expect(moved).toBe(false);
    cleanup();
  });

  it('failure: at far the card does not move', async () => {
    const { moved, cleanup } = await dragAt(0.3);
    expect(moved).toBe(false);
    cleanup();
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

describe('fitView must not cut off the chrome it painted', () => {
  it('failure: content bounds include the zone band above the topmost seat', async () => {
    // getContentBounds unions node boxes only, so zones, department frames and
    // their labels sat outside the fitted region — the top zone's name was
    // clipped by the viewport edge. Reserving a label band (T94) added more
    // chrome above the first row, which made the omission plainly visible.
    const container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '700px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: gridData(),
      staffCurrentOrgId: 'org1',
      useWorker: false,
      render: { cellWidth: 140, cellHeight: 160, staffZoneChrome: true },
    });

    const renderer = (
      diagram as unknown as {
        host: {
          renderer: {
            getContentBounds(): { y: number } | null;
            listNodeBoxes(): readonly { y: number }[];
          };
        };
      }
    ).host.renderer;
    const bounds = renderer.getContentBounds()!;
    const topSeat = Math.min(...renderer.listNodeBoxes().map((b) => b.y));

    expect(bounds).toBeTruthy();
    expect(bounds.y).toBeLessThan(topSeat);

    diagram.destroy();
    container.remove();
  });
});
