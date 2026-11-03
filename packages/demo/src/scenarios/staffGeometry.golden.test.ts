import { describe, expect, it } from '@rstest/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeStaffLiveGeometry,
  defaultRenderConfig,
  emptyDiagramData,
  layoutStaffCanvas,
  resolveNodeTheme,
  resolveTheme,
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  type DiagramData,
  type StaffCanvasResult,
  type StaffEdgeLink,
} from '@org-hierarchy/sdk';
import { buildTabConfig, type TabConfigDeps } from '../app/tabConfigs.js';
import { TAB_META, isDemoTab, type DemoTab } from '../app/tabs.js';
import { buildScaleStaffWindow, STAFF_SCALE_DEFAULT_FOCUS } from './scaleStaff.js';

const LODS = ['near', 'mid', 'far'] as const;

const goldenPath = join(dirname(fileURLToPath(import.meta.url)), '__golden__/staff-geometry.json');
const staffTabs = [
  'staff-shps', 'variant-b', 'staff-tree', 'staff-dept-legacy', 'staff-dept-v2',
  'mockup-staff-figma', 'mockup-staff-magnetic', 'staff-brigade', 'staff-1m',
  'mockup-staff-gojs', 'worker',
] satisfies DemoTab[];
const deps: TabConfigDeps = {
  theme: 'light',
  contourControls: { paddingCells: 1, smoothIterations: 2 },
  flatOrgsData: emptyDiagramData(),
  // Only used by the inventory check, never by a captured staff scene.
  scaleOrgsWindow: () => { throw new Error('Not a staff scene'); },
  scaleStaffWindow: () => buildScaleStaffWindow({ focusIndex: STAFF_SCALE_DEFAULT_FOCUS }),
};
const rect = (box: { x: number; y: number; width: number; height: number }) =>
  ({ x: box.x, y: box.y, w: box.width, h: box.height });
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, 'en');
const link = (edge: StaffEdgeLink) => ({ from: edge.fromId, to: edge.toId, kind: edge.kind });
const byLink = (a: ReturnType<typeof link>, b: ReturnType<typeof link>) =>
  a.from.localeCompare(b.from, 'en') || a.to.localeCompare(b.to, 'en') || a.kind.localeCompare(b.kind, 'en');

function normalizeLayout(canvas: StaffCanvasResult, margin: number) {
  return {
    // `role` drives paint (external → alpha, seat drag mode) but is invisible to a
    // bare rect; captured so the A4.2b Rust-adapter cannot regress it unseen (B1).
    nodes: canvas.positionNodes
      .map((node) => ({ id: node.id, ...rect(node), role: node.role ?? null }))
      .sort(byId),
    // Raw bands only have y/height today. Their horizontal span is the canvas
    // inside its margins; painted content bounds are captured separately below.
    bands: canvas.tiers.map((band) => ({
      id: band.organizationId ?? 'org-cards',
      x: band.x ?? margin, y: band.y,
      w: band.width ?? canvas.width - margin * 2, h: band.height,
    })).sort((a, b) => a.y - b.y || a.x - b.x || byId(a, b)),
    // `expanded`/`positionCount` are TS-enriched (not Rust geometry) and drive paint
    // (skip gojs-vertical, badge count) — also rect-invisible, so captured (B1).
    orgCards: canvas.orgCards
      .map((card) => ({
        id: card.orgId,
        ...rect(card),
        expanded: card.expanded ?? false,
        positionCount: card.positionCount,
      }))
      .sort(byId),
    edges: canvas.edges.map(link).sort(byLink),
    width: canvas.width, height: canvas.height,
  };
}

async function capture(tab: DemoTab) {
  const cfg = buildTabConfig(tab, deps);
  if (!cfg.staffLayout || !cfg.staffCurrentOrgId) throw new Error(`${tab}: missing staff config`);
  // These tab builders supply DiagramData, never mapper input (inventory below).
  const data = cfg.data as DiagramData;
  const currentOrgId = cfg.staffCurrentOrgId;
  // #96: prune is always on and this golden computes geometry directly (not through
  // OrgHierarchyDiagram's seed). Mirror the role-based default (SPEC §2.2): the
  // current org is fully expanded. Flat/matrix tabs are unaffected (every seat was
  // already visible); a deep current-org tree (mock3) expands as the app renders it.
  const roleDefaultExpanded = data.positions
    .filter((p) => p.organizationId === currentOrgId)
    .map((p) => p.id);
  const staffLayout = { ...cfg.staffLayout, expandedPositionIds: roleDefaultExpanded };

  // Seam A — the raw layout straight from the tab's own `staffLayout`, before
  // the renderer folds in theme/config-derived options.
  const layout = await layoutStaffCanvas(
    { ...data, reports: data.reportLines },
    currentOrgId,
    { ...staffLayout, expandedOrgIds: cfg.staffExpandedOrgIds ?? staffLayout.expandedOrgIds },
  );

  // Seam B — the live geometry the renderer actually paints, through the shared
  // SDK entry. No pipeline is re-implemented here: that is the point — the
  // golden tracks the renderer's own code, not a copy that could drift.
  const resolvedTheme = resolveTheme(cfg.theme ?? 'light');
  const theme = resolveNodeTheme(resolvedTheme, cfg.styles);
  const config = { ...defaultRenderConfig, ...cfg.render };
  const base = {
    data,
    currentOrgId,
    theme,
    resolvedTheme,
    config,
    staff: { layout: staffLayout, expandedOrgIds: cfg.staffExpandedOrgIds },
  };
  const geoms = Object.fromEntries(
    await Promise.all(LODS.map(async (lod) => [lod, await computeStaffLiveGeometry({ ...base, lod })] as const)),
  ) as Record<(typeof LODS)[number], Awaited<ReturnType<typeof computeStaffLiveGeometry>>>;
  const live = geoms.near;
  const margin = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...live.staffOptions }.margin;

  const zones = live.zones.map((band) => {
    if (band.x === undefined || band.width === undefined) throw new Error(`${tab}: missing zone bounds`);
    return { id: band.organizationId ?? 'org-cards', ...rect({ ...band, x: band.x, width: band.width }) };
  }).sort((a, b) => a.y - b.y || a.x - b.x || byId(a, b));
  // `endsOnDeptTop` (entry-dot vs arrow) and `marked` (foreign-frame highlight) steer
  // paint but are dropped by a bare {from,to,kind,points} row — captured so the Rust
  // route adapter cannot regress them unseen (B1). `marked` lives on live.markedCrossings
  // (the renderer folds it into markedKeys the same way, DiagramRenderer.ts:793).
  const routes = Object.fromEntries(LODS.map((lod) => {
    const g = geoms[lod];
    const markedKeys = new Set(g.markedCrossings.map((c) => `${c.fromId}\u0000${c.toId}`));
    return [
      lod,
      g.routes.map((segment) => ({
        ...link(segment),
        points: segment.points.map(({ x, y }) => ({ x, y })),
        endsOnDeptTop: segment.endsOnDeptTop ?? false,
        marked: markedKeys.has(`${segment.fromId}\u0000${segment.toId}`),
      })).sort(byLink),
    ];
  }));

  return {
    layout: normalizeLayout(layout, staffLayout.margin ?? DEFAULT_STAFF_LAYOUT_OPTIONS.margin),
    live: { ...normalizeLayout(live.canvas, margin), zones, routes },
  };
}

function compare(actual: unknown, expected: unknown, path: string, tolerance = 1): void {
  const fail = () => { throw new Error(`${path}: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`); };
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > tolerance) fail();
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) compare(actual.length, expected.length, `${path}.length`, 0);
    actual.forEach((value, index) => compare(value, expected[index], `${path}[${index}]`, tolerance));
    return;
  }
  if (actual !== null && expected !== null && typeof actual === 'object' && typeof expected === 'object'
    && !Array.isArray(actual) && !Array.isArray(expected)) {
    const actualEntries = Object.entries(actual).sort(([a], [b]) => a.localeCompare(b, 'en'));
    const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b, 'en'));
    compare(actualEntries.map(([key]) => key), expectedEntries.map(([key]) => key), `${path}.keys`, 0);
    actualEntries.forEach(([key, value], index) => compare(value, expectedEntries[index]?.[1], `${path}.${key}`, tolerance));
    return;
  }
  if (actual !== expected) fail();
}

describe('staffGeometry golden', () => {
  it('covers every real tab declaring staffLayout', () => {
    // `staff-mock3` is the A* R3 comparison tab (T128 T8, `render.staffUseAstar`): its routed output
    // is deliberately NOT golden-baselined until the flip (step C) + rebaseline (T10) land after the
    // owner's R3 visual gate, so it is excluded here like the scale tab.
    // `staff-alpha` (T129) computes geometry ONLY via the mockup-ported layout (`staffAlphaMockup`),
    // deliberately bypassing the Rust/TS calc this golden guards — so it is excluded too.
    const actual = Object.keys(TAB_META).filter((tab) => isDemoTab(tab)).filter((tab) =>
      tab !== 'scale-100k' && tab !== 'staff-mock3' && tab !== 'staff-alpha'
      && buildTabConfig(tab, deps).staffLayout !== undefined);
    expect(actual.sort()).toEqual([...staffTabs].sort());
  });

  // R3 smoke (T128 T8): the mock3 ШПС tab really routes through the Rust A* pipeline (useAstar) and
  // produces a line per report edge, the large majority clean (best-effort/marked is the Q1 minority).
  // Not a baseline — the visual mockup comparison (R3) is the owner's. Documents the clean/marked
  // split so the owner knows what to expect before opening the tab.
  it('staff-mock3 routes through A* (R3 smoke)', async () => {
    const near = (await capture('staff-mock3')).live.routes.near;
    expect(near.length).toBeGreaterThan(40);
    const marked = near.filter((r) => r.marked).length;
    expect(marked, `${marked}/${near.length} lines best-effort (expected a small minority)`).toBeLessThan(
      near.length / 4,
    );
  });

  it('compares numbers within ±1px, but rejects structural changes and non-finite values', () => {
    expect(() => compare({ x: 11 }, { x: 10 }, 'scene')).not.toThrow();
    expect(() => compare({ x: 9 }, { x: 10 }, 'scene')).not.toThrow();
    expect(() => compare({ x: 11.01 }, { x: 10 }, 'scene')).toThrow('scene.x: expected 10, actual 11.01');
    expect(() => compare([{ id: 'b' }], [{ id: 'a' }], 'scene')).toThrow('scene[0].id');
    expect(() => compare([1], [1, 2], 'scene')).toThrow('scene.length');
    expect(() => compare({ y: 1 }, { x: 1 }, 'scene')).toThrow('scene.keys');
    expect(() => compare({ x: NaN }, { x: 1 }, 'scene')).toThrow('scene.x');
  });

  it('reproduces exactly on a second build; UPDATE_GOLDEN regenerates the baseline', async () => {
    if (process.env.UPDATE_GOLDEN !== '1' && !existsSync(goldenPath)) {
      throw new Error('Missing staff geometry golden. Run UPDATE_GOLDEN=1 npm run test -w @org-hierarchy/demo -- staffGeometry');
    }
    const actual = Object.fromEntries(await Promise.all(staffTabs.map(async (tab) => [tab, await capture(tab)])));
    const repeated = Object.fromEntries(await Promise.all(staffTabs.map(async (tab) => [tab, await capture(tab)])));
    // Zero tolerance here: the baseline's pixel budget must not hide randomness.
    // This guard stays active while the baseline compare is parked (below), so a
    // non-deterministic capture is still caught; it also keeps UPDATE_GOLDEN=1 as
    // the R4 rebaseline path.
    compare(repeated, actual, 'determinism', 0);
    if (process.env.UPDATE_GOLDEN === '1') {
      mkdirSync(dirname(goldenPath), { recursive: true });
      writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`);
    }
  });

  // PARKED (dg32, owner decision) — the baseline comparison is suspended until R4:
  // a rebaseline onto a CORRECTED Rust, AFTER the R3 visual gate in the browser
  // (owner's own queue — work/reports/staff-rust-geometry/_HANDOFF-2026-10-30-dg30-link-routing.md
  // sequences R2 detached-fix → R3 visual gate → R4 rebaseline).
  //
  // The live Rust geometry currently diverges from the TS-era baseline in 10/11
  // captured scenes, and the divergence is NOT merely the cosmetic `live.bands = 0`
  // (Rust carries no raw tier bands — see adaptStaffGeometry.ts FORK1). It includes
  // three KNOWN, un-fixed bugs; rebaselining now would freeze them as golden truth
  // and make the T128 A* router validate against a wrong reference:
  //   • card_pad gate (packages/core/src/layout/staff_layout.rs:1246) turns ~1129 TS
  //     around-card detours into raw ortho → links cut through cards (spec §5.1/§10.4);
  //   • matrix coords dropped (buildStaffLayoutInput.ts:226-231) → the staff-1m canvas
  //     is ~19× too wide for the same node count;
  //   • detached seats mis-classified as tree (gojs / variant-b / mockup-staff-magnetic).
  //
  // Determinism (above) still guards randomness; UPDATE_GOLDEN=1 remains the R4
  // escape hatch. Re-enable at R4 by deleting `.skip`. See the dg30 PARITY-FAILURE
  // report (_r7-a4-2b-PARITY-FAILURE-dg30.md), which decided the same not-yet.
  it.skip('matches the baseline [PARKED dg32 → R4; see the finding above]', async () => {
    const actual = Object.fromEntries(await Promise.all(staffTabs.map(async (tab) => [tab, await capture(tab)])));
    const expected: unknown = JSON.parse(readFileSync(goldenPath, 'utf8'));
    compare(actual, expected, 'staffGeometry');
  });
});
