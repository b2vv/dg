import { describe, expect, it } from '@rstest/core';
import { victimsForExpand } from './positionExpand.js';

describe('victimsForExpand', () => {
  it('success: under the cap nothing is evicted', () => {
    expect(victimsForExpand(new Set(['a']), 3)).toEqual([]);
    expect(victimsForExpand(new Set(['a', 'b']), 3)).toEqual([]);
  });

  it('success: at the cap the oldest makes room for exactly one', () => {
    expect(victimsForExpand(new Set(['a', 'b', 'c']), 3)).toEqual(['a']);
    // Set order is insertion order, so «oldest» is the first expanded.
    expect(victimsForExpand(new Set(['x', 'y']), 1)).toEqual(['x', 'y']);
  });

  it('success: an infinite cap keeps everything open', () => {
    expect(victimsForExpand(new Set(['a', 'b', 'c']), Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('failure: a zero or negative cap clears the set rather than under-flowing', () => {
    expect(victimsForExpand(new Set(['a', 'b']), 0)).toEqual(['a', 'b']);
    expect(victimsForExpand(new Set(['a', 'b']), -5)).toEqual(['a', 'b']);
    expect(victimsForExpand(new Set(), 0)).toEqual([]);
  });
});
