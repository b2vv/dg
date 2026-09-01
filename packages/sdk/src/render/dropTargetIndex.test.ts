import { describe, expect, it } from '@rstest/core';
import { DropTargetIndex, distanceToRect } from './dropTargetIndex.js';
import type { NodeWorldBox } from './SceneRegistry.js';

/** T91 rows 14-15 — finding the drop target without walking the scene. */

const W = 100;
const H = 40;
const PITCH_X = 140;
const PITCH_Y = 80;

const box = (id: string, col: number, row: number): NodeWorldBox => ({
  id,
  kind: 'position',
  x: col * PITCH_X,
  y: row * PITCH_Y,
  width: W,
  height: H,
});

/** A wall `cols × rows` of cards on the scene pitch. */
function wall(cols: number, rows: number): NodeWorldBox[] {
  const out: NodeWorldBox[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) out.push(box(`p-${r}-${c}`, c, r));
  }
  return out;
}

const indexOf = (boxes: NodeWorldBox[]) => new DropTargetIndex(boxes, PITCH_X, PITCH_Y);

describe('drop target index (T91 rows 14-15)', () => {
  it('finds the card under the pointer', () => {
    const idx = indexOf(wall(10, 10));
    expect(idx.at(3 * PITCH_X + 5, 4 * PITCH_Y + 5)?.id).toBe('p-4-3');
  });

  it('answers nothing in the gap between cards', () => {
    const idx = indexOf(wall(10, 10));
    // Just past the right edge of a card, well inside the gap to the next.
    expect(idx.at(3 * PITCH_X + W + 10, 4 * PITCH_Y + 5)).toBeUndefined();
  });

  it('row 14: the work per lookup does not grow with the scene', () => {
    const small = indexOf(wall(5, 5)); // 25 cards
    const large = indexOf(wall(100, 100)); // 10 000 cards

    small.nearest(3 * PITCH_X + 5, 3 * PITCH_Y + 5, 40);
    large.nearest(3 * PITCH_X + 5, 3 * PITCH_Y + 5, 40);

    // The same pointer, 400× the scene: the number of boxes examined must not
    // follow. A full walk would read 25 and 10 000 here.
    expect(large.probed).toBe(small.probed);
    expect(large.probed).toBeLessThan(25);
  });

  it('row 14: even the biggest wall stays a handful of tests', () => {
    const idx = indexOf(wall(200, 200)); // 40 000 cards
    idx.nearest(50 * PITCH_X + 5, 50 * PITCH_Y + 5, 40);
    expect(idx.probed).toBeLessThan(25);
  });

  it('row 15: a pointer just outside a card still catches it', () => {
    const idx = indexOf(wall(10, 10));
    const target = box('p-4-3', 3, 4);
    // 12px past the right edge — outside, but within a 40px magnet.
    const hit = idx.nearest(target.x + W + 12, target.y + 5, 40);
    expect(hit?.id).toBe('p-4-3');
  });

  it('row 15: beyond the radius it catches nothing', () => {
    const idx = indexOf([box('only', 0, 0)]);
    expect(idx.nearest(W + 100, 5, 40)).toBeUndefined();
  });

  it('row 15: of two candidates the nearer wins', () => {
    const left = box('left', 0, 0);
    const right = box('right', 1, 0);
    const idx = indexOf([left, right]);
    // In the gap, but closer to the left card's right edge.
    const x = left.x + W + 8;
    expect(idx.nearest(x, 5, 200)?.id).toBe('left');
    expect(idx.nearest(right.x - 8, 5, 200)?.id).toBe('right');
  });

  it('skips the dragged card itself, even when the pointer is over it', () => {
    const idx = indexOf(wall(3, 3));
    expect(idx.nearest(PITCH_X + 5, 5, 0, 'p-0-1')).toBeUndefined();
  });

  it('a card wider than a bucket is still found across all of it', () => {
    const wide: NodeWorldBox = {
      id: 'wide',
      kind: 'position',
      x: 0,
      y: 0,
      width: PITCH_X * 3 + 20,
      height: H,
    };
    const idx = indexOf([wide]);
    expect(idx.at(PITCH_X * 3 + 10, 5)?.id).toBe('wide');
  });

  it('a degenerate pitch does not collapse everything into one bucket', () => {
    // Guard for the day a scene reports a zero pitch: falling back to 1 keeps
    // lookups bounded instead of silently restoring the full walk.
    const idx = new DropTargetIndex(wall(20, 20), 0, 0);
    idx.nearest(3 * PITCH_X + 5, 3 * PITCH_Y + 5, 10);
    expect(idx.probed).toBeLessThan(400);
  });

  it('distance is measured to the rectangle, not its centre', () => {
    const b = box('b', 0, 0);
    expect(distanceToRect(b.x + 5, b.y + 5, b)).toBe(0);
    expect(distanceToRect(b.x + W + 3, b.y + 5, b)).toBeCloseTo(3);
    expect(distanceToRect(b.x - 3, b.y - 4, b)).toBeCloseTo(5);
  });
});
