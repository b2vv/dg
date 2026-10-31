// T126 R7 A4.1 — the input adapter.
//
// Builds the Rust `StaffLayoutInput` from `DiagramData` plus the render-layer
// values the data model does not carry (metrics, content padding, measured card
// sizes, dock hints). It is a pure mapping: no geometry is computed here — that
// is exactly what `computeStaffGeometryWasm` now owns. Kept out of the render
// call path until A4.2 wires it, so A4.1 is golden-neutral.
//
// Two deliberate contract points (A4.1 critic):
//   • `contentPadding` is a separate argument, not read from `StaffLayoutOptions`
//     — it is resolved from theme/config in the render layer, not layout options.
//   • a position's sibling `order` is never emitted: `DiagramPosition` has no
//     `order` field, and TS `comparePositions` therefore always sees `undefined`
//     (⟺ 0). Emitting any stand-in would break sort parity with the Rust side.
import type { DiagramData, DiagramPosition, DiagramReportLine } from '../data/types.js';
import { visiblePositions } from '../layout/staff/positionExpand.js';
import { DEFAULT_STAFF_LAYOUT_OPTIONS, type StaffLayoutOptions } from '../layout/staff/types.js';
import type {
  StaffDockHintInput,
  StaffLayoutInput,
  StaffLayoutMetrics,
  StaffNodeSize,
} from '../wasm/layoutBridge.js';
import type { LodLevel } from './lod.js';

/** The slice of `DiagramData` the staff geometry depends on. */
type StaffData = Pick<DiagramData, 'organizations' | 'positions' | 'reportLines' | 'departments'>;

export interface BuildStaffLayoutInputArgs {
  data: StaffData;
  /** Validated non-null focus org (see `resolveStaffCurrentOrgId`). */
  currentOrgId: string;
  /** The same options object `layoutStaffCanvas` receives. */
  options: StaffLayoutOptions;
  lod: LodLevel;
  /**
   * Zone content padding, resolved in the render layer (`departmentWrapperPadding`)
   * — not a `StaffLayoutOptions` field, so it must be passed explicitly.
   */
  contentPadding: number;
  /**
   * DOM-measured card sizes. Default: derived from explicit `position.width`/
   * `.height`; positions without an explicit size are omitted and the Rust side
   * falls back to `StaffLayoutMetrics.nodeWidth/nodeHeight`.
   */
  nodeSizes?: StaffNodeSize[];
  /** Figma/GoJS dock geometry per position, resolved in the render layer. */
  dockHints?: StaffDockHintInput[];
  /** DEV (T128 T8): route via the Rust A* pipeline instead of the detour. Default false. */
  useAstar?: boolean;
  /** DEV (T128 step 1): pack departments as a tidy block-tree instead of the flat row. Default false. */
  treeBlockLayout?: boolean;
  /** DEV (T128 dg37): evaluate parent candidates for multi-source departments to minimize crossings. Default false. */
  multiSourceParentEval?: boolean;
}

export function resolveMetrics(options: StaffLayoutOptions, contentPadding: number): StaffLayoutMetrics {
  const d = DEFAULT_STAFF_LAYOUT_OPTIONS;
  return {
    nodeWidth: options.nodeWidth ?? d.nodeWidth,
    nodeHeight: options.nodeHeight ?? d.nodeHeight,
    refCellWidth: options.refCellWidth ?? d.refCellWidth,
    refCellHeight: options.refCellHeight ?? d.refCellHeight,
    horizontalGap: options.horizontalGap ?? d.horizontalGap,
    verticalGap: options.verticalGap ?? d.verticalGap,
    margin: options.margin ?? d.margin,
    tierGap: options.tierGap ?? d.tierGap,
    orgCardWidth: options.orgCardWidth ?? d.orgCardWidth,
    orgCardHeight: options.orgCardHeight ?? d.orgCardHeight,
    zoneLabelBand: options.zoneLabelBand ?? d.zoneLabelBand,
    contentPadding,
    deptGrouping: options.deptGrouping ?? d.deptGrouping,
  };
}

function deriveNodeSizes(positions: readonly DiagramPosition[], metrics: StaffLayoutMetrics): StaffNodeSize[] {
  const sizes: StaffNodeSize[] = [];
  for (const p of positions) {
    if (p.width === undefined && p.height === undefined) continue;
    // A partial size falls back to the *resolved* metric for the missing
    // dimension, matching TS `positionSize`, so a metrics override is honored.
    sizes.push({
      id: p.id,
      width: p.width ?? metrics.nodeWidth,
      height: p.height ?? metrics.nodeHeight,
    });
  }
  return sizes;
}

/**
 * Tier-1 leadership: the head plus its *direct* admin reports inside its org
 * (SPEC §2.2). Ported from the TS `canvasLayout.leadershipOf`, which A4 removes —
 * the adapter becomes the owner. Depth-1 by construction, which is why collapse and
 * leadership selection commute on it (T66 cross-exam U2).
 */
function leadershipOf(
  headId: string,
  orgPositions: readonly DiagramPosition[],
  reports: readonly DiagramReportLine[],
): DiagramPosition[] {
  const direct = new Set(
    reports.filter((r) => r.kind === 'admin' && r.fromId === headId).map((r) => r.toId),
  );
  return orgPositions.filter((p) => p.id === headId || direct.has(p.id));
}

const resolveMaxExpand = (options: StaffLayoutOptions): number =>
  Math.max(0, options.maxExpandedOrgCards ?? DEFAULT_STAFF_LAYOUT_OPTIONS.maxExpandedOrgCards ?? 1);

interface ExpandCap {
  /** Child orgs that stay expanded after the cap (the only ones to place staff). */
  readonly cappedChildren: string[];
  /** Requested child orgs trimmed by the cap, in request order (diagnostic input). */
  readonly ceilingDropped: string[];
  /**
   * `expandedOrgIds` to forward to Rust: the request minus over-cap children, order
   * preserved. Non-child ids stay so Rust still emits its not-a-child diagnostic; the
   * cap itself (Rust applies the list as-is) is the adapter's to enforce.
   */
  readonly forwardedExpandedOrgIds: string[];
}

/** Partition `expandedOrgIds` against the child set and the expand cap (mirrors `canvasLayout`). */
export function capExpandedChildren(
  data: StaffData,
  currentOrgId: string,
  options: StaffLayoutOptions,
): ExpandCap {
  const requested = options.expandedOrgIds ?? [];
  const childIds = new Set(
    data.organizations.filter((o) => o.parentOrgId === currentOrgId).map((o) => o.id),
  );
  const requestedChildren = requested.filter((id) => childIds.has(id));
  const maxExpand = resolveMaxExpand(options);
  const cappedChildren = requestedChildren.slice(0, maxExpand);
  const ceilingDropped = requestedChildren.slice(maxExpand);
  const dropped = new Set(ceilingDropped);
  return {
    cappedChildren,
    ceilingDropped,
    forwardedExpandedOrgIds: requested.filter((id) => !dropped.has(id)),
  };
}

/**
 * Positions that survive collapse, as the laid-out tiers would show them (T66 V2a:
 * the adapter owns visibility; Rust owns coordinates). One `visiblePositions` pass per
 * rendered org block — managing (tier 1), current (tier 2), each capped-expanded child
 * (tier 3) — concatenated. Per-org order is the BFS order the TS block used; cross-org
 * order is irrelevant (Rust re-filters by `organizationId`).
 *
 * Managing mirrors `canvasLayout` tier 1 exactly (owner decision): with exactly one
 * `isHead` it collapses the *leadership* subset; otherwise the raw positions pass
 * through (inert — Rust tier 1 skips them with its own diagnostic) rather than letting
 * `visiblePositions` throw on an unresolvable head.
 */
function collapseVisiblePositions(
  data: StaffData,
  currentOrgId: string,
  cappedChildren: readonly string[],
  expandedPositionIds: readonly string[],
): DiagramPosition[] {
  const out: DiagramPosition[] = [];

  const managingId = data.organizations.find((o) => o.id === currentOrgId)?.parentOrgId;
  if (managingId && data.organizations.some((o) => o.id === managingId)) {
    const mgrPositions = data.positions.filter((p) => p.organizationId === managingId);
    const heads = mgrPositions.filter((p) => p.isHead === true);
    if (heads.length === 1) {
      const leadership = leadershipOf(heads[0]!.id, mgrPositions, data.reportLines);
      out.push(...visiblePositions(leadership, data.reportLines, managingId, expandedPositionIds));
    } else {
      // 0 or >1 heads: tier 1 is skipped by Rust; keep raw positions (inert).
      out.push(...mgrPositions);
    }
  }

  out.push(...visiblePositions(data.positions, data.reportLines, currentOrgId, expandedPositionIds));

  for (const childId of cappedChildren) {
    out.push(...visiblePositions(data.positions, data.reportLines, childId, expandedPositionIds));
  }

  return out;
}

/**
 * The cap diagnostic `canvasLayout` emitted for child orgs dropped by
 * `maxExpandedOrgCards`. Rust applies `expandedOrgIds` as-is (cap = TS-adapter), so this
 * line must be produced by the adapter and merged into the render diagnostics (A4.2b).
 * Non-child ids are Rust's to diagnose, not the cap's.
 */
export function staffExpandCeilingDiagnostics(
  data: StaffData,
  currentOrgId: string,
  options: StaffLayoutOptions,
): string[] {
  const { ceilingDropped } = capExpandedChildren(data, currentOrgId, options);
  if (ceilingDropped.length === 0) return [];
  return [
    `Tier3 expand ignored (exceeds maxExpandedOrgCards=${resolveMaxExpand(options)}): ${ceilingDropped.join(', ')}`,
  ];
}

/** Map `DiagramData` + render-layer inputs into the Rust `StaffLayoutInput`. */
export function buildStaffLayoutInput(args: BuildStaffLayoutInputArgs): StaffLayoutInput {
  const { data, currentOrgId, options, lod, contentPadding } = args;
  const metrics = resolveMetrics(options, contentPadding);

  const { cappedChildren, forwardedExpandedOrgIds } = capExpandedChildren(data, currentOrgId, options);

  const collapse =
    options.collapseUnexpandedPositions ??
    DEFAULT_STAFF_LAYOUT_OPTIONS.collapseUnexpandedPositions ??
    false;
  const positions = collapse
    ? collapseVisiblePositions(data, currentOrgId, cappedChildren, options.expandedPositionIds ?? [])
    : data.positions;

  // Collapse hides nodes: a matrix/dotted line to one would route to nothing. Admin lines
  // are left to Rust's own guards (org-scoped children map + global admin-parent map).
  const visibleIds = new Set(positions.map((p) => p.id));
  const reports = collapse
    ? data.reportLines.filter(
        (r) => r.kind === 'admin' || (visibleIds.has(r.fromId) && visibleIds.has(r.toId)),
      )
    : data.reportLines;

  return {
    currentOrgId,
    positions: positions.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      isHead: p.isHead === true,
      departmentId: p.departmentId,
    })),
    reports: reports.map((r) => ({ fromId: r.fromId, toId: r.toId, kind: r.kind })),
    organizations: data.organizations.map((o) => ({ id: o.id, parentOrgId: o.parentOrgId })),
    departments: data.departments.map((d) => ({ id: d.id, order: d.order })),
    nodeSizes: args.nodeSizes ?? deriveNodeSizes(positions, metrics),
    options: metrics,
    dockHints: args.dockHints ?? [],
    expandedOrgIds: [...forwardedExpandedOrgIds],
    lod,
    ...(args.useAstar ? { useAstar: true } : {}),
    ...(args.treeBlockLayout ? { treeBlockLayout: true } : {}),
    ...(args.multiSourceParentEval ? { multiSourceParentEval: true } : {}),
  };
}
