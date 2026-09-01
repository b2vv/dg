import type { FederatedPointerEvent } from 'pixi.js';
import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { PersonNodeView } from './PersonNode.js';
import type { DiagramData } from '../data/types.js';
import type { LayoutPatch } from '../callbacks.js';

/**
 * T91 rows 11-13, 16-24 — dragging a seat onto another seat re-parents it.
 *
 * The scene here is a *tree*: no position carries a `gridCell`, so the layout
 * places every card itself and gives it the `tree` role. That is what puts these
 * cards in re-parent mode — the same drag on an authored cell still moves, and
 * `personDrag.contract.test.ts` holds that half.
 */
function treeData(): DiagramData {
  const seat = (id: string, title: string, isHead = false) => ({
    id,
    title,
    organizationId: 'org1',
    groupIds: [],
    status: 'vacant' as const,
    isTemporary: false,
    isHead,
  });
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [],
    persons: [],
    // head → a → b,  head → c
    positions: [
      seat('head', 'Head', true),
      seat('a', 'Manager A'),
      seat('b', 'Report B'),
      seat('c', 'Manager C'),
    ],
    reportLines: [
      { fromId: 'head', toId: 'a', kind: 'admin' },
      { fromId: 'a', toId: 'b', kind: 'admin' },
      { fromId: 'head', toId: 'c', kind: 'admin' },
    ],
  };
}

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

interface Internals {
  host: {
    renderer: {
      layers: { persons: { children: unknown[] }; dragPreview: { children: unknown[] } };
      lastDropPreview: { targetId: string; valid: boolean; color: number } | null;
      getNodeBox(id: string): { x: number; y: number; width: number; height: number } | undefined;
    };
  };
  data: DiagramData;
}

async function mountTree(onPatch?: (patch: LayoutPatch) => void) {
  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.height = '700px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: treeData(),
    staffCurrentOrgId: 'org1',
    useWorker: false,
    callbacks: { onLayoutChange: (patch) => onPatch?.(patch) },
  });
  // Drag is offered only in the `near` band; the views are rebuilt on the way.
  diagram.setZoom(1.4);
  await new Promise((r) => setTimeout(r, 120));
  const internals = diagram as unknown as Internals;
  const renderer = internals.host.renderer;
  const nodeFor = (id: string) => {
    const box = renderer.getNodeBox(id);
    if (!box) throw new Error(`no box for ${id}`);
    const node = (renderer.layers.persons.children as PersonNodeView[]).find(
      (c) => c instanceof PersonNodeView && Math.abs(c.x - box.x) < 0.5 && Math.abs(c.y - box.y) < 0.5,
    );
    if (!node) throw new Error(`no view for ${id}`);
    return { node, box };
  };
  // The pointer arrives in *global* space and the drag converts it with
  // `personLayer.toLocal`. Aiming with world coordinates therefore misses by
  // the viewport transform — at zoom 1.4 it lands on a different card
  // altogether, which is how this harness first "proved" the wrong target.
  const toGlobal = (x: number, y: number) =>
    (renderer.layers.persons as unknown as {
      toGlobal(p: { x: number; y: number }): { x: number; y: number };
    }).toGlobal({ x, y });
  return { container, diagram, renderer, internals, nodeFor, toGlobal };
}

/** Press on `fromId`, sweep to the centre of `toId`, release there. */
function dragOnto(
  toGlobal: (x: number, y: number) => { x: number; y: number },
  from: { node: PersonNodeView; box: { x: number; y: number } },
  to: { x: number; y: number; width: number; height: number } | null,
  release = true,
) {
  const start = toGlobal(from.box.x + 5, from.box.y + 5);
  from.node.emit('pointerdown', pointerEvent(start));
  const at = to
    ? toGlobal(to.x + to.width / 2, to.y + to.height / 2)
    : toGlobal(from.box.x + 4000, from.box.y + 4000);
  from.node.emit('globalpointermove', pointerEvent(at));
  if (release) from.node.emit('pointerup', pointerEvent(at));
  return at;
}

describe('seat re-parent by drag (T91)', () => {
  it('row 12: dropping a seat on another seat makes it report there', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, internals, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));

    dragOnto(toGlobal, nodeFor('b'), nodeFor('c').box);
    await new Promise((r) => setTimeout(r, 120));

    const parentOfB = internals.data.reportLines.find((r) => r.kind === 'admin' && r.toId === 'b');
    expect(parentOfB?.fromId).toBe('c');
    expect(patches).toContainEqual({
      type: 'position-reparent',
      positionId: 'b',
      fromManagerId: 'a',
      toManagerId: 'c',
    });
    diagram.destroy();
    container.remove();
  });

  it('row 12: the dragged seat gains no gridCell — its place stays the layout’s', async () => {
    // The bug this closes: `movePersonToCell` writes a `gridCell` and clears the
    // computed coords, so before T91 a drag in a tree quietly turned a computed
    // position into an authored one.
    const { container, diagram, internals, nodeFor, toGlobal } = await mountTree();

    dragOnto(toGlobal, nodeFor('b'), nodeFor('c').box);
    await new Promise((r) => setTimeout(r, 120));

    expect(internals.data.positions.every((p) => p.gridCell === undefined)).toBe(true);
    diagram.destroy();
    container.remove();
  });

  it('row 12: no position-move patch is emitted for a tree card', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));

    dragOnto(toGlobal, nodeFor('b'), nodeFor('c').box);
    await new Promise((r) => setTimeout(r, 120));

    expect(patches.some((p) => p.type === 'position-move')).toBe(false);
    diagram.destroy();
    container.remove();
  });

  it('row 16: over a target it may join, the preview draws a ring and a ghost', async () => {
    const { container, diagram, renderer, nodeFor, toGlobal } = await mountTree();

    // The view is taken before the drag: the card follows the pointer, so
    // resolving it by position afterwards finds nothing.
    const b = nodeFor('b');
    dragOnto(toGlobal, b, nodeFor('c').box, false);

    expect(renderer.lastDropPreview).toMatchObject({ targetId: 'c', valid: true });
    // Ring plus ghost line.
    expect(renderer.layers.dragPreview.children).toHaveLength(2);

    b.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    diagram.destroy();
    container.remove();
  });

  it('row 17: over a target it may not, the same preview turns red', async () => {
    // Its own mount rather than a second drag in the test above: releasing a
    // valid drag re-parents and rebuilds the scene, so the boxes the next drag
    // would aim at are gone.
    const { container, diagram, renderer, nodeFor, toGlobal } = await mountTree();

    // a onto b — b is a's own report, so this would close a cycle.
    const a = nodeFor('a');
    dragOnto(toGlobal, a, nodeFor('b').box, false);

    expect(renderer.lastDropPreview).toMatchObject({ targetId: 'b', valid: false });
    // Drawn all the same — the user must see the refusal, not an absence.
    expect(renderer.layers.dragPreview.children).toHaveLength(2);

    a.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    diagram.destroy();
    container.remove();
  });

  it('rows 16-17: refusal and acceptance are not painted the same colour', async () => {
    const first = await mountTree();
    const b = first.nodeFor('b');
    dragOnto(first.toGlobal, b, first.nodeFor('c').box, false);
    const validColor = first.renderer.lastDropPreview!.color;
    b.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    first.diagram.destroy();
    first.container.remove();

    const second = await mountTree();
    const a = second.nodeFor('a');
    dragOnto(second.toGlobal, a, second.nodeFor('b').box, false);
    const refusedColor = second.renderer.lastDropPreview!.color;
    a.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    second.diagram.destroy();
    second.container.remove();

    expect(refusedColor).not.toBe(validColor);
  });

  it('row 18: releasing over a refused target changes nothing', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, internals, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));

    const before = internals.data.reportLines;
    dragOnto(toGlobal, nodeFor('a'), nodeFor('b').box);
    await new Promise((r) => setTimeout(r, 120));

    expect(internals.data.reportLines).toBe(before);
    expect(patches).toHaveLength(0);
    diagram.destroy();
    container.remove();
  });

  it('row 19: releasing over empty canvas changes nothing', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, internals, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));

    const before = internals.data.reportLines;
    dragOnto(toGlobal, nodeFor('b'), null);
    await new Promise((r) => setTimeout(r, 120));

    expect(internals.data.reportLines).toBe(before);
    expect(patches).toHaveLength(0);
    diagram.destroy();
    container.remove();
  });

  it('row 20: the preview leaves the scene when the pointer does', async () => {
    const { container, diagram, renderer, nodeFor, toGlobal } = await mountTree();

    const dragged = nodeFor('b');
    dragOnto(toGlobal, dragged, nodeFor('c').box, false);
    expect(renderer.layers.dragPreview.children.length).toBeGreaterThan(0);

    dragged.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    expect(renderer.layers.dragPreview.children).toHaveLength(0);
    expect(renderer.lastDropPreview).toBeNull();

    diagram.destroy();
    container.remove();
  });

  it('row 21: selection chrome and the drag preview do not clear each other', async () => {
    const { container, diagram, renderer, nodeFor, toGlobal } = await mountTree();

    const dragged = nodeFor('b');
    dragOnto(toGlobal, dragged, nodeFor('c').box, false);
    const drawn = renderer.layers.dragPreview.children.length;
    expect(drawn).toBeGreaterThan(0);

    // Selection repaints wipe `overlay` wholesale — that is why the preview has
    // a layer of its own.
    diagram.select({ kind: 'position', id: 'head' });
    expect(renderer.layers.dragPreview.children).toHaveLength(drawn);

    dragged.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    diagram.destroy();
    container.remove();
  });


  it('row 23: the scene is redrawn around the new manager', async () => {
    const { container, diagram, internals, renderer, nodeFor, toGlobal } = await mountTree();

    // Captured before, because the assertion has to be about a *change*. An
    // "is b below c" check would have passed without any redraw at all: b was
    // already the lowest card on the scene.
    const beforeB = { ...renderer.getNodeBox('b')! };
    const beforeA = { ...renderer.getNodeBox('a')! };
    expect(beforeB.x).toBe(beforeA.x);

    dragOnto(toGlobal, nodeFor('b'), nodeFor('c').box);
    await new Promise((r) => setTimeout(r, 150));

    const afterB = renderer.getNodeBox('b')!;
    const afterC = renderer.getNodeBox('c')!;
    // b left the column under a and joined the one under c.
    expect(afterB.x).not.toBe(beforeB.x);
    expect(Math.abs(afterB.x - afterC.x)).toBeLessThan(Math.abs(afterB.x - renderer.getNodeBox('a')!.x));
    expect(afterB.y).toBeGreaterThan(afterC.y);
    expect(internals.data.reportLines).toContainEqual({
      fromId: 'c',
      toId: 'b',
      kind: 'admin',
    });

    diagram.destroy();
    container.remove();
  });

  it('row 24: a render that draws nothing puts the data back', async () => {
    const failures: string[] = [];
    const container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '700px';
    document.body.appendChild(container);
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: treeData(),
      staffCurrentOrgId: 'org1',
      useWorker: false,
      callbacks: { onRenderFailed: (f) => failures.push(f.reason) },
    });
    const internals = diagram as unknown as Internals;
    const before = internals.data.reportLines;

    // Break the render the way a layout failure would, then ask for the edit.
    const renderer = internals.host.renderer as unknown as {
      render: (...args: unknown[]) => Promise<void>;
    };
    renderer.render = () => Promise.reject(new Error('layout exploded'));

    await expect(diagram.reparentPosition('b', 'c')).rejects.toThrow('layout exploded');

    // The diagram must not describe a reporting line it never drew (T97).
    expect(internals.data.reportLines).toBe(before);
    expect(failures).toContain('layout exploded');

    diagram.destroy();
    container.remove();
  });

  it('row 13: below the near band the gesture pans instead of re-parenting', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));
    const grabbed = nodeFor('b');
    const target = nodeFor('c').box;

    // farMax is 0.45 — well below it there is no card to aim at.
    diagram.setZoom(0.2);
    await new Promise((r) => setTimeout(r, 120));

    dragOnto(toGlobal, grabbed, target);
    await new Promise((r) => setTimeout(r, 120));

    expect(patches).toHaveLength(0);
    diagram.destroy();
    container.remove();
  });

  it('row 4: dropping on the manager it already has emits nothing', async () => {
    const patches: LayoutPatch[] = [];
    const { container, diagram, renderer, nodeFor, toGlobal } = await mountTree((p) => patches.push(p));

    const dragged = nodeFor('b');
    dragOnto(toGlobal, dragged, nodeFor('a').box, false);
    expect(renderer.lastDropPreview).toMatchObject({ targetId: 'a', valid: false });
    dragged.node.emit('pointerup', pointerEvent({ x: 0, y: 0 }));
    await new Promise((r) => setTimeout(r, 120));

    expect(patches).toHaveLength(0);
    diagram.destroy();
    container.remove();
  });
});
