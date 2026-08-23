import { describe, expect, it } from 'vitest';
import { isPrimaryPointerTap } from './selection.js';

describe('isPrimaryPointerTap (CTX-5)', () => {
  it('accepts left button and undefined (touch)', () => {
    expect(isPrimaryPointerTap({ button: 0 })).toBe(true);
    expect(isPrimaryPointerTap({})).toBe(true);
  });

  it('rejects right button — Pixi follow-up tap after context menu', () => {
    expect(isPrimaryPointerTap({ button: 2 })).toBe(false);
  });
});
