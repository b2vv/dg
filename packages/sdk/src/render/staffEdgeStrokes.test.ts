import { describe, expect, it } from '@rstest/core';
import { staffEdgeStrokes } from './StaffEdgesView.js';

describe('staffEdgeStrokes', () => {
  it('keeps the per-theme table when no override is given', () => {
    const dark = staffEdgeStrokes('dark');
    const light = staffEdgeStrokes('light');
    expect(dark.admin.color).toBe(0xe2e8f0);
    expect(light.admin.color).toBe(0x334155);
    expect(dark.matrix.dash).toEqual([6, 4]);
  });

  it('lead-org is a dashed grey plink in both themes, not a solid admin line', () => {
    for (const theme of ['light', 'dark'] as const) {
      const t = staffEdgeStrokes(theme);
      expect(t['lead-org'].color).toBe(0x6b6b73);
      expect(t['lead-org'].dash).toEqual([6, 4]);
      expect(t['lead-org'].width).toBe(2);
    }
  });

  it('cross-tier is gone from the stroke table', () => {
    expect('cross-tier' in staffEdgeStrokes('dark')).toBe(false);
  });

  it('repaints every kind from the host edge style, keeping the dash pattern', () => {
    const figma = staffEdgeStrokes('dark', { color: 0xa6a6a6, width: 1 });
    expect(figma.admin.color).toBe(0xa6a6a6);
    expect(figma['lead-org'].color).toBe(0xa6a6a6);
    expect(figma['lead-org'].dash).toEqual([6, 4]);
    expect(figma.matrix.color).toBe(0xa6a6a6);
    expect(figma.dotted.color).toBe(0xa6a6a6);
    expect(figma.matrix.dash).toEqual([6, 4]);
    expect(figma.admin.width).toBe(1);
  });

  it('keeps per-theme width when only the color is overridden', () => {
    const recolored = staffEdgeStrokes('light', { color: 0x000000 });
    expect(recolored.admin.width).toBe(staffEdgeStrokes('light').admin.width);
  });

  it('failure: an edge style with no color/width returns the theme table itself', () => {
    const base = staffEdgeStrokes('dark');
    expect(staffEdgeStrokes('dark', {})).toBe(base);
    expect(staffEdgeStrokes('dark', { terminator: 'dot', cornerRadius: 8 })).toBe(base);
  });
});
