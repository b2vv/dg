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

/**
 * T111-K4b — the *sprite* layer. K4a made the contour ring show the resolved
 * drop; the neighbour's card itself still sat where it was, so the dragged
 * card visually landed on top of it (spec A9: "including the movement of the
 * neighbour's **sprite**, not just the ring").
 *
 * Two seats with a free cell behind the occupant, so `resolveSeatDrop`
 * answers `push` rather than `swap`: P1@(0,0), P2@(1,0), and (2,0) empty.
 */
function twoInARow(): DiagramData {
  const cells: Array<[string, number]> = [
    ['P1', 0],
    ['P2', 1],
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

async function mountData(data: DiagramData, onDrop: (patch: LayoutPatch) => void) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data,
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
  return { container, diagram, host };
}

/**
 * Person nodes left-to-right **as they stand right now**. Callers capture this
 * before the drag: once a card is displaced the x order is exactly what is
 * under test, so re-sorting mid-drag would hand back a different card and the
 * assertion would silently follow the move instead of catching it.
 */
function personNodesByX(children: readonly unknown[]): PersonNodeView[] {
  return children
    .filter((c): c is PersonNodeView => c instanceof PersonNodeView)
    .slice()
    .sort((a, b) => a.x - b.x);
}

describe('seat-collision card preview (T111-K4b)', () => {
  it('success: mid-drag, a pushed neighbour sprite moves to its own new cell', async () => {
    const { container, diagram, host } = await mountData(twoInARow(), rstest.fn());
    const [p1, p2] = personNodesByX(host.renderer.layers.persons.children);
    if (!p1 || !p2) throw new Error('expected two person nodes');
    const p2Home = { x: p2.x, y: p2.y };

    const start = { x: p1.x + 5, y: p1.y + 5 };
    p1.emit('pointerdown', pointerEvent(start));
    // One cell right: P1 lands on P2's cell, and (2,0) is free — so P2 is
    // pushed one further right rather than swapped.
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));

    // The neighbour's card itself has moved, mid-drag — not just its ring.
    expect(p2.x).toBeGreaterThan(p2Home.x);
    expect(p2.y).toBeCloseTo(p2Home.y, 5);

    p1.emit('pointerup', pointerEvent({ x: start.x + 160, y: start.y }));
    diagram.destroy();
    container.remove();
  });

  it('success: mid-drag, a swapped neighbour sprite moves to the cell the mover is leaving', async () => {
    const { container, diagram, host } = await mountData(threeInARow(), rstest.fn());
    const [p1, p2] = personNodesByX(host.renderer.layers.persons.children);
    if (!p1 || !p2) throw new Error('expected three person nodes');
    const p1Home = { x: p1.x, y: p1.y };
    const p2Home = { x: p2.x, y: p2.y };

    const start = { x: p1.x + 5, y: p1.y + 5 };
    p1.emit('pointerdown', pointerEvent(start));
    // P3 sits behind P2, so there is nowhere to push: `swap`. P2 has to take
    // the cell P1 is vacating.
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));

    expect(p2.x).toBeCloseTo(p1Home.x, 5);
    expect(p2.x).toBeLessThan(p2Home.x);

    p1.emit('pointerup', pointerEvent({ x: start.x + 160, y: start.y }));
    diagram.destroy();
    container.remove();
  });

  it('failure: a cancelled drag restores the displaced neighbour sprite, byte for byte', async () => {
    const onDrop = rstest.fn();
    const { container, diagram, host } = await mountData(threeInARow(), onDrop);
    const [p1, p2] = personNodesByX(host.renderer.layers.persons.children);
    if (!p1 || !p2) throw new Error('expected three person nodes');
    const p2Home = { x: p2.x, y: p2.y };

    const start = { x: p1.x + 5, y: p1.y + 5 };
    p1.emit('pointerdown', pointerEvent(start));
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));
    // Confirm it actually moved, so "restored" cannot pass for the wrong
    // reason (the same trap the K4a cancel test guards against).
    expect(p2.x).not.toBeCloseTo(p2Home.x, 5);

    p1.emit('globalpointermove', pointerEvent({ x: start.x - 100000, y: start.y - 100000 }));
    p1.emit('pointerup', pointerEvent({ x: start.x - 100000, y: start.y - 100000 }));

    expect(p2.x).toBeCloseTo(p2Home.x, 5);
    expect(p2.y).toBeCloseTo(p2Home.y, 5);
    expect(onDrop).not.toHaveBeenCalled();
    diagram.destroy();
    container.remove();
  });

  it('failure: re-aiming mid-gesture puts the first neighbour back and displaces the new one', async () => {
    // The trap this catches: displace P2, then move on so the resolved drop
    // names P3 instead — if the previous displacement is not undone first,
    // P2 stays parked in a cell nobody asked it to occupy, and the preview
    // shows a layout that no drop would ever produce.
    const { container, diagram, host } = await mountData(threeInARow(), rstest.fn());
    const [p1, p2, p3] = personNodesByX(host.renderer.layers.persons.children);
    if (!p1 || !p2 || !p3) throw new Error('expected three person nodes');
    const p2Home = { x: p2.x, y: p2.y };
    const p3Home = { x: p3.x, y: p3.y };

    const start = { x: p1.x + 5, y: p1.y + 5 };
    p1.emit('pointerdown', pointerEvent(start));
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));
    expect(p2.x).not.toBeCloseTo(p2Home.x, 5);

    // Same gesture, new target cell: now P3 is the occupant. The scene is at
    // zoom 1.4, so a screen-space delta covers ~1/1.4 of a cell pitch — +320
    // still rounds into col 1, which is why this is +400 and not double the
    // first move.
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 400, y: start.y }));

    expect(p2.x).toBeCloseTo(p2Home.x, 5);
    expect(p2.y).toBeCloseTo(p2Home.y, 5);
    expect(p3.x).not.toBeCloseTo(p3Home.x, 5);

    p1.emit('pointerup', pointerEvent({ x: start.x + 400, y: start.y }));
    diagram.destroy();
    container.remove();
  });

  it('failure: a committed drop leaves no card parked by the preview', async () => {
    // The preview displaces a neighbour by hand; the commit that follows
    // re-renders every card from data. If the preview's bookkeeping is not
    // cleared on the way through, the re-render and the leftover offset fight
    // over the same sprite and the neighbour ends up one cell too far.
    const onDrop = rstest.fn();
    const { container, diagram, host } = await mountData(threeInARow(), onDrop);
    const [p1, p2] = personNodesByX(host.renderer.layers.persons.children);
    if (!p1 || !p2) throw new Error('expected three person nodes');

    const start = { x: p1.x + 5, y: p1.y + 5 };
    p1.emit('pointerdown', pointerEvent(start));
    p1.emit('globalpointermove', pointerEvent({ x: start.x + 160, y: start.y }));
    p1.emit('pointerup', pointerEvent({ x: start.x + 160, y: start.y }));
    await new Promise((r) => {
      setTimeout(r, 80);
    });

    expect(onDrop).toHaveBeenCalled();
    // Data is the authority after a commit: P1 in P2's cell, P2 in P1's.
    const cellOf = (id: string) =>
      diagram.getData().positions.find((p) => p.id === id)?.gridCell;
    expect(cellOf('P1')).toEqual({ col: 1, row: 0 });
    expect(cellOf('P2')).toEqual({ col: 0, row: 0 });
    // And the sprites agree with it — P2 is left of P1, not parked further out.
    const after = personNodesByX(host.renderer.layers.persons.children);
    expect(after[0]?.x).toBeLessThan(after[1]?.x ?? 0);

    diagram.destroy();
    container.remove();
  });
});
