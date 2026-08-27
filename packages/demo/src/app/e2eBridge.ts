import { layoutStaffCanvas, type DiagramData, type OrgHierarchyConfig } from '@org-hierarchy/sdk';
import type { OrgHierarchyDiagram } from '@org-hierarchy/sdk';

/**
 * `window.__demoE2e` — the seam Playwright drives the demo through. Kept out of
 * `App` so the production path never carries the test surface inline.
 */
export interface DemoE2eBridge {
  collapseOrg(orgId: string): Promise<void> | undefined;
  expandOrg(orgId: string): Promise<void> | undefined;
  /** Same code path as demo `onNodeClick` for flat orgs / 100k org cards. */
  clickOrg(orgId: string): void;
  getScaleWindowStart(): number | null;
  toggleStaffOrg(orgId: string): Promise<boolean> | undefined;
  focusTestId(testId: string): Promise<boolean> | undefined;
  getStaffExpandedOrgIds(): string[];
  getZoom(): number;
  getStaffLayoutEdges(): Promise<Array<{ fromId: string; toId: string; kind: string }>>;
  /** Soft render warnings — a silently empty contour layer must show up here. */
  getLayoutDiagnostics(): string[];
  /** Engine that drew the scene (T83): 'webgl' | 'canvas' | null. */
  getRendererKind(): 'webgl' | 'canvas' | null;
}

export interface E2eBridgeDeps {
  diagram: OrgHierarchyDiagram;
  /** Same code path as demo `onNodeClick` for flat orgs / 100k org cards. */
  clickOrg(orgId: string): void;
  /** Start index of the materialized 100k window, or null when there is none. */
  scaleWindowStart(): number | null;
  /** Config of the tab on screen — the staff edge probe re-lays it out. */
  config(): OrgHierarchyConfig<unknown>;
}

/** Install the bridge on `window`. Only called in `?e2e=1` mode. */
export function installDemoE2eBridge(deps: E2eBridgeDeps): void {
  const { diagram } = deps;
  const bridge: DemoE2eBridge = {
    collapseOrg: (orgId) => diagram.collapseOrg(orgId),
    expandOrg: (orgId) => diagram.expandOrg(orgId),
    clickOrg: (orgId) => deps.clickOrg(orgId),
    getScaleWindowStart: () => deps.scaleWindowStart(),
    toggleStaffOrg: (orgId) => diagram.toggleStaffOrgExpand(orgId),
    focusTestId: (testId) => diagram.focusByTestId(testId),
    getStaffExpandedOrgIds: () => diagram.getStaffExpandedOrgIds(),
    getZoom: () => diagram.getZoom(),
    getLayoutDiagnostics: () => [...diagram.getLayoutDiagnostics()],
    getRendererKind: () => diagram.getRendererKind(),
    getStaffLayoutEdges: () => staffLayoutEdgesFor(deps.config()),
  };
  (window as unknown as { __demoE2e?: DemoE2eBridge }).__demoE2e = bridge;
}

/** E2e: lay out the staff canvas for a tab config and report its edges. */
export async function staffLayoutEdgesFor(
cfg: OrgHierarchyConfig<unknown>,
): Promise<Array<{ fromId: string; toId: string; kind: string }>> {
  const orgId = cfg.staffCurrentOrgId;
  const data = cfg.data;
  if (!orgId || !data || typeof data !== 'object' || !('positions' in data)) return [];
  const diagram = data as DiagramData;
  const canvas = await layoutStaffCanvas(
    {
      organizations: diagram.organizations,
      positions: diagram.positions,
      reports: diagram.reportLines,
      groups: diagram.groups,
      departments: diagram.departments,
      persons: diagram.persons,
    },
    orgId,
    {
      ...cfg.staffLayout,
      expandedOrgIds: cfg.staffExpandedOrgIds ?? cfg.staffLayout?.expandedOrgIds,
    },
  );
  return canvas.edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind }));
}
