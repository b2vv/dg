import { describe, expect, it } from '@rstest/core';
import { ViewStateStore } from './ViewStateStore.js';

describe('ViewStateStore (T76)', () => {
  it('success: theme and lod setters', () => {
    const s = new ViewStateStore();
    s.setThemeMode('dark');
    s.setLodLevel('far');
    expect(s.themeMode).toBe('dark');
    expect(s.lodLevel).toBe('far');
  });

  it('success: staff org expand toggle', () => {
    const s = new ViewStateStore();
    expect(s.toggleStaffOrgExpanded('o1')).toBe(true);
    expect(s.staffExpandedOrgIds.has('o1')).toBe(true);
    expect(s.toggleStaffOrgExpanded('o1')).toBe(false);
    expect(s.staffExpandedOrgIds.has('o1')).toBe(false);
  });

  it('success: position expand set/clear', () => {
    const s = new ViewStateStore();
    s.setPositionExpanded('p1', true);
    s.setPositionExpanded('p2', true);
    expect(s.staffExpandedPositionIds.size).toBe(2);
    s.clearPositionExpanded();
    expect(s.staffExpandedPositionIds.size).toBe(0);
  });
});
