import { describe, expect, it } from '@rstest/core';
import { worldPointToScreen, roundedPathD } from './staffChromeGeometry.js';

const V = { x: 10, y: 20, scale: 2 } as const;

describe('worldPointToScreen', () => {
  it('scales then translates (matches worldBoxToScreen origin)', () => {
    expect(worldPointToScreen(5, 7, V)).toEqual({ x: 5 * 2 + 10, y: 7 * 2 + 20 });
  });
  it('identity viewport returns the point unchanged', () => {
    expect(worldPointToScreen(3, 4, { x: 0, y: 0, scale: 1 })).toEqual({ x: 3, y: 4 });
  });
});

describe('roundedPathD', () => {
  it('success: two points → straight move+line, no arc', () => {
    const d = roundedPathD(
      [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
      4,
    );
    expect(d).toBe('M0 0L0 10');
    expect(d).not.toContain('Q');
  });

  it('success: elbow (3 points) → rounded corner with a quadratic', () => {
    const d = roundedPathD(
      [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 20, y: 20 },
      ],
      4,
    );
    expect(d).toContain('Q'); // corner is rounded
    expect(d.startsWith('M0 0')).toBe(true);
    expect(d.endsWith('L20 20')).toBe(true);
  });

  it('corner radius is clamped to half the shorter adjacent segment', () => {
    // segments length 2 each → radius clamped to 1, not the requested 4.
    const d = roundedPathD(
      [
        { x: 0, y: 0 },
        { x: 0, y: 2 },
        { x: 2, y: 2 },
      ],
      4,
    );
    // approach point = (0, 2-1)=(0,1); exit point = (0+1,2)=(1,2)
    expect(d).toBe('M0 0L0 1Q0 2 1 2L2 2');
  });

  it('failure/boundary: empty points → empty string, single point → just a move', () => {
    expect(roundedPathD([], 4)).toBe('');
    expect(roundedPathD([{ x: 3, y: 5 }], 4)).toBe('M3 5');
  });

  it('failure/boundary: zero-length segment does not divide by zero', () => {
    const d = roundedPathD(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 }, // duplicate (zero-length into corner)
        { x: 5, y: 0 },
      ],
      4,
    );
    expect(d).not.toContain('NaN');
    expect(d.endsWith('L5 0')).toBe(true);
  });
});
