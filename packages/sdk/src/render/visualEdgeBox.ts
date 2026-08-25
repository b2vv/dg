import type { DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import {
  figmaRowAvatar,
  FIGMA_ROW_AVATAR_SIZE,
  resolveGojsRowLayoutMetrics,
  resolvePersonLayout,
} from './personLayout.js';
import type { StaffEdgeBox } from '../layout/staffEdgeGeometry.js';
import { personVisualWorldRect } from './personVisualGeometry.js';
import type { PersonNodeStyle } from './types.js';

export interface LayoutPositionNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Edge routing AABB that matches what PersonNode actually paints at this LOD.
 * Layout boxes stay full cell cards; mid/far chrome is smaller — ports must follow.
 */
export function visualPersonEdgeBox(box: StaffEdgeBox, lod: LodLevel): StaffEdgeBox {
  const hints = box.personEdgeHints;
  if (lod === 'near' && hints?.layout === 'gojs-row') {
    return {
      id: box.id,
      x: box.x,
      y: box.y + hints.cardY,
      width: box.width,
      height: hints.cardH + hints.countBarH,
    };
  }
  if (lod === 'near' && hints?.layout === 'figma-row') {
    // Chrome-less seat: edges dock on the tile, but the whole row (tile + text
    // column) stays an obstacle so other routes do not cross the labels.
    return {
      id: box.id,
      x: box.x + hints.tileX,
      y: box.y + hints.tileY,
      width: hints.tileSize,
      height: hints.tileSize,
      obstacle: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  }
  return personVisualWorldRect(box, lod);
}

/** Attach gojs-row near hints when the seat template needs a shorter edge AABB. */
export function staffEdgeBoxForPosition(
  node: LayoutPositionNode,
  position: DiagramPosition,
  style: PersonNodeStyle,
): StaffEdgeBox {
  const box: StaffEdgeBox = {
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  const layout = resolvePersonLayout(style);
  if (layout === 'figma-row') {
    const avatar = figmaRowAvatar(style);
    const size = avatar.size ?? FIGMA_ROW_AVATAR_SIZE;
    return {
      ...box,
      personEdgeHints: {
        layout: 'figma-row',
        tileX: avatar.cx - size / 2,
        tileY: avatar.cy - size / 2,
        tileSize: size,
      },
    };
  }
  if (layout !== 'gojs-row') return box;
  const metrics = resolveGojsRowLayoutMetrics(position, style);
  return {
    ...box,
    personEdgeHints: {
      layout: 'gojs-row',
      cardY: metrics.cardY,
      cardH: metrics.cardH,
      countBarH: metrics.countBarH,
    },
  };
}

/** Map staff layout position nodes to edge boxes (shared by live render + SVG export). */
export function mapPositionNodesToStaffEdgeBoxes(
  positionNodes: readonly LayoutPositionNode[],
  positionById: ReadonlyMap<string, DiagramPosition>,
  personTheme: PersonNodeStyle,
): StaffEdgeBox[] {
  return positionNodes.map((n) => {
    const position = positionById.get(n.id);
    const personStyle: PersonNodeStyle = {
      ...personTheme,
      width: n.width,
      height: n.height,
    };
    if (!position) {
      return { id: n.id, x: n.x, y: n.y, width: n.width, height: n.height };
    }
    return staffEdgeBoxForPosition(n, position, personStyle);
  });
}

/** Org card visual bounds (far = symbol chip, vertically centered). */
export function visualOrgEdgeBox(
  box: StaffEdgeBox,
  lod: LodLevel,
  symbolSize = 36,
): StaffEdgeBox {
  if (lod !== 'far') {
    return { id: box.id, x: box.x, y: box.y, width: box.width, height: box.height };
  }
  const size = Math.min(symbolSize, 36, box.width, box.height);
  return {
    id: box.id,
    x: box.x,
    y: box.y + (box.height - size) / 2,
    width: size,
    height: size,
  };
}

export function mapStaffEdgeBoxesForLod(
  positionNodes: readonly StaffEdgeBox[],
  orgCards: readonly StaffEdgeBox[],
  lod: LodLevel,
): StaffEdgeBox[] {
  return [
    ...positionNodes.map((n) => visualPersonEdgeBox(n, lod)),
    ...orgCards.map((c) => visualOrgEdgeBox(c, lod)),
  ];
}
