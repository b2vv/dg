export type { ContourComputer, RenderOptions } from './DiagramRenderer.js';
export { DiagramRenderer, LayerManager } from './DiagramRenderer.js';
export { PixiHost } from './PixiHost.js';
export { Viewport } from './Viewport.js';
export type { ViewportTransform, ViewportOptions } from './Viewport.js';
export { resolveLodLevel, simplifyPolyline, defaultLodThresholds } from './lod.js';
export type { LodLevel, LodThresholds } from './lod.js';
export { DepartmentBlobView } from './DepartmentBlob.js';
export { PersonNodeView } from './PersonNode.js';
export { OrganizationNodeView } from './OrganizationNode.js';
export { OrgEdgesView } from './OrgEdgesView.js';
export { StaffEdgesView } from './StaffEdgesView.js';
export {
  buildStaffEdgeSegments,
  staffEdgeEndpoints,
} from './staffEdgeGeometry.js';
export type {
  StaffEdgeBox,
  StaffEdgeLink,
  StaffEdgeSegment,
} from './staffEdgeGeometry.js';
export { parseSvgPath } from './svgPath.js';
export { resolveTheme, getOrgSymbolUrl } from './theme.js';
export {
  defaultNodeTheme,
  defaultRenderConfig,
  mergeTheme,
  type NodeTheme,
  type ThemeMode,
  type RenderConfig,
  type DepartmentBlobStyle,
  type PersonNodeStyle,
  type OrganizationNodeStyle,
} from './types.js';
