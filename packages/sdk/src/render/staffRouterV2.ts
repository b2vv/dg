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

export interface StaffRoutingInput {
  positionNodes: readonly { id: string; x: number; y: number; width: number; height: number }[];
  edges: StaffEdgeLink[];
  positionById: ReadonlyMap<string, DiagramPosition>;
  personTheme: PersonNodeStyle;
  lod: LodLevel;
  orgCards: readonly StaffEdgeBox[];
  framePadding?: number;
}

export interface StaffRoutingResult {
  routedSegments: StaffEdgeSegment[];
  /** Edges still intruding into a foreign department frame after routing. */
  markedCrossings: Array<{ fromId: string; toId: string }>;
}

/** Route an already laid-out scene for render/export without moving its nodes. */
export function resolveStaffRouting(input: StaffRoutingInput): StaffRoutingResult {
  const { memberBoxesByDept } = contourSceneInputs(input.positionNodes, input.positionById);
  const deptFrames: StaffEdgeFrame[] = [];
  for (const [deptId, members] of memberBoxesByDept) {
    if (deptId === NO_DEPARTMENT_ID) continue;
    const rect = unionBoxes(members, input.framePadding ?? 8);
    if (!rect) continue;
    deptFrames.push({ deptId, rect, memberIds: new Set(members.map((member) => member.positionId)) });
  }

  const edgeBoxes = mapStaffEdgeBoxesForLod(
    mapPositionNodesToStaffEdgeBoxes(input.positionNodes, input.positionById, input.personTheme),
    input.orgCards,
    input.lod,
  );
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
