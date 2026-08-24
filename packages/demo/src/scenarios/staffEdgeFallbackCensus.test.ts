import { describe, expect, it } from 'vitest';
import {
  defaultNodeTheme,
  layoutStaffCanvas,
  classifyStaffEdgeRoute,
  polylineHitsBoxInterior,
  mapPositionNodesToStaffEdgeBoxes,
  mapStaffEdgeBoxesForLod,
  type DiagramData,
  type PersonNodeStyle,
  type StaffCanvasResult,
  type StaffLayoutOptions,
  type StaffEdgeBox,
  type StaffEdgeLink,
} from '@org-hierarchy/sdk';
import {
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
} from './mockupFigma.js';
import { buildStaffTreeData } from './staffTree.js';

interface RouteCensus {
  tab: string;
  total: number;
  byVia: { direct: number; around: number; forced: number };
  hitsForeignBox: number;
  forcedAndDirty: number;
  byKind: Record<string, { total: number; forced: number; dirty: number }>;
}

function emptyKind(): { total: number; forced: number; dirty: number } {
  return { total: 0, forced: 0, dirty: 0 };
}

function staffInput(data: DiagramData) {
  return {
    organizations: data.organizations,
    positions: data.positions,
    reports: data.reportLines,
    groups: data.groups,
    departments: data.departments,
    persons: data.persons,
  };
}

function edgeBoxes(
  canvas: StaffCanvasResult,
  data: DiagramData,
  personTheme: PersonNodeStyle,
): StaffEdgeBox[] {
  const positionById = new Map(data.positions.map((p) => [p.id, p]));
  return mapStaffEdgeBoxesForLod(
    mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, positionById, personTheme),
    canvas.orgCards.map((c) => ({
      id: c.orgId,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
    })),
    'near',
  );
}

function censusTab(
  tab: string,
  canvas: StaffCanvasResult,
  data: DiagramData,
  personTheme: PersonNodeStyle,
): RouteCensus {
  const boxes = edgeBoxes(canvas, data, personTheme);
  const byId = new Map(boxes.map((b) => [b.id, b]));
  const byVia = { direct: 0, around: 0, forced: 0 };
  const byKind: RouteCensus['byKind'] = {};
  let hitsForeignBox = 0;
  let forcedAndDirty = 0;

  for (const edge of canvas.edges) {
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) continue;
    const kind = edge.kind as StaffEdgeLink['kind'];
    const route = classifyStaffEdgeRoute(from, to, kind, boxes);
    byVia[route.via] += 1;
    const others = boxes.filter((b) => b.id !== from.id && b.id !== to.id);
    const dirty = others.some((b) => polylineHitsBoxInterior(route.points, b));
    if (dirty) hitsForeignBox += 1;
    if (route.via === 'forced' && dirty) forcedAndDirty += 1;
    const bucket = (byKind[kind] ??= emptyKind());
    bucket.total += 1;
    if (route.via === 'forced') bucket.forced += 1;
    if (dirty) bucket.dirty += 1;
  }

  return {
    tab,
    total: byVia.direct + byVia.around + byVia.forced,
    byVia,
    hitsForeignBox,
    forcedAndDirty,
    byKind,
  };
}

const FIGMA_LAYOUT: StaffLayoutOptions = {
  horizontalGap: 36,
  verticalGap: 40,
  tierGap: 48,
  margin: 28,
  nodeWidth: 248,
  nodeHeight: 72,
  orgCardWidth: 220,
  orgCardHeight: 56,
  refCellWidth: 260,
  refCellHeight: 88,
  expandedOrgIds: ['unit-current'],
  collapseUnexpandedPositions: false,
};

const GOJS_LAYOUT: StaffLayoutOptions = {
  horizontalGap: 36,
  verticalGap: 40,
  tierGap: 48,
  margin: 28,
  nodeWidth: 200,
  nodeHeight: 98,
  orgCardWidth: 220,
  orgCardHeight: 121,
  refCellWidth: 220,
  refCellHeight: 72,
  expandedOrgIds: ['unit-current'],
  collapseUnexpandedPositions: false,
};

const TREE_LAYOUT: StaffLayoutOptions = {
  horizontalGap: 40,
  verticalGap: 52,
  tierGap: 36,
  margin: 24,
  nodeWidth: 136,
  nodeHeight: 156,
  orgCardWidth: 200,
  orgCardHeight: 64,
  refCellWidth: 140,
  refCellHeight: 160,
  collapseUnexpandedPositions: true,
};

describe('staff edge fallback census (demo tabs)', () => {
  it('counts the unchecked around-alt branch on Staff · Figma / GoJS / tree', async () => {
    const figmaData = buildMockupStaffFigmaData();
    const gojsData = buildMockupStaffGojsData();
    const treeData = buildStaffTreeData();

    const figmaPerson: PersonNodeStyle = {
      ...defaultNodeTheme.person,
      width: MOCKUP_FIGMA_STYLES.person.width,
      height: MOCKUP_FIGMA_STYLES.person.height,
      personLayout: MOCKUP_FIGMA_STYLES.person.personLayout,
    };
    const gojsPerson: PersonNodeStyle = {
      ...defaultNodeTheme.person,
      width: MOCKUP_GOJS_STYLES.person.width,
      height: MOCKUP_GOJS_STYLES.person.height,
      cardRowHeight: MOCKUP_GOJS_STYLES.person.cardRowHeight,
      personLayout: MOCKUP_GOJS_STYLES.person.personLayout,
    };

    const rows = [
      censusTab(
        'Staff · Figma',
        await layoutStaffCanvas(staffInput(figmaData), 'region', FIGMA_LAYOUT),
        figmaData,
        figmaPerson,
      ),
      censusTab(
        'Staff · GoJS',
        await layoutStaffCanvas(staffInput(gojsData), 'region', GOJS_LAYOUT),
        gojsData,
        gojsPerson,
      ),
      censusTab(
        'Staff · tree',
        await layoutStaffCanvas(staffInput(treeData), 'ops', TREE_LAYOUT),
        treeData,
        defaultNodeTheme.person,
      ),
    ];

    const totals = rows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.forced += r.byVia.forced;
        acc.dirty += r.hitsForeignBox;
        return acc;
      },
      { total: 0, forced: 0, dirty: 0 },
    );

    expect(rows[0]?.total).toBe(9);
    expect({
      total: totals.total,
      forced: totals.forced,
      forcedPct: Number(((100 * totals.forced) / Math.max(1, totals.total)).toFixed(2)),
      dirty: totals.dirty,
      dirtyPct: Number(((100 * totals.dirty) / Math.max(1, totals.total)).toFixed(2)),
      tabs: rows.map((r) => ({
        tab: r.tab,
        total: r.total,
        ...r.byVia,
        dirty: r.hitsForeignBox,
        kinds: r.byKind,
      })),
    }).toMatchInlineSnapshot(`
      {
        "dirty": 5,
        "dirtyPct": 22.73,
        "forced": 1,
        "forcedPct": 4.55,
        "tabs": [
          {
            "around": 0,
            "direct": 8,
            "dirty": 2,
            "forced": 1,
            "kinds": {
              "admin": {
                "dirty": 0,
                "forced": 0,
                "total": 7,
              },
              "cross-tier": {
                "dirty": 1,
                "forced": 0,
                "total": 1,
              },
              "dotted": {
                "dirty": 1,
                "forced": 1,
                "total": 1,
              },
            },
            "tab": "Staff · Figma",
            "total": 9,
          },
          {
            "around": 0,
            "direct": 9,
            "dirty": 1,
            "forced": 0,
            "kinds": {
              "admin": {
                "dirty": 0,
                "forced": 0,
                "total": 7,
              },
              "cross-tier": {
                "dirty": 1,
                "forced": 0,
                "total": 1,
              },
              "dotted": {
                "dirty": 0,
                "forced": 0,
                "total": 1,
              },
            },
            "tab": "Staff · GoJS",
            "total": 9,
          },
          {
            "around": 0,
            "direct": 4,
            "dirty": 2,
            "forced": 0,
            "kinds": {
              "admin": {
                "dirty": 0,
                "forced": 0,
                "total": 1,
              },
              "cross-tier": {
                "dirty": 2,
                "forced": 0,
                "total": 3,
              },
            },
            "tab": "Staff · tree",
            "total": 4,
          },
        ],
        "total": 22,
      }
    `);
  });
});
