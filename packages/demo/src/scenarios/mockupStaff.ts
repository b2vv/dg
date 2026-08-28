import type { DiagramData } from '@org-hierarchy/sdk';
import { DEMO_AVATAR_PNG } from './demoMedia.js';
import { FIGMA_SEAT } from './mockupLayouts.js';

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

/**
 * Adds one staff position **without a department** — production rosters are
 * full of them, and both contour engines have to treat it as a foreign card
 * rather than as empty grid space.
 */
export function withLooseSeat(data: DiagramData): DiagramData {
  const loose = staffPosition(
    {
      id: 'pos-loose',
      title: 'Seconded specialist',
      organizationId: 'region',
      personId: 'p-sup',
    },
    FIGMA_SEAT,
  );
  return {
    ...data,
    positions: [...data.positions, loose],
    reportLines: [...data.reportLines, { fromId: 'pos-1z', toId: 'pos-loose', kind: 'admin' }],
  };
}

/** Figma seat box (frame 1264:7906). */

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
      // T87.8 — `entityType` is the host's own vocabulary; the SDK carries it
      // through untouched and the demo card reads it to choose how the picture
      // is shown. That is the claim of acceptance row 3: the host decides.
      {
        id: 'p-head',
        fullName: 'Avery Chen',
        photoUrl: photo,
        testId: 'staff-head',
        entityType: 'promo-cover',
      },
      {
        id: 'p-1z',
        fullName: 'Jordan Blake',
        photoUrl: photo,
        testId: 'staff-temp',
        entityType: 'promo-contain',
      },
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
 * row 2  no department    people ·1        people ·2
 * ```
 *
 * The supply seat sits inside the command department's bounding box on purpose:
 * it is the G2/M2 case — the command contour has to notch around a foreign card
 * instead of swallowing it. The seat at (0,2) carries **no** `departmentId`,
 * which production rosters have plenty of: it owns no contour, and no wash may
 * cover it either.
 */
export function buildMockupStaffMagneticData(): DiagramData {
  const base = withLooseSeat(buildMockupStaffFigmaData());
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
    'pos-loose': { col: 0, row: 2 },
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

/**
 * Flood copy of the Figma «посади» scene — the demo the BA compares against
 * {@link buildMockupStaffMagneticData}.
 *
 * Same people and departments, but the grid deliberately **interleaves**
 * departments the way a fully-authored `row`/`col` product will: the command
 * department wraps the supply seat on three sides, so the Rust cell flood has to
 * produce a C-shape (G5 notch + G6 mouth) instead of a rectangle with a bite.
 *
 * ```text
 *        col 0            col 1            col 2
 * row 0  command          command          command
 * row 1  command          supply           command   ← foreign enclosed on 3 sides
 * row 2  command          people ·1        people ·2
 * ```
 */
export function buildMockupStaffFloodData(): DiagramData {
  const base = withLooseSeat(buildMockupStaffFigmaData());
  const cells: Record<string, { col: number; row: number }> = {
    // Managing org keeps the plain command block.
    'pos-hq-head': { col: 1, row: 0 },
    'pos-hq-1z': { col: 0, row: 1 },
    'pos-hq-2z': { col: 1, row: 1 },
    'pos-hq-cos': { col: 2, row: 1 },
    // Current org — command wraps the supply seat.
    'pos-head': { col: 1, row: 0 },
    'pos-1z': { col: 0, row: 0 },
    'pos-2z': { col: 2, row: 0 },
    'pos-ops': { col: 0, row: 1 },
    'pos-sup': { col: 1, row: 1 },
    'pos-loose': { col: 0, row: 2 },
    'pos-p1': { col: 1, row: 2 },
    'pos-p2': { col: 2, row: 2 },
  };
  const extra = staffPosition(
    {
      id: 'pos-cmd-right',
      title: 'Shift supervisor',
      organizationId: 'region',
      departmentId: 'exec',
      personId: 'p-2z',
      gridCell: { col: 2, row: 1 },
    },
    FIGMA_SEAT,
  );
  const withCells = base.positions.map((p) => {
    const gridCell = cells[p.id];
    return gridCell ? { ...p, gridCell } : p;
  });
  return {
    ...base,
    positions: [...withCells, extra],
    reportLines: [...base.reportLines, { fromId: 'pos-head', toId: 'pos-cmd-right', kind: 'admin' }],
  };
}

/** GoJS staff: landscape row seats (production card). */
export function buildMockupStaffGojsData(): DiagramData {
  return buildStaffTopology({ width: 200, height: 98 }, true);
}
