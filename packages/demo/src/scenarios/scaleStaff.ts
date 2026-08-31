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
  /**
   * One past the last **tier-2** seat in the window.
   *
   * Not `startIndex + windowSize`: `windowSize` counts every materialised
   * position across all three tiers, so using it as an end printed a range that
   * ran past the tier — `window 700004…700033 / 1000000` on a tier that stops
   * at 700 004.
   */
  endIndex: number;
  focusIndex: number;
  /** Tier the focus index lands in — the window can only centre on `current`. */
  focusTier: ScaleStaffTier;
  /** True when the focus seat is materialized and marked with a testId. */
  focusMaterialized: boolean;
  startIndex: number;
  /**
   * First index of the wall's top row. The camera compensation on a rebuild is
   * `(wallBase - previousWallBase) / STAFF_SCALE_COLS` rows — without this the
   * host cannot tell how far the frame of reference moved.
   */
  wallBase: number;
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

/**
 * Which seat indices carry exactly this name.
 *
 * `personName` is `FIRST[i % 10] + LAST[(i >> 2) % 10]`, so a name pins two
 * congruences on one index: `i ≡ f (mod 10)` and `⌊i/4⌋ ≡ l (mod 10)`. Their
 * periods are 10 and 40, so the pair repeats every 40 — and inside one period
 * a realizable pair has exactly one solution. The matches are therefore an
 * arithmetic sequence `first + 40k`, which is why a million-row search needs no
 * index and no scan.
 *
 * Only **40 of the 100** name pairs are reachable at all: the two congruences
 * are not independent, since `⌊i/4⌋` moves four times slower than `i`. The one
 * named in `spec.md` — «Morgan Blake» — is one of the sixty that no index
 * produces, which is why looking for it returns nothing rather than the ten
 * thousand the spec expected.
 */
export function scaleStaffNameMatches(
  query: string,
  total = STAFF_SCALE_TOTAL,
): { first: number; step: number; count: number } | null {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return null;
  const step = 4 * LAST.length;
  for (let r = 0; r < step; r += 1) {
    if (personName(r).toLowerCase() !== wanted) continue;
    const count = Math.max(0, Math.ceil((total - r) / step));
    return { first: r, step, count };
  }
  return null;
}

/** One page of name matches, without materialising the ones before it. */
export function scaleStaffNamePage(
  query: string,
  page: number,
  size: number,
  total = STAFF_SCALE_TOTAL,
): { indices: number[]; total: number; hasMore: boolean } {
  const match = scaleStaffNameMatches(query, total);
  if (!match) return { indices: [], total: 0, hasMore: false };
  const from = page * size;
  const take = Math.max(0, Math.min(size, match.count - from));
  const indices = Array.from({ length: take }, (_, k) => match.first + (from + k) * match.step);
  return { indices, total: match.count, hasMore: from + take < match.count };
}

/** The generated name of a seat — exported so tests can check the inversion. */
export function scaleStaffPersonName(index: number): string {
  return personName(index);
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

/**
 * Start of the tier-2 wall, snapped **down to a whole grid row**.
 *
 * The snap is what makes a seat's column absolute: with `base` a multiple of
 * `STAFF_SCALE_COLS`, `(i - base) % COLS === i % COLS`, so panning never moves a
 * seat sideways. Only the row stays window-relative, and only ever by whole
 * rows — which is exactly the quantity the camera is shifted back by when the
 * window is rebuilt, so the content on screen does not move at all.
 *
 * Absolute rows were the other candidate and were measured, not guessed: at the
 * default focus the row is ~14 570, and `coords.ts:61` turns that into
 * `y = row * pitchY` ≈ 730 000 px. The scene becomes as tall as the address
 * space, `fitView` zooms out past anything visible, and tier 1 ends up 700 000 px
 * from tier 2. Relative rows plus a camera shift keep the world small.
 */
export function snapWallBase(start: number): number {
  return Math.floor(start / STAFF_SCALE_COLS) * STAFF_SCALE_COLS;
}

/**
 * Grid cell of a current-org seat.
 *
 * Row 0 is reserved for the pinned head, so the wall starts at row 1.
 */
export function cellOfSeat(index: number, wallBase: number): { col: number; row: number } {
  return {
    col: index % STAFF_SCALE_COLS,
    row: Math.floor((index - wallBase) / STAFF_SCALE_COLS) + 1,
  };
}

/**
 * Tier 2 — the window of current-org seats the viewport actually draws.
 *
 * Two things here are deliberately **not** derived from `range.start`, because
 * a window that slides must not move what it merely scrolls past:
 *
 * 1. **The cell.** `cellOfSeat` reads the absolute address, so a seat keeps its
 *    column and row whatever the window start is. Deriving it from `i - start`
 *    made a one-seat slide re-flow all 600 cards under a camera that never moved.
 * 2. **The head.** `isHead` is structural — exactly one per org, and
 *    `resolveHead` throws otherwise — so it cannot simply be dropped. It is
 *    pinned to the first seat of the tier, which keeps the same person in charge
 *    however far the window travels; previously the boss changed as you panned.
 *
 * The pinned head is the one card whose cell *does* ride with the window: it sits
 * in its own row directly above the wall, so it stays on screen and every report
 * line keeps both ends in the scene. Its identity is fixed; only its seat is.
 */
function currentTier(range: { start: number; end: number; leadSeats: number }, focusIndex: number): TierSeats {
  const tier = emptyTier();
  const headIndex = range.leadSeats;
  const headId = `pos-${headIndex}`;
  const headInWall = headIndex >= range.start && headIndex < range.end;
  const wallBase = snapWallBase(range.start);

  if (!headInWall) {
    pushSeat(tier, headIndex, {
      id: headId,
      title: `${seatTitle(headIndex)} · head`,
      organizationId: 'current-org',
      departmentId: departmentOfSeat(headIndex - range.leadSeats),
      isHead: true,
      // Its own row above the wall, so it never collides with a real cell.
      gridCell: { col: 0, row: 0 },
    });
  }

  for (let i = range.start; i < range.end; i += 1) {
    pushSeat(tier, i, {
      id: `pos-${i}`,
      title: i === focusIndex ? `${seatTitle(i)} · focus` : seatTitle(i),
      organizationId: 'current-org',
      departmentId: departmentOfSeat(i - range.leadSeats),
      isHead: i === headIndex,
      gridCell: cellOfSeat(i, wallBase),
      testId: i === focusIndex ? 'scale-focus-seat' : undefined,
    });
    if (i !== headIndex) tier.reportLines.push({ fromId: headId, toId: `pos-${i}`, kind: 'admin' });
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
  /**
   * Build at this index instead of centring on the focus.
   *
   * A window that follows the camera is given a range, not a point: centring
   * would drag it back to the middle on every rebuild and fight the pan.
   */
  startIndex?: number;
} = {}): ScaleStaffWindow {
  const t0 = typeof performance === 'undefined' ? Date.now() : performance.now();
  const total = options.total ?? STAFF_SCALE_TOTAL;
  const composition = scaleStaffComposition(total);
  const windowSize = Math.min(options.windowSize ?? STAFF_SCALE_WINDOW, composition.current);
  const focusIndex = Math.max(0, Math.min(options.focusIndex ?? 0, total - 1));
  const expandedOrgId = options.expandedOrgId ?? 'sub-0';

  // The window can only centre inside tier 2: a lead or subordinate index still
  // renders, but `focusMaterialized` reports that no seat carries the marker.
  const focusTier = tierOfSeat(focusIndex, total);
  const currentFocus = Math.max(0, Math.min(focusIndex - composition.lead, composition.current - 1));
  const start =
    options.startIndex === undefined
      ? composition.lead + resolveStaffWindowStart(currentFocus, windowSize, composition.current)
      : Math.max(
          composition.lead,
          Math.min(options.startIndex, composition.lead + Math.max(0, composition.current - windowSize)),
        );
  const end = Math.min(composition.lead + composition.current, start + windowSize);
  const subBase = composition.lead + composition.current;

  const tiers = [
    leadTier(composition.lead),
    currentTier({ start, end, leadSeats: composition.lead }, focusIndex),
    subordinateTier(subBase, Math.min(SUBORDINATE_WINDOW, composition.subordinate), expandedOrgId),
  ];
  const positions = tiers.flatMap((t) => t.positions);
  const { organizations: subOrgs, groups } = subordinateOrgs();

  const t1 = typeof performance === 'undefined' ? Date.now() : performance.now();
  return {
    total,
    windowSize: positions.length,
    endIndex: end,
    focusIndex,
    focusTier,
    focusMaterialized: positions.some((p) => p.testId === 'scale-focus-seat'),
    startIndex: start,
    wallBase: snapWallBase(start),
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
