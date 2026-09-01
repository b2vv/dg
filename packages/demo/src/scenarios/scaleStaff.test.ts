import { describe, expect, it } from '@rstest/core';
import {
  buildScaleStaffWindow,
  departmentOfSeat,
  parseScaleStaffQuery,
  resolveStaffWindowStart,
  scaleStaffComposition,
  scaleStaffNameMatches,
  scaleStaffNamePage,
  scaleStaffPersonName,
  staffAncestorsOutside,
  staffParentOfSeat,
  STAFF_FANOUT,
  STAFF_SCALE_COLS,
  STAFF_SCALE_DEFAULT_FOCUS,
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

describe('T88.1 — geometry that survives a sliding window', () => {
  // Two windows that overlap. `mid` and `mid + STAFF_SCALE_COLS` differ by exactly
  // one grid row, so a seat in the overlap must land in the same column and one
  // row apart — never re-flowed to a different column.
  const mid = STAFF_SCALE_DEFAULT_FOCUS;
  const a = buildScaleStaffWindow({ focusIndex: mid });
  const b = buildScaleStaffWindow({ focusIndex: mid + STAFF_SCALE_COLS });
  const cellOf = (w: typeof a, id: string) =>
    w.data.positions.find((p) => p.id === id)?.gridCell;

  it('success: a seat keeps its column when the window slides past it', () => {
    // Seats present in both windows. The cell is a property of the seat's index
    // in the address space, not of where the window happened to start — anything
    // else moves all 600 cards under a camera that did not move.
    const shared = a.data.positions
      .filter((p) => p.organizationId === 'current-org')
      .map((p) => p.id)
      .filter((id) => b.data.positions.some((p) => p.id === id));
    expect(shared.length).toBeGreaterThan(100);

    // Seats pinned above the wall are the documented exception: their cells ride
    // in row 0 so their report lines keep both ends on screen. That used to be
    // exactly one card, the head; since tier 2 became a hierarchy (T96) it is
    // the head plus whichever managers this window does not hold. Row 0 is the
    // discriminator — `cellOfSeat` starts the wall at row 1 — and everything
    // else must still hold its column.
    const onWall = shared.filter((id) => cellOf(a, id)?.row !== 0 && cellOf(b, id)?.row !== 0);
    expect(onWall.length).toBeGreaterThan(100);
    const movedSideways = onWall.filter((id) => cellOf(a, id)?.col !== cellOf(b, id)?.col);
    expect(movedSideways).toEqual([]);
  });

  it('success: the column comes from the absolute index, not the window start', () => {
    // The column is what a sideways pan must never change, and snapping the wall
    // base to a whole row is what buys it: (i - base) % COLS === i % COLS.
    expect(cellOf(a, `pos-${mid}`)?.col).toBe(mid % STAFF_SCALE_COLS);
    expect(cellOf(b, `pos-${mid}`)?.col).toBe(mid % STAFF_SCALE_COLS);
  });

  it('success: a slide moves rows by whole rows, which is what the camera undoes', () => {
    // Rows stay window-relative on purpose — absolute rows would put the wall at
    // y ≈ 730 000 px (coords.ts:61 multiplies row by the pitch) and zoom the
    // scene out past anything visible. The price is that a rebuild shifts every
    // row by the same integer, and the host shifts the camera back by it.
    const shift = (b.wallBase - a.wallBase) / STAFF_SCALE_COLS;
    expect(shift).toBe(1);
    const shared = a.data.positions
      .filter((p) => p.organizationId === 'current-org')
      .map((p) => p.id)
      .filter((id) => b.data.positions.some((p) => p.id === id))
      // Pinned managers ride in row 0 and do not shift with the wall — see the
      // column test above for why that set is no longer just the head.
      .filter((id) => cellOf(a, id)?.row !== 0 && cellOf(b, id)?.row !== 0);
    for (const id of shared.slice(0, 50)) {
      expect(cellOf(b, id)?.row).toBe((cellOf(a, id)?.row ?? 0) - shift);
    }
  });

  it('failure: the head of the current org is the same person after a slide', () => {
    // `isHead` is structural — exactly one per org, and resolveHead throws
    // otherwise. Which seat carries it must not depend on where the window
    // starts, or panning promotes and demotes people.
    const headOf = (w: typeof a) =>
      w.data.positions.find((p) => p.organizationId === 'current-org' && p.isHead)?.id;
    expect(headOf(a)).toBeDefined();
    expect(headOf(b)).toBe(headOf(a));
  });

  it('failure: every admin report line points at a seat that is in the scene', () => {
    // The lines all originate at the head. When the head moved with the window,
    // a slide rewrote all 600 of them; a line to a seat outside the window is
    // the same defect seen from the other end.
    const ids = new Set(b.data.positions.map((p) => p.id));
    const dangling = (b.data.reportLines ?? []).filter(
      (l) => !ids.has(l.fromId) || !ids.has(l.toId),
    );
    expect(dangling).toEqual([]);
  });
});

describe('name search by congruence (T88.10)', () => {
  it('success: matches are an arithmetic sequence, not a scan', () => {
    const m = scaleStaffNameMatches('Morgan Nguyen');
    expect(m).not.toBeNull();
    expect(m!.step).toBe(40);
    expect(m!.first).toBe(12);
    expect(m!.count).toBe(25_000);
    // Spot-check the far end: the sequence must still generate the name there.
    expect(scaleStaffPersonName(m!.first + 24_999 * m!.step)).toBe('Morgan Nguyen');
  });

  it('failure: «Morgan Blake» is unreachable — the spec named a name nobody has', () => {
    // Only 40 of the 100 pairs exist: ⌊i/4⌋ moves four times slower than i, so
    // the two congruences are not independent. spec.md, plan.md and tasks.md all
    // expect ~10 000 hits for this one; the true answer is none.
    expect(scaleStaffNameMatches('Morgan Blake')).toBeNull();
  });

  it('success: exactly 40 of the 100 pairs are reachable, each with 25 000 seats', () => {
    const reachable = new Set<string>();
    for (let i = 0; i < 40; i += 1) reachable.add(scaleStaffPersonName(i));
    expect(reachable.size).toBe(40);
    for (const name of reachable) {
      expect(scaleStaffNameMatches(name)!.count).toBe(25_000);
    }
  });

  it('success: a page is 20 indices and knows the total behind it', () => {
    const p0 = scaleStaffNamePage('Morgan Nguyen', 0, 20);
    expect(p0.indices).toHaveLength(20);
    expect(p0.total).toBe(25_000);
    expect(p0.hasMore).toBe(true);
    expect(p0.indices[0]).toBe(12);
    expect(p0.indices[19]).toBe(12 + 19 * 40);
    expect(scaleStaffNamePage('Morgan Nguyen', 1, 20).indices[0]).toBe(12 + 20 * 40);
  });

  it('failure: the last page is short and says there is no more', () => {
    const last = scaleStaffNamePage('Morgan Nguyen', 1249, 20);
    expect(last.indices).toHaveLength(20);
    expect(last.hasMore).toBe(false);
    expect(scaleStaffNamePage('Morgan Nguyen', 1250, 20).indices).toEqual([]);
  });

  it('failure: an unknown or empty name matches nothing', () => {
    expect(scaleStaffNameMatches('')).toBeNull();
    expect(scaleStaffNameMatches('Nobody Here')).toBeNull();
    expect(scaleStaffNamePage('Nobody Here', 0, 20)).toEqual({
      indices: [],
      total: 0,
      hasMore: false,
    });
  });
});

describe('tier 2 is a hierarchy, not a star (T96)', () => {
  it('success: a manager is arithmetic on the index — no search, no graph', () => {
    // The window exists because a cell is a division. The hierarchy is bought at
    // the same price or the window loses the property it was built for.
    expect(staffParentOfSeat(LEAD_SEATS)).toBeNull();
    expect(staffParentOfSeat(LEAD_SEATS + 1)).toBe(LEAD_SEATS);
    expect(staffParentOfSeat(LEAD_SEATS + 7)).toBe(LEAD_SEATS);
    // A block head answers one level up, not to its neighbour.
    expect(staffParentOfSeat(LEAD_SEATS + 8)).toBe(LEAD_SEATS);
    expect(staffParentOfSeat(LEAD_SEATS + 9)).toBe(LEAD_SEATS + 8);
    expect(staffParentOfSeat(LEAD_SEATS + 72)).toBe(LEAD_SEATS + 64);
  });

  it('success: every chain ends at the head, and none of them loops', () => {
    for (const offset of [1, 9, 73, 512, 4095, 100_000]) {
      let cursor: number | null = LEAD_SEATS + offset;
      let steps = 0;
      while (cursor !== null && steps < 50) {
        cursor = staffParentOfSeat(cursor);
        steps += 1;
      }
      expect(cursor).toBeNull();
      expect(steps).toBeLessThan(20);
    }
  });

  it('success: managers sit near their reports — that is the whole point', () => {
    // The refuted alternative, `floor(i / fanout)`, is a tree on paper: the grid
    // lays out by index, so it puts parent 375 a hundred rows from child 3001
    // and every edge crosses the wall again (T88 §15.1).
    const spans: number[] = [];
    for (let offset = 1; offset < 4000; offset += 1) {
      spans.push(offset + LEAD_SEATS - (staffParentOfSeat(LEAD_SEATS + offset) ?? 0));
    }
    spans.sort((x, y) => x - y);
    expect(spans[Math.floor(spans.length / 2)]).toBeLessThanOrEqual(STAFF_FANOUT);
    // A handful reach further — those are the block heads answering upward.
    expect(spans.filter((d) => d >= 64).length).toBeLessThan(spans.length / 50);
  });

  it('success: a window materialises a tree, not a fan from one node', () => {
    const win = buildScaleStaffWindow({ focusIndex: 350_000, windowSize: 600 });
    const admin = win.data.reportLines.filter((l) => l.kind === 'admin');
    const parents = new Set(admin.map((l) => l.fromId));
    // The star had one parent for the whole tier and a fanout equal to it.
    expect(parents.size).toBeGreaterThan(20);
    const fanout = new Map<string, number>();
    for (const line of admin) fanout.set(line.fromId, (fanout.get(line.fromId) ?? 0) + 1);
    expect(Math.max(...fanout.values())).toBeLessThan(60);
  });

  it('failure: no report line points at a card the scene does not have', () => {
    // The invariant the pinning exists for: a manager outside the window is
    // materialised above the wall rather than left as a dangling edge.
    const win = buildScaleStaffWindow({ startIndex: 400_000, windowSize: 900 });
    const ids = new Set(win.data.positions.map((p) => p.id));
    for (const line of win.data.reportLines) {
      expect(ids.has(line.fromId) || line.fromId === 'pos-0').toBe(true);
      expect(ids.has(line.toId)).toBe(true);
    }
  });

  it('failure: pinning a chain costs a handful of seats, not a second window', () => {
    // If this ever grows with the window, the window has stopped being a window.
    const outside = staffAncestorsOutside(500_000, { start: 499_800, end: 500_400 });
    expect(outside.length).toBeLessThan(10);
  });
});
