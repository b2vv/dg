import { describe, expect, it } from '@rstest/core';
import {
  buildScaleStaffWindow,
  departmentOfSeat,
  parseScaleStaffQuery,
  resolveStaffWindowStart,
  scaleStaffComposition,
  STAFF_SCALE_TOTAL,
  STAFF_SCALE_WINDOW,
  SUBORDINATE_ORGS,
  LEAD_SEATS,
  tierOfSeat,
} from './scaleStaff.js';

describe('scale staff address space', () => {
  it('success: a million seats split across the three tiers', () => {
    const c = scaleStaffComposition();
    expect(c.lead + c.current + c.subordinate).toBe(STAFF_SCALE_TOTAL);
    expect(c.lead).toBeGreaterThan(0);
    expect(c.subordinate).toBeGreaterThan(0);
    expect(c.groups + c.simpleOrgs).toBeLessThanOrEqual(SUBORDINATE_ORGS);
  });

  it('success: window stays inside the range and centres on the focus', () => {
    expect(resolveStaffWindowStart(0, 100, 1000)).toBe(0);
    expect(resolveStaffWindowStart(500, 100, 1000)).toBe(450);
    expect(resolveStaffWindowStart(999, 100, 1000)).toBe(900);
  });

  it('failure: a window wider than the range clamps to it', () => {
    expect(resolveStaffWindowStart(5, 500, 10)).toBe(0);
  });
});

describe('buildScaleStaffWindow', () => {
  it('success: materializes a window, not a million objects', () => {
    const win = buildScaleStaffWindow({ focusIndex: 500_000 });
    expect(win.total).toBe(STAFF_SCALE_TOTAL);
    expect(win.data.positions.length).toBeLessThan(STAFF_SCALE_WINDOW * 3);
    expect(win.data.positions.length).toBe(win.windowSize);
    // The focused seat is in the window and marked for e2e.
    expect(win.data.positions.some((p) => p.testId === 'scale-focus-seat')).toBe(true);
  });

  it('success: three tiers — lead org, current org, subordinate cards', () => {
    const win = buildScaleStaffWindow({ focusIndex: 10_000 });
    const orgIds = new Set(win.data.positions.map((p) => p.organizationId));
    expect(orgIds.has('lead-org')).toBe(true);
    expect(orgIds.has('current-org')).toBe(true);
    const subs = win.data.organizations.filter((o) => o.parentOrgId === 'current-org');
    expect(subs).toHaveLength(SUBORDINATE_ORGS);
    // Half the subordinate cards belong to groups, half are standalone.
    expect(subs.filter((o) => o.groupIds.length > 0)).toHaveLength(SUBORDINATE_ORGS / 2);
    expect(subs.filter((o) => o.groupIds.length === 0)).toHaveLength(SUBORDINATE_ORGS / 2);
    expect(win.data.groups.length).toBe(win.composition.groups);
  });

  it('success: every materialized seat has a grid cell, unique per org block', () => {
    const win = buildScaleStaffWindow({ focusIndex: 42 });
    expect(win.data.positions.every((p) => p.gridCell)).toBe(true);
    const byOrg = new Map<string, Set<string>>();
    for (const p of win.data.positions) {
      const key = `${p.gridCell!.col}:${p.gridCell!.row}`;
      const seen = byOrg.get(p.organizationId) ?? new Set<string>();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      byOrg.set(p.organizationId, seen);
    }
  });

  it('success: some seats carry no department, like a real roster', () => {
    const win = buildScaleStaffWindow({ focusIndex: 100 });
    const loose = win.data.positions.filter((p) => !p.departmentId);
    expect(loose.length).toBeGreaterThan(0);
    expect(loose.length).toBeLessThan(win.data.positions.length / 4);
    expect(departmentOfSeat(0)).toBeUndefined();
    expect(departmentOfSeat(1)).toBe('dept-0');
  });

  it('failure: a focus past the end clamps into the address space', () => {
    const win = buildScaleStaffWindow({ focusIndex: STAFF_SCALE_TOTAL + 10 });
    expect(win.focusIndex).toBe(STAFF_SCALE_TOTAL - 1);
    expect(win.data.positions.length).toBeGreaterThan(0);
  });
});

describe('parseScaleStaffQuery', () => {
  it('success: accepts pos-N and bare N', () => {
    expect(parseScaleStaffQuery('pos-123')).toBe(123);
    expect(parseScaleStaffQuery('  456 ')).toBe(456);
  });

  it('failure: rejects names and out-of-range indices', () => {
    expect(parseScaleStaffQuery('Avery Chen')).toBeNull();
    expect(parseScaleStaffQuery(`pos-${STAFF_SCALE_TOTAL}`)).toBeNull();
    expect(parseScaleStaffQuery('')).toBeNull();
  });
});

describe('honesty of the focus marker', () => {
  it('success: a tier-2 index is materialized and marked', () => {
    const win = buildScaleStaffWindow({ focusIndex: 400_000 });
    expect(win.focusTier).toBe('current');
    expect(win.focusMaterialized).toBe(true);
  });

  it('failure: a tier-3 index cannot be centred, and the window says so', () => {
    const win = buildScaleStaffWindow({ focusIndex: 900_000 });
    expect(win.focusTier).toBe('subordinate');
    // The scene still renders, but nothing claims to be that seat.
    expect(win.focusMaterialized).toBe(false);
    expect(win.data.positions.some((p) => p.testId === 'scale-focus-seat')).toBe(false);
  });

  it('failure: a lead-tier index is reported as lead, not silently re-centred', () => {
    const win = buildScaleStaffWindow({ focusIndex: 1 });
    expect(win.focusTier).toBe('lead');
    expect(win.focusMaterialized).toBe(false);
  });

  it('success: tierOfSeat splits the address space at the tier borders', () => {
    expect(tierOfSeat(0)).toBe('lead');
    expect(tierOfSeat(LEAD_SEATS)).toBe('current');
    expect(tierOfSeat(LEAD_SEATS + 699_999)).toBe('current');
    expect(tierOfSeat(LEAD_SEATS + 700_000)).toBe('subordinate');
  });
});
