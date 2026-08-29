import {
  layoutStaffCanvas,
  OrgHierarchyDiagram as OrgHierarchyDiagramClass,
  type DiagramData,
  type OrgHierarchyConfig,
} from '@org-hierarchy/sdk';
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
  /** Drive the camera to an exact zoom — LOD-band assertions need it exact. */
  setZoom(scale: number): void;
  /** Move the camera without animation — panning assertions need it exact. */
  setViewport(next: { x?: number; y?: number; scale?: number }): void;
  getViewport(): { x: number; y: number; scale: number };
  /**
   * How much is materialized right now (T88, row 2).
   *
   * Counts rather than the data itself: the assertion is that a sliding window
   * evicts, and `reportLines` is the collection that would leak — the demo adds
   * one per seat, and edges carry no id, so an append-only window would walk
   * toward a million of them while the node count looked healthy.
   */
  getSceneCounts(): { positions: number; reportLines: number };
  /** Nodes Pixi is not drawing because HTML replaced them (T87, rows 1 and 5). */
  getPromotedNodeIds(): string[];
  getStaffLayoutEdges(): Promise<Array<{ fromId: string; toId: string; kind: string }>>;
  /** Soft render warnings — a silently empty contour layer must show up here. */
  getLayoutDiagnostics(): string[];
  /** Engine that drew the scene (T83): 'webgl' | 'canvas' | null. */
  getRendererKind(): 'webgl' | 'canvas' | null;
  /**
   * Mount a throwaway second diagram with the given engine and report what it
   * got (T83, acceptance rows 5 and 6). A second diagram is the only way to
   * observe that Pixi's WebGL verdict belongs to the page rather than to one
   * diagram — the demo itself only ever mounts one.
   */
  probeSecondDiagram(renderer?: string): Promise<{ kind: string | null; error: string | null }>;
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
    setZoom: (scale) => diagram.setZoom(scale),
    setViewport: (next) => diagram.setViewport(next),
    getViewport: () => diagram.getViewport(),
    getSceneCounts: () => {
      const d = diagram.getData();
      return { positions: d.positions.length, reportLines: d.reportLines?.length ?? 0 };
    },
    getPromotedNodeIds: () => [...diagram.getPromotedNodeIds()],
    getLayoutDiagnostics: () => [...diagram.getLayoutDiagnostics()],
    getRendererKind: () => diagram.getRendererKind(),
    getStaffLayoutEdges: () => staffLayoutEdgesFor(deps.config()),
    probeSecondDiagram: (renderer) => probeSecondDiagram(renderer),
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

/** Smallest diagram that still mounts — this probe is about the engine, not the scene. */
function probeData(): DiagramData {
  return {
    organizations: [{ id: 'probe-org', name: 'Probe', groupIds: [] }],
    groups: [],
    departments: [],
    persons: [{ id: 'probe-per', fullName: 'Probe Person' }],
    positions: [
      {
        id: 'probe-pos',
        organizationId: 'probe-org',
        title: 'Head',
        personId: 'probe-per',
        isHead: true,
      },
    ],
    reportLines: [],
  } as unknown as DiagramData;
}

async function probeSecondDiagram(
  renderer?: string,
): Promise<{ kind: string | null; error: string | null }> {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-10000px;width:400px;height:300px';
  document.body.appendChild(host);
  try {
    const probe = await OrgHierarchyDiagramClass.create(host, {
      data: probeData(),
      useWorker: false,
      renderer: renderer as OrgHierarchyConfig['renderer'],
    });
    const kind = probe.getRendererKind();
    probe.destroy();
    return { kind, error: null };
  } catch (e) {
    return { kind: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    host.remove();
  }
}
