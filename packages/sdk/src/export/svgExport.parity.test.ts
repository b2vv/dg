import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import { computeStaffLiveGeometry } from '../render/staffLiveGeometry.js';
import { resolveNodeTheme, resolveTheme } from '../render/theme.js';
import { defaultNodeTheme, defaultRenderConfig, type RenderConfig } from '../render/types.js';
import { buildDiagramSvg } from './svgExport.js';

// R6-6 (H3, half): the SVG export and the live renderer route link points through
// the ONE seam `resolveStaffRouting` at the near LOD. This test pins that the SVG
// renders exactly the near routes the live geometry produces — ON THE SAME CANVAS.
// Canvas/option-builder unification between the two entry points is a separate
// concern (R7, the "two truths" of layout options); here the canvas is shared so
// only routing parity is under test. Fixture uses matrix/dotted edges (no arrow),
// so rendered path points equal route points directly — no arrow-shortening.

function staffScene(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org One', groupIds: [] }],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'OPS', name: 'Ops', organizationId: 'org1' },
    ],
    persons: ['P1', 'P2', 'P3'].map((id) => ({ id: `person-${id}`, fullName: id })),
    positions: [
      { id: 'P1', title: 'P1', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'person-P1', status: 'filled' as const, isTemporary: false, gridCell: { col: 0, row: 0 } },
      { id: 'P2', title: 'P2', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'person-P2', status: 'filled' as const, isTemporary: false, gridCell: { col: 1, row: 0 } },
      { id: 'P3', title: 'P3', organizationId: 'org1', departmentId: 'OPS', groupIds: [], personId: 'person-P3', status: 'filled' as const, isTemporary: false, gridCell: { col: 0, row: 1 } },
    ],
    reportLines: [
      { fromId: 'P1', toId: 'P2', kind: 'matrix' },
      { fromId: 'P1', toId: 'P3', kind: 'dotted' },
    ],
  };
}

type Pt = { x: number; y: number };

/** Edge polylines from `<g id="edges">` — `<path>` only (arrows are `<polygon>`). */
function svgEdgePolylines(svg: string): Pt[][] {
  const group = svg.match(/<g id="edges">([\s\S]*?)<\/g>/);
  if (!group) return [];
  return [...group[1]!.matchAll(/<path d="([^"]+)"/g)].map((m) =>
    [...m[1]!.matchAll(/[ML]([\d.eE+-]+) ([\d.eE+-]+)/g)].map((c) => ({ x: +c[1]!, y: +c[2]! })),
  );
}

async function liveNearRoutes(data: DiagramData, config: RenderConfig) {
  // Rebuild the SVG's own canvas from its documented layout inputs, then feed it
  // to the live geometry so BOTH route the identical scene (isolates R7).
  const staffOpts = {
    refCellWidth: config.cellWidth,
    refCellHeight: config.cellHeight,
    deptGrouping: config.staffEdgeRouter === 'v2',
  };
  const canvas = await layoutStaffCanvas(
    {
      organizations: data.organizations,
      positions: data.positions,
      reports: data.reportLines,
      groups: data.groups,
      departments: data.departments,
      persons: data.persons,
    },
    'org1',
    staffOpts,
  );
  // Only `theme.person` affects routing; match the SVG's personTheme (default).
  const theme = { ...resolveNodeTheme(resolveTheme('light'), undefined), person: defaultNodeTheme.person };
  const live = await computeStaffLiveGeometry({
    data,
    currentOrgId: 'org1',
    theme,
    resolvedTheme: 'light',
    config,
    staff: undefined,
    lod: 'near',
    canvas,
  });
  return live.routes;
}

describe('buildDiagramSvg — live/SVG link-point parity (R6-6, H3)', () => {
  for (const router of ['legacy', 'v2'] as const) {
    it(`router '${router}': SVG edges equal the live near routes on the same canvas`, async () => {
      const data = staffScene();
      const config = { ...defaultRenderConfig, staffEdgeRouter: router };

      const svg = await buildDiagramSvg({ data, currentOrgId: 'org1', config });
      const svgPolylines = svgEdgePolylines(svg);
      const routes = await liveNearRoutes(data, config);

      // Guard against a vacuous fixture and against the arrow-shortening path:
      // the comparison below is only valid for non-arrow edges.
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.every((r) => r.kind !== 'admin')).toBe(true);
      expect(svgPolylines.length).toBe(routes.length);
      expect(svgPolylines).toEqual(routes.map((r) => r.points));
    });
  }
});

/** Raw `<path .../>` tags inside `<g id="edges">`. */
function svgEdgePaths(svg: string): string[] {
  const group = svg.match(/<g id="edges">([\s\S]*?)<\/g>/);
  if (!group) return [];
  return [...group[1]!.matchAll(/<path [^>]*\/>/g)].map((m) => m[0]);
}

/** Managing + current org: the cross-org connector is a `lead-org` plink. */
function tierScene(): DiagramData {
  const mk = (id: string, orgId: string) => ({
    id,
    title: id,
    organizationId: orgId,
    groupIds: [],
    personId: `person-${id}`,
    status: 'filled' as const,
    isTemporary: false,
    isHead: true,
    gridCell: { col: 0, row: 0 },
  });
  return {
    organizations: [
      { id: 'mgr', name: 'Managing', groupIds: [] },
      { id: 'current', name: 'Current', groupIds: [], parentOrgId: 'mgr' },
    ],
    groups: [],
    departments: [],
    persons: [
      { id: 'person-M1', fullName: 'M1' },
      { id: 'person-C1', fullName: 'C1' },
    ],
    positions: [mk('M1', 'mgr'), mk('C1', 'current')],
    reportLines: [],
  };
}

describe('buildDiagramSvg — per-kind stroke in SVG (R6-7, H3 style)', () => {
  it('matrix and dotted edges render dashed in SVG, not one solid admin line', async () => {
    const svg = await buildDiagramSvg({
      data: staffScene(),
      currentOrgId: 'org1',
      config: { ...defaultRenderConfig, staffEdgeRouter: 'v2' },
    });
    const paths = svgEdgePaths(svg);
    expect(paths.length).toBeGreaterThan(0);
    // The fixture has only matrix/dotted edges → every edge path must be dashed.
    expect(paths.every((p) => p.includes('stroke-dasharray'))).toBe(true);
    // matrix light colour, not the admin solid #334155.
    expect(svg).toContain('#94a3b8');
  });

  it('lead-org plink renders dashed grey with no arrow in SVG', async () => {
    const svg = await buildDiagramSvg({
      data: tierScene(),
      currentOrgId: 'current',
      config: { ...defaultRenderConfig, staffEdgeRouter: 'v2' },
    });
    const edgeGroup = svg.match(/<g id="edges">([\s\S]*?)<\/g>/)?.[1] ?? '';
    const paths = svgEdgePaths(svg);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((p) => p.includes('stroke-dasharray'))).toBe(true);
    expect(edgeGroup).toContain('#6b6b73');
    // lead-org carries no arrow head; only admin edges do.
    expect(edgeGroup).not.toContain('<polygon');
  });
});
