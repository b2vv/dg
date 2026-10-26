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
  snapWorldToCell,
  isValidGridCell,
  movePositionToCell,
  resolveSeatDrop,
  applySeatDrop,
  shiftPositionBlock,
  type GridSnap,
  type SeatDrop,
} from './positionMove.js';
export {
  adminParentsOf,
  canReparent,
  checkReparent,
  reparentPosition,
  type ReparentCheck,
  type ReparentRefusal,
} from './positionReparent.js';
export {
  selectNode,
  sameNodeRef,
  selectMany,
  sameSelectionSet,
  replaceSelection,
  toggleInSelection,
  isSelectionToggleModifier,
  readSelectionPointerMods,
  type SelectionPointerMods,
} from './selection.js';
export { DoubleTapTracker, NODE_DOUBLE_TAP_MS, type DoubleTapKind } from './doubleTap.js';
export {
  bulkContextMenuItems,
  defaultContextMenuItems,
  type ContextMenuItemsOptions,
} from './contextMenu.js';
export { resolveContextMenuNodeData } from './contextMenuPayload.js';
// nodeDomTestId / normalizeTestIdKey / orgTestId / personTestId / positionTestId /
// resolveTestIdInData / TestAnchorCandidate перенесені у `../core` (спліт dg T3a).
