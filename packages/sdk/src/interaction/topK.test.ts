import { describe, expect, it } from '@rstest/core';
import { TopKCollector } from './topK.js';

const byValue = (a: number, b: number) => a - b;

describe('TopKCollector', () => {
  it('success: keeps the k smallest, ascending', () => {
    const top = new TopKCollector<number>(3, byValue);
    for (const n of [9, 1, 7, 3, 8, 2]) top.push(n);
    expect(top.drain()).toEqual([1, 2, 3]);
    expect(top.size).toBe(3);
  });

  it('success: fewer items than the limit come back whole', () => {
    const top = new TopKCollector<number>(5, byValue);
    for (const n of [4, 2]) top.push(n);
    expect(top.drain()).toEqual([2, 4]);
  });

  it('success: matches a full sort + slice on random input', () => {
    const items = Array.from({ length: 500 }, (_, i) => (i * 7919) % 1000);
    const top = new TopKCollector<number>(17, byValue);
    for (const n of items) top.push(n);
    expect(top.drain()).toEqual([...items].sort(byValue).slice(0, 17));
  });

  it('success: worst case — descending input still selects correctly', () => {
    const items = Array.from({ length: 200 }, (_, i) => 200 - i);
    const top = new TopKCollector<number>(4, byValue);
    for (const n of items) top.push(n);
    expect(top.drain()).toEqual([1, 2, 3, 4]);
  });

  it('failure: a non-positive limit keeps nothing', () => {
    const top = new TopKCollector<number>(0, byValue);
    top.push(1);
    expect(top.drain()).toEqual([]);
    expect(top.size).toBe(0);
  });
});
