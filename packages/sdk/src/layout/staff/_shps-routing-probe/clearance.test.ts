import { describe, expect, it } from '@rstest/core';
import { cardClearance, segRectDistance, svgSerializable, throughThirdFrame } from './clearance.js';
import type { RouteOutput } from './probeTypes.js';

const box = (id: string, x: number, y: number, w = 100, h = 100) => ({ id, x, y, w, h });

describe('clearance — вимір 8px / крізь-рамку (контрольні проби)', () => {
  it('control: segRectDistance 0 when inside', () => {
    expect(segRectDistance({ x: 50, y: 50 }, { x: 60, y: 60 }, box('b', 0, 0))).toBe(0);
  });

  it('control: exact distance to side', () => {
    // Сегмент вертикальний на x=110, картка [0..100]; відстань = 10.
    expect(segRectDistance({ x: 110, y: 10 }, { x: 110, y: 90 }, box('b', 0, 0))).toBeCloseTo(10, 5);
  });

  // КОНТРОЛЬНА ПРОБА: лінія за 7px від чужої картки → порушення (<8px).
  it('control: line 7px from a foreign card → violation', () => {
    const out: RouteOutput = {
      nodes: [box('card', 0, 0)],
      deptFrames: [],
      edges: [{ fromId: 'x', toId: 'y', kind: 'admin', points: [{ x: 107, y: 0 }, { x: 107, y: 100 }] }],
    };
    const r = cardClearance(out);
    expect(r.minClearance).toBeCloseTo(7, 5);
    expect(r.violations).toBeGreaterThan(0);
  });

  // КОНТРОЛЬНА ПРОБА: лінія за 9px → чисто.
  it('control: line 9px from a foreign card → clean', () => {
    const out: RouteOutput = {
      nodes: [box('card', 0, 0)],
      deptFrames: [],
      edges: [{ fromId: 'x', toId: 'y', kind: 'admin', points: [{ x: 109, y: 0 }, { x: 109, y: 100 }] }],
    };
    expect(cardClearance(out).violations).toBe(0);
  });

  it('own from/to card is not counted against clearance', () => {
    const out: RouteOutput = {
      nodes: [box('card', 0, 0)],
      deptFrames: [],
      edges: [{ fromId: 'card', toId: 'y', kind: 'admin', points: [{ x: 50, y: 50 }, { x: 200, y: 50 }] }],
    };
    expect(cardClearance(out).violations).toBe(0); // from=card → пропущено
  });

  // КОНТРОЛЬНА ПРОБА: ребро крізь рамку третього департаменту → фіксується.
  it('control: edge through third dept frame → counted', () => {
    const out: RouteOutput = {
      nodes: [],
      deptFrames: [box('A', 0, 0), box('B', 400, 0), box('C', 200, 0)],
      edges: [{ fromId: 'a1', toId: 'b1', kind: 'inter-dept', points: [{ x: 50, y: 50 }, { x: 450, y: 50 }] }],
    };
    const deptOf = (n: string) => (n === 'a1' ? 'A' : n === 'b1' ? 'B' : null);
    expect(throughThirdFrame(out, deptOf)).toBeGreaterThan(0); // проходить крізь C
  });

  it('edge within its own two frames does not count as through-third', () => {
    const out: RouteOutput = {
      nodes: [],
      deptFrames: [box('A', 0, 0), box('B', 400, 0)],
      edges: [{ fromId: 'a1', toId: 'b1', kind: 'inter-dept', points: [{ x: 50, y: 50 }, { x: 450, y: 50 }] }],
    };
    const deptOf = (n: string) => (n === 'a1' ? 'A' : 'B');
    expect(throughThirdFrame(out, deptOf)).toBe(0);
  });

  it('svgSerializable: valid polyline → true; single point → false', () => {
    expect(svgSerializable([{ fromId: 'a', toId: 'b', kind: 'admin', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }])).toBe(true);
    expect(svgSerializable([{ fromId: 'a', toId: 'b', kind: 'admin', points: [{ x: 0, y: 0 }] }])).toBe(false);
  });
});
