import { Container } from 'pixi.js';
import { describe, expect, it, rstest } from '@rstest/core';
import { DoubleTapTracker } from '../interaction/doubleTap.js';
import { PersonInteractions, type DragGrid } from './personInteractions.js';
import { defaultRenderConfig } from './types.js';
import type { PersonNodeView } from './PersonNode.js';

const GRID: DragGrid = {
  pitchX: 164,
  pitchY: 188,
  originX: 40,
  originY: 24,
  insetX: 2,
  insetY: 2,
};

/** Stand-in for the seat view: a positioned container that records listeners. */
function fakeSeat(chrome: { isChrome?: boolean } = {}) {
  const listeners = new Map<string, (e: never) => void>();
  const node = new Container();
  node.position.set(GRID.originX + GRID.insetX, GRID.originY + GRID.insetY);
  Object.assign(node, {
    activateChromePointer: () => false,
    isChromePointer: () => chrome.isChrome === true,
    on(event: string, fn: (e: never) => void) {
      listeners.set(event, fn);
      return node;
    },
  });
  const fire = (event: string, e: Record<string, unknown> = {}) =>
    listeners.get(event)?.({
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
      global: { x: 0, y: 0 },
      stopPropagation: () => {},
      preventDefault: () => {},
      ...e,
    } as never);
  return { node: node as unknown as PersonNodeView, fire, raw: node };
}

function harness(grid: DragGrid | null = GRID) {
  const personLayer = new Container();
  const previews: Array<[string, number, number]> = [];
  const restores: number[] = [];
  const boxes: string[] = [];
  const paints: number[] = [];
  const interactions = new PersonInteractions({
    personLayer,
    doubleTap: new DoubleTapTracker(),
    rememberBox: (box) => boxes.push(box.id),
    dragGrid: () => grid,
    // These tests are about the drag itself, so they run in the band where the
    // drag is offered at all.
    currentLod: () => 'near' as const,
    previewDrag: (id, col, row) => previews.push([id, col, row]),
    restoreContours: () => restores.push(1),
    requestPaint: () => paints.push(1),
    // This harness exercises the `move` mode only, so the re-parent seams are
    // inert here — `personReparent.contract.test.ts` drives them for real.
    dropTargetAt: () => undefined,
    canDropOn: () => false,
    showDropPreview: () => {},
    clearDropPreview: () => {},
  });
  return { interactions, previews, restores, boxes, paints };
}

const bindArgs = (options: Record<string, unknown>) => ({
  personId: 'per1',
  positionId: 'pos1',
  box: { id: 'pos1', kind: 'position' as const, x: 42, y: 26, width: 160, height: 184 },
  config: defaultRenderConfig,
  options,
  gridCell: { col: 0, row: 0 },
});

describe('PersonInteractions', () => {
  it('success: binding remembers the seat box for hit-testing later', () => {
    const h = harness();
    const seat = fakeSeat();
    h.interactions.bind(seat.node, bindArgs({}));
    expect(h.boxes).toEqual(['pos1']);
  });

  it('success: a click without movement selects and never reports a drop', () => {
    const h = harness();
    const seat = fakeSeat();
    const onPersonClick = rstest.fn();
    const onPersonDragEnd = rstest.fn();
    h.interactions.bind(seat.node, bindArgs({ onPersonClick, onPersonDragEnd }));

    seat.fire('pointerdown', { global: { x: 50, y: 30 } });
    seat.fire('pointerup');
    seat.fire('pointertap');

    expect(onPersonClick).toHaveBeenCalledWith('per1', 'pos1', expect.anything());
    expect(onPersonDragEnd).not.toHaveBeenCalled();
    expect(h.previews).toEqual([]);
  });

  it('success: dragging previews the contour once per cell and drops on the snapped cell', () => {
    const h = harness();
    const seat = fakeSeat();
    const onPersonDragEnd = rstest.fn();
    h.interactions.bind(seat.node, bindArgs({ onPersonDragEnd }));

    seat.fire('pointerdown', { global: { x: 42, y: 26 } });
    // Two moves inside the same target cell → one preview.
    seat.fire('globalpointermove', { global: { x: 42 + GRID.pitchX, y: 26 } });
    seat.fire('globalpointermove', { global: { x: 44 + GRID.pitchX, y: 26 } });
    seat.fire('pointerup');

    expect(h.previews).toEqual([['pos1', 1, 0]]);
    expect(onPersonDragEnd).toHaveBeenCalledWith('pos1', 1, 0);

    // Nothing paints by itself since T84: a card that moved and never asked for
    // a paint would slide only inside the scene graph, not on screen.
    expect(h.paints.length).toBeGreaterThan(0);
  });

  it('failure: a drop outside the grid restores the contours and returns the card', () => {
    const h = harness();
    const seat = fakeSeat();
    const onPersonDragEnd = rstest.fn();
    h.interactions.bind(seat.node, bindArgs({ onPersonDragEnd }));

    seat.fire('pointerdown', { global: { x: 42, y: 26 } });
    seat.fire('globalpointermove', { global: { x: -900, y: -900 } });
    seat.fire('pointerup');

    expect(onPersonDragEnd).not.toHaveBeenCalled();
    expect(h.restores).toEqual([1]);
    expect(seat.raw.x).toBe(GRID.originX + GRID.insetX);
  });

  it('failure: a pointer that started on card chrome never begins a drag', () => {
    const h = harness();
    const seat = fakeSeat({ isChrome: true });
    const onPersonDragEnd = rstest.fn();
    h.interactions.bind(seat.node, bindArgs({ onPersonDragEnd }));

    seat.fire('pointerdown', { global: { x: 42, y: 26 } });
    seat.fire('globalpointermove', { global: { x: 42 + GRID.pitchX, y: 26 } });
    seat.fire('pointerup');

    expect(h.previews).toEqual([]);
    expect(onPersonDragEnd).not.toHaveBeenCalled();
  });

  it('failure: reset drops an in-flight drag, so the old card cannot finish it', () => {
    const h = harness();
    const seat = fakeSeat();
    const onPersonDragEnd = rstest.fn();
    h.interactions.bind(seat.node, bindArgs({ onPersonDragEnd }));

    seat.fire('pointerdown', { global: { x: 42, y: 26 } });
    seat.fire('globalpointermove', { global: { x: 42 + GRID.pitchX, y: 26 } });
    h.interactions.reset();
    seat.fire('pointerup');

    expect(onPersonDragEnd).not.toHaveBeenCalled();
  });
});
