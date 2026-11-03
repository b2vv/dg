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
  type StaffNodeBox,
  type StaffTierBand,
} from '../layout/staff/types.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import { positionHasCoords } from '../layout/staff/coords.js';
import { resolveStaffHead } from '../layout/staff/resolveHead.js';
import { visiblePositions } from '../layout/staff/positionExpand.js';
import { resolveDeptHeads } from '../layout/staff/resolveDeptHeads.js';
import {
  computeStaffGeometryWasm,
  computeStaffMockupLayoutWasm,
  type StaffMockupInput,
} from '../wasm/layoutBridge.js';
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

/** Department frame in world coords — the single geometry source (Rust mockup
 *  layout). The React near-view chrome draws from these; empty off the alpha path. */
export interface StaffFrameBox {
  departmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  /**
   * Department frames in world coords — populated only on the alpha mockup path
   * (from Rust `result.frames`, the single source). Empty elsewhere. The React
   * near-view chrome consumes these so frames and lines share one geometry (no
   * AABB drift, entry dots sit on the frame edge).
   */
  frames: StaffFrameBox[];
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

  // T129 (alpha): the ONLY calculation on this path is the mockup-ported layout.
  // The previous calc (Rust `compute_staff_geometry` via `computeViaRust`, and the
  // TS `layoutStaffCanvas` via `computeViaTs`) is not called here — owner decision
  // 2026-11-01. Coords feed the same surfaces (Pixi far / React mid+near).
  if (config.staffAlphaMockup === true) {
    return computeViaMockup({
      data, currentOrgId, theme, config, staffOptions, zoneLabelBand, contentPadding, lod,
    });
  }

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
    buildStaffLayoutInput({
      data,
      currentOrgId,
      options: staffOptions,
      lod,
      contentPadding,
      dockHints,
      useAstar: config.staffUseAstar === true,
      treeBlockLayout: config.staffTreeBlockLayout === true,
      multiSourceParentEval: config.staffMultiSourceParentEval === true,
    }),
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

  // frames only on the alpha mockup path (Rust `result.frames`); the real staff
  // layout derives dept chrome from member AABB, so none here.
  return {
    canvas,
    staffOptions,
    zoneLabelBand,
    contentPadding,
    zones,
    routes,
    frames: [],
    markedCrossings,
  };
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
    frames: [],
    markedCrossings: routed.markedCrossings,
  };
}

/**
 * Build the Rust mockup-layout input from diagram data for one org — the filtering,
 * admin-edge selection and params in one place so `computeViaMockup` and any future
 * caller can't drift. Internal (not exported): the demo near-view chrome gets the
 * same geometry through `computeStaffLiveGeometry`, not by re-building the input.
 */
function buildStaffMockupInput(
  data: DiagramData,
  currentOrgId: string,
  expandedPositionIds: readonly string[],
): StaffMockupInput {
  // #96: prune the current org's admin tree to the visible set — the role-based
  // default (SPEC §2.2 current org = all unless collapsed) is seeded into
  // `expandedPositionIds` by OrgHierarchyDiagram, and `togglePositionExpand`
  // mutates it. `visiblePositions` filters by org and degrades to all positions
  // when the org has no resolvable head (matrix/headless).
  const inOrg = visiblePositions(data.positions, data.reportLines, currentOrgId, expandedPositionIds);
  const ids = new Set(inOrg.map((p) => p.id));
  // Розмір — на картку (`position.width/height`, калібрує хост); посада без нього бере
  // DG-сидіння 300×112 з `params`. Не розмір першої посади на всіх: так калібровані
  // висоти не мали ефекту.
  const sizes = inOrg
    .filter((p) => p.width !== undefined || p.height !== undefined)
    .map((p) => ({ id: p.id, width: p.width ?? 300, height: p.height ?? 112 }));
  const reports = data.reportLines
    .filter(
      (r) => r.kind === 'admin' && r.fromId !== r.toId && ids.has(r.fromId) && ids.has(r.toId),
    )
    .map((r) => ({ fromId: r.fromId, toId: r.toId, kind: 'admin' as const }));
  return {
    positions: inOrg.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      isHead: p.isHead === true,
      departmentId: p.departmentId,
    })),
    reports,
    departments: data.departments
      .filter((d) => d.organizationId === currentOrgId)
      .map((d) => ({ id: d.id, order: d.order })),
    // routing 'astar' = порт справжнього роутера мокапа (route()/A*, 0 перетинів);
    // 'simple' лишається варіантом порівняння в Rust-бібліотеці.
    params: { pad: 8, lane: 8, cardWidth: 300, cardHeight: 112, headerHeight: 34, routing: 'astar' },
    sizes,
  };
}

/**
 * T129 alpha: staff geometry from ONLY the mockup-ported layout
 * (`computeStaffMockupLayout`, two-level tidy-tree + A* line routing). The old calc
 * is not used on this path. Node coords feed the same `StaffCanvasResult` the
 * surfaces consume; `frames`/`routes` come straight from the Rust result (the single
 * geometry source for both the Pixi-far scene and the React-near chrome).
 */
async function computeViaMockup(input: BranchInput): Promise<StaffLiveGeometry> {
  const { data, currentOrgId, staffOptions, zoneLabelBand, contentPadding } = input;

  const mockInput = buildStaffMockupInput(
    data,
    currentOrgId,
    staffOptions.expandedPositionIds ?? [],
  );
  const result = await computeStaffMockupLayoutWasm(mockInput);

  const positionNodes: StaffNodeBox[] = result.nodes.map((n) => ({
    id: n.id,
    organizationId: currentOrgId,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    role: 'tree',
    tier: 2,
  }));

  const canvas: StaffCanvasResult = {
    currentOrgId,
    tiers: [],
    positionNodes,
    edges: mockInput.reports.map((r) => ({ fromId: r.fromId, toId: r.toId, kind: 'admin' as const })),
    orgCards: [],
    width: result.width,
    height: result.height,
    diagnostics: [],
  };

  // Лінії підпорядкування рахуються в Rust-мокап-бібліотеці (єдине джерело
  // геометрії, ADR-0002) — тут лише адаптація сегментів у render-форму. x1/y1/x2/y2
  // = перша/остання точки ламаної, як чекає StaffEdgesView.
  const routes: StaffEdgeSegment[] = result.edges
    .filter((e) => e.points.length >= 2)
    .map((e) => {
      const points = e.points.map((pt) => ({ x: pt.x, y: pt.y }));
      const first = points[0]!;
      const last = points[points.length - 1]!;
      return {
        fromId: e.fromId,
        toId: e.toId,
        kind: 'admin' as const,
        points,
        x1: first.x,
        y1: first.y,
        x2: last.x,
        y2: last.y,
        // Ребро-в-департамент докається на верх рамки → вхідна крапка, не стрілка
        // (прапор рахується в Rust-роутері, як у мокапі).
        endsOnDeptTop: e.endsOnDeptTop,
      };
    });

  return {
    canvas,
    staffOptions,
    zoneLabelBand,
    contentPadding,
    zones: [],
    routes,
    // Рамки департаментів із Rust — єдине джерело для React-хрому (T1/B1).
    frames: result.frames.map((f) => ({
      departmentId: f.departmentId,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
    })),
    markedCrossings: [],
  };
}
