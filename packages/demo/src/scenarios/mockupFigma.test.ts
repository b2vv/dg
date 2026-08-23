import { describe, expect, it } from 'vitest';
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

  it('org GoJS: tree counts, temp, unitCode; no period on card', () => {
    const data = buildMockupOrgsGojsData();
    expect(data.organizations.some((o) => o.isTemporary)).toBe(true);
    expect(data.organizations.some((o) => o.unitCode)).toBe(true);
    expect(data.organizations.some((o) => o.childrenCount !== undefined)).toBe(true);
    expect(data.organizations.some((o) => o.showShortName === false)).toBe(true);
    for (const org of data.organizations) {
      expect(org.periodStart).toBeUndefined();
      expect(org.periodEnd).toBeUndefined();
    }
    expect(JSON.stringify(data)).not.toMatch(MILITARY_HINT);
  });

  it('staff Figma uses landscape seats; GoJS row seats', () => {
    const figma = buildMockupStaffFigmaData();
    const gojs = buildMockupStaffGojsData();
    expect(figma.positions[0]!.width).toBe(248);
    expect(figma.positions[0]!.height).toBe(72);
    expect(gojs.positions[0]!.width).toBe(200);
    expect(gojs.positions[0]!.height).toBe(56);
    expect(JSON.stringify(figma)).not.toMatch(MILITARY_HINT);
    expect(JSON.stringify(gojs)).not.toMatch(MILITARY_HINT);
  });

  it('staff: temp + period + vacant; dotted deputy → unit manager', () => {
    const data = buildMockupStaffFigmaData();
    expect(data.positions.some((p) => p.isTemporary && p.periodStart)).toBe(true);
    expect(data.positions.some((p) => p.status === 'vacant')).toBe(true);
    expect(data.reportLines).toContainEqual({
      fromId: 'pos-1z',
      toId: 'pos-u-h',
      kind: 'dotted',
    });
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
    expect(p.personLayout).toBe('figma-row');
    expect(MOCKUP_FIGMA_STYLES.staffZone.dashed).toBe(true);
    expect(MOCKUP_FIGMA_STYLES.staffZone.stroke).toBe(0x3b82f6);
    expect(MOCKUP_FIGMA_STYLES.staffZone.labelAlign).toBe('right');
  });

  it('GoJS org + staff tokens (production gamma)', () => {
    const o = MOCKUP_GOJS_STYLES.organization;
    expect(o.width).toBe(220);
    expect(o.height).toBe(121);
    expect(o.symbolWidth).toBe(80);
    expect(o.symbolHeight).toBe(56);
    expect(o.orgCardLayout).toBe('gojs-vertical');
    expect(o.hidePeriodOnCard).toBe(true);
    const p = MOCKUP_GOJS_STYLES.person;
    expect(p.width).toBe(200);
    expect(p.height).toBe(56);
    expect(p.personLayout).toBe('gojs-row');
    expect(MOCKUP_GOJS_STYLES.staffZone.dashed).toBe(false);
    expect(MOCKUP_GOJS_STYLES.staffZone.labelAlign).toBe('right');
  });

  it('staff layout: unit-current expand places tier-3 seats', async () => {
    const { layoutStaffCanvas } = await import('@org-hierarchy/sdk');
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
    expect(canvas.edges).toContainEqual({
      fromId: 'pos-1z',
      toId: 'pos-u-h',
      kind: 'dotted',
    });
  });
});
