import type { NodeRef } from '../core/index.js';

/** Selection and transient hover shared by interaction consumers. */
export interface InteractionState {
  readonly selected: readonly NodeRef[];
  readonly primary: NodeRef | null;
  readonly hovered: NodeRef | null;
}
