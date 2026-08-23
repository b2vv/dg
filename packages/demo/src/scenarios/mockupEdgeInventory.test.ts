import { describe, expect, it } from 'vitest';
import { layoutStaffCanvas } from '@org-hierarchy/sdk';
import { buildMockupStaffFigmaData } from './mockupFigma.js';

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
      {
        expandedOrgIds: ['unit-current'],
        nodeWidth: 248,
        nodeHeight: 72,
        orgCardWidth: 220,
        orgCardHeight: 56,
      },
    );

    const sorted = canvas.edges
      .map((e) => ({ kind: e.kind, fromId: e.fromId, toId: e.toId }))
      .sort((a, b) =>
        `${a.kind}:${a.fromId}:${a.toId}`.localeCompare(`${b.kind}:${b.fromId}:${b.toId}`),
      );

    expect(sorted).toEqual([
      { kind: 'admin', fromId: 'pos-1z', toId: 'pos-sup' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-1z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-2z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-ops' },
      { kind: 'admin', fromId: 'pos-sup', toId: 'pos-vac' },
      { kind: 'admin', fromId: 'pos-u-h', toId: 'pos-u-2' },
      { kind: 'admin', fromId: 'pos-u-h', toId: 'pos-u-sup' },
      { kind: 'cross-tier', fromId: 'pos-head', toId: 'unit-current' },
      { kind: 'dotted', fromId: 'pos-1z', toId: 'pos-u-h' },
    ]);
  });
});
