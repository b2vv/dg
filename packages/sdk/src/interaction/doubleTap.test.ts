import { describe, expect, it } from 'vitest';
import { DoubleTapTracker, NODE_DOUBLE_TAP_MS } from './doubleTap.js';

describe('DoubleTapTracker (T69)', () => {
  it('success: two taps on same key within window → one double', () => {
    const t = new DoubleTapTracker();
    expect(t.tap('org:a', 1000)).toBe('single');
    expect(t.tap('org:a', 1000 + NODE_DOUBLE_TAP_MS)).toBe('double');
  });

  it('success: third tap after double starts a new single', () => {
    const t = new DoubleTapTracker();
    expect(t.tap('p', 0)).toBe('single');
    expect(t.tap('p', 50)).toBe('double');
    expect(t.tap('p', 100)).toBe('single');
  });

  it('failure: gap > window → two singles', () => {
    const t = new DoubleTapTracker();
    expect(t.tap('org:a', 0)).toBe('single');
    expect(t.tap('org:a', NODE_DOUBLE_TAP_MS + 1)).toBe('single');
  });

  it('failure: different keys never double', () => {
    const t = new DoubleTapTracker();
    expect(t.tap('org:a', 0)).toBe('single');
    expect(t.tap('org:b', 10)).toBe('single');
    expect(t.tap('org:a', 20)).toBe('single');
  });

  it('success: reset clears pending single', () => {
    const t = new DoubleTapTracker();
    expect(t.tap('org:a', 0)).toBe('single');
    t.reset();
    expect(t.tap('org:a', 10)).toBe('single');
  });
});
