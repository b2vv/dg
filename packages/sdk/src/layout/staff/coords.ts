import type { DiagramPosition } from '../../data/types.js';
import type { StaffLayoutOptions } from './types.js';
import { DEFAULT_STAFF_LAYOUT_OPTIONS } from './types.js';

export type StaffGeom = Required<
  Pick<
    StaffLayoutOptions,
    | 'nodeWidth'
    | 'nodeHeight'
    | 'horizontalGap'
    | 'verticalGap'
    | 'refCellWidth'
    | 'refCellHeight'
    | 'margin'
  >
>;

export function resolveGeom(options: StaffLayoutOptions = {}): StaffGeom {
  const d = DEFAULT_STAFF_LAYOUT_OPTIONS;
  return {
    nodeWidth: options.nodeWidth ?? d.nodeWidth,
    nodeHeight: options.nodeHeight ?? d.nodeHeight,
    horizontalGap: options.horizontalGap ?? d.horizontalGap,
    verticalGap: options.verticalGap ?? d.verticalGap,
    refCellWidth: options.refCellWidth ?? d.refCellWidth,
    refCellHeight: options.refCellHeight ?? d.refCellHeight,
    margin: options.margin ?? d.margin,
  };
}

export function positionHasCoords(p: DiagramPosition): boolean {
  if (p.gridCell) return true;
  if (p.layoutX !== undefined && p.layoutY !== undefined) return true;
  if (p.layoutCoords) return true;
  return false;
}

export function positionSize(p: DiagramPosition, geom: StaffGeom): { width: number; height: number } {
  return {
    width: p.width ?? geom.nodeWidth,
    height: p.height ?? geom.nodeHeight,
  };
}

export function resolvePositionAABB(
  p: DiagramPosition,
  geom: StaffGeom,
): { x: number; y: number; width: number; height: number } {
  const { width, height } = positionSize(p, geom);
  if (p.layoutCoords) {
    return { x: p.layoutCoords.x, y: p.layoutCoords.y, width, height };
  }
  if (p.layoutX !== undefined && p.layoutY !== undefined) {
    return { x: p.layoutX, y: p.layoutY, width, height };
  }
  if (p.gridCell) {
    const pitchX = geom.refCellWidth + geom.horizontalGap;
    const pitchY = geom.refCellHeight + geom.verticalGap;
    return {
      x: p.gridCell.col * pitchX + (geom.refCellWidth - width) / 2,
      y: p.gridCell.row * pitchY + (geom.refCellHeight - height) / 2,
      width,
      height,
    };
  }
  throw new Error(`Position ${p.id} has no coordinates`);
}

export function aabbOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gapX: number,
  gapY: number,
): boolean {
  return !(
    a.x + a.width + gapX <= b.x ||
    b.x + b.width + gapX <= a.x ||
    a.y + a.height + gapY <= b.y ||
    b.y + b.height + gapY <= a.y
  );
}
