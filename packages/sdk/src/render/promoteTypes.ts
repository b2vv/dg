import type { ContextMenuNodeData } from '../interaction/contextMenuPayload.js';
import type { NodeKind } from '../interaction/types.js';
import type { WorldBox } from './promoteMath.js';

/**
 * Frame geometry of the node a promoted card stands in for.
 *
 * ⚠️ **The units depend on who hands it to you**, and the shape cannot tell you
 * which: {@link OrgHierarchyDiagram.getPromoteChrome} returns **world** units,
 * and the overlay multiplies them by the camera before putting them in a slot,
 * so a card component receives **screen** px. Each side says which it means.
 *
 * The scaling is the point: a DOM card that keeps a fixed corner radius while
 * the canvas card beside it scales matches at exactly one zoom level and is
 * visibly wrong at every other.
 */
export interface PromoteChrome {
  borderRadius: number;
  borderWidth: number;
  /** Body inset, where the node kind has one. Organizations do; seats do not. */
  paddingX?: number;
  paddingY?: number;
}

export interface PromoteCandidate {
  id: string;
  kind: NodeKind;
  world: WorldBox;
  node: ContextMenuNodeData;
}
