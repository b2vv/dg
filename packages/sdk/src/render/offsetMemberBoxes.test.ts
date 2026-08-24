import { describe, expect, it } from 'vitest';
import type { ContourMemberBox } from './contourClearance.js';
import { offsetMemberBoxesForGridMove } from './offsetMemberBoxes.js';

function box(id: string, x: number, y: number): ContourMemberBox {
  return { positionId: id, x, y, width: 100, height: 50 };
}

describe('offsetMemberBoxesForGridMove (T78-L6)', () => {
  it('success: matching box moves by delta cells × cell size', () => {
    const boxes = new Map<string, ContourMemberBox[]>([['d1', [box('p1', 10, 20), box('p2', 200, 20)]]]);
    const next = offsetMemberBoxesForGridMove(boxes, 'p1', 2, -1, 80, 40);
    expect(next.get('d1')![0]).toMatchObject({ positionId: 'p1', x: 170, y: -20, width: 100, height: 50 });
    expect(next.get('d1')![1]).toMatchObject({ positionId: 'p2', x: 200, y: 20 });
    expect(boxes.get('d1')![0]!.x).toBe(10);
  });

  it('failure: unknown positionId leaves coordinates unchanged', () => {
    const boxes = new Map<string, ContourMemberBox[]>([['d1', [box('p1', 10, 20)]]]);
    const next = offsetMemberBoxesForGridMove(boxes, 'missing', 3, 1, 80, 40);
    expect(next.get('d1')![0]).toEqual(box('p1', 10, 20));
  });

  it('failure: non-finite delta is a no-op', () => {
    const boxes = new Map<string, ContourMemberBox[]>([['d1', [box('p1', 10, 20)]]]);
    const next = offsetMemberBoxesForGridMove(boxes, 'p1', Number.NaN, 1, 80, 40);
    expect(next.get('d1')![0]!.x).toBe(10);
    expect(next.get('d1')![0]!.y).toBe(20);
  });
});
