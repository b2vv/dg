import { describe, expect, it } from 'vitest';
import { layoutStaffCanvas } from '@org-hierarchy/sdk';
import { buildMockupStaffFigmaData, FIGMA_STAFF_LAYOUT } from './mockups.js';

/** Canonical staff mockup edge inventory — see MOCKUP-edge-map-discussion.md */
describe('mockup staff edge inventory', () => {
  it('Staff · Figma layout edges (admin + cross-tier + dotted)', async () => {
    const data = buildMockupStaffFigmaData();
    const canvas = await layoutStaffCanvas(
      {
        organizations: data.organizations,
        positions: data.positions,
        reports: data.reportLines,
        groups: data.groups,
        departments: data.departments,
        persons: data.persons,
      },
      'region',
      FIGMA_STAFF_LAYOUT,
    );

    const sorted = canvas.edges
      .map((e) => ({ kind: e.kind, fromId: e.fromId, toId: e.toId }))
      .sort((a, b) =>
        `${a.kind}:${a.fromId}:${a.toId}`.localeCompare(`${b.kind}:${b.fromId}:${b.toId}`),
      );

    expect(sorted).toEqual([
      // Current tier — command row + service departments.
      { kind: 'admin', fromId: 'pos-1z', toId: 'pos-sup' },
      { kind: 'admin', fromId: 'pos-2z', toId: 'pos-p1' },
      { kind: 'admin', fromId: 'pos-2z', toId: 'pos-p2' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-1z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-2z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-ops' },
      // Managing tier — leadership (SPEC §2.2 «керівний склад»).
      { kind: 'admin', fromId: 'pos-hq-head', toId: 'pos-hq-1z' },
      { kind: 'admin', fromId: 'pos-hq-head', toId: 'pos-hq-2z' },
      { kind: 'admin', fromId: 'pos-hq-head', toId: 'pos-hq-cos' },
      { kind: 'cross-tier', fromId: 'pos-hq-head', toId: 'pos-head' },
      { kind: 'dotted', fromId: 'pos-hq-1z', toId: 'pos-head' },
    ]);
  });
});
