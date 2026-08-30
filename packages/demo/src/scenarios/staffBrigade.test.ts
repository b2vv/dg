import { describe, expect, it } from '@rstest/core';
import { buildStaffBrigadeData } from './staffBrigade.js';

/**
 * These assert the properties the fixture exists to carry, not its contents.
 *
 * A fixture drifts: somebody adds a section, somebody wires a shortcut edge, and
 * a year later it is a second `Staff · 1M` with better names. Each test below is
 * one of the three reasons this tab was added.
 */
describe('brigade staff fixture', () => {
  it('success: no position carries coordinates, so the layout is the tree branch', () => {
    // SPEC.md §2.2.1: coords on every seat → matrix, on none → pure tree. A seat
    // that quietly gained a gridCell would move the whole scene to hybrid.
    const { data } = buildStaffBrigadeData();
    const withCoords = data.positions.filter(
      (p) => 'gridCell' in p || 'layoutCoords' in p || 'col' in p || 'row' in p,
    );
    expect(withCoords).toEqual([]);
    expect(data.reportLines.length).toBeGreaterThan(0);
  });

  it('success: it is a tree — every seat but the two heads has exactly one parent', () => {
    const { data } = buildStaffBrigadeData();
    const parents = new Map<string, number>();
    for (const line of data.reportLines) {
      if (line.kind !== 'admin') continue;
      parents.set(line.toId, (parents.get(line.toId) ?? 0) + 1);
    }
    expect([...parents.values()].every((n) => n === 1)).toBe(true);

    const heads = data.positions.filter((p) => p.isHead).map((p) => p.id);
    const orphans = data.positions.filter((p) => !parents.has(p.id)).map((p) => p.id);
    expect(orphans.sort()).toEqual(heads.sort());
  });

  it('failure: no seat becomes a star — the widest span of reports stays small', () => {
    // The whole point of this fixture against scaleStaff, where one head carries
    // 3 939 edges and every one of them crosses the entire canvas.
    const { data } = buildStaffBrigadeData();
    const fanout = new Map<string, number>();
    for (const line of data.reportLines) {
      fanout.set(line.fromId, (fanout.get(line.fromId) ?? 0) + 1);
    }
    expect(Math.max(...fanout.values())).toBeLessThanOrEqual(10);
  });

  it('success: tier 3 is mixed echelons, not one shape repeated', () => {
    const { data, subordinateUnits } = buildStaffBrigadeData();
    const units = data.organizations.filter((o) => o.parentOrgId === 'brigade');
    expect(units).toHaveLength(subordinateUnits);
    // Battalion, group, battery, company — reorganisation leaves all four side
    // by side, and a canvas that only sees one of them was never asked.
    const echelons = new Set(units.map((u) => u.name.split(' ').at(-1)));
    expect(echelons.size).toBeGreaterThanOrEqual(4);
  });

  it('success: the staff is readable-sized, and vacancies are seats without people', () => {
    const { data, brigadeSeats } = buildStaffBrigadeData();
    // Tens, not thousands: SPEC.md keeps heavy staff to the focused org and
    // draws everything below it as a card.
    expect(brigadeSeats).toBeGreaterThan(40);
    expect(brigadeSeats).toBeLessThan(200);

    const vacant = data.positions.filter((p) => p.status === 'vacant');
    expect(vacant.length).toBeGreaterThan(0);
    expect(vacant.every((p) => p.personId === undefined)).toBe(true);
    expect(data.positions.some((p) => p.status === 'acting')).toBe(true);
  });

  it('failure: building twice gives the same scene', () => {
    // A fixture that shuffles turns every visual test into a coin toss.
    expect(JSON.stringify(buildStaffBrigadeData())).toBe(
      JSON.stringify(buildStaffBrigadeData()),
    );
  });
});
