import { describe, expect, it } from '@rstest/core';
import {
  personFarDotRadius,
  personMidBandHeight,
  personVisualLocalRect,
  personVisualWorldRect,
} from './personVisualGeometry.js';
import { visualPersonEdgeBox } from './visualEdgeBox.js';

describe('personVisualGeometry', () => {
  it('success: mid band matches legacy formula', () => {
    expect(personMidBandHeight(156)).toBe(Math.min(156, Math.max(56, 156 * 0.48)));
    expect(personMidBandHeight(72)).toBe(56);
  });

  it('success: local near fills layout AABB', () => {
    expect(personVisualLocalRect(136, 156, 'near')).toEqual({
      x: 0,
      y: 0,
      width: 136,
      height: 156,
    });
  });

  it('success: local mid centers band vertically', () => {
    const mid = personVisualLocalRect(136, 156, 'mid');
    expect(mid.x).toBe(0);
    expect(mid.width).toBe(136);
    expect(mid.y).toBeCloseTo((156 - mid.height) / 2);
  });

  it('success: local far is centered dot box', () => {
    const far = personVisualLocalRect(136, 156, 'far');
    const r = personFarDotRadius(136, 156);
    expect(far.width).toBeCloseTo(r * 2);
    expect(far.x + far.width / 2).toBeCloseTo(68);
    expect(far.y + far.height / 2).toBeCloseTo(78);
  });

  it('success: world rect offsets local box', () => {
    const world = personVisualWorldRect({ id: 'p', x: 10, y: 20, width: 136, height: 156 }, 'mid');
    const local = personVisualLocalRect(136, 156, 'mid');
    expect(world.id).toBe('p');
    expect(world.x).toBe(10 + local.x);
    expect(world.y).toBe(20 + local.y);
    expect(world.width).toBe(local.width);
    expect(world.height).toBe(local.height);
  });

  it('success: visualPersonEdgeBox delegates to shared geometry', () => {
    const box = { id: 'p', x: 10, y: 20, width: 136, height: 156 };
    expect(visualPersonEdgeBox(box, 'mid')).toEqual(personVisualWorldRect(box, 'mid'));
  });
});
