import { describe, expect, it } from '@rstest/core';
import type { NodeWorldBox } from './SceneRegistry.js';
import { boxesIntersectRect, isDrag, rectFromDrag } from './marquee.js';

describe('rectFromDrag', () => {
  it.each([
    [2, 3, 12, 23],
    [12, 3, 2, 23],
    [2, 23, 12, 3],
    [12, 23, 2, 3],
  ])('success: normalizes direction from (%s, %s) to (%s, %s)', (x, y, endX, endY) => {
    expect(rectFromDrag({ x, y }, { x: endX, y: endY })).toEqual({
      x: 2, y: 3, width: 10, height: 20,
    });
  });

  it('failure boundary: stationary pointer produces a zero-area rectangle', () => {
    expect(rectFromDrag({ x: -5, y: 8 }, { x: -5, y: 8 })).toEqual({
      x: -5, y: 8, width: 0, height: 0,
    });
  });

  it('success: preserves one-unit dimensions and negative world coordinates', () => {
    expect(rectFromDrag({ x: -2, y: -3 }, { x: -3, y: -4 })).toEqual({
      x: -3, y: -4, width: 1, height: 1,
    });
  });
});

describe('boxesIntersectRect', () => {
  const rect = { x: 10, y: 20, width: 20, height: 30 };

  it('success: selects partial overlap and fully inside boxes in input order', () => {
    const boxes: readonly NodeWorldBox[] = [
      { id: 'partial', kind: 'person', x: 5, y: 15, width: 10, height: 10 },
      { id: 'inside', kind: 'organization', x: 15, y: 25, width: 5, height: 5 },
      { id: 'surrounding', kind: 'position', x: 0, y: 0, width: 100, height: 100 },
    ];
    expect(boxesIntersectRect(boxes, rect)).toEqual(['partial', 'inside', 'surrounding']);
  });

  it.each([
    ['left', 0, 25, 9, 5],
    ['right', 31, 25, 5, 5],
    ['above', 15, 0, 5, 19],
    ['below', 15, 51, 5, 5],
  ])('failure: excludes a box fully %s of the rectangle', (id, x, y, width, height) => {
    expect(boxesIntersectRect([{ id, kind: 'position', x, y, width, height }], rect)).toEqual([]);
  });

  it.each([
    ['left', 0, 25, 10, 5],
    ['right', 30, 25, 5, 5],
    ['top', 15, 10, 5, 10],
    ['bottom', 15, 50, 5, 5],
    ['corner', 30, 50, 5, 5],
  ])('success boundary: includes exact %s contact', (id, x, y, width, height) => {
    expect(boxesIntersectRect([{ id, kind: 'position', x, y, width, height }], rect)).toEqual([id]);
  });

  it('failure: empty boxes return no ids', () => {
    expect(boxesIntersectRect([], rect)).toEqual([]);
  });

  it('success: a covering rectangle selects every box regardless of kind', () => {
    const boxes: readonly NodeWorldBox[] = [
      { id: 'p', kind: 'person', x: -4, y: -3, width: 1, height: 1 },
      { id: 'o', kind: 'organization', x: 5, y: 6, width: 2, height: 3 },
      { id: 's', kind: 'position', x: 10, y: 10, width: 5, height: 5 },
    ];
    expect(boxesIntersectRect(boxes, { x: -10, y: -10, width: 30, height: 30 })).toEqual(['p', 'o', 's']);
  });

  it.each([
    [10, 20, 0, 0, ['box']],
    [9, 19, 0, 0, []],
    [9, 19, 1, 1, ['box']],
    [10, 15, 0, 10, ['box']],
    [5, 20, 10, 0, ['box']],
  ])('boundary: rectangle (%s, %s, %s, %s)', (x, y, width, height, ids) => {
    expect(boxesIntersectRect([
      { id: 'box', kind: 'person', x: 10, y: 20, width: 5, height: 5 },
    ], { x, y, width, height })).toEqual(ids);
  });
});

describe('isDrag', () => {
  it.each([
    [10, 20, false],
    [13, 20, false],
    [14, 20, false],
    [15, 20, true],
    [10, 25, true],
    [7, 17, true],
    [12, 22, false],
  ])('classifies pointer (%s, %s) with the default 4px threshold', (x, y, expected) => {
    expect(isDrag({ x: 10, y: 20 }, { x, y })).toBe(expected);
  });

  it('success: honors a custom threshold and its exact boundary', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 6, y: 8 }, 10)).toBe(false);
    expect(isDrag({ x: 0, y: 0 }, { x: 6, y: 8 }, 9)).toBe(true);
  });
});
