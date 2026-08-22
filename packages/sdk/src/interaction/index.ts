export type { NodeKind, NodeRef, SearchResult, MenuItem } from './types.js';
export type {
  ContextMenuNodeData,
  ContextMenuPointer,
  ContextMenuRequest,
} from './contextMenuPayload.js';
export { InteractionError } from './types.js';
export {
  buildSearchIndex,
  buildSearchIndexAsync,
  searchIndex,
  mergeSearchIndexes,
  flattenPositionSearchRows,
  buildOrgSearchIndex,
  buildSearchIndexFromPositionRows,
  searchIndexToDTO,
  searchIndexFromDTO,
  type SearchIndex,
  type SearchIndexEntry,
  type SearchIndexDTO,
  type PositionSearchRow,
} from './searchIndex.js';
export { revealOrgPath, resolveOrganizationIdForNode } from './revealPath.js';
export {
  snapToGrid,
  isValidGridCell,
  movePositionToCell,
  shiftPositionBlock,
  type GridSnap,
} from './positionMove.js';
export { selectNode, sameNodeRef } from './selection.js';
export { defaultContextMenuItems } from './contextMenu.js';
export { resolveContextMenuNodeData } from './contextMenuPayload.js';
export {
  nodeDomTestId,
  normalizeTestIdKey,
  orgTestId,
  personTestId,
  positionTestId,
  resolveTestIdInData,
  type TestAnchorCandidate,
} from './nodeTestId.js';
