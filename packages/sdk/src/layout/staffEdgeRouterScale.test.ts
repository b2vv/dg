import { describe, expect, it } from '@rstest/core';
import { buildStaffEdgeSegments } from './staffEdgeGeometry.js';
import type { StaffEdgeBox, StaffEdgeLink } from './staffEdgeGeometry.js';

/**
 * The router's cost has to follow edge *length*, not the size of the wall.
 *
 * `classifyStaffEdgeRoute` checks every candidate route against the other cards,
 * and the y-sorted index exists so an edge only pays for the band it crosses.
 * Lose the index and this stays correct while going quadratic — which is how it
 * shipped: 855ms of a 1.2s render on a four-thousand-seat window.
 *
 * The assertion is a ratio measured in one process rather than a millisecond
 * threshold, because a threshold measures the machine. Observed ratio when this
 * was written: 38×, against the 4× asserted.
 */
const COLS = 24;
const PITCH_X = 288;
const PITCH_Y = 88;

function wall(n: number): StaffEdgeBox[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `pos-${i}`,
    x: (i % COLS) * PITCH_X,
    y: Math.floor(i / COLS) * PITCH_Y,
    width: 248,
    height: 44,
  }));
}

/** Every seat reports to one head: each edge crosses the whole wall. */
function star(n: number): StaffEdgeLink[] {
  return Array.from({ length: n - 1 }, (_, k) => ({
    fromId: 'pos-0',
    toId: `pos-${k + 1}`,
    kind: 'admin' as const,
  }));
}

/** Managers head their own block of eight, so every edge stays in one band. */
function localTree(n: number, fanout = 8): StaffEdgeLink[] {
  const out: StaffEdgeLink[] = [];
  for (let i = 1; i < n; i += 1) {
    const parent = Math.floor(i / fanout) * fanout;
    if (parent !== i) out.push({ fromId: `pos-${parent}`, toId: `pos-${i}`, kind: 'admin' });
  }
  return out;
}

/** Best of two runs — the first pays for the index and the JIT. */
function bestMs(edges: StaffEdgeLink[], boxes: StaffEdgeBox[]): number {
  let best = Infinity;
  for (let run = 0; run < 2; run += 1) {
    // A fresh array each run: the index is cached on the array's identity.
    const obstacles = [...boxes];
    const t0 = performance.now();
    buildStaffEdgeSegments(edges, obstacles);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}

describe('staff edge router scale', () => {
  it('success: a local hierarchy does not pay for the whole wall', () => {
    const boxes = wall(4000);
    const localMs = bestMs(localTree(4000), boxes);
    const starMs = bestMs(star(4000), boxes);
    expect(starMs / Math.max(localMs, 0.01)).toBeGreaterThan(4);
  });

  it('failure: the index does not optimise a blocked path into a straight one', () => {
    // Two cards in the same column with a third squarely between them: the
    // direct vertical is unavailable, so the route has to leave the column.
    const boxes: StaffEdgeBox[] = [
      { id: 'a', x: 0, y: 0, width: 100, height: 40 },
      { id: 'blocker', x: 0, y: 100, width: 100, height: 40 },
      { id: 'b', x: 0, y: 200, width: 100, height: 40 },
    ];
    const [seg] = buildStaffEdgeSegments([{ fromId: 'a', toId: 'b', kind: 'admin' }], boxes);
    expect(seg).toBeDefined();
    expect(seg!.points.length).toBeGreaterThan(2);
    expect(seg!.points.some((p) => p.x < 0 || p.x > 100)).toBe(true);
  });
});
