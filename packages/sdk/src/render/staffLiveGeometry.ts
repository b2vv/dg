// The staff canvas's *live geometry* — layout, zone bands and routed edges — in
// one pure computation, so the Pixi renderer and the golden regression test run
// the SAME code instead of two copies that can drift (the reason this module
// exists: a hand-reproduced pipeline in the test guards a parallel copy, not the
// renderer). `DiagramRenderer.renderStaffCanvas` composes these pieces and then
// paints them; here they are composed and returned as data, with no paint.
//
// Single LOD per call, matching the renderer (it paints one `options.lod`); a
// caller that needs several — the golden captures near/mid/far — calls once per
// LOD. The `RenderOptions` import is type-only, as in `staffLayoutInputs.ts`, so
// the cycle with `DiagramRenderer` is erased at runtime.
import type { DiagramData } from '../data/types.js';
import { buildStaffEdgeSegments } from '../layout/staffEdgeGeometry.js';
import type { StaffEdgeBox, StaffEdgeSegment } from '../layout/staffEdgeGeometry.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  type StaffCanvasResult,
  type StaffLayoutOptions,
  type StaffTierBand,
} from '../layout/staff/types.js';
import { contourButtonGroupMargin } from './contour/contourButtonGroup.js';
import type { LodLevel } from './lod.js';
import type { RenderOptions } from './DiagramRenderer.js';
import { buildStaffLayoutOptions } from './staffLayoutInputs.js';
import { enrichStaffTierBands } from './staffZoneBounds.js';
import { resolveStaffRouting } from './staffRouterV2.js';
import { defaultRenderConfig, type NodeTheme, type RenderConfig } from './types.js';
import { mapPositionNodesToStaffEdgeBoxes, mapStaffEdgeBoxesForLod } from './visualEdgeBox.js';

export interface StaffLiveGeometryInput {
  data: DiagramData;
  currentOrgId: string;
  theme: NodeTheme;
  resolvedTheme: 'light' | 'dark';
  config: RenderConfig;
  staff: RenderOptions['staff'];
  lod: LodLevel;
  /**
   * A layout already computed by the orchestrator (split T2b). When given, the
   * canvas is reused as-is; otherwise it is laid out here from the same options.
   */
  canvas?: StaffCanvasResult;
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
function departmentWrapperPadding(theme: NodeTheme, config: RenderConfig): number {
  const style = config.departmentStyle ?? defaultRenderConfig.departmentStyle ?? 'blob';
  if (style === 'card') {
    const card = theme.departmentCard;
    const padding = card?.padding ?? 8;
    return padding + (card?.labelRow ? (card.labelFontSize ?? 12) + 6 : 0);
  }
  return contourButtonGroupMargin(config.paddingCells ?? 0, theme.department.strokeWidth);
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
  const canvas =
    input.canvas ??
    (await layoutStaffCanvas(
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
    ));

  const margin = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOptions }.margin;
  const contentPadding = departmentWrapperPadding(theme, config);

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

  let routes: StaffEdgeSegment[];
  let markedCrossings: StaffLiveGeometry['markedCrossings'] = [];
  if (config.staffEdgeRouter === 'v2') {
    const routed = resolveStaffRouting({
      positionNodes: canvas.positionNodes,
      edges: canvas.edges,
      positionById,
      personTheme: theme.person,
      lod,
      orgCards: orgCardBoxes,
    });
    routes = routed.routedSegments;
    markedCrossings = routed.markedCrossings;
  } else {
    const edgeBoxes = mapStaffEdgeBoxesForLod(
      mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, positionById, theme.person),
      orgCardBoxes,
      lod,
    );
    routes = buildStaffEdgeSegments(canvas.edges, edgeBoxes);
  }

  return { canvas, staffOptions, zoneLabelBand, contentPadding, zones, routes, markedCrossings };
}
