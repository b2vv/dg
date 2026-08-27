import { describe, expect, it } from '@rstest/core';
import {
  mapContourPointToWorld,
  resolveContourWorldTransform,
} from './contourWorldTransform.js';

describe('contourWorldTransform', () => {
  it('success: gap=0 → translation only matches card inset origin', () => {
    const nodes = [{ id: 'a', x: 2, y: 22, width: 136, height: 156 }];
    const positions = new Map([['a', { gridCell: { col: 0, row: 0 } }]]);
    const t = resolveContourWorldTransform(nodes, positions, 140, 160, 140, 160);
    expect(t.originX).toBeCloseTo(0);
    expect(t.originY).toBeCloseTo(20); // 22 - insetY=(160-156)/2=2 → 20
    const p = mapContourPointToWorld(0, 0, t);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(20);
  });

  it('success: nonzero gap scales all columns (no single-sample drift)', () => {
    const cellW = 100;
    const cellH = 50;
    const gapX = 40;
    const gapY = 10;
    const pitchX = cellW + gapX;
    const pitchY = cellH + gapY;
    const cardW = 80;
    const cardH = 40;
    const insetX = (cellW - cardW) / 2;
    const insetY = (cellH - cardH) / 2;
    const marginY = 20;
    const nodes = [
      {
        id: 'c0',
        x: 0 * pitchX + insetX,
        y: 0 * pitchY + insetY + marginY,
        width: cardW,
        height: cardH,
      },
      {
        id: 'c2',
        x: 2 * pitchX + insetX,
        y: 1 * pitchY + insetY + marginY,
        width: cardW,
        height: cardH,
      },
    ];
    const positions = new Map([
      ['c0', { gridCell: { col: 0, row: 0 } }],
      ['c2', { gridCell: { col: 2, row: 1 } }],
    ]);
    // Sample first node only — transform must still place col 2 correctly.
    const t = resolveContourWorldTransform(nodes, positions, cellW, cellH, pitchX, pitchY);
    const leftCol2 = mapContourPointToWorld(2 * cellW, 1 * cellH, t);
    expect(leftCol2.x).toBeCloseTo(2 * pitchX);
    expect(leftCol2.y).toBeCloseTo(1 * pitchY + marginY);
    // Card at col2 should sit inset inside that cell
    expect(nodes[1]!.x).toBeCloseTo(leftCol2.x + insetX);
    expect(nodes[1]!.y).toBeCloseTo(leftCol2.y + insetY);
  });

  it('failure: no gridCell → identity origin at 0', () => {
    const t = resolveContourWorldTransform(
      [{ id: 'x', x: 9, y: 9, width: 10, height: 10 }],
      new Map([['x', {}]]),
      140,
      160,
      140,
      160,
    );
    expect(t.originX).toBe(0);
    expect(t.originY).toBe(0);
  });
});
