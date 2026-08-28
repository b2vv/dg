import { describe, expect, it } from '@rstest/core';
import {
  resolvePromoteIds,
  nearVisibleGateOpen,
  pickNearestToCenter,
  screenRectInView,
  worldBoxToScreen,
  nodeEntityKey,
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

  it('success: near-selection promotes the one visual card', () => {
    expect(
      resolvePromoteIds({ mode: 'near-selection', lod: 'near', selection }),
    ).toEqual([nodeEntityKey('position', 'pos1')]);
  });

  it('success: person selection promotes the position visual, not org+person aliases', () => {
    expect(
      resolvePromoteIds({
        mode: 'selection',
        lod: 'mid',
        selection: {
          id: 'p1',
          kind: 'person',
          positionId: 'pos1',
          personId: 'p1',
          organizationId: 'org1',
        },
      }),
    ).toEqual([nodeEntityKey('position', 'pos1')]);
  });

  it('success: organization selection promotes only the org card', () => {
    expect(
      resolvePromoteIds({
        mode: 'selection',
        lod: 'near',
        selection: { id: 'org1', kind: 'organization', organizationId: 'org1' },
      }),
    ).toEqual([nodeEntityKey('organization', 'org1')]);
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

describe('nearVisibleGateOpen', () => {
  it('success: open at near — the band the user called "beauty"', () => {
    expect(nearVisibleGateOpen('near')).toBe(true);
  });

  it('failure: closed at mid and far, where cards are schematic anyway', () => {
    expect(nearVisibleGateOpen('mid')).toBe(false);
    expect(nearVisibleGateOpen('far')).toBe(false);
  });
});

describe('near-visible does not go through the selection resolver', () => {
  // The resolver has no candidates on its input (ResolvePromoteIdsArgs carries
  // mode/lod/selection only), so it cannot answer "which cards are visible".
  // Asking it anyway must promote nothing rather than quietly promote the
  // selection — a wrong single card is harder to notice than an empty layer.
  it('failure: resolvePromoteIds promotes nothing in near-visible mode', () => {
    expect(
      resolvePromoteIds({
        mode: 'near-visible',
        lod: 'near',
        selection: { id: 'pos1', kind: 'position', positionId: 'pos1' },
      }),
    ).toEqual([]);
  });

  it('success: the selection modes are untouched by the new mode', () => {
    expect(
      resolvePromoteIds({
        mode: 'near-selection',
        lod: 'near',
        selection: { id: 'pos1', kind: 'position', positionId: 'pos1' },
      }),
    ).toEqual([nodeEntityKey('position', 'pos1')]);
    expect(
      resolvePromoteIds({
        mode: 'near-selection',
        lod: 'mid',
        selection: { id: 'pos1', kind: 'position', positionId: 'pos1' },
      }),
    ).toEqual([]);
  });
});

describe('pickNearestToCenter', () => {
  const screen = { width: 800, height: 600 };
  /** 44 cards in a row across the screen — the count measured at the near threshold. */
  const cards = Array.from({ length: 44 }, (_, i) => ({
    id: `c${i}`,
    screenRect: { left: i * 20 - 40, top: 280, width: 16, height: 40 },
  }));

  it('success: a cap of 5 keeps five, and they are the five nearest the centre', () => {
    const kept = pickNearestToCenter(cards, screen, 5);
    expect(kept).toHaveLength(5);
    // Screen centre is x=400; card i has centre 20i - 32, so i=21.6 is nearest.
    expect(kept.map((c) => c.id).sort()).toEqual(['c20', 'c21', 'c22', 'c23', 'c24'].sort());
  });

  it('success: no cap keeps everything — the default is no ceiling', () => {
    expect(pickNearestToCenter(cards, screen, undefined)).toHaveLength(44);
  });

  it('failure: a cap of zero promotes nothing, leaving every node on the canvas', () => {
    expect(pickNearestToCenter(cards, screen, 0)).toHaveLength(0);
  });

  it('failure: out-of-range caps fall back to no ceiling rather than to silence', () => {
    // A host that passes nonsense gets the working default, not a feature that
    // quietly does nothing — an empty layer is the harder failure to diagnose.
    expect(pickNearestToCenter(cards, screen, -1)).toHaveLength(44);
    expect(pickNearestToCenter(cards, screen, Number.NaN)).toHaveLength(44);
    expect(pickNearestToCenter(cards, screen, Number.POSITIVE_INFINITY)).toHaveLength(44);
  });

  it('success: a fractional cap rounds down', () => {
    expect(pickNearestToCenter(cards, screen, 2.5)).toHaveLength(2);
  });

  it('success: a cap larger than the input keeps the input, and keeps its order', () => {
    const three = cards.slice(0, 3);
    expect(pickNearestToCenter(three, screen, 99)).toEqual(three);
  });

  it('success: ties keep their original order, so the layer does not reshuffle', () => {
    // Two cards mirrored about the centre are exactly as far from it.
    const mirrored = [
      { id: 'right', screenRect: { left: 500, top: 280, width: 20, height: 20 } },
      { id: 'left', screenRect: { left: 280, top: 280, width: 20, height: 20 } },
    ];
    expect(pickNearestToCenter(mirrored, screen, 1).map((c) => c.id)).toEqual(['right']);
  });
});
