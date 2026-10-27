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
    nodes: canvas.positionNodes.map((node) => ({ id: node.id, ...rect(node) })).sort(byId),
    // Raw bands only have y/height today. Their horizontal span is the canvas
    // inside its margins; painted content bounds are captured separately below.
    bands: canvas.tiers.map((band) => ({
      id: band.organizationId ?? 'org-cards',
      x: band.x ?? margin, y: band.y,
      w: band.width ?? canvas.width - margin * 2, h: band.height,
    })).sort((a, b) => a.y - b.y || a.x - b.x || byId(a, b)),
    orgCards: canvas.orgCards.map((card) => ({ id: card.orgId, ...rect(card) })).sort(byId),
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
  const staffLayout = cfg.staffLayout;

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
  const routes = Object.fromEntries(LODS.map((lod) => [
    lod,
    geoms[lod].routes.map((segment) => ({
      ...link(segment), points: segment.points.map(({ x, y }) => ({ x, y })),
    })).sort(byLink),
  ]));

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
    const actual = Object.keys(TAB_META).filter((tab) => isDemoTab(tab)).filter((tab) =>
      tab !== 'scale-100k' && buildTabConfig(tab, deps).staffLayout !== undefined);
    expect(actual.sort()).toEqual([...staffTabs].sort());
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

  it('matches the baseline and reproduces exactly on a second build', async () => {
    if (process.env.UPDATE_GOLDEN !== '1' && !existsSync(goldenPath)) {
      throw new Error('Missing staff geometry golden. Run UPDATE_GOLDEN=1 npm run test -w @org-hierarchy/demo -- staffGeometry');
    }
    const actual = Object.fromEntries(await Promise.all(staffTabs.map(async (tab) => [tab, await capture(tab)])));
    const repeated = Object.fromEntries(await Promise.all(staffTabs.map(async (tab) => [tab, await capture(tab)])));
    // Zero tolerance here: the baseline's pixel budget must not hide randomness.
    compare(repeated, actual, 'determinism', 0);
    if (process.env.UPDATE_GOLDEN === '1') {
      mkdirSync(dirname(goldenPath), { recursive: true });
      writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`);
    }
    const expected: unknown = JSON.parse(readFileSync(goldenPath, 'utf8'));
    compare(actual, expected, 'staffGeometry');
  });
});
