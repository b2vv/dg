export {
  HierarchyBuilder,
  buildFromFlat,
} from './HierarchyBuilder.js';

export {
  HierarchyNodeImpl,
  generateId,
  resetIdCounter,
} from './HierarchyNode.js';

export {
  TreeLayout,
  computeLayout,
} from './TreeLayout.js';

export {
  SvgRenderer,
  renderSvg,
  renderOrgChart,
} from './SvgRenderer.js';

export {
  HtmlRenderer,
  renderHtml,
  DEFAULT_CSS,
} from './HtmlRenderer.js';

export type {
  NodeType,
  PositionStatus,
  NodeMetadata,
  HierarchyNodeInput,
  HierarchyNode,
  LayoutDirection,
  LayoutOptions,
  LayoutNode,
  LayoutResult,
  LayoutEdge,
  NodeStyle,
  EdgeStyle,
  SvgRenderOptions,
  HtmlRenderOptions,
  SerializedHierarchy,
} from './types.js';

export {
  HierarchyError,
  DuplicateNodeError,
  NodeNotFoundError,
  DEFAULT_LAYOUT_OPTIONS,
  DEFAULT_NODE_STYLE,
  DEFAULT_EDGE_STYLE,
  NODE_TYPE_COLORS,
  STATUS_COLORS,
} from './types.js';
