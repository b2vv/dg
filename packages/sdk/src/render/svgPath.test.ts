import { describe, expect, it } from 'vitest';
import { parseSvgPath } from './svgPath.js';

describe('parseSvgPath', () => {
  it('success: parses M/L/Z contour path', () => {
    const parsed = parseSvgPath('M 0 0 L 100 0 L 100 80 L 0 80 Z');
    expect(parsed).not.toBeNull();
    expect(parsed!.points.length).toBeGreaterThanOrEqual(4);
    expect(parsed!.closed).toBe(true);
  });

  it('success: parses M/H/V org edge path', () => {
    const parsed = parseSvgPath('M 10 20 V 40 H 50 V 60');
    expect(parsed).not.toBeNull();
    expect(parsed!.points.length).toBeGreaterThanOrEqual(3);
  });

  it('failure: empty path returns null', () => {
    expect(parseSvgPath('')).toBeNull();
    expect(parseSvgPath('   ')).toBeNull();
  });

  it('failure: malformed path returns null', () => {
    expect(parseSvgPath('M 0 0 Q broken')).toBeNull();
  });
});
