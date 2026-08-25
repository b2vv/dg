import type {
  DiagramData,
  NodeTheme,
  OrgLayoutOptions,
  StaffLayoutOptions,
} from '@org-hierarchy/sdk';
import { DEMO_AVATAR_PNG } from './demoMedia.js';

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
        groupIds: [],
        collapsed: false,
        matrixOrder: i,
        filledCount: filled as number,
        vacantCount: vacant as number,
        symbolUrl: peer,
        symbolUrlLight: peer,
        symbolUrlDark: peer,
      })),
    ],
    // Frame 1264:8121 shows the peers inside a bare dashed frame — no group caption.
    groups: [],
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

/** Figma seat box (frame 1264:7906). */
const FIGMA_SEAT = { width: 248, height: 44 } as const;

/** Org row-tree layout for frame 1264:8121 — 234×110 cards, 40px between peers. */
export const FIGMA_ORG_LAYOUT = {
  nodeWidth: 234,
  nodeHeight: 110,
  horizontalGap: 40,
  verticalGap: 72,
  margin: 40,
  orgEdgeStyle: 'spine-bus',
} satisfies OrgLayoutOptions;

/**
 * Staff canvas layout for frame 1264:7906. Zone inset is `margin / 2`, kept
 * clear of the 16px department padding so the two labels never collide.
 */
export const FIGMA_STAFF_LAYOUT = {
  horizontalGap: 56,
  verticalGap: 76,
  tierGap: 72,
  margin: 96,
  nodeWidth: FIGMA_SEAT.width,
  nodeHeight: FIGMA_SEAT.height,
  orgCardWidth: 234,
  orgCardHeight: 110,
  refCellWidth: 304,
  refCellHeight: 88,
  collapseUnexpandedPositions: false,
} satisfies StaffLayoutOptions;

/** Magnetic copy: matrix mode, so `refCell*` must equal `render.cell*`. */
export const MAGNETIC_STAFF_LAYOUT = {
  ...FIGMA_STAFF_LAYOUT,
  refCellHeight: 120,
} satisfies StaffLayoutOptions;

/** Contour grid pitch for the magnetic copy (`render.cellWidth/Height`). */
export const MAGNETIC_CELL = { width: 304, height: 120 } as const;

/**
 * Figma «посади» topology (frame 1264:7906) with civilian names (rule 1 of
 * work/tasks/MOCKUP-styles-review.md): a managing tier holding one command
 * department, and the current tier holding a command department with two
 * service departments side by side beneath it.
 */
export function buildMockupStaffFigmaData(): DiagramData {
  const seat = FIGMA_SEAT;
  const photo = DEMO_AVATAR_PNG;
  return {
    organizations: [
      { id: 'holding', name: 'Lumen Holdings', groupIds: [], collapsed: false },
      {
        id: 'region',
        name: 'Pacific Region',
        parentOrgId: 'holding',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-unit',
      },
    ],
    groups: [],
    departments: [
      { id: 'hq-exec', name: 'Executive office', organizationId: 'holding' },
      { id: 'exec', name: 'Regional leadership', organizationId: 'region' },
      { id: 'supply', name: 'Supply service', organizationId: 'region' },
      { id: 'people', name: 'People operations', organizationId: 'region' },
    ],
    persons: [
      { id: 'p-hq-head', fullName: 'Dana Whitfield', photoUrl: photo },
      { id: 'p-hq-1z', fullName: 'Noel Farrow', photoUrl: photo },
      { id: 'p-hq-2z', fullName: 'Sasha Ilves', photoUrl: photo },
      { id: 'p-head', fullName: 'Avery Chen', photoUrl: photo, testId: 'staff-head' },
      { id: 'p-1z', fullName: 'Jordan Blake', photoUrl: photo, testId: 'staff-temp' },
      { id: 'p-2z', fullName: 'Morgan Lee', photoUrl: photo },
      { id: 'p-sup', fullName: 'Casey Nguyen', photoUrl: photo },
      { id: 'p-u1', fullName: 'Taylor Brooks', photoUrl: photo },
      { id: 'p-u2', fullName: 'Jamie Ortiz', photoUrl: photo },
    ],
    positions: [
      // Managing tier — command department (frame zone «Тактична група»).
      // Sibling groups are declared in reverse: the row-tree lays siblings
      // out right→left, so on screen this reads deputy → chief of staff.
      staffPosition(
        {
          id: 'pos-hq-head',
          title: 'Group director',
          organizationId: 'holding',
          departmentId: 'hq-exec',
          personId: 'p-hq-head',
          isHead: true,
          isTemporary: true,
          periodStart: '2018-06-27',
          periodEnd: null,
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-hq-cos',
          title: 'Chief of staff',
          organizationId: 'holding',
          departmentId: 'hq-exec',
          status: 'vacant',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-hq-2z',
          title: 'Deputy director',
          organizationId: 'holding',
          departmentId: 'hq-exec',
          personId: 'p-hq-2z',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-hq-1z',
          title: 'First deputy',
          organizationId: 'holding',
          departmentId: 'hq-exec',
          personId: 'p-hq-1z',
        },
        seat,
      ),
      // Current tier — command department (frame zone «поточний підрозділ»).
      staffPosition(
        {
          id: 'pos-head',
          title: 'Regional director',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-head',
          isHead: true,
          testId: 'staff-head',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-ops',
          title: 'Chief of staff',
          organizationId: 'region',
          departmentId: 'exec',
          status: 'vacant',
          testId: 'staff-vacant',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-2z',
          title: 'Deputy director',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-2z',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-1z',
          title: 'First deputy',
          organizationId: 'region',
          departmentId: 'exec',
          personId: 'p-1z',
          isTemporary: true,
          periodStart: '2018-06-27',
          periodEnd: null,
          testId: 'staff-temp',
        },
        seat,
      ),
      // Service departments — one row under the command department.
      staffPosition(
        {
          id: 'pos-p2',
          title: 'Analyst',
          organizationId: 'region',
          departmentId: 'people',
          personId: 'p-u2',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-p1',
          title: 'Coordinator',
          organizationId: 'region',
          departmentId: 'people',
          personId: 'p-u1',
        },
        seat,
      ),
      staffPosition(
        {
          id: 'pos-sup',
          title: 'Service lead',
          organizationId: 'region',
          departmentId: 'supply',
          personId: 'p-sup',
        },
        seat,
      ),
    ],
    reportLines: [
      { fromId: 'pos-hq-head', toId: 'pos-hq-1z', kind: 'admin' },
      { fromId: 'pos-hq-head', toId: 'pos-hq-2z', kind: 'admin' },
      { fromId: 'pos-hq-head', toId: 'pos-hq-cos', kind: 'admin' },
      { fromId: 'pos-head', toId: 'pos-1z', kind: 'admin' },
      { fromId: 'pos-head', toId: 'pos-2z', kind: 'admin' },
      { fromId: 'pos-head', toId: 'pos-ops', kind: 'admin' },
      { fromId: 'pos-1z', toId: 'pos-sup', kind: 'admin' },
      { fromId: 'pos-2z', toId: 'pos-p1', kind: 'admin' },
      { fromId: 'pos-2z', toId: 'pos-p2', kind: 'admin' },
      // Frame 1264:7906 draws the zone-to-zone line from the managing deputy;
      // the SDK adds its own cross-tier edge (managing head → current head).
      { fromId: 'pos-hq-1z', toId: 'pos-head', kind: 'dotted' },
    ],
    orgLinks: [],
  };
}

/**
 * Magnetic copy of the Figma «посади» scene (frame 1264:7906).
 *
 * Same people and departments as {@link buildMockupStaffFigmaData}, but every
 * seat carries `gridCell` so the canvas runs in matrix mode: departments become
 * **magnetic contours** (own cells with Manhattan ≤ magnetRadius merge into one
 * blob) and each organization is a **zone block** — a plain rectangle around its
 * own seats that foreign nodes never enter.
 *
 * Grid (local per org block):
 * ```text
 *        col 0            col 1            col 2
 * row 0                   head             supply           ← foreign inside the
 * row 1  first deputy     deputy           chief of staff      command bbox
 * row 2                   people ·1        people ·2
 * ```
 *
 * The supply seat sits inside the command department's bounding box on purpose:
 * it is the G2/M2 case — the command contour has to notch around a foreign card
 * instead of swallowing it.
 */
export function buildMockupStaffMagneticData(): DiagramData {
  const base = buildMockupStaffFigmaData();
  const cells: Record<string, { col: number; row: number }> = {
    // Managing org block — head over a three-seat command row.
    'pos-hq-head': { col: 1, row: 0 },
    'pos-hq-1z': { col: 0, row: 1 },
    'pos-hq-2z': { col: 1, row: 1 },
    'pos-hq-cos': { col: 2, row: 1 },
    // Current org block — command row, then the two service departments.
    'pos-head': { col: 1, row: 0 },
    'pos-1z': { col: 0, row: 1 },
    'pos-2z': { col: 1, row: 1 },
    'pos-ops': { col: 2, row: 1 },
    // Foreign card inside the command component's bbox (G2 / M2 demo).
    'pos-sup': { col: 2, row: 0 },
    'pos-p1': { col: 1, row: 2 },
    'pos-p2': { col: 2, row: 2 },
  };
  return {
    ...base,
    positions: base.positions.map((p) => {
      const gridCell = cells[p.id];
      return gridCell ? { ...p, gridCell } : p;
    }),
  };
}

/** GoJS staff: landscape row seats (production card). */
export function buildMockupStaffGojsData(): DiagramData {
  return buildStaffTopology({ width: 200, height: 98 }, true);
}

/** @deprecated Use buildMockupOrgsFigmaData */
export const buildMockupOrgsData = buildMockupOrgsFigmaData;
/** @deprecated Use buildMockupStaffFigmaData */
export const buildMockupStaffData = buildMockupStaffFigmaData;

/**
 * Figma «Casiopeya» dark tokens (2026-08 frames 1264:7906 «посади» /
 * 1264:8121 «організації»). Hex mirrors the Figma variables:
 * bg/primary #121212 · bg/secondary #222222 · bg/tertiary #303030 ·
 * text/primary #ffffff · text/secondary #a6a6a6 · accent/primary #e8490f.
 */
export const MOCKUP_FIGMA_STYLES = {
  /** Canvas surface — bg/secondary behind the dashed zones. */
  canvasBackground: 0x222222,
  /** Connectors: 1px grey elbows, rounded corners, round dot at each port. */
  edge: {
    color: 0xa6a6a6,
    width: 1,
    cornerRadius: 8,
    terminator: 'dot',
    dotRadius: 2.67,
  },
  organization: {
    // Frame 1264:8121 — 234×110 card, 16px body inset, symbol row 49px.
    width: 234,
    height: 110,
    background: 0x121212,
    border: 0x303030,
    borderWidth: 1,
    borderRadius: 12,
    nameColor: 0xffffff,
    groupColor: 0xa6a6a6,
    nameFontSize: 14,
    groupFontSize: 12,
    symbolSize: 49,
    symbolWidth: 116,
    symbolHeight: 49,
    orgCardLayout: 'gojs-vertical',
    bodyPaddingX: 16,
    bodyPaddingY: 16,
    nameRowHeight: 17,
    symbolRowGap: 12,
    hidePeriodOnCard: true,
    hideMenuChrome: true,
    tempMarkerStyle: 'hourglass',
    brandColor: 0xe8490f,
    periodColor: 0xa6a6a6,
    metaColor: 0xa6a6a6,
    metaFontSize: 12,
    badgeColor: 0xe8490f,
    badgeTextColor: 0xffffff,
    // `N [M]` sits top-right of the body, no chip background.
    countsBadgeBackground: 0x121212,
    countsBadgeTextColor: 0xa6a6a6,
    countsBadgeFontSize: 14,
  },
  person: {
    // Frame 1264:7906 — chrome-less seat: 40×40 tile + title/name column.
    width: 248,
    height: 44,
    background: 0x121212,
    backgroundAlpha: 0,
    border: 0x303030,
    borderWidth: 0,
    borderRadius: 8,
    nameColor: 0xe8490f,
    titleColor: 0xffffff,
    nameFontSize: 14,
    titleFontSize: 16,
    badgeColor: 0xe8490f,
    badgeTextColor: 0xffffff,
    avatarColor: 0x5e5a57,
    avatarPlaceholderColor: 0x121212,
    periodChipBackground: 0x222222,
    periodChipTextColor: 0xffffff,
    periodChipFontSize: 14,
    vacantLabelColor: 0xa6a6a6,
    // Both permanent and acting names are accent/primary; ⏳ marks acting.
    temporaryNameColor: 0xe8490f,
    permanentNameColor: 0xe8490f,
    tempMarkerStyle: 'hourglass',
    hidePeriodOnCard: true,
    hideVacantLabel: true,
    personLayout: 'figma-row',
  },
  staffZone: {
    // Tier band + sibling-org frame: #191f26 fill, dashed #3d5067.
    fill: 0x191f26,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 12,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    labelAlign: 'right',
    labelPadding: 16,
    dashed: true,
  },
  departmentCard: {
    // Department block inside a tier: #242f3d fill, dashed #3d5067.
    fill: 0x242f3d,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 8,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    padding: 16,
    labelRow: true,
    dashed: true,
  },
} satisfies Partial<NodeTheme>;

/**
 * Magnetic variant of the Figma tokens: departments are painted as magnetic
 * contours (pre-T64 default) instead of rectangular cards, and the staff zone
 * is a solid block rather than a dashed frame.
 */
export const MOCKUP_MAGNETIC_STYLES = {
  ...MOCKUP_FIGMA_STYLES,
  /** Department contour — same palette as the Figma dept card. */
  department: {
    fill: 0x242f3d,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    labelAlign: 'right',
  },
  /** Organization block: solid #191f26 rectangle, foreign nodes stay outside. */
  staffZone: {
    ...MOCKUP_FIGMA_STYLES.staffZone,
    dashed: false,
  },
} satisfies Partial<NodeTheme>;

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
    orgCardLayout: 'gojs-vertical',
    hidePeriodOnCard: true,
    tempMarkerStyle: 'hourglass',
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
    personLayout: 'gojs-row',
  },
  staffZone: {
    fill: 0x191f26,
    fillAlpha: 0.92,
    stroke: 0x475569,
    strokeWidth: 1,
    borderRadius: 6,
    labelColor: 0xe2e8f0,
    labelFontSize: 12,
    labelAlign: 'right',
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
} satisfies Partial<NodeTheme>;

/** @deprecated Use MOCKUP_FIGMA_STYLES */
export const MOCKUP_DARK_STYLES = MOCKUP_FIGMA_STYLES;
