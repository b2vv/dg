import { describe, expect, it } from '@rstest/core';
import { emptyDiagramData } from './types.js';
import { isDiagramData, mergeById, mergePartial } from './mergeData.js';

const base = () => ({
  ...emptyDiagramData(),
  organizations: [{ id: 'o1', name: 'Old', groupIds: [] }],
  positions: [{ id: 'p1', organizationId: 'o1', title: 'Lead', groupIds: [], status: 'filled' as const, isTemporary: false }],
  reportLines: [{ fromId: 'p1', toId: 'p2', kind: 'admin' as const }],
});

describe('mergeData', () => {
  it('success: patch replaces by id and keeps untouched rows', () => {
    const next = mergePartial(base(), {
      organizations: [
        { id: 'o1', name: 'New', groupIds: [] },
        { id: 'o2', name: 'Added', groupIds: [] },
      ],
    });
    expect(next.organizations.map((o) => o.name)).toEqual(['New', 'Added']);
    expect(next.positions).toHaveLength(1);
  });

  it('success: report lines dedupe on from/to/kind, not on identity', () => {
    const next = mergePartial(base(), {
      reportLines: [{ fromId: 'p1', toId: 'p2', kind: 'admin' }],
    });
    expect(next.reportLines).toHaveLength(1);
  });

  it('failure: an empty or missing patch never drops the base rows', () => {
    expect(mergeById(base().organizations, undefined)).toHaveLength(1);
    expect(mergeById(base().organizations, [])).toHaveLength(1);
    expect(mergePartial(base(), {}).positions).toHaveLength(1);
  });

  it('failure: raw host payloads are not DiagramData', () => {
    expect(isDiagramData(base())).toBe(true);
    expect(isDiagramData({ rows: [] })).toBe(false);
    expect(isDiagramData(null)).toBe(false);
  });
});

describe('isDiagramData rejects false-positive shapes (structure audit)', () => {
  it('failure: the three names present but not arrays is not DiagramData', () => {
    // This shape used to pass, and the error surfaced later and elsewhere —
    // while seeding expansion from `data.positions`.
    expect(isDiagramData({ organizations: null, persons: null, positions: null })).toBe(false);
    expect(isDiagramData({ organizations: [], persons: [], positions: {} })).toBe(false);
    expect(isDiagramData({ organizations: 1, persons: 2, positions: 3 })).toBe(false);
  });

  it('success: real DiagramData still passes', () => {
    expect(isDiagramData(emptyDiagramData())).toBe(true);
  });

  it('failure: a raw payload with none of the names is still rejected', () => {
    expect(isDiagramData({ rows: [] })).toBe(false);
    expect(isDiagramData(null)).toBe(false);
  });
});
