import { describe, expect, it } from 'vitest';
import {
  brandMarkSymbol,
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
  buildMockupStaffFloodData,
  buildMockupStaffMagneticData,
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
  MOCKUP_MAGNETIC_STYLES,
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
    expect(data.organizations.some((o) => o.fullName && !o.symbolUrl)).toBe(true);
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
    expect(figma.positions[0]!.height).toBe(44);
    expect(gojs.positions[0]!.width).toBe(200);
    expect(gojs.positions[0]!.height).toBe(98);
    expect(JSON.stringify(figma)).not.toMatch(MILITARY_HINT);
    expect(JSON.stringify(gojs)).not.toMatch(MILITARY_HINT);
  });

  it('staff Figma mirrors frame 1264:7906: two tiers, command + service depts', () => {
    const data = buildMockupStaffFigmaData();
    expect(data.positions.some((p) => p.isTemporary && p.periodStart)).toBe(true);
    expect(data.positions.some((p) => p.status === 'vacant')).toBe(true);
    // Managing tier: head + three direct reports (SPEC «керівний склад»).
    const hq = data.positions.filter((p) => p.organizationId === 'holding');
    expect(hq).toHaveLength(4);
    expect(hq.filter((p) => p.isHead)).toHaveLength(1);
    // Current tier: command department + two service departments.
    expect(data.departments.filter((d) => d.organizationId === 'region').map((d) => d.id)).toEqual([
      'exec',
      'supply',
      'people',
    ]);
    // Zone-to-zone link from the managing deputy (the frame draws it there).
    expect(data.reportLines).toContainEqual({
      fromId: 'pos-hq-1z',
      toId: 'pos-head',
      kind: 'dotted',
    });
  });
});

/** Approved style tokens — see work/tasks/MOCKUP-styles-review.md */
describe('mockup style tokens (approved)', () => {
  it('Figma org card tokens (frame 1264:8121)', () => {
    const o = MOCKUP_FIGMA_STYLES.organization;
    expect(o.width).toBe(234);
    expect(o.height).toBe(110);
    expect(o.background).toBe(0x121212);
    expect(o.border).toBe(0x303030);
    expect(o.borderRadius).toBe(12);
    expect(o.orgCardLayout).toBe('gojs-vertical');
    // 16px body inset + 17px name row + 12px gap + 49px symbol + 16px = 110.
    expect(o.bodyPaddingX).toBe(16);
    expect(o.bodyPaddingY).toBe(16);
    expect(o.nameRowHeight).toBe(17);
    expect(o.symbolRowGap).toBe(12);
    expect(o.symbolHeight).toBe(49);
    expect(o.bodyPaddingY + o.nameRowHeight + o.symbolRowGap + o.symbolHeight + o.bodyPaddingY).toBe(
      o.height,
    );
    expect(o.nameColor).toBe(0xffffff);
    expect(o.countsBadgeTextColor).toBe(0xa6a6a6);
    expect(o.countsBadgeFontSize).toBe(14);
  });

  it('Figma seat + dashed zone tokens (frame 1264:7906)', () => {
    const p = MOCKUP_FIGMA_STYLES.person;
    expect(p.width).toBe(248);
    expect(p.height).toBe(44);
    // Chrome-less seat: avatar tile + text column, no card frame.
    expect(p.backgroundAlpha).toBe(0);
    expect(p.borderWidth).toBe(0);
    expect(p.avatarPlaceholderColor).toBe(0x121212);
    // accent/primary for every name; ⏳ (not the «T» pill) marks acting.
    expect(p.temporaryNameColor).toBe(0xe8490f);
    expect(p.permanentNameColor).toBe(0xe8490f);
    expect(p.tempMarkerStyle).toBe('hourglass');
    expect(p.hidePeriodOnCard).toBe(true);
    expect(p.hideVacantLabel).toBe(true);
    expect(p.titleFontSize).toBe(16);
    expect(p.nameFontSize).toBe(14);
    expect(p.personLayout).toBe('figma-row');
    expect(MOCKUP_FIGMA_STYLES.staffZone.dashed).toBe(true);
    expect(MOCKUP_FIGMA_STYLES.staffZone.fill).toBe(0x191f26);
    expect(MOCKUP_FIGMA_STYLES.staffZone.stroke).toBe(0x3d5067);
    expect(MOCKUP_FIGMA_STYLES.staffZone.labelAlign).toBe('right');
    expect(MOCKUP_FIGMA_STYLES.departmentCard.fill).toBe(0x242f3d);
    expect(MOCKUP_FIGMA_STYLES.departmentCard.dashed).toBe(true);
  });

  it('Figma canvas + connector tokens', () => {
    expect(MOCKUP_FIGMA_STYLES.canvasBackground).toBe(0x222222);
    expect(MOCKUP_FIGMA_STYLES.edge).toEqual({
      color: 0xa6a6a6,
      width: 1,
      cornerRadius: 8,
      terminator: 'dot',
      dotRadius: 2.67,
    });
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
    expect(p.height).toBe(98);
    expect(p.cardRowHeight).toBe(56);
    expect(p.personLayout).toBe('gojs-row');
    expect(o.hideMenuChrome).toBe(true);
    expect(MOCKUP_GOJS_STYLES.staffZone.dashed).toBe(false);
    expect(MOCKUP_GOJS_STYLES.staffZone.labelAlign).toBe('right');
  });

  it('staff layout: unit-current expand places tier-3 seats (GoJS tab)', async () => {
    const { layoutStaffCanvas } = await import('@org-hierarchy/sdk');
    const data = buildMockupStaffGojsData();
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
        nodeWidth: 200,
        nodeHeight: 98,
        orgCardWidth: 220,
        orgCardHeight: 121,
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

/** Staff · Magnetic — same scene, pre-T64 chrome: dept blob + org block. */
describe('magnetic staff copy', () => {
  it('mirrors the Figma staff scene plus one seat with no department', () => {
    const figma = buildMockupStaffFigmaData();
    const magnetic = buildMockupStaffMagneticData();
    const added = magnetic.positions.filter((p) => !figma.positions.some((f) => f.id === p.id));
    expect(added.map((p) => p.id)).toEqual(['pos-loose']);
    // Production rosters carry seats with no department — both engines must see
    // it as a foreign card, so the fixture keeps one.
    expect(added[0]!.departmentId).toBeUndefined();
    expect(magnetic.departments).toEqual(figma.departments);
    expect(JSON.stringify(magnetic)).not.toMatch(MILITARY_HINT);
  });

  it('authors a grid cell per seat — contours only paint in matrix mode', () => {
    const data = buildMockupStaffMagneticData();
    expect(data.positions.every((p) => p.gridCell)).toBe(true);
    // Cells are unique inside each org block.
    for (const orgId of ['holding', 'region']) {
      const keys = data.positions
        .filter((p) => p.organizationId === orgId)
        .map((p) => `${p.gridCell!.col}:${p.gridCell!.row}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('command department is one magnetic cluster; services are their own', async () => {
    const { clusterPositionsByDepartment } = await import('@org-hierarchy/sdk');
    const data = buildMockupStaffMagneticData();
    const inputs = data.positions
      .filter((p) => p.organizationId === 'region' && p.departmentId && p.gridCell)
      .map((p) => ({
        id: p.id,
        departmentId: p.departmentId!,
        col: p.gridCell!.col,
        row: p.gridCell!.row,
      }));
    // magnetRadius 1.5 = orthogonal neighbours only.
    expect(clusterPositionsByDepartment(inputs, 'exec', 1.5)).toHaveLength(1);
    expect(clusterPositionsByDepartment(inputs, 'people', 1.5)).toHaveLength(1);
    expect(clusterPositionsByDepartment(inputs, 'supply', 1.5)).toHaveLength(1);
  });

  it('tokens: department paints as a blob, organization block is solid', () => {
    expect(MOCKUP_MAGNETIC_STYLES.department.labelAlign).toBe('right');
    expect(MOCKUP_MAGNETIC_STYLES.department.fill).toBe(0x242f3d);
    expect(MOCKUP_MAGNETIC_STYLES.staffZone.dashed).toBe(false);
    // Seats and connectors stay identical to the Figma tab.
    expect(MOCKUP_MAGNETIC_STYLES.person).toBe(MOCKUP_FIGMA_STYLES.person);
    expect(MOCKUP_MAGNETIC_STYLES.edge).toBe(MOCKUP_FIGMA_STYLES.edge);
  });
});

/** Staff · Flood — the C-shape demo the BA compares with Staff · Magnetic. */
describe('flood staff copy', () => {
  it('interleaves departments so the command contour must wrap a foreign cell', () => {
    const data = buildMockupStaffFloodData();
    const cellOf = (id: string) => data.positions.find((p) => p.id === id)?.gridCell;
    // Supply sits in the middle of the command block, own cells on three sides.
    expect(cellOf('pos-sup')).toEqual({ col: 1, row: 1 });
    expect(cellOf('pos-head')).toEqual({ col: 1, row: 0 });
    expect(cellOf('pos-ops')).toEqual({ col: 0, row: 1 });
    expect(cellOf('pos-cmd-right')).toEqual({ col: 2, row: 1 });
    expect(data.positions.every((p) => p.gridCell)).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(MILITARY_HINT);
  });

  it('keeps the Figma people and adds only the seats the demo needs', () => {
    const figma = buildMockupStaffFigmaData();
    const flood = buildMockupStaffFloodData();
    const added = flood.positions.filter((p) => !figma.positions.some((f) => f.id === p.id));
    expect(added.map((p) => p.id).sort()).toEqual(['pos-cmd-right', 'pos-loose']);
    expect(added.find((p) => p.id === 'pos-loose')?.departmentId).toBeUndefined();
    expect(flood.departments).toEqual(figma.departments);
    expect(flood.persons).toEqual(figma.persons);
  });

  it('cells stay unique inside each org block', () => {
    const data = buildMockupStaffFloodData();
    for (const orgId of ['holding', 'region']) {
      const keys = data.positions
        .filter((p) => p.organizationId === orgId)
        .map((p) => `${p.gridCell!.col}:${p.gridCell!.row}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
