import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PromoteBackdropProps } from '@org-hierarchy/sdk/react';
import type { DiagramData, StaffLiveGeometry } from '@org-hierarchy/sdk';
import {
  buildStaffChromeGeometry,
  installStaffHoverHighlight,
  makeStaffChromeBackdrop,
  relatedStaffIds,
  staffAdminAncestors,
  staffVisibleData,
  type StaffChromeGeometry,
} from './StaffChromeBackdrop.js';

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

describe('buildStaffChromeGeometry', () => {
  it('success: joins dept name + count, maps lines, computes org AABB', () => {
    const geom = buildStaffChromeGeometry(
      live({
        frames: [{ departmentId: 'd1', x: 0, y: 0, width: 100, height: 80 }],
        routes: [
          {
            fromId: 'a',
            toId: 'b',
            kind: 'admin',
            points: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
            x1: 1,
            y1: 2,
            x2: 3,
            y2: 4,
            endsOnDeptTop: true,
          },
        ],
        canvas: {
          positionNodes: [{ id: 'p1', x: 10, y: 10, width: 50, height: 30 }],
        },
      } as unknown as Partial<StaffLiveGeometry>),
      data({
        organizations: [{ id: 'org', name: 'Org X', role: 'current', groupIds: [], collapsed: false }],
        departments: [{ id: 'd1', name: 'Dept One', organizationId: 'org', order: 0 }],
        positions: [
          { id: 'p1', departmentId: 'd1', organizationId: 'org' },
          { id: 'p2', departmentId: 'd1', organizationId: 'org' },
        ] as unknown as DiagramData['positions'],
      }),
      'org',
    );

    expect(geom.depts).toHaveLength(1);
    expect(geom.depts[0]).toMatchObject({ departmentId: 'd1', name: 'Dept One', count: 2 });
    expect(geom.lines).toHaveLength(1);
    expect(geom.lines[0]).toEqual({
      fromId: 'a',
      toId: 'b',
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      endsOnDeptTop: true,
    });
    // Org AABB spans frames (0..100) and nodes (10..60), padded (TOP 44 above).
    expect(geom.org).not.toBeNull();
    expect(geom.org?.name).toBe('Org X');
    expect(geom.org?.y).toBe(-44); // minY 0 minus the TOP label room
    expect(geom.org?.x).toBe(-20);
  });

  it('boundary: no frames and no nodes → org is null, empty depts/lines', () => {
    const geom = buildStaffChromeGeometry(live(), data(), 'org');
    expect(geom.org).toBeNull();
    expect(geom.depts).toEqual([]);
    expect(geom.lines).toEqual([]);
    expect(geom.nodeBoxes).toEqual({});
    expect(geom.foundId).toBeNull();
  });

  it('nodeBoxes: seat boxes keyed by position id (for the §8.2 found marker)', () => {
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
    );
    expect(geom.nodeBoxes).toEqual({
      p1: { x: 10, y: 20, width: 50, height: 30 },
      p2: { x: 70, y: 20, width: 50, height: 30 },
    });
    expect(geom.foundId).toBeNull();
  });

  it('relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself', () => {
    const lines = [
      { fromId: 'ceo', toId: 'cfo' },
      { fromId: 'cfo', toId: 'acc' },
      { fromId: 'cto', toId: 'dev' }, // unrelated to cfo
    ];
    // cfo touches ceo→cfo and cfo→acc → related = {cfo, ceo, acc}, not cto/dev.
    expect([...relatedStaffIds(lines, 'cfo')].sort()).toEqual(['acc', 'ceo', 'cfo']);
    // No line touches a lone node → only itself.
    expect([...relatedStaffIds(lines, 'lonely')]).toEqual(['lonely']);
    expect([...relatedStaffIds([], 'x')]).toEqual(['x']);
  });

  it('staffVisibleData: collapsing a head hides its subtree but keeps the head', () => {
    const d = data({
      positions: [
        { id: 'ceo' },
        { id: 'a' },
        { id: 'a1' },
        { id: 'b' },
      ] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'ceo', toId: 'a', kind: 'admin' },
        { fromId: 'a', toId: 'a1', kind: 'admin' },
        { fromId: 'ceo', toId: 'b', kind: 'admin' },
      ],
    });
    // Collapse 'a' → 'a' stays, 'a1' (its child) is hidden; 'b' untouched.
    const vis = staffVisibleData(d, new Set(['a']));
    expect(vis.positions.map((p) => p.id).sort()).toEqual(['a', 'b', 'ceo']);
    expect(vis.reportLines.map((r) => `${r.fromId}>${r.toId}`).sort()).toEqual([
      'ceo>a',
      'ceo>b',
    ]);
    // Empty collapsed set → everything visible.
    expect(staffVisibleData(d, new Set()).positions).toHaveLength(4);
  });

  it('staffAdminAncestors: walks every admin parent up, with a visited guard', () => {
    const d = data({
      positions: [
        { id: 'ceo' },
        { id: 'cfo' },
        { id: 'acc' },
        { id: 'bz' },
        { id: 'x' },
      ] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'ceo', toId: 'cfo', kind: 'admin' },
        { fromId: 'cfo', toId: 'acc', kind: 'admin' },
        { fromId: 'acc', toId: 'bz', kind: 'admin' },
        // 'x' has two admin parents (diamond) — both chains must be gathered once.
        { fromId: 'cfo', toId: 'x', kind: 'admin' },
        { fromId: 'acc', toId: 'x', kind: 'admin' },
      ],
    });
    expect([...staffAdminAncestors(d, 'bz')].sort()).toEqual(['acc', 'ceo', 'cfo']);
    expect([...staffAdminAncestors(d, 'x')].sort()).toEqual(['acc', 'ceo', 'cfo']);
    expect([...staffAdminAncestors(d, 'ceo')]).toEqual([]); // root has none
  });

  it('staffAdminAncestors: a cycle does not loop forever', () => {
    const d = data({
      positions: [{ id: 'a' }, { id: 'b' }] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'a', toId: 'b', kind: 'admin' },
        { fromId: 'b', toId: 'a', kind: 'admin' }, // malformed cycle
      ],
    });
    expect([...staffAdminAncestors(d, 'a')].sort()).toEqual(['a', 'b']);
  });

  it('staffVisibleData: a node with a second live parent stays visible', () => {
    const d = data({
      positions: [{ id: 'ceo' }, { id: 'a' }, { id: 'x' }] as unknown as DiagramData['positions'],
      reportLines: [
        { fromId: 'ceo', toId: 'a', kind: 'admin' },
        { fromId: 'a', toId: 'x', kind: 'admin' },
        { fromId: 'ceo', toId: 'x', kind: 'admin' }, // second parent
      ],
    });
    // Collapse 'a' → 'x' still reachable via ceo→x, so it stays.
    expect(staffVisibleData(d, new Set(['a'])).positions.map((p) => p.id).sort()).toEqual([
      'a',
      'ceo',
      'x',
    ]);
  });

  it('found marker (§8.2): foundId → v3 white ring + «Знайдено» chip in the backdrop', () => {
    const geom: StaffChromeGeometry = {
      org: null,
      depts: [],
      lines: [],
      nodeBoxes: { p1: { x: 10, y: 20, width: 50, height: 30 } },
      foundId: 'p1',
    };
    const Backdrop = makeStaffChromeBackdrop(() => geom);
    // scale 1, no pan → px(n)=n and toScreen is identity, so the v3 values read raw.
    const props = {
      viewport: { x: 0, y: 0, scale: 1 },
      screen: { width: 800, height: 600 },
      lod: 'near',
    } as unknown as PromoteBackdropProps;
    const html = renderToStaticMarkup(Backdrop(props)!);

    expect(html).toContain('data-staff-found="p1"');
    expect(html).toContain('staff-found'); // pulse/glow class
    expect(html).toContain('outline:2px solid #fff'); // v3 white ring
    expect(html).toContain('Знайдено'); // chip text
    expect(html).toContain('#111113'); // chip dark text colour (v3)

    // No hit → no marker.
    const empty = renderToStaticMarkup(makeStaffChromeBackdrop(() => ({ ...geom, foundId: null }))(props)!);
    expect(empty).not.toContain('data-staff-found');
    expect(empty).not.toContain('Знайдено');
  });

  it('found marker: unknown foundId (collapsed/absent node) → no marker, no throw', () => {
    const geom: StaffChromeGeometry = {
      org: null,
      depts: [],
      lines: [],
      nodeBoxes: { p1: { x: 0, y: 0, width: 10, height: 10 } },
      foundId: 'ghost', // not in nodeBoxes (e.g. inside a collapsed subtree)
    };
    const Backdrop = makeStaffChromeBackdrop(() => geom);
    const props = {
      viewport: { x: 0, y: 0, scale: 1 },
      screen: { width: 800, height: 600 },
      lod: 'near',
    } as unknown as PromoteBackdropProps;
    const html = renderToStaticMarkup(Backdrop(props)!);
    expect(html).not.toContain('data-staff-found');
  });

  it('hover clear restores the §8.2 focus baseline (not blank) while a search is focused', () => {
    const mount = document.createElement('div');
    // Two cards as the promote slots render them: found full, the other dimmed.
    mount.innerHTML =
      '<div data-staff-pos="ceo" style="opacity:1"></div>' +
      '<div data-staff-pos="cfo" style="opacity:0.38"></div>' +
      '<div data-staff-chrome></div>';
    const dispose = installStaffHoverHighlight(mount, () => 'ceo');
    const cfo = mount.querySelector<HTMLElement>('[data-staff-pos="cfo"]')!;

    // Hover cfo → hover dims the non-related cards imperatively.
    cfo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    // Leave (hover lands on the non-card chrome) → clear() runs.
    mount
      .querySelector('[data-staff-chrome]')!
      .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    // The dim must be back to the focus baseline (.38), NOT wiped to '' (full).
    expect(cfo.style.opacity).toBe('0.38');
    expect(mount.querySelector<HTMLElement>('[data-staff-pos="ceo"]')!.style.opacity).toBe('1');
    dispose();
  });

  it('hover clear blanks opacity when no search is focused (foundId null)', () => {
    const mount = document.createElement('div');
    mount.innerHTML =
      '<div data-staff-pos="ceo" style="opacity:1"></div>' +
      '<div data-staff-pos="cfo" style="opacity:1"></div>' +
      '<div data-staff-chrome></div>';
    const dispose = installStaffHoverHighlight(mount, () => null);
    const cfo = mount.querySelector<HTMLElement>('[data-staff-pos="cfo"]')!;
    cfo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    mount
      .querySelector('[data-staff-chrome]')!
      .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(cfo.style.opacity).toBe('');
    dispose();
  });

  it('failure/fallback: unknown dept name → departmentId; org name falls back by role', () => {
    const geom = buildStaffChromeGeometry(
      live({ frames: [{ departmentId: 'dX', x: 0, y: 0, width: 10, height: 10 }] } as unknown as Partial<StaffLiveGeometry>),
      data({
        // currentOrgId 'missing' is absent → fall back to the role:'current' org.
        organizations: [{ id: 'real', name: 'Real Org', role: 'current', groupIds: [], collapsed: false }],
        departments: [], // no name for dX
      }),
      'missing',
    );
    expect(geom.depts[0]?.name).toBe('dX'); // fallback to id
    expect(geom.depts[0]?.count).toBe(0);
    expect(geom.org?.name).toBe('Real Org'); // fallback by role
  });
});
