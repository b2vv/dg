import type { DiagramData, DiagramPosition } from '@org-hierarchy/sdk';

/**
 * 1M staff positions across the three staff tiers.
 *
 * The address space is virtual: a viewport materializes a **window** of seats,
 * never a million objects (that alone would be hundreds of megabytes before
 * Pixi ever sees it). Same trick as the 100k orgs tab — the status line reports
 * window and total so the demo never claims to draw more than it does.
 *
 * ```text
 * tier 1  lead org            seats [0, LEAD_SEATS)
 * tier 2  current org         seats [LEAD_SEATS, LEAD_SEATS + CURRENT_SEATS)
 * tier 3  subordinate orgs    the rest — half of them inside groups, half simple
 * ```
 */
export const STAFF_SCALE_TOTAL = 1_000_000;

/** Seats materialized for one viewport window (tier 2). */
export const STAFF_SCALE_WINDOW = 600;

/** Grid width of the current-org block; magnetism reads these cells. */
export const STAFF_SCALE_COLS = 24;

/** Tier-1 leadership: head + three deputies. */
export const LEAD_SEATS = 4;

/** Share of the address space that belongs to the current org (tier 2). */
export const CURRENT_SEATS = 700_000;

/** Subordinate org cards in tier 3 — the first half sit in groups. */
export const SUBORDINATE_ORGS = 12;
export const SUBORDINATE_GROUPS = 2;

/** Seats shown under an expanded tier-3 card. */
export const SUBORDINATE_WINDOW = 24;

/**
 * Where the tab opens: the middle of the current org, so the first view is the
 * tier-2 wall of seats rather than the four-seat lead block.
 */
export const STAFF_SCALE_DEFAULT_FOCUS = LEAD_SEATS + Math.floor(CURRENT_SEATS / 2);

/** Departments cycled through the current org. */
const DEPARTMENTS = 8;
/** Consecutive seats sharing a department — long runs make readable contours. */
const DEPARTMENT_RUN = 12;
/** Every n-th seat carries no department, like a real roster. */
const NO_DEPARTMENT_EVERY = 17;

const FIRST = ['Avery', 'Jordan', 'Morgan', 'Casey', 'Taylor', 'Jamie', 'Noel', 'Sasha', 'Dana', 'Riley'];
const LAST = ['Chen', 'Blake', 'Lee', 'Nguyen', 'Brooks', 'Ortiz', 'Farrow', 'Ilves', 'Whitfield', 'Quinn'];
const ROLE = ['Coordinator', 'Analyst', 'Adviser', 'Specialist', 'Lead', 'Planner'];

export interface ScaleStaffComposition {
  lead: number;
  current: number;
  subordinate: number;
  groups: number;
  simpleOrgs: number;
}

/** Which tier a seat index belongs to. */
export type ScaleStaffTier = 'lead' | 'current' | 'subordinate';

export interface ScaleStaffWindow {
  total: number;
  /** Seats actually materialized (all tiers). */
  windowSize: number;
  focusIndex: number;
  /** Tier the focus index lands in — the window can only centre on `current`. */
  focusTier: ScaleStaffTier;
  /** True when the focus seat is materialized and marked with a testId. */
  focusMaterialized: boolean;
  startIndex: number;
  buildMs: number;
  composition: ScaleStaffComposition;
  data: DiagramData;
}

/** Tier of a seat index in the virtual address space. */
export function tierOfSeat(index: number, total = STAFF_SCALE_TOTAL): ScaleStaffTier {
  const composition = scaleStaffComposition(total);
  if (index < composition.lead) return 'lead';
  if (index < composition.lead + composition.current) return 'current';
  return 'subordinate';
}

export function scaleStaffComposition(total = STAFF_SCALE_TOTAL): ScaleStaffComposition {
  const current = Math.min(CURRENT_SEATS, Math.max(0, total - LEAD_SEATS));
  return {
    lead: Math.min(LEAD_SEATS, total),
    current,
    subordinate: Math.max(0, total - LEAD_SEATS - current),
    groups: SUBORDINATE_GROUPS,
    // Half the subordinate cards sit in groups, the other half stand alone.
    simpleOrgs: SUBORDINATE_ORGS / 2,
  };
}

function personName(index: number): string {
  return `${FIRST[index % FIRST.length]} ${LAST[(index >> 2) % LAST.length]}`;
}

function seatTitle(index: number): string {
  return `${ROLE[index % ROLE.length]} ${index}`;
}

/** Department of a current-org seat, or `undefined` for the loose ones. */
export function departmentOfSeat(localIndex: number): string | undefined {
  if (localIndex % NO_DEPARTMENT_EVERY === 0) return undefined;
  return `dept-${Math.floor(localIndex / DEPARTMENT_RUN) % DEPARTMENTS}`;
}

/** Subordinate org of a tier-3 seat — first half of the orgs sit in groups. */
export function subordinateOrgOfSeat(subIndex: number): string {
  return `sub-${subIndex % SUBORDINATE_ORGS}`;
}

export function resolveStaffWindowStart(
  focusIndex: number,
  windowSize: number,
  total: number,
): number {
  const size = Math.min(windowSize, total);
  let start = focusIndex - Math.floor(size / 2);
  if (start < 0) start = 0;
  if (start + size > total) start = Math.max(0, total - size);
  return start;
}

/** Parse «pos-123456» / «123456» into a seat index, or null. */
export function parseScaleStaffQuery(query: string, total = STAFF_SCALE_TOTAL): number | null {
  const q = query.trim().toLowerCase();
  const m = /^pos-?(\d+)$/.exec(q) ?? /^(\d+)$/.exec(q);
  if (!m) return null;
  const index = Number(m[1]);
  if (!Number.isFinite(index) || index < 0 || index >= total) return null;
  return index;
}

function seat(
  id: string,
  title: string,
  organizationId: string,
  extra: Partial<DiagramPosition> = {},
): DiagramPosition {
  return {
    id,
    title,
    organizationId,
    groupIds: [],
    status: 'filled',
    isTemporary: false,
    ...extra,
  };
}

/**
 * Materialize the scene for one focus seat: the whole (tiny) lead tier, a window
 * of the current org around the focus, and every subordinate card with a slice
 * of the focused one's staff.
 */
interface TierSeats {
  positions: DiagramPosition[];
  persons: DiagramData['persons'];
  reportLines: DiagramData['reportLines'];
}

function emptyTier(): TierSeats {
  return { positions: [], persons: [], reportLines: [] };
}

function pushSeat(
  tier: TierSeats,
  index: number,
  position: Omit<DiagramPosition, 'groupIds' | 'status' | 'isTemporary' | 'personId'>,
): void {
  tier.persons.push({ id: `person-${index}`, fullName: personName(index) });
  tier.positions.push(seat(position.id, position.title, position.organizationId, {
    ...position,
    personId: `person-${index}`,
  }));
}

/** Tier 1 — the lead org's leadership: head plus its direct reports. */
function leadTier(seats: number): TierSeats {
  const tier = emptyTier();
  for (let i = 0; i < seats; i += 1) {
    pushSeat(tier, i, {
      id: `pos-${i}`,
      title: i === 0 ? 'Group director' : seatTitle(i),
      organizationId: 'lead-org',
      departmentId: 'lead-exec',
      isHead: i === 0,
      gridCell: { col: i === 0 ? 1 : i - 1, row: i === 0 ? 0 : 1 },
      testId: i === 0 ? 'scale-lead-head' : undefined,
    });
    if (i > 0) tier.reportLines.push({ fromId: 'pos-0', toId: `pos-${i}`, kind: 'admin' });
  }
  return tier;
}

/** Tier 2 — the window of current-org seats the viewport actually draws. */
function currentTier(range: { start: number; end: number; leadSeats: number }, focusIndex: number): TierSeats {
  const tier = emptyTier();
  const headId = `pos-${range.start}`;
  for (let i = range.start; i < range.end; i += 1) {
    const local = i - range.start;
    pushSeat(tier, i, {
      id: `pos-${i}`,
      title: i === focusIndex ? `${seatTitle(i)} · focus` : seatTitle(i),
      organizationId: 'current-org',
      departmentId: departmentOfSeat(i - range.leadSeats),
      isHead: i === range.start,
      gridCell: { col: local % STAFF_SCALE_COLS, row: Math.floor(local / STAFF_SCALE_COLS) },
      testId: i === focusIndex ? 'scale-focus-seat' : undefined,
    });
    if (i !== range.start) tier.reportLines.push({ fromId: headId, toId: `pos-${i}`, kind: 'admin' });
  }
  tier.reportLines.push({ fromId: 'pos-0', toId: headId, kind: 'dotted' });
  return tier;
}

/** Tier 3 — the slice of staff shown under the expanded subordinate card. */
function subordinateTier(base: number, seats: number, orgId: string): TierSeats {
  const tier = emptyTier();
  for (let k = 0; k < seats; k += 1) {
    const i = base + k;
    pushSeat(tier, i, {
      id: `pos-${i}`,
      title: seatTitle(i),
      organizationId: orgId,
      departmentId: k % NO_DEPARTMENT_EVERY === 0 ? undefined : `sub-dept-${k % 3}`,
      isHead: k === 0,
      gridCell: { col: k % 6, row: Math.floor(k / 6) },
    });
    if (k > 0) tier.reportLines.push({ fromId: `pos-${base}`, toId: `pos-${i}`, kind: 'admin' });
  }
  return tier;
}

/** Tier-3 cards: the first half sit in groups, the rest stand alone. */
function subordinateOrgs(): { organizations: DiagramData['organizations']; groups: DiagramData['groups'] } {
  const groups = Array.from({ length: SUBORDINATE_GROUPS }, (_, g) => ({
    id: `sub-group-${g}`,
    name: `Group ${g + 1}`,
  }));
  const grouped = SUBORDINATE_ORGS / 2;
  const organizations = Array.from({ length: SUBORDINATE_ORGS }, (_, s) => ({
    id: `sub-${s}`,
    name: s < grouped ? `Grouped unit ${s}` : `Simple unit ${s}`,
    parentOrgId: 'current-org',
    groupIds: s < grouped ? [`sub-group-${s % SUBORDINATE_GROUPS}`] : [],
    collapsed: false,
    testId: s === 0 ? ('scale-sub-first' as const) : undefined,
  }));
  return { organizations, groups };
}

function departmentsFor(expandedOrgId: string): DiagramData['departments'] {
  return [
    { id: 'lead-exec', name: 'Executive office', organizationId: 'lead-org' },
    ...Array.from({ length: DEPARTMENTS }, (_, d) => ({
      id: `dept-${d}`,
      name: `Department ${d}`,
      organizationId: 'current-org',
    })),
    ...Array.from({ length: 3 }, (_, d) => ({
      id: `sub-dept-${d}`,
      name: `Unit desk ${d}`,
      organizationId: expandedOrgId,
    })),
  ];
}

/**
 * Materialize the scene for one focus seat: the whole (tiny) lead tier, a window
 * of the current org around the focus, and every subordinate card with a slice
 * of the expanded one's staff.
 */
export function buildScaleStaffWindow(options: {
  total?: number;
  windowSize?: number;
  focusIndex?: number;
  expandedOrgId?: string;
} = {}): ScaleStaffWindow {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const total = options.total ?? STAFF_SCALE_TOTAL;
  const composition = scaleStaffComposition(total);
  const windowSize = Math.min(options.windowSize ?? STAFF_SCALE_WINDOW, composition.current);
  const focusIndex = Math.max(0, Math.min(options.focusIndex ?? 0, total - 1));
  const expandedOrgId = options.expandedOrgId ?? 'sub-0';

  // The window can only centre inside tier 2: a lead or subordinate index still
  // renders, but `focusMaterialized` reports that no seat carries the marker.
  const focusTier = tierOfSeat(focusIndex, total);
  const currentFocus = Math.max(0, Math.min(focusIndex - composition.lead, composition.current - 1));
  const start = composition.lead + resolveStaffWindowStart(currentFocus, windowSize, composition.current);
  const end = Math.min(composition.lead + composition.current, start + windowSize);
  const subBase = composition.lead + composition.current;

  const tiers = [
    leadTier(composition.lead),
    currentTier({ start, end, leadSeats: composition.lead }, focusIndex),
    subordinateTier(subBase, Math.min(SUBORDINATE_WINDOW, composition.subordinate), expandedOrgId),
  ];
  const positions = tiers.flatMap((t) => t.positions);
  const { organizations: subOrgs, groups } = subordinateOrgs();

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    total,
    windowSize: positions.length,
    focusIndex,
    focusTier,
    focusMaterialized: positions.some((p) => p.testId === 'scale-focus-seat'),
    startIndex: start,
    buildMs: Math.round(t1 - t0),
    composition,
    data: {
      organizations: [
        { id: 'lead-org', name: 'Lumen Holdings', groupIds: [], collapsed: false },
        {
          id: 'current-org',
          name: 'Pacific Region',
          parentOrgId: 'lead-org',
          groupIds: [],
          collapsed: false,
          testId: 'scale-current-org',
        },
        ...subOrgs,
      ],
      groups,
      departments: departmentsFor(expandedOrgId),
      persons: tiers.flatMap((t) => t.persons),
      positions,
      reportLines: tiers.flatMap((t) => t.reportLines),
      orgLinks: [],
    },
  };
}
