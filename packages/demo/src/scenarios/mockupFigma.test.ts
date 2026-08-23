import { describe, expect, it } from 'vitest';
import {
  brandMarkSymbol,
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
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

  it('org GoJS: period / temp cues, civilian names', () => {
    const data = buildMockupOrgsGojsData();
    expect(data.organizations.some((o) => o.periodStart)).toBe(true);
    expect(data.organizations.some((o) => o.isTemporary)).toBe(true);
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
});
