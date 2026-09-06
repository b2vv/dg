import type { FederatedPointerEvent } from 'pixi.js';
import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { PersonNodeView } from './PersonNode.js';
import type { DiagramData } from '../data/types.js';
import type { LayoutPatch } from '../callbacks.js';

/**
 * T111-K4a — the projection has to show the *resolved* seat drop while the
 * user is still dragging, not just where the dragged card landed
 * (plan.md §3, spec.md A9/A10). Three seats in one org block, one row:
 * P1@(0,0), P2@(1,0), P3@(2,0). Dragging P1 onto P2's cell leaves P2 nowhere
 * to be pushed (P3 already sits behind it) — `resolveSeatDrop` answers
 * `swap`, and the contour preview has to show P2 back at P1's authored cell,
 * not overlapping it.
 */
function threeInARow(): DiagramData {
  const cells: Array<[string, number]> = [
    ['P1', 0],
    ['P2', 1],
    ['P3', 2],
  ];
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: cells.map(([id]) => ({ id: `person-${id}`, fullName: id })),
    positions: cells.map(([id, col]) => ({
      id,
      title: id,
      organizationId: 'org1',
      departmentId: 'IT',
      groupIds: [],
      personId: `person-${id}`,
      status: 'filled' as const,
      isTemporary: false,
      gridCell: { col, row: 0 },
    })),
    reportLines: [],
  };
}

/** Stub pointer event — see the note in nodeInteractions.contract.test.ts. */
function pointerEvent(local: { x: number; y: number }, pointerId = 1): FederatedPointerEvent {
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

type RendererInternals = {
  contours: {
    previewState(positionId: string): { col: number; row: number; box?: { x: number; y: number } } | undefined;
  };
};

async function mountThreeInARow(onDrop: (patch: LayoutPatch) => void) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: threeInARow(),
    useWorker: false,
    callbacks: {
      onLayoutChange: (patch) => {
        if (patch.type === 'position-move') onDrop(patch);
      },
    },
    render: { cellWidth: 140, cellHeight: 160 },
  });
  diagram.setZoom(1.4);
  await new Promise((r) => {
    setTimeout(r, 80);
  });
  const host = (
    diagram as unknown as { host: { renderer: { layers: { persons: { children: unknown[] } } } } }
  ).host;
  const renderer = host.renderer as unknown as RendererInternals;
  return { container, diagram, host, renderer };
}

/**
 * P1 sits at col 0 — the leftmost card — so it can be picked out of the three
 * `PersonNodeView`s without relying on child order, which the staff canvas
 * layout does not promise matches `data.positions` order.
 */
function leftmostPersonNode(children: readonly unknown[]): PersonNodeView {
  const nodes = children.filter((c): c is PersonNodeView => c instanceof PersonNodeView);
  const node = nodes.reduce((a, b) => (b.x < a.x ? b : a));
  if (!node) throw new Error('expected a person node');
  return node;
}

describe('seat-collision contour preview (T111-K4a)', () => {
  it('success: mid-drag, the contour projection shows the resolved swap for both seats', async () => {
    const { container, diagram, host, renderer } = await mountThreeInARow(rstest.fn());
    const node = leftmostPersonNode(host.renderer.layers.persons.children);

    const start = { x: node.x + 5, y: node.y + 5 };
    node.emit('pointerdown', pointerEvent(start));
    // One cell pitch to the right (cellWidth 140 + default horizontalGap 20):
    // P1 lands on P2's cell. P3 already sits behind P2, so there is nowhere
    // to push P2 to — `resolveSeatDrop` answers `swap`.
    node.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));

    // Mid-drag snapshot (spec A9): both seats already show the resolved
    // state, before the pointer is ever released.
    expect(renderer.contours.previewState('P1')).toMatchObject({ col: 1, row: 0 });
    expect(renderer.contours.previewState('P2')).toMatchObject({ col: 0, row: 0 });
    expect(renderer.contours.previewState('P3')).toMatchObject({ col: 2, row: 0 });

    node.emit('pointerup', pointerEvent({ x: start.x + 160, y: start.y }));
    diagram.destroy();
    container.remove();
  });

  it('failure: a cancelled drag restores both seats to the pre-drag state, byte for byte', async () => {
    const onDrop = rstest.fn();
    const { container, diagram, host, renderer } = await mountThreeInARow(onDrop);
    const node = leftmostPersonNode(host.renderer.layers.persons.children);

    const baseline = ['P1', 'P2', 'P3'].map((id) => renderer.contours.previewState(id));

    const start = { x: node.x + 5, y: node.y + 5 };
    node.emit('pointerdown', pointerEvent(start));
    node.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));
    // Confirm the preview actually diverged before we cancel — otherwise
    // "restored" would be true for the wrong reason (nothing ever moved).
    expect(['P1', 'P2', 'P3'].map((id) => renderer.contours.previewState(id))).not.toEqual(
      baseline,
    );

    // Drag off the grid entirely — an invalid drop, cancelled rather than
    // committed (personInteractions.ts: snap.col/row < 0 restores instead of
    // reporting a drop).
    node.emit('globalpointermove', pointerEvent({ x: start.x - 100000, y: start.y - 100000 }));
    node.emit('pointerup', pointerEvent({ x: start.x - 100000, y: start.y - 100000 }));

    expect(['P1', 'P2', 'P3'].map((id) => renderer.contours.previewState(id))).toEqual(baseline);
    expect(onDrop).not.toHaveBeenCalled();
    diagram.destroy();
    container.remove();
  });
});
