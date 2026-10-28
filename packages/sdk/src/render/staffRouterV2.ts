import { NO_DEPARTMENT_ID } from '../data/types.js';
import type { DiagramPosition } from '../data/types.js';
import { buildStaffEdgeSegments, edgeIntrudesForeignFrame } from '../layout/staffEdgeGeometry.js';
import type {
  StaffEdgeBox,
  StaffEdgeFrame,
  StaffEdgeLink,
  StaffEdgeSegment,
} from '../layout/staffEdgeGeometry.js';
import { contourSceneInputs } from './contour/contourInputs.js';
import type { LodLevel } from './lod.js';
import { unionBoxes } from './staffZoneBounds.js';
import type { PersonNodeStyle } from './types.js';
import { mapPositionNodesToStaffEdgeBoxes, mapStaffEdgeBoxesForLod } from './visualEdgeBox.js';

/** Which routing engine a caller resolved from `config.staffEdgeRouter`. */
export type StaffRouter = 'v2' | 'legacy';

export interface StaffRoutingInput {
  /**
   * Resolved router, not the raw `RenderConfig`: the single seam below is the one
   * site that both the live renderer and the SVG export route through (T126 R6-6),
   * so neither re-implements routing and the two cannot drift. `'legacy'` skips
   * foreign-frame avoidance and never marks crossings; `'v2'` does both.
   */
  router: StaffRouter;
  positionNodes: readonly { id: string; x: number; y: number; width: number; height: number }[];
  edges: StaffEdgeLink[];
  positionById: ReadonlyMap<string, DiagramPosition>;
  personTheme: PersonNodeStyle;
  lod: LodLevel;
  orgCards: readonly StaffEdgeBox[];
  framePadding?: number;
  /** department id → head position id (lines spec §3.2): a cross-dept admin
   *  edge into the head docks on the frame top. Computed by each caller from
   *  reportLines so the seam stays purely geometric. */
  deptHeadById?: ReadonlyMap<string, string>;
}

export interface StaffRoutingResult {
  routedSegments: StaffEdgeSegment[];
  /** Edges still intruding into a foreign department frame after routing. */
  markedCrossings: Array<{ fromId: string; toId: string }>;
}

/**
 * Route an already laid-out scene for render/export without moving its nodes.
 * The single routing seam: live geometry and SVG export both call this with the
 * same inputs, so their link points are identical by construction (not two copies
 * that can drift). Edge boxes are shared across both branches; only `'v2'` adds the
 * department-frame avoidance pass and the residual-crossing marks.
 */
export function resolveStaffRouting(input: StaffRoutingInput): StaffRoutingResult {
  const edgeBoxes = mapStaffEdgeBoxesForLod(
    mapPositionNodesToStaffEdgeBoxes(input.positionNodes, input.positionById, input.personTheme),
    input.orgCards,
    input.lod,
  );

  if (input.router === 'legacy') {
    return { routedSegments: buildStaffEdgeSegments(input.edges, edgeBoxes), markedCrossings: [] };
  }

  const { memberBoxesByDept } = contourSceneInputs(input.positionNodes, input.positionById);
  const deptFrames: StaffEdgeFrame[] = [];
  for (const [deptId, members] of memberBoxesByDept) {
    if (deptId === NO_DEPARTMENT_ID) continue;
    const rect = unionBoxes(members, input.framePadding ?? 8);
    if (!rect) continue;
    const memberIds = new Set(members.map((member) => member.positionId));
    const headId = input.deptHeadById?.get(deptId);
    deptFrames.push({
      deptId,
      rect,
      memberIds,
      ...(headId !== undefined && memberIds.has(headId) ? { headId } : {}),
    });
  }

  const routedSegments = buildStaffEdgeSegments(input.edges, edgeBoxes, deptFrames);
  const boxById = new Map(edgeBoxes.map((box) => [box.id, box]));
  const markedCrossings: StaffRoutingResult['markedCrossings'] = [];
  for (const segment of routedSegments) {
    const from = boxById.get(segment.fromId);
    const to = boxById.get(segment.toId);
    if (from && to && edgeIntrudesForeignFrame(segment.points, from, to, deptFrames)) {
      markedCrossings.push({ fromId: segment.fromId, toId: segment.toId });
    }
  }
  return { routedSegments, markedCrossings };
}
