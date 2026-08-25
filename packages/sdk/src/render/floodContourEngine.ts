import { computeAllContours, type ContourMagnetConfig, type ContourPositionInput } from '../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import type { ContourPoint } from './contourFillet.js';
import { filterContoursForPaint } from './contourPaintFilter.js';
import { mapFloodRingToCards, type FloodCardGeometry } from './floodRingCards.js';
import {
  resolveContourWorldTransform,
  type ContourWorldTransform,
} from './contourWorldTransform.js';

/**
 * `cell-flood` engine (T80): department contours from the Rust cell walk
 * (`packages/core/src/contour.rs`, G1–G8) instead of the TS button-group wash.
 *
 * It lives beside the renderer rather than inside it because it changes for its
 * own reasons — cell-space geometry and the WASM contract — while
 * `DiagramRenderer` changes for paint and interaction ones.
 */
export interface FloodContourInput {
  /** Cell-space seats, already bucketed by department. */
  inputs: readonly ContourPositionInput[];
  magnet: ContourMagnetConfig;
  /** positionId → organizationId: `gridCell` is local to one org block. */
  orgByPosition: ReadonlyMap<string, string>;
  /** World cards for every seat, used to resolve each block's own origin. */
  memberBoxes: readonly ContourMemberBox[];
  /** Canvas-wide transform — supplies pitch and cell size. */
  transform: ContourWorldTransform;
  /** Card box and wash padding the rings are snapped onto. */
  cards: Pick<FloodCardGeometry, 'cardWidth' | 'cardHeight' | 'insetX' | 'insetY' | 'padding'>;
  personCounts: ReadonlyMap<string, number>;
  minContourMembers: number;
  /** Aborts between blocks when the render epoch moved on. */
  isCurrent?: () => boolean;
}

export interface FloodContourResult {
  ringsByDept: Map<string, ContourPoint[][]>;
  /** Reasons the layer is empty — the host sees these, never a silent blank. */
  diagnostics: string[];
}

/** Group seats by org block: `gridCell` numbering restarts in each block. */
export function groupInputsByOrg(
  inputs: readonly ContourPositionInput[],
  orgByPosition: ReadonlyMap<string, string>,
): Map<string, ContourPositionInput[]> {
  const byOrg = new Map<string, ContourPositionInput[]>();
  for (const input of inputs) {
    const orgId = orgByPosition.get(input.id) ?? '';
    const list = byOrg.get(orgId) ?? [];
    list.push(input);
    byOrg.set(orgId, list);
  }
  return byOrg;
}

/** Origin for one block: its own cards anchor the shared pitch. */
function blockTransformFor(
  inputs: readonly ContourPositionInput[],
  boxById: ReadonlyMap<string, ContourMemberBox>,
  transform: ContourWorldTransform,
): ContourWorldTransform {
  const cellById = new Map(inputs.map((p) => [p.id, { gridCell: { col: p.col, row: p.row } }]));
  const nodes = inputs
    .map((p) => boxById.get(p.id))
    .filter((b): b is ContourMemberBox => !!b)
    .map((b) => ({ id: b.positionId, x: b.x, y: b.y, width: b.width, height: b.height }));
  return resolveContourWorldTransform(
    nodes,
    cellById,
    transform.cellWidth,
    transform.cellHeight,
    transform.pitchX,
    transform.pitchY,
  );
}

export async function computeFloodContours(
  input: FloodContourInput,
): Promise<FloodContourResult> {
  const ringsByDept = new Map<string, ContourPoint[][]>();
  const boxById = new Map(input.memberBoxes.map((b) => [b.positionId, b]));

  for (const [, blockInputs] of groupInputsByOrg(input.inputs, input.orgByPosition)) {
    const blockTransform = blockTransformFor(blockInputs, boxById, input.transform);

    let contours;
    try {
      contours = await computeAllContours([...blockInputs], input.magnet);
    } catch (err) {
      return {
        ringsByDept,
        diagnostics: [
          `Contour flood unavailable: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
    if (input.isCurrent?.() === false) return { ringsByDept, diagnostics: [] };

    // Cells are wider than the seats inside them, so rings are snapped onto the
    // card rectangle plus the wash padding — otherwise the contour hangs a whole
    // gap away on the right and bottom.
    const cards: FloodCardGeometry = { ...blockTransform, ...input.cards };
    for (const contour of filterContoursForPaint(
      contours,
      input.personCounts,
      input.minContourMembers,
    )) {
      if (contour.points.length < 3) continue;
      const rings = ringsByDept.get(contour.departmentId) ?? [];
      rings.push(mapFloodRingToCards(contour.points, cards));
      ringsByDept.set(contour.departmentId, rings);
    }
  }

  return { ringsByDept, diagnostics: [] };
}
