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
import type { DiagramData } from '../data/types.js';
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
}

function resolveMetrics(options: StaffLayoutOptions, contentPadding: number): StaffLayoutMetrics {
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

function deriveNodeSizes(data: StaffData, metrics: StaffLayoutMetrics): StaffNodeSize[] {
  const sizes: StaffNodeSize[] = [];
  for (const p of data.positions) {
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

/** Map `DiagramData` + render-layer inputs into the Rust `StaffLayoutInput`. */
export function buildStaffLayoutInput(args: BuildStaffLayoutInputArgs): StaffLayoutInput {
  const { data, currentOrgId, options, lod, contentPadding } = args;
  const metrics = resolveMetrics(options, contentPadding);

  return {
    currentOrgId,
    positions: data.positions.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      isHead: p.isHead === true,
      departmentId: p.departmentId,
    })),
    reports: data.reportLines.map((r) => ({ fromId: r.fromId, toId: r.toId, kind: r.kind })),
    organizations: data.organizations.map((o) => ({ id: o.id, parentOrgId: o.parentOrgId })),
    departments: data.departments.map((d) => ({ id: d.id, order: d.order })),
    nodeSizes: args.nodeSizes ?? deriveNodeSizes(data, metrics),
    options: metrics,
    dockHints: args.dockHints ?? [],
    expandedOrgIds: [...(options.expandedOrgIds ?? [])],
    lod,
  };
}
