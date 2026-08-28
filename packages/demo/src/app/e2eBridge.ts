import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { DefaultPromoteCard } from '@org-hierarchy/sdk/react';
import {
  layoutStaffCanvas,
  worldBoxToScreen,
  screenRectInView,
  type PromoteCandidate,
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
  /** T87.0 TEMPORARY — measure the real cost of one promote sync(). Deleted after the number lands. */
  measurePromoteSync(zoom?: number, iterations?: number): PromoteSyncMeasurement;
}

/** T87.0 TEMPORARY. */
export interface PromoteSyncMeasurement {
  zoom: number;
  lod: string;
  boxes: number;
  /** Guard: a zero here means the geometry probe measured an empty array, not speed. */
  rawBoxes: number;
  survivors: number;
  candidates: number;
  visible: number;
  /** ms, per phase, over `iterations` runs. */
  phases: Record<string, { p50: number; p95: number; max: number }>;
}

export interface E2eBridgeDeps {
  diagram: OrgHierarchyDiagram;
  /** Same code path as demo `onNodeClick` for flat orgs / 100k org cards. */
  clickOrg(orgId: string): void;
  /** Start index of the materialized 100k window, or null when there is none. */
  scaleWindowStart(): number | null;
  /** Config of the tab on screen — the staff edge probe re-lays it out. */
  config(): OrgHierarchyConfig<unknown>;
  /** T87.0 TEMPORARY — the element the overlay would be positioned over. */
  mount: HTMLElement;
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
    probeSecondDiagram: (renderer) => probeSecondDiagram(renderer),
    measurePromoteSync: (zoom, iterations) =>
      measurePromoteSync(diagram, deps.mount, zoom, iterations ?? 60),
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

// ─────────────────────────────────────────────────────────────────────────────
// T87.0 TEMPORARY — measurement harness. Removed once the number is recorded in
// work/reports/promote-near/report.md. It exists because the earlier DOM number
// moved static divs; this one runs the actual work a promote sync() does.
// ─────────────────────────────────────────────────────────────────────────────

function stats(samples: number[]): { p50: number; p95: number; max: number } {
  const s = [...samples].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
  return {
    p50: Number(at(0.5).toFixed(3)),
    p95: Number(at(0.95).toFixed(3)),
    max: Number((s[s.length - 1] ?? 0).toFixed(3)),
  };
}

function measurePromoteSync(
  diagram: OrgHierarchyDiagram,
  mount: HTMLElement,
  zoom: number | undefined,
  iterations: number,
): PromoteSyncMeasurement {
  if (zoom != null) diagram.setZoom(zoom);
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5';
  mount.appendChild(layer);
  const root = createRoot(layer);

  const phases: Record<string, number[]> = {
    listPromoteCandidates: [],
    // The hypothesis under test: the expensive half of listPromoteCandidates is
    // the per-box data resolution, not the geometry. If filtering on geometry
    // first is cheap, the flat 2.1ms is an ordering problem, not a cache problem.
    boxesOnly: [],
    boxesThenFilter: [],
    filterVisible: [],
    setPromotedNodeIds: [],
    reactRender: [],
    layoutFlush: [],
    wholeSync: [],
  };

  let boxes = 0;
  let lastRawBoxes = -1;
  let lastSurvivors = -1;
  let candidates = 0;
  let visible = 0;

  for (let i = 0; i < iterations; i += 1) {
    // A pan frame moves the camera, so the viewport is re-read every iteration
    // and nothing downstream can be cached across iterations by accident.
    const viewport = diagram.getViewport();
    const screen = { width: mount.clientWidth || 1, height: mount.clientHeight || 1 };
    const t0 = performance.now();

    const all = diagram.listPromoteCandidates();
    const t1 = performance.now();

    const renderer = (diagram as unknown as {
      renderer?: { listNodeBoxes(): Array<{ id: string; x: number; y: number; width: number; height: number }> };
    }).renderer;
    const ta = performance.now();
    // Chrome clamps performance.now() to ~0.1ms, and one geometry pass lands
    // under that. Twenty passes lift it above the clamp; the reported number is
    // divided back down, so it is a real per-pass cost rather than a floor.
    const REPEATS = 20;
    let rawBoxes: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    let survivors = 0;
    for (let r = 0; r < REPEATS; r += 1) rawBoxes = renderer?.listNodeBoxes() ?? [];
    const tb = performance.now();
    for (let r = 0; r < REPEATS; r += 1) {
      survivors = 0;
      for (const b of rawBoxes) {
        const rect = worldBoxToScreen({ x: b.x, y: b.y, width: b.width, height: b.height }, viewport);
        if (screenRectInView(rect, screen)) survivors += 1;
      }
    }
    const tc = performance.now();
    lastRawBoxes = rawBoxes.length;
    lastSurvivors = survivors;

    const shown: PromoteCandidate[] = [];
    for (const c of all) {
      const rect = worldBoxToScreen(c.world, viewport);
      if (screenRectInView(rect, screen)) shown.push(c);
    }
    const t2 = performance.now();

    diagram.setPromotedNodeIds(shown.map((c) => c.id));
    const t3 = performance.now();

    flushSync(() => {
      root.render(
        createElement(
          'div',
          { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
          shown.map((c) =>
            createElement(DefaultPromoteCard, {
              key: c.id,
              id: c.id,
              node: c.node,
              screenRect: worldBoxToScreen(c.world, viewport),
              viewport,
              onDemote: () => {},
            }),
          ),
        ),
      );
    });
    const t4 = performance.now();

    // React can hand back before the browser has recalculated style and layout;
    // reading a geometric property forces that work into this measurement rather
    // than leaving it to land, unattributed, later in the frame.
    void layer.offsetHeight;
    const t5 = performance.now();

    boxes = all.length;
    candidates = all.length;
    visible = shown.length;

    // The first iterations pay for React's first mount and for cold code paths.
    if (i >= 5) {
      phases.listPromoteCandidates.push(t1 - t0);
      phases.boxesOnly.push((tb - ta) / REPEATS);
      phases.boxesThenFilter.push((tc - ta) / REPEATS);
      phases.filterVisible.push(t2 - t1);
      phases.setPromotedNodeIds.push(t3 - t2);
      phases.reactRender.push(t4 - t3);
      phases.layoutFlush.push(t5 - t4);
      phases.wholeSync.push(t5 - t0);
    }
  }

  root.unmount();
  layer.remove();
  diagram.setPromotedNodeIds([]);

  return {
    zoom: Number(diagram.getZoom().toFixed(3)),
    lod: diagram.getLodLevel(),
    boxes,
    rawBoxes: lastRawBoxes,
    survivors: lastSurvivors,
    candidates,
    visible,
    phases: Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, stats(v)])),
  };
}
