import type { DiagramData } from '@org-hierarchy/sdk';
import { DEMO_PLACEHOLDER_PNG, DEMO_AVATAR_PNG } from './demoMedia.js';

/** Neutral brand mark (letter) as data-URI SVG — safe for GitHub Pages. */
export function brandMarkSymbol(mark: string, fill = '#5b9bd5'): string {
  const safe = mark.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect x="8" y="8" width="104" height="104" rx="16" fill="${fill}" stroke="#1e3a5f" stroke-width="4"/>
    <text x="60" y="78" text-anchor="middle" font-size="48" font-family="system-ui,sans-serif" font-weight="700" fill="#0f172a">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Wide banner symbol (~400×200) for full-bleed org cards. */
export function fullBleedOrgSymbol(label: string, fill = '#64748b'): string {
  const safe = label.replace(/[<>&"']/g, '').slice(0, 12) || 'ORG';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <rect width="400" height="200" fill="${fill}"/>
    <text x="200" y="112" text-anchor="middle" font-size="42" font-family="system-ui,sans-serif" font-weight="700" fill="#0f172a">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Figma-style org tree topology:
 * root → mid → five peer children (sibling dashed chrome in demo).
 */
export function buildMockupOrgsFigmaData(): DiagramData {
  const root = brandMarkSymbol('CL', '#7dd3fc');
  const mid = brandMarkSymbol('NW', '#5b9bd5');
  const peer = brandMarkSymbol('DV', '#93c5fd');
  return {
    organizations: [
      {
        id: 'org-root',
        name: 'Cedar Lake Group',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-root',
        filledCount: 1,
        vacantCount: 6,
        symbolUrl: root,
        symbolUrlLight: root,
        symbolUrlDark: root,
        showShortName: true,
      },
      {
        id: 'org-mid',
        name: 'Northwind Region',
        parentOrgId: 'org-root',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-mid',
        filledCount: 5,
        vacantCount: 5,
        symbolUrl: mid,
        symbolUrlLight: mid,
        symbolUrlDark: mid,
      },
      ...[
        ['org-harbor', 'Harbor Division', 4, 12],
        ['org-maple', 'Maple Division', 3, 8],
        ['org-summit', 'Summit Division', 2, 6],
        ['org-river', 'River Division', 5, 10],
        ['org-atlas', 'Atlas Division', 3, 9],
      ].map(([id, name, filled, vacant], i) => ({
        id: id as string,
        name: name as string,
        parentOrgId: 'org-mid',
        groupIds: ['g-peer'],
        collapsed: false,
        matrixOrder: i,
        filledCount: filled as number,
        vacantCount: vacant as number,
        symbolUrl: peer,
        symbolUrlLight: peer,
        symbolUrlDark: peer,
      })),
    ],
    groups: [{ id: 'g-peer', name: 'Regional peers', emblemUrl: DEMO_PLACEHOLDER_PNG }],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };
}

/**
 * GoJS-style org tree — production vertical cards, tree counts, no period on card.
 */
export function buildMockupOrgsGojsData(): DiagramData {
  const logo = (mark: string) => brandMarkSymbol(mark, '#94a3b8');
  const banner = fullBleedOrgSymbol('EMEA');
  return {
    organizations: [
      {
        id: 'org-hq',
        name: 'Brightside Holdings',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-hq',
        childrenCount: 1,
        allDescendantCount: 6,
        symbolUrl: logo('BH'),
        symbolUrlLight: logo('BH'),
        symbolUrlDark: logo('BH'),
        showShortName: true,
      },
      {
        id: 'org-emea',
        name: 'EMEA Operations',
        parentOrgId: 'org-hq',
        groupIds: [],
        collapsed: false,
        childrenCount: 5,
        allDescendantCount: 5,
        symbolUrl: banner,
        symbolUrlLight: banner,
        symbolUrlDark: banner,
        unitCode: 'EU-12',
      },
      {
        id: 'org-no-symbol',
        name: 'Nordic Desk',
        fullName: 'Nordic Regional Operations Desk',
        parentOrgId: 'org-hq',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-no-symbol',
        unitCode: 'NO-01',
      },
      ...[
        ['org-berlin', 'Berlin Hub', 0, 0, false, true],
        ['org-lisbon', 'Lisbon Hub', 0, 0, true, true],
        ['org-prague', 'Prague Hub', 0, 0, false, false],
        ['org-oslo', 'Oslo Hub', 0, 0, false, true],
        ['org-dublin', 'Dublin Hub', 0, 0, false, true],
      ].map(([id, name, _c, _d, temp, caption], i) => ({
        id: id as string,
        name: name as string,
        parentOrgId: 'org-emea',
        groupIds: [],
        collapsed: false,
        matrixOrder: i,
        ...(caption ? {} : { showShortName: false as const }),
        isTemporary: temp as boolean,
        symbolUrl: logo(String(name).slice(0, 1)),
        symbolUrlLight: logo(String(name).slice(0, 1)),
        symbolUrlDark: logo(String(name).slice(0, 1)),
      })),
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };
}

function staffPosition(
  partial: Omit<
    DiagramData['positions'][number],
    'groupIds' | 'status' | 'isTemporary'
  > & {
    status?: DiagramData['positions'][number]['status'];
    isTemporary?: boolean;
    width?: number;
    height?: number;
  },
  size: { width: number; height: number },
): DiagramData['positions'][number] {
  return {
    groupIds: [],
    status: 'filled',
    isTemporary: false,
    width: size.width,
    height: size.height,
    ...partial,
  };
}

/** Shared civilian staff topology for Figma vs GoJS card chrome. */
function buildStaffTopology(
  card: { width: number; height: number },
  gojs = false,
): DiagramData {
  return {
    organizations: [
      { id: 'holding', name: 'Lumen Holdings', groupIds: [], collapsed: false },
      {
        id: 'region',
        name: 'Pacific Region',
        parentOrgId: 'holding',
        groupIds: [],
        collapsed: false,
      },
      {
        id: 'unit-current',
        name: 'Current Business Unit',
        parentOrgId: 'region',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-unit',
      },
    ],
    groups: [],
    departments: [
      { id: 'exec', name: 'Executive office', organizationId: 'region' },
      { id: 'ops', name: 'Operations desk', organizationId: 'region' },
      { id: 'exec2', name: 'Unit leadership', organizationId: 'unit-current' },
      { id: 'ops2', name: 'Unit operations', organizationId: 'unit-current' },
    ],
    persons: [
      { id: 'p-head', fullName: 'Avery Chen', photoUrl: DEMO_AVATAR_PNG, testId: 'staff-head' },
      { id: 'p-1z', fullName: 'Jordan Blake', photoUrl: DEMO_AVATAR_PNG, testId: 'staff-temp' },
      { id: 'p-2z', fullName: 'Morgan Lee', photoUrl: DEMO_AVATAR_PNG },
      { id: 'p-ops', fullName: 'Riley Quinn', photoUrl: DEMO_AVATAR_PNG },
      { id: 'p-sup', fullName: 'Casey Nguyen', photoUrl: DEMO_AVATAR_PNG },
      { id: 'p-u1', fullName: 'Taylor Brooks', photoUrl: DEMO_AVATAR_PNG },
      { id: 'p-u2', fullName: 'Jamie Ortiz', photoUrl: DEMO_AVATAR_PNG },
    ],
    positions: [
      staffPosition(
        {
        id: 'pos-head',
        title: 'Regional director',
        organizationId: 'region',
        departmentId: 'exec',
        personId: 'p-head',
        isHead: true,
        testId: 'staff-head',
        ...(gojs
          ? { isKeyPosition: true, childrenCount: 3, allDescendantCount: 5 }
          : {}),
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-1z',
          title: 'First deputy',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-1z',
          isTemporary: !gojs,
          ...(gojs ? { pending: true } : {}),
          periodStart: '2018-06-27',
          periodEnd: null,
          testId: 'staff-temp',
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-2z',
          title: 'Deputy director',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-2z',
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-ops',
          title: 'Chief of staff',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-ops',
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-sup',
          title: 'Operations lead',
          organizationId: 'region',
          departmentId: 'ops',
          personId: 'p-sup',
          ...(gojs ? { detached: true } : {}),
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-vac',
          title: 'Operations analyst',
          organizationId: 'region',
          departmentId: 'ops',
          status: 'vacant',
          testId: 'staff-vacant',
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-u-h',
          title: 'Unit manager',
          organizationId: 'unit-current',
          departmentId: 'exec2',
        personId: 'p-u1',
        isHead: true,
        testId: 'unit-head',
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-u-2',
          title: 'Deputy manager',
          organizationId: 'unit-current',
          departmentId: 'exec2',
          personId: 'p-u2',
          isTemporary: true,
          periodStart: '2023-01-01',
          periodEnd: null,
        },
        card,
      ),
      staffPosition(
        {
          id: 'pos-u-sup',
          title: 'Unit coordinator',
          organizationId: 'unit-current',
          departmentId: 'ops2',
          status: 'vacant',
        },
        card,
      ),
    ],
    reportLines: [
      // Executive: director → three direct reports
      { fromId: 'pos-head', toId: 'pos-1z', kind: 'admin' },
      { fromId: 'pos-head', toId: 'pos-2z', kind: 'admin' },
      { fromId: 'pos-head', toId: 'pos-ops', kind: 'admin' },
      // Operations chain under first deputy
      { fromId: 'pos-1z', toId: 'pos-sup', kind: 'admin' },
      { fromId: 'pos-sup', toId: 'pos-vac', kind: 'admin' },
      // Current business unit (tier-3 expand)
      { fromId: 'pos-u-h', toId: 'pos-u-2', kind: 'admin' },
      { fromId: 'pos-u-h', toId: 'pos-u-sup', kind: 'admin' },
      // Decorative cross-org (SPEC: does not affect layout)
      { fromId: 'pos-1z', toId: 'pos-u-h', kind: 'dotted' },
    ],
  };
}

/** Figma staff: landscape seats. */
export function buildMockupStaffFigmaData(): DiagramData {
  return buildStaffTopology({ width: 248, height: 72 });
}

/** GoJS staff: landscape row seats (production card). */
export function buildMockupStaffGojsData(): DiagramData {
  return buildStaffTopology({ width: 200, height: 98 }, true);
}

/** @deprecated Use buildMockupOrgsFigmaData */
export const buildMockupOrgsData = buildMockupOrgsFigmaData;
/** @deprecated Use buildMockupStaffFigmaData */
export const buildMockupStaffData = buildMockupStaffFigmaData;

/** Dark Figma-like styles (orgs + staff). */
export const MOCKUP_FIGMA_STYLES = {
  organization: {
    width: 200,
    height: 120,
    background: 0x2a323c,
    border: 0x3d4a5c,
    borderWidth: 1,
    borderRadius: 8,
    nameColor: 0xf1f5f9,
    groupColor: 0x94a3b8,
    nameFontSize: 13,
    groupFontSize: 11,
    symbolSize: 56,
    periodColor: 0x4ade80,
    metaColor: 0x94a3b8,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    countsBadgeBackground: 0x1e293b,
    countsBadgeTextColor: 0xe2e8f0,
  },
  person: {
    width: 248,
    height: 72,
    background: 0x2a323c,
    border: 0x3d4a5c,
    borderWidth: 1,
    borderRadius: 8,
    nameColor: 0xf97316,
    titleColor: 0xf1f5f9,
    nameFontSize: 13,
    titleFontSize: 12,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
    periodChipBackground: 0x14532d,
    periodChipTextColor: 0x86efac,
    vacantLabelColor: 0x94a3b8,
    temporaryNameColor: 0xf97316,
    permanentNameColor: 0xf1f5f9,
    personLayout: 'figma-row' as const,
  },
  staffZone: {
    fill: 0x1a222d,
    fillAlpha: 0.55,
    stroke: 0x3b82f6,
    strokeWidth: 1.25,
    borderRadius: 4,
    labelColor: 0xe2e8f0,
    labelFontSize: 13,
    labelAlign: 'right' as const,
    dashed: true,
  },
  departmentCard: {
    fill: 0x1e3a5f,
    fillAlpha: 0.92,
    stroke: 0x334155,
    strokeWidth: 1,
    borderRadius: 6,
    labelColor: 0xcbd5e1,
    labelFontSize: 12,
  },
};

/** Dark GoJS-production styles (cassiopeia-admin-ui gamma). */
export const MOCKUP_GOJS_STYLES = {
  organization: {
    width: 220,
    height: 121,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    groupColor: 0xcbd5e1,
    nameFontSize: 14,
    groupFontSize: 11,
    symbolSize: 80,
    symbolWidth: 80,
    symbolHeight: 56,
    noCaptionSymbolWidth: 109,
    noCaptionSymbolHeight: 76,
    orgCardLayout: 'gojs-vertical' as const,
    hidePeriodOnCard: true,
    tempMarkerStyle: 'hourglass' as const,
    hideMenuChrome: true,
    gojsTreeExpander: true,
    brandColor: 0x2563eb,
    periodColor: 0x4ade80,
    metaColor: 0x94a3b8,
    metaFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    countsBadgeBackground: 0x334155,
    countsBadgeTextColor: 0xe2e8f0,
    countsBadgeFontSize: 13,
  },
  person: {
    width: 200,
    height: 98,
    cardRowHeight: 56,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    titleColor: 0xcbd5e1,
    nameFontSize: 13,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
    avatarPlaceholderColor: 0x475569,
    periodChipBackground: 0x334155,
    periodChipTextColor: 0xcbd5e1,
    periodChipFontSize: 12,
    timelineDotColor: 0x4ade80,
    vacantLabelColor: 0x94a3b8,
    temporaryNameColor: 0xea580c,
    permanentNameColor: 0xf1f5f9,
    brandColor: 0x2563eb,
    pendingColor: 0xf59e0b,
    detachedBorderColor: 0x64748b,
    countBarBackground: 0x334155,
    countBarTextColor: 0xe2e8f0,
    countBarFontSize: 11,
    personLayout: 'gojs-row' as const,
  },
  staffZone: {
    fill: 0x191f26,
    fillAlpha: 0.92,
    stroke: 0x475569,
    strokeWidth: 1,
    borderRadius: 6,
    labelColor: 0xe2e8f0,
    labelFontSize: 12,
    labelAlign: 'right' as const,
    dashed: false,
  },
  departmentCard: {
    fill: 0x242f3d,
    fillAlpha: 0.95,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 8,
    labelColor: 0xcbd5e1,
    labelFontSize: 12,
  },
};

/** @deprecated Use MOCKUP_FIGMA_STYLES */
export const MOCKUP_DARK_STYLES = MOCKUP_FIGMA_STYLES;
