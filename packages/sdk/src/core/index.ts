// #5 shared `core` base (спліт dg T3a) — addressing-vocabulary + identity.
// Залежить ТІЛЬКИ від ../data. Жодного import з ../interaction або ../render:
// core — найнижчий шар, адаптери й #4 залежать від нього, не навпаки.
export type { NodeKind, NodeRef, SearchResult, MenuItem } from './types.js';
export { nodeEntityKey, parseNodeEntityKey } from './nodeKey.js';
export {
  orgNodeRef,
  normalizeSelected,
  personNodeRef,
  positionNodeRef,
  seatNodeRef,
  resolveNodeRefInData,
  testIdForRef,
} from './nodeRefs.js';
export {
  nodeDomTestId,
  normalizeTestIdKey,
  orgTestId,
  personTestId,
  positionTestId,
  resolveTestIdInData,
  type TestAnchorCandidate,
} from './nodeTestId.js';
