// NodeKind / NodeRef / SearchResult / MenuItem перенесені у `../core` (спліт dg T3a).
export type {
  ContextMenuNodeData,
  ContextMenuPointer,
  ContextMenuRequest,
} from './contextMenuPayload.js';

export class InteractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InteractionError';
  }
}
