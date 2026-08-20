import { describe, expect, it } from 'vitest';
import {
  resolvePromoteIds,
  screenRectInView,
  worldBoxToScreen,
} from './promoteMath.js';

describe('worldBoxToScreen', () => {
  it('success: applies scale then pan', () => {
    const screen = worldBoxToScreen(
      { x: 100, y: 50, width: 120, height: 64 },
      { x: 10, y: 20, scale: 2 },
    );
    expect(screen).toEqual({ left: 210, top: 120, width: 240, height: 128 });
  });

  it('failure: zero scale collapses size (still finite)', () => {
    const screen = worldBoxToScreen(
      { x: 10, y: 10, width: 100, height: 100 },
      { x: 0, y: 0, scale: 0 },
    );
    expect(screen.width).toBe(0);
    expect(screen.height).toBe(0);
  });
});

describe('resolvePromoteIds', () => {
  const selection = {
    id: 'pos1',
    kind: 'position' as const,
    positionId: 'pos1',
    personId: 'p1',
    organizationId: 'org1',
  };

  it('success: near-selection promotes when lod is near', () => {
    expect(
      resolvePromoteIds({ mode: 'near-selection', lod: 'near', selection }),
    ).toEqual(['pos1', 'p1', 'org1']);
  });

  it('failure: near-selection demotes when lod is mid/far', () => {
    expect(
      resolvePromoteIds({ mode: 'near-selection', lod: 'mid', selection }),
    ).toEqual([]);
    expect(
      resolvePromoteIds({ mode: 'near-selection', lod: 'far', selection }),
    ).toEqual([]);
  });

  it('failure: off / no selection → empty', () => {
    expect(resolvePromoteIds({ mode: 'off', lod: 'near', selection })).toEqual([]);
    expect(
      resolvePromoteIds({ mode: 'selection', lod: 'near', selection: null }),
    ).toEqual([]);
  });
});

describe('screenRectInView', () => {
  it('success: intersecting rect is in view', () => {
    expect(
      screenRectInView({ left: 100, top: 100, width: 50, height: 50 }, { width: 800, height: 600 }),
    ).toBe(true);
  });

  it('failure: fully off-screen is out of view', () => {
    expect(
      screenRectInView({ left: -400, top: -400, width: 10, height: 10 }, { width: 800, height: 600 }),
    ).toBe(false);
  });
});
