import { describe, expect, it } from 'vitest';
import { isZoomWheel, wheelPanDelta } from './Viewport.js';

describe('isZoomWheel', () => {
  it('success: ctrl or meta means zoom (trackpad pinch arrives as ctrl+wheel)', () => {
    expect(isZoomWheel({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isZoomWheel({ ctrlKey: false, metaKey: true })).toBe(true);
  });

  it('failure: a bare wheel is a pan, not a zoom', () => {
    expect(isZoomWheel({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});

describe('wheelPanDelta', () => {
  it('success: content follows the wheel, so the camera moves the other way', () => {
    expect(wheelPanDelta({ deltaX: 0, deltaY: 120, shiftKey: false })).toEqual({ dx: 0, dy: -120 });
    expect(wheelPanDelta({ deltaX: 40, deltaY: 0, shiftKey: false })).toEqual({ dx: -40, dy: 0 });
  });

  it('success: shift maps a vertical wheel onto the X axis', () => {
    expect(wheelPanDelta({ deltaX: 0, deltaY: 120, shiftKey: true })).toEqual({ dx: -120, dy: 0 });
  });

  it('success: a trackpad that already reports deltaX keeps both axes under shift', () => {
    expect(wheelPanDelta({ deltaX: 30, deltaY: 10, shiftKey: true })).toEqual({ dx: -30, dy: -10 });
  });

  it('failure: non-finite deltas are treated as zero', () => {
    expect(wheelPanDelta({ deltaX: Number.NaN, deltaY: Number.NaN, shiftKey: false })).toEqual({
      dx: 0,
      dy: 0,
    });
  });
});
