import { describe, expect, it } from 'vitest';
import { layoutStaffCanvas } from '@org-hierarchy/sdk';
import {
  brandMarkSymbol,
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
} from './mockupFigma.js';

const MILITARY_HINT =
  /ОБТРО|ОБРТРО|тгр|штаб|командир|офіцер|тактичн|військ|Шацьк/i;

describe('mockup fixtures (GH Pages safe)', () => {
  it('brandMarkSymbol emits svg data URI', () => {
    expect(brandMarkSymbol('NW')).toMatch(/^data:image\/svg\+xml/);
  });

  it('org Figma: root → mid → 5 peers, no military names', () => {
    const data = buildMockupOrgsFigmaData();
    expect(data.organizations).toHaveLength(7);
    const blob = JSON.stringify(data);
    expect(blob).not.toMatch(MILITARY_HINT);
    expect(data.organizations.filter((o) => o.parentOrgId === 'org-mid')).toHaveLength(5);
  });

  it('org Figma: no period / temp / unitCode (approved display rules)', () => {
    const data = buildMockupOrgsFigmaData();
    for (const org of data.organizations) {
      expect(org.periodStart).toBeUndefined();
      expect(org.periodEnd).toBeUndefined();
      expect(org.isTemporary).toBeUndefined();
      expect(org.unitCode).toBeUndefined();
    }
    expect(data.organizations[0]!.showShortName).toBe(true);
    expect(data.organizations.every((o) => o.symbolUrl?.startsWith('data:image/svg'))).toBe(true);
  });

  it('org GoJS: period / temp / unitCode cues present', () => {
    const data = buildMockupOrgsGojsData();
    expect(data.organizations.some((o) => o.periodStart)).toBe(true);
    expect(data.organizations.some((o) => o.isTemporary)).toBe(true);
    expect(data.organizations.some((o) => o.unitCode)).toBe(true);
    expect(data.organizations.every((o) => o.filledCount !== undefined)).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(MILITARY_HINT);
  });

  it('staff Figma uses landscape seats; GoJS portrait', () => {
    const figma = buildMockupStaffFigmaData();
    const gojs = buildMockupStaffGojsData();
    expect(figma.positions[0]!.width).toBe(248);
    expect(figma.positions[0]!.height).toBe(72);
    expect(gojs.positions[0]!.width).toBe(136);
    expect(gojs.positions[0]!.height).toBe(156);
    expect(JSON.stringify(figma)).not.toMatch(MILITARY_HINT);
    expect(JSON.stringify(gojs)).not.toMatch(MILITARY_HINT);
  });

  it('staff: temp + period + vacant; no cross-tier dotted edge', () => {
    const data = buildMockupStaffFigmaData();
    expect(data.positions.some((p) => p.isTemporary && p.periodStart)).toBe(true);
    expect(data.positions.some((p) => p.status === 'vacant')).toBe(true);
    expect(data.reportLines.some((l) => l.kind === 'dotted')).toBe(false);
    expect(data.organizations.some((o) => o.id === 'unit-current')).toBe(true);
  });
});

/** Approved style tokens — see work/tasks/MOCKUP-styles-review.md */
describe('mockup style tokens (approved)', () => {
  it('Figma org card tokens', () => {
    const o = MOCKUP_FIGMA_STYLES.organization;
    expect(o.width).toBe(200);
    expect(o.height).toBe(120);
    expect(o.background).toBe(0x2a323c);
    expect(o.symbolSize).toBe(56);
    expect(o.borderRadius).toBe(8);
  });

  it('Figma staff row + dashed zone tokens', () => {
    const p = MOCKUP_FIGMA_STYLES.person;
    expect(p.width).toBe(248);
    expect(p.height).toBe(72);
    expect(p.temporaryNameColor).toBe(0xf97316);
    expect(p.permanentNameColor).toBe(0xf1f5f9);
    expect(MOCKUP_FIGMA_STYLES.staffZone.dashed).toBe(true);
    expect(MOCKUP_FIGMA_STYLES.staffZone.stroke).toBe(0x3b82f6);
    expect(MOCKUP_FIGMA_STYLES.staffZone.labelAlign).toBe('right');
  });

  it('GoJS org + staff tokens', () => {
    const o = MOCKUP_GOJS_STYLES.organization;
    expect(o.height).toBe(64);
    expect(o.symbolSize).toBe(36);
    expect(o.background).toBe(0xffffff);
    const p = MOCKUP_GOJS_STYLES.person;
    expect(p.width).toBe(136);
    expect(p.height).toBe(156);
    expect(MOCKUP_GOJS_STYLES.staffZone.dashed).toBe(false);
    expect(MOCKUP_GOJS_STYLES.staffZone.labelAlign).toBe('left');
  });

  it('staff layout: unit-current expand places tier-3 seats', async () => {
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
    expect(canvas.orgCards.find((c) => c.orgId === 'unit-current')?.expanded).toBe(true);
    expect(canvas.positionNodes.some((n) => n.tier === 3 && n.id === 'pos-u-h')).toBe(true);
  });
});
