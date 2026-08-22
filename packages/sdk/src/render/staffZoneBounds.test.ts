import { describe, expect, it } from 'vitest';
import {
  enrichStaffTierBands,
  unionBoxes,
  worldBoundsForTier,
} from './staffZoneBounds.js';
import type { StaffNodeBox, StaffTierBand } from '../layout/staff/types.js';

function box(
  id: string,
  org: string,
  x: number,
  y: number,
  tier: 1 | 2 | 3 = 2,
): StaffNodeBox {
  return { id, organizationId: org, x, y, width: 100, height: 50, tier };
}

describe('staffZoneBounds', () => {
  it('success: staff-block bounds union nodes for org+tier', () => {
    const tier: StaffTierBand = {
      tier: 2,
      kind: 'staff-block',
      y: 40,
      height: 200,
      organizationId: 'org1',
    };
    const nodes = [box('a', 'org1', 10, 50), box('b', 'org1', 130, 60)];
    const r = worldBoundsForTier(tier, nodes, [], { margin: 32 });
    expect(r.y).toBe(40);
    expect(r.height).toBe(200);
    expect(r.x).toBe(10 - 16);
    expect(r.width).toBe(130 + 100 - 10 + 32);
  });

  it('success: enrich adds label from organizations', () => {
    const tiers: StaffTierBand[] = [
      { tier: 2, kind: 'staff-block', y: 0, height: 100, organizationId: 'org1' },
    ];
    const nodes = [box('a', 'org1', 0, 0)];
    const next = enrichStaffTierBands(tiers, nodes, [], [{ id: 'org1', name: 'Ops', groupIds: [] }], {
      margin: 8,
      canvasWidth: 400,
    });
    expect(next[0]?.label).toBe('Ops');
    expect(next[0]?.width).toBeGreaterThan(0);
  });

  it('success: unionBoxes with padding', () => {
    const u = unionBoxes(
      [
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 5, width: 10, height: 10 },
      ],
      2,
    );
    expect(u).toEqual({ x: -2, y: -2, width: 34, height: 19 });
  });

  it('failure: empty nodes still returns band y/height', () => {
    const tier: StaffTierBand = {
      tier: 1,
      kind: 'staff-block',
      y: 12,
      height: 64,
      organizationId: 'missing',
    };
    const r = worldBoundsForTier(tier, [], [], { margin: 10, canvasWidth: 200 });
    expect(r).toEqual({ x: 10, y: 12, width: 180, height: 64 });
  });
});
