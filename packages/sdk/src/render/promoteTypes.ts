import type { ContextMenuNodeData } from '../interaction/contextMenuPayload.js';
import type { WorldBox } from './promoteMath.js';

export interface PromoteCandidate {
  id: string;
  kind: 'organization' | 'person' | 'position';
  world: WorldBox;
  node: ContextMenuNodeData;
}
