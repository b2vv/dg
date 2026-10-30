// The staff canvas's *live geometry* — layout, zone bands and routed edges — in
// one pure computation, so the Pixi renderer and the golden regression test run
// the SAME code instead of two copies that can drift (the reason this module
// exists: a hand-reproduced pipeline in the test guards a parallel copy, not the
// renderer). `DiagramRenderer.renderStaffCanvas` composes these pieces and then
// paints them; here they are composed and returned as data, with no paint.
//
// T126 R7 A4.2b: the geometry now comes from Rust (`computeStaffGeometryWasm`),
// the single source (T66 V2a). This module is the render-layer glue around it —
// resolve options/padding/dock-hints, build the Rust input, call the bridge, and
// adapt the result back into the render shapes. The old TS pipeline
// (`layoutStaffCanvas` + `enrichStaffTierBands` + `resolveStaffRouting`) is gone
// from the render path; it lives on only in the golden's Seam-A capture until A4.4
// removes it.
//
// Single LOD per call, matching the renderer (it paints one `options.lod`); a
// caller that needs several — the golden captures near/mid/far — calls once per
// LOD. The `RenderOptions` import is type-only, as in `staffLayoutInputs.ts`, so
// the cycle with `DiagramRenderer` is erased at runtime.
import type { DiagramData } from '../data/types.js';
import type { StaffEdgeBox, StaffEdgeSegment } from '../layout/staffEdgeGeometry.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  StaffLayoutError,
  type StaffCanvasResult,
  type StaffLayoutOptions,
  type StaffTierBand,
} from '../layout/staff/types.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import { positionHasCoords } from '../layout/staff/coords.js';
import { resolveStaffHead } from '../layout/staff/resolveHead.js';
import { resolveDeptHeads } from '../layout/staff/resolveDeptHeads.js';
import { computeStaffGeometryWasm } from '../wasm/layoutBridge.js';
import { adaptStaffGeometry } from './adaptStaffGeometry.js';
import {
  buildStaffLayoutInput,
  capExpandedChildren,
  resolveMetrics,
  staffExpandCeilingDiagnostics,
} from './buildStaffLayoutInput.js';
import { buildStaffDockHints } from './buildStaffDockHints.js';
import { contourButtonGroupMargin } from './contour/contourButtonGroup.js';
import type { LodLevel } from './lod.js';
import type { RenderOptions } from './DiagramRenderer.js';
import { buildStaffLayoutOptions } from './staffLayoutInputs.js';
import { enrichStaffTierBands } from './staffZoneBounds.js';
import { resolveStaffRouting } from './staffRouterV2.js';
import { defaultRenderConfig, type NodeTheme, type RenderConfig } from './types.js';

export interface StaffLiveGeometryInput {
  data: DiagramData;
  currentOrgId: string;
  theme: NodeTheme;
  resolvedTheme: 'light' | 'dark';
  config: RenderConfig;
  staff: RenderOptions['staff'];
  lod: LodLevel;
}

export interface StaffLiveGeometry {
  canvas: StaffCanvasResult;
  staffOptions: StaffLayoutOptions;
  /** Strip reserved above content for the zone's own label (T94). */
  zoneLabelBand: number;
  /** How far a department wrapper sticks out past its seats. */
  contentPadding: number;
  /** Enriched tier bands (x/width/y/height/label); empty when zone chrome is off. */
  zones: StaffTierBand[];
  /** Routed edge segments for `lod`. */
  routes: StaffEdgeSegment[];
  /** Edges still intruding a foreign department frame after routing (v2 only). */
  markedCrossings: Array<{ fromId: string; toId: string }>;
}

/** The org block wraps the department wrappers, not the bare seats. */
export function departmentWrapperPadding(theme: NodeTheme, config: RenderConfig): number {
  const style = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
  if (style === 'card') {
    const card = theme.departmentCard;
    const padding = card?.padding ?? 8;
    return padding + (card?.labelRow ? (card.labelFontSize ?? 12) + 6 : 0);
  }
  return contourButtonGroupMargin(config.paddingCells ?? 0, theme.department.strokeWidth);
}

/**
 * Can the current org be laid out as a tree — i.e. does it have a resolvable
 * staff head (one `isHead`, or exactly one parentless position)? Rust computes
 * ONLY `tree` coord-mode; a matrix/headless scene (free `gridCell` placement, no
 * head) has no tree head and must stay on the TS layout path. A routing probe,
 * not an error-catch fallback: only the `StaffLayoutError` «no head» class routes
 * to TS; the TS path's own tree branch still throws for a headless *tree* scene.
 */
function staffHeadResolvable(data: DiagramData, currentOrgId: string): boolean {
  try {
    resolveStaffHead(data.positions, currentOrgId, data.reportLines);
    return true;
  } catch (err) {
    if (err instanceof StaffLayoutError) return false;
    throw err;
  }
}

/**
 * Is the current org a *genuine tree* — the only shape Rust lays out?
 *
 * `resolveStaffHead` alone is too weak a gate: a lone position with an authored
 * `gridCell` and no hierarchy resolves as "head" (the single parentless seat),
 * so the head-only gate routed that *matrix* scene through tree-only Rust, which
 * gives every seat the `tree` role — and a `tree` role drags to re-parent, not to
 * a grid cell, so the drop never fires (personDrag contract, T77-M05).
 *
 * A scene is a tree when it has NO authored coordinates (pure hierarchy), or when
 * it carries a real hierarchy signal anyway — an explicit `isHead`, or an admin
 * reporting line among its seats. A bare coordinate placement with neither is a
 * matrix scene and stays on the TS layout path, which honours the grid and keeps
 * the `matrix` role (drag = move). Every captured golden tab has an explicit
 * `isHead`, so this leaves their routing (and the dg30 matrix→tree convergence
 * for the coords tabs) byte-identical; it only reclaims the headless-matrix
 * fixtures the weak gate had misrouted.
 */
function isGenuineTreeScene(data: DiagramData, currentOrgId: string): boolean {
  const inOrg = data.positions.filter((p) => p.organizationId === currentOrgId);
  if (!inOrg.some(positionHasCoords)) return true;
  if (inOrg.some((p) => p.isHead === true)) return true;
  const ids = new Set(inOrg.map((p) => p.id));
  return data.reportLines.some(
    (r) => r.kind === 'admin' && r.fromId !== r.toId && ids.has(r.fromId) && ids.has(r.toId),
  );
}

export async function computeStaffLiveGeometry(
  input: StaffLiveGeometryInput,
): Promise<StaffLiveGeometry> {
  const { data, currentOrgId, theme, resolvedTheme, config, staff, lod } = input;

  const { options: staffOptions, zoneLabelBand } = buildStaffLayoutOptions(
    theme,
    config,
    resolvedTheme,
    staff,
  );
  const contentPadding = departmentWrapperPadding(theme, config);

  // Rust implements only `tree` coord-mode (`staff_layout.rs`: «matrix/hybrid — TS
  // adapter»). A *genuine tree* scene — the golden demo tabs, converging matrix→tree
  // as dg30 requires — goes to Rust; a matrix/headless scene (interaction and
  // contract fixtures: free `gridCell`, no hierarchy) stays on the TS layout path
  // until Rust gains matrix (A4.4+). The FORK2 migration dropped this gate (routed
  // everything through tree-only Rust → «cannot resolve staff head» on matrix
  // fixtures); this restores it. Both conditions are needed: `staffHeadResolvable`
  // keeps Rust from throwing on a headless scene, and `isGenuineTreeScene` keeps a
  // lone authored-grid seat (head-resolvable but matrix) off the tree path that
  // would break its drag contract. Routing by scene shape, NOT an error-catch of
  // the Rust call.
  const useRust =
    staffHeadResolvable(data, currentOrgId) && isGenuineTreeScene(data, currentOrgId);
  return useRust
    ? computeViaRust({ data, currentOrgId, theme, config, staffOptions, zoneLabelBand, contentPadding, lod })
    : computeViaTs({ data, currentOrgId, theme, config, staffOptions, zoneLabelBand, contentPadding, lod });
}

interface BranchInput {
  data: DiagramData;
  currentOrgId: string;
  theme: NodeTheme;
  config: RenderConfig;
  staffOptions: StaffLayoutOptions;
  zoneLabelBand: number;
  contentPadding: number;
  lod: LodLevel;
}

/** Tree scenes: the single Rust source (T66 V2a). */
async function computeViaRust(input: BranchInput): Promise<StaffLiveGeometry> {
  const { data, currentOrgId, theme, config, staffOptions, zoneLabelBand, contentPadding, lod } = input;
  const metrics = resolveMetrics(staffOptions, contentPadding);

  // Dock hints are resolved in the render layer (seat chrome geometry) and fed to
  // Rust, which does its own LOD boxing — without them figma/gojs ports would sit
  // on the full cell box. A safe superset over all positions (Rust keys by id).
  const dockHints = buildStaffDockHints(data, metrics, theme.person);

  const result = await computeStaffGeometryWasm(
    buildStaffLayoutInput({ data, currentOrgId, options: staffOptions, lod, contentPadding, dockHints }),
  );

  // The cap is the adapter's to enforce and diagnose (Rust applies `expandedOrgIds`
  // as-is): the capped children drive the orgCard `expanded` flag, and the ceiling
  // diagnostic is prepended to the Rust diagnostics.
  const { cappedChildren } = capExpandedChildren(data, currentOrgId, staffOptions);
  const { canvas, zones, routes, markedCrossings } = adaptStaffGeometry({
    result,
    data,
    cappedExpandedOrgIds: new Set(cappedChildren),
    staffZoneChrome: config.staffZoneChrome === true,
    capDiagnostics: staffExpandCeilingDiagnostics(data, currentOrgId, staffOptions),
  });

  return { canvas, staffOptions, zoneLabelBand, contentPadding, zones, routes, markedCrossings };
}

/**
 * Matrix/headless scenes: the TS layout path (`layoutStaffCanvas` branches
 * matrix-vs-tree per org block). Restored from pre-FORK2 `computeStaffLiveGeometry`
 * until Rust gains matrix (A4.4+). Same single routing seam (`resolveStaffRouting`)
 * as the SVG export, so link points cannot drift.
 */
async function computeViaTs(input: BranchInput): Promise<StaffLiveGeometry> {
  const { data, currentOrgId, theme, config, staffOptions, zoneLabelBand, contentPadding, lod } = input;

  const canvas = await layoutStaffCanvas(
    {
      organizations: data.organizations,
      positions: data.positions,
      reports: data.reportLines,
      groups: data.groups,
      departments: data.departments,
      persons: data.persons,
    },
    currentOrgId,
    staffOptions,
  );

  const margin = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOptions }.margin;
  const zones = config.staffZoneChrome
    ? enrichStaffTierBands(canvas.tiers, canvas.positionNodes, canvas.orgCards, data.organizations, {
        margin,
        canvasWidth: canvas.width,
        contentPadding,
        labelBand: zoneLabelBand,
      })
    : [];

  const orgCardBoxes: StaffEdgeBox[] = canvas.orgCards.map((c) => ({
    id: c.orgId,
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
  }));
  const positionById = new Map(data.positions.map((p) => [p.id, p]));
  const deptHeadById = resolveDeptHeads(data.positions, data.reportLines);

  const routed = resolveStaffRouting({
    router: config.staffEdgeRouter === 'v2' ? 'v2' : 'legacy',
    positionNodes: canvas.positionNodes,
    edges: canvas.edges,
    positionById,
    personTheme: theme.person,
    lod,
    orgCards: orgCardBoxes,
    deptHeadById,
  });

  return {
    canvas,
    staffOptions,
    zoneLabelBand,
    contentPadding,
    zones,
    routes: routed.routedSegments,
    markedCrossings: routed.markedCrossings,
  };
}
