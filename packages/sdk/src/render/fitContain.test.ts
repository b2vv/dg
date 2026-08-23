import { describe, expect, it } from 'vitest';
import { fitContain } from './fitContain.js';

describe('fitContain', () => {
  it('success: wide texture fits width, letterboxes vertically', () => {
    const r = fitContain(400, 200, 36, 36);
    expect(r.width).toBe(36);
    expect(r.height).toBe(18);
    expect(r.offsetX).toBe(0);
    expect(r.offsetY).toBe(9);
  });

  it('success: tall texture fits height, letterboxes horizontally', () => {
    const r = fitContain(200, 400, 36, 36);
    expect(r.width).toBe(18);
    expect(r.height).toBe(36);
    expect(r.offsetX).toBe(9);
    expect(r.offsetY).toBe(0);
  });

  it('success: square unchanged', () => {
    expect(fitContain(36, 36, 36, 36)).toEqual({
      width: 36,
      height: 36,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('failure: zero / invalid source falls back to max box', () => {
    expect(fitContain(0, 10, 36, 36).width).toBe(36);
    expect(fitContain(10, 0, 36, 36).height).toBe(36);
  });
});
