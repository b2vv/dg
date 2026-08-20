export type NodeKind = 'organization' | 'person' | 'position';

export interface NodeRef {
  kind: NodeKind;
  id: string;
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  personId?: string;
}

export interface SearchResult {
  node: NodeRef;
  label: string;
  score: number;
}

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

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
