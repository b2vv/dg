import type { ContourPositionInput } from '../../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import { clusterPositionIds } from './contourCluster.js';
import { contourButtonGroupMargin, memberBoxesForCluster } from './contourButtonGroup.js';
import { polishContourRings } from './contourPolish.js';
import { isPaintableDepartment, shouldPaintDeptContour } from './contourPaintFilter.js';
import { resolveMagnetRadius } from '../../contour/magnetRadius.js';

export interface PaintMagneticGroupsArgs {
  inputs: readonly ContourPositionInput[];
  memberBoxesByDept: ReadonlyMap<string, readonly ContourMemberBox[]>;
  departmentIds: readonly string[];
  magnetRadius: number;
  strokeWidth: number;
  paddingCells: number;
  smoothIterations: number;
  personCounts: ReadonlyMap<string, number>;
  minContourMembers: number;
  /** G2 corridor in px; falls back to the wash margin when omitted. */
  corridorPx?: number;
}

export interface PaintedMagneticGroup {
  departmentId: string;
  ring: { x: number; y: number }[];
}

/**
 * Bucket size for the neighbour index, in px. Two card widths: small enough
 * that a ring reads a handful of buckets, large enough that a cluster does not
 * walk hundreds of empty ones.
 */
const NEIGHBOUR_BUCKET_PX = 512;

export interface BoxIndex {
  buckets: Map<number, number[]>;
  boxes: readonly ContourMemberBox[];
}

const bucketKey = (cx: number, cy: number): number => cx * 73_856_093 + cy;

export function buildBoxIndex(boxes: readonly ContourMemberBox[]): BoxIndex {
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i]!;
    const x0 = Math.floor(box.x / NEIGHBOUR_BUCKET_PX);
    const x1 = Math.floor((box.x + box.width) / NEIGHBOUR_BUCKET_PX);
    const y0 = Math.floor(box.y / NEIGHBOUR_BUCKET_PX);
    const y1 = Math.floor((box.y + box.height) / NEIGHBOUR_BUCKET_PX);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const key = bucketKey(cx, cy);
        const list = buckets.get(key);
        if (list) list.push(i);
        else buckets.set(key, [i]);
      }
    }
  }
  return { buckets, boxes };
}

/**
 * Foreign cards that can still reach this cluster's ring.
 *
 * `notchedRings` already drops a foreign card whose inflated rect misses the
 * frame (`contourNotch.ts:251`), so cutting the same set here changes nothing
 * that is drawn — it only stops the scene-sized array from being built once per
 * ring, which is where two thirds of the frame used to go (T107). The reach is
 * deliberately one pixel wider than the test downstream, because including a
 * card that will be rejected is free and excluding one is a visual bug.
 *
 * Indices are returned in their original order: `subtractRects` consumes the
 * cuts in sequence, and reordering them would be a geometry change wearing the
 * costume of an optimisation.
 */
export function foreignBoxesNear(
  index: BoxIndex,
  memberBoxes: readonly ContourMemberBox[],
  reach: number,
  own: ReadonlySet<string>,
): ContourMemberBox[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of memberBoxes) {
    if (box.x < minX) minX = box.x;
    if (box.y < minY) minY = box.y;
    if (box.x + box.width > maxX) maxX = box.x + box.width;
    if (box.y + box.height > maxY) maxY = box.y + box.height;
  }
  if (!Number.isFinite(minX)) return [];

  const x0 = Math.floor((minX - reach) / NEIGHBOUR_BUCKET_PX);
  const x1 = Math.floor((maxX + reach) / NEIGHBOUR_BUCKET_PX);
  const y0 = Math.floor((minY - reach) / NEIGHBOUR_BUCKET_PX);
  const y1 = Math.floor((maxY + reach) / NEIGHBOUR_BUCKET_PX);

  const seen = new Set<number>();
  for (let cx = x0; cx <= x1; cx += 1) {
    for (let cy = y0; cy <= y1; cy += 1) {
      const list = index.buckets.get(bucketKey(cx, cy));
      if (!list) continue;
      for (const i of list) seen.add(i);
    }
  }

  const picked = [...seen].sort((a, b) => a - b);
  const out: ContourMemberBox[] = [];
  for (const i of picked) {
    const box = index.boxes[i]!;
    if (own.has(box.positionId)) continue;
    if (box.x + box.width < minX - reach) continue;
    if (box.x > maxX + reach) continue;
    if (box.y + box.height < minY - reach) continue;
    if (box.y > maxY + reach) continue;
    out.push(box);
  }
  return out;
}

/** One rounded button-group ring per magnetic cluster (paint only). */
export function paintMagneticGroups(args: PaintMagneticGroupsArgs): PaintedMagneticGroup[] {
  const magnetRadius = resolveMagnetRadius(args.magnetRadius);
  const out: PaintedMagneticGroup[] = [];
  const allBoxes = [...args.memberBoxesByDept.values()].flat();
  const index = buildBoxIndex(allBoxes);
  // One pass over the inputs instead of one per department (T107).
  const inputsByDept = new Map<string, ContourPositionInput[]>();
  for (const input of args.inputs) {
    const bucket = inputsByDept.get(input.departmentId);
    if (bucket) bucket.push(input);
    else inputsByDept.set(input.departmentId, [input]);
  }
  // The same reach `notchedRings` applies, plus a pixel of slack.
  const margin = contourButtonGroupMargin(args.paddingCells ?? 0, args.strokeWidth);
  const reach = margin + Math.max(margin, args.corridorPx ?? margin) + 1;

  for (const deptId of args.departmentIds) {
    // Seats without a department are foreign to every wash — they are in
    // `allBoxes` above, but they never get a contour of their own.
    if (!isPaintableDepartment(deptId)) continue;
    if (!shouldPaintDeptContour(args.personCounts.get(deptId), args.minContourMembers)) {
      continue;
    }
    const members = args.memberBoxesByDept.get(deptId) ?? [];
    const clusters = clusterPositionIds(inputsByDept.get(deptId) ?? [], magnetRadius);
    for (const clusterIds of clusters) {
      const boxes = memberBoxesForCluster(clusterIds, members);
      const own = new Set(boxes.map((b) => b.positionId));
      const rings = polishContourRings({
        memberBoxes: boxes,
        foreignBoxes: foreignBoxesNear(index, boxes, reach, own),
        strokeWidth: args.strokeWidth,
        paddingCells: args.paddingCells,
        smoothIterations: args.smoothIterations,
        corridorPx: args.corridorPx,
      });
      for (const ring of rings) out.push({ departmentId: deptId, ring });
    }
  }
  return out;
}
