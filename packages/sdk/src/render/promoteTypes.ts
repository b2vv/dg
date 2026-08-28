import type { ContextMenuNodeData } from '../interaction/contextMenuPayload.js';
import type { WorldBox } from './promoteMath.js';

/**
 * Frame geometry of the node a promoted card stands in for, in **screen** px.
 *
 * A DOM card that invents its own corners or insets stops matching the canvas
 * card beside it, and the mismatch is visible at every zoom but one — the values
 * are scaled by the current camera for exactly that reason.
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
  kind: 'organization' | 'person' | 'position';
  world: WorldBox;
  node: ContextMenuNodeData;
}
