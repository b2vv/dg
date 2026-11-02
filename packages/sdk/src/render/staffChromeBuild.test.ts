import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import type { StaffLiveGeometry } from './staffLiveGeometry.js';
import {
  buildStaffChromeGeometry,
  computeStaffFit,
  type StaffChromePad,
} from './staffChromeGeometry.js';

/** Minimal live geometry — only the fields `buildStaffChromeGeometry` reads. */
function live(over: Partial<StaffLiveGeometry> = {}): StaffLiveGeometry {
  return {
    frames: [],
    routes: [],
    canvas: { positionNodes: [] },
    ...over,
  } as unknown as StaffLiveGeometry;
}

function data(over: Partial<DiagramData> = {}): DiagramData {
  return {
    organizations: [],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
    ...over,
  } as unknown as DiagramData;
}

const DEFAULT_PAD: StaffChromePad = { x: 20, top: 44 };

describe('buildStaffChromeGeometry (SDK, Б2 getter body)', () => {
  it('success: joins dept name + count, maps lines, computes padded org AABB', () => {
    const geom = buildStaffChromeGeometry(
      live({
        frames: [{ departmentId: 'd1', x: 0, y: 0, width: 100, height: 80 }],
        routes: [
          {
            fromId: 'a',
            toId: 'b',
            points: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
            endsOnDeptTop: true,
          },
        ],
        canvas: { positionNodes: [{ id: 'p1', x: 10, y: 10, width: 50, height: 30 }] },
      } as unknown as Partial<StaffLiveGeometry>),
      data({
        organizations: [
          { id: 'org', name: 'Org X', role: 'current', groupIds: [], collapsed: false },
        ],
        departments: [{ id: 'd1', name: 'Dept One', organizationId: 'org', order: 0 }],
        positions: [
          { id: 'p1', departmentId: 'd1', organizationId: 'org' },
          { id: 'p2', departmentId: 'd1', organizationId: 'org' },
        ] as unknown as DiagramData['positions'],
      }),
      'org',
      DEFAULT_PAD,
    );

    expect(geom.depts).toHaveLength(1);
    expect(geom.depts[0]).toMatchObject({ departmentId: 'd1', name: 'Dept One', count: 2 });
    expect(geom.lines).toEqual([
      { fromId: 'a', toId: 'b', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }], endsOnDeptTop: true },
    ]);
    // AABB spans frames (0..100) and nodes (10..60); padded x=20 (l/r), top=44, bottom=20.
    expect(geom.org).not.toBeNull();
    expect(geom.org?.name).toBe('Org X');
    expect(geom.org?.x).toBe(-20); // minX 0 − pad.x
    expect(geom.org?.y).toBe(-44); // minY 0 − pad.top
    expect(geom.org?.width).toBe(100 + 20 * 2); // (100−0) + pad.x*2
    expect(geom.org?.height).toBe(80 + 44 + 20); // (80−0) + pad.top + pad.bottom(=x)
  });

  it('pad is honoured, not hardcoded: changing pad shifts the org box exactly', () => {
    const l = live({
      frames: [{ departmentId: 'd1', x: 0, y: 0, width: 100, height: 80 }],
    } as unknown as Partial<StaffLiveGeometry>);
    const base = buildStaffChromeGeometry(l, data(), 'org', { x: 10, top: 10 }).org!;
    const wider = buildStaffChromeGeometry(l, data(), 'org', { x: 30, top: 50, bottom: 5 }).org!;
    // x: 0 − pad.x
    expect(base.x).toBe(-10);
    expect(wider.x).toBe(-30);
    // y: 0 − pad.top
    expect(base.y).toBe(-10);
    expect(wider.y).toBe(-50);
    // width: 100 + 2·pad.x
    expect(base.width).toBe(120);
    expect(wider.width).toBe(160);
    // height: 80 + top + bottom(=x when absent)
    expect(base.height).toBe(80 + 10 + 10);
    expect(wider.height).toBe(80 + 50 + 5);
  });

  it('boundary: no frames and no nodes → org null, empty depts/lines/nodeBoxes', () => {
    const geom = buildStaffChromeGeometry(live(), data(), 'org', DEFAULT_PAD);
    expect(geom.org).toBeNull();
    expect(geom.depts).toEqual([]);
    expect(geom.lines).toEqual([]);
    expect(geom.nodeBoxes).toEqual({});
  });

  it('no foundId on the SDK type (host state, per contract)', () => {
    const geom = buildStaffChromeGeometry(live(), data(), 'org', DEFAULT_PAD);
    expect('foundId' in geom).toBe(false);
  });

  it('nodeBoxes: seat boxes keyed by position id', () => {
    const geom = buildStaffChromeGeometry(
      live({
        canvas: {
          positionNodes: [
            { id: 'p1', x: 10, y: 20, width: 50, height: 30 },
            { id: 'p2', x: 70, y: 20, width: 50, height: 30 },
          ],
        },
      } as unknown as Partial<StaffLiveGeometry>),
      data(),
      'org',
      DEFAULT_PAD,
    );
    expect(geom.nodeBoxes).toEqual({
      p1: { x: 10, y: 20, width: 50, height: 30 },
      p2: { x: 70, y: 20, width: 50, height: 30 },
    });
  });

  it('fallback: unknown dept name → departmentId; org name falls back by role', () => {
    const geom = buildStaffChromeGeometry(
      live({
        frames: [{ departmentId: 'dX', x: 0, y: 0, width: 10, height: 10 }],
      } as unknown as Partial<StaffLiveGeometry>),
      data({
        organizations: [
          { id: 'real', name: 'Real Org', role: 'current', groupIds: [], collapsed: false },
        ],
        departments: [],
      }),
      'missing', // absent → fall back to role:'current'
      DEFAULT_PAD,
    );
    expect(geom.depts[0]?.name).toBe('dX');
    expect(geom.depts[0]?.count).toBe(0);
    expect(geom.org?.name).toBe('Real Org');
  });
});

describe('computeStaffFit (SDK, replaces demo staffFitTransform)', () => {
  const screen = { width: 1000, height: 700 };

  it('axis=width: scale = available width / org width, centred, top-aligned', () => {
    const t = computeStaffFit({ x: 0, y: 0, width: 1500, height: 900 }, screen, {
      padding: 50,
      minScale: 0.4,
      maxScale: 1,
    });
    expect(t.scale).toBeCloseTo(900 / 1500); // (1000 − 2·50) / 1500
    expect(t.x).toBeCloseTo((1000 - 1500 * t.scale) / 2);
    expect(t.y).toBe(50); // top-align: padding − box.y·scale, box.y=0
  });

  it('capped at maxScale: a narrow org never zooms past the cap', () => {
    const t = computeStaffFit({ x: 100, y: 200, width: 300, height: 160 }, screen, {
      padding: 50,
      minScale: 0.55,
      maxScale: 1,
    });
    expect(t.scale).toBe(1);
    expect(t.x).toBe((1000 - 300) / 2 - 100);
    expect(t.y).toBe(50 - 200);
  });

  it('floored at minScale: a very wide org stops at the near-view minimum', () => {
    const t = computeStaffFit({ x: 0, y: 0, width: 9000, height: 900 }, screen, {
      padding: 50,
      minScale: 0.55,
      maxScale: 1,
    });
    expect(t.scale).toBe(0.55);
  });

  it('defaults: padding=48, minScale=0.55, maxScale=1, axis=width, align=top', () => {
    // width 1200 → width-fit (1000−96)/1200 ≈ 0.753, inside [0.55,1] so not clamped.
    const t = computeStaffFit({ x: 0, y: 0, width: 1200, height: 500 }, screen);
    expect(t.scale).toBeCloseTo((1000 - 48 * 2) / 1200);
    expect(t.y).toBe(48); // top-align by default
  });

  it('axis=both: scale is the smaller of the width-fit and height-fit', () => {
    // width-fit = (1000−96)/1000 = 0.904; height-fit = (700−96)/1000 = 0.604 → both picks 0.604.
    const t = computeStaffFit({ x: 0, y: 0, width: 1000, height: 1000 }, screen, {
      axis: 'both',
      minScale: 0.1,
    });
    expect(t.scale).toBeCloseTo((700 - 96) / 1000);
  });

  it('align=center: y centres the box instead of top-aligning', () => {
    const t = computeStaffFit({ x: 0, y: 0, width: 100, height: 100 }, screen, {
      align: 'center',
      maxScale: 1,
    });
    expect(t.scale).toBe(1);
    expect(t.y).toBe((700 - 100) / 2);
  });

  it('guard: fit scale stays within the Viewport global clamp [0.15, 4]', () => {
    // minScale 0.55 / maxScale 1 are both inside [0.15, 4] → animateTo will not re-clamp.
    const wide = computeStaffFit({ x: 0, y: 0, width: 99999, height: 900 }, screen);
    const narrow = computeStaffFit({ x: 0, y: 0, width: 1, height: 1 }, screen);
    for (const s of [wide.scale, narrow.scale]) {
      expect(s).toBeGreaterThanOrEqual(0.15);
      expect(s).toBeLessThanOrEqual(4);
    }
  });
});
