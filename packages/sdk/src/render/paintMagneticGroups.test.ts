import { describe, expect, it } from 'vitest';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import type { ContourMemberBox } from './contourClearance.js';

const CELL = 100;
const cell = (positionId: string, col: number, row: number): ContourMemberBox => ({
  positionId,
  x: col * CELL,
  y: row * CELL,
  width: 80,
  height: 60,
});

function ringCovers(ring: readonly { x: number; y: number }[], p: { x: number; y: number }): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y) {
      const x = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < x) inside = !inside;
    }
  }
  return inside;
}

const centerOf = (b: ContourMemberBox) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** IT owns the row; CEO sits between two IT cards, inside the component bbox. */
function scene() {
  const it = [cell('P1', 0, 0), cell('P2', 1, 0), cell('P3', 2, 0)];
  const ceo = cell('P4', 1, 1);
  const itWithBelow = [...it, cell('P5', 0, 1)];
  return { it, ceo, itWithBelow };
}

describe('paintMagneticGroups (G2 / M2)', () => {
  const base = {
    magnetRadius: 1.5,
    strokeWidth: 1,
    paddingCells: 0,
    smoothIterations: 0,
    minContourMembers: 1,
  };

  it('success: a foreign card inside the component bbox is not covered (M2)', () => {
    const { itWithBelow, ceo } = scene();
    const groups = paintMagneticGroups({
      ...base,
      inputs: [
        { id: 'P1', departmentId: 'IT', col: 0, row: 0 },
        { id: 'P2', departmentId: 'IT', col: 1, row: 0 },
        { id: 'P3', departmentId: 'IT', col: 2, row: 0 },
        { id: 'P5', departmentId: 'IT', col: 0, row: 1 },
        { id: 'P4', departmentId: 'CEO', col: 1, row: 1 },
      ],
      memberBoxesByDept: new Map([
        ['IT', itWithBelow],
        ['CEO', [ceo]],
      ]),
      departmentIds: ['CEO', 'IT'],
      personCounts: new Map([
        ['IT', 4],
        ['CEO', 1],
      ]),
    });

    const itRings = groups.filter((g) => g.departmentId === 'IT').map((g) => g.ring);
    expect(itRings.length).toBeGreaterThan(0);
    for (const ring of itRings) {
      expect(ringCovers(ring, centerOf(ceo))).toBe(false);
    }
    // Own cards stay covered.
    expect(itRings.some((r) => ringCovers(r, centerOf(itWithBelow[0]!)))).toBe(true);
    expect(itRings.some((r) => ringCovers(r, centerOf(itWithBelow[2]!)))).toBe(true);
  });

  it('success: no foreign card inside the bbox keeps the plain button-group ring', () => {
    const { it } = scene();
    const groups = paintMagneticGroups({
      ...base,
      inputs: [
        { id: 'P1', departmentId: 'IT', col: 0, row: 0 },
        { id: 'P2', departmentId: 'IT', col: 1, row: 0 },
        { id: 'P3', departmentId: 'IT', col: 2, row: 0 },
      ],
      memberBoxesByDept: new Map([['IT', it]]),
      departmentIds: ['IT'],
      personCounts: new Map([['IT', 3]]),
    });
    expect(groups).toHaveLength(1);
    for (const card of it) {
      expect(ringCovers(groups[0]!.ring, centerOf(card))).toBe(true);
    }
  });

  it('failure: a department under minContourMembers paints nothing', () => {
    const { ceo } = scene();
    const groups = paintMagneticGroups({
      ...base,
      minContourMembers: 2,
      inputs: [{ id: 'P4', departmentId: 'CEO', col: 1, row: 1 }],
      memberBoxesByDept: new Map([['CEO', [ceo]]]),
      departmentIds: ['CEO'],
      personCounts: new Map([['CEO', 1]]),
    });
    expect(groups).toEqual([]);
  });
});
