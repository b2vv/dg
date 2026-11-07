import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { computeStaffFit } from './staffChromeGeometry.js';
import type { DiagramData } from '../data/types.js';

function staffData(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org', role: 'current', groupIds: [], collapsed: false }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: [
      { id: 'p1', fullName: 'A' },
      { id: 'p2', fullName: 'B' },
    ],
    positions: [
      { id: 'a', title: 'A', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'p1', status: 'filled', isTemporary: false, isHead: true },
      { id: 'b', title: 'B', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'p2', status: 'filled', isTemporary: false },
    ],
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
  } as unknown as DiagramData;
}

async function makeMounted(): Promise<{ diagram: OrgHierarchyDiagram; container: HTMLElement }> {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 1000 });
  Object.defineProperty(container, 'clientHeight', { value: 700 });
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: staffData(),
    theme: 'light',
    useWorker: false,
    renderer: 'canvas',
    staffCurrentOrgId: 'org1',
    render: { staffReactChrome: true },
  });
  return { diagram, container };
}

describe('OrgHierarchyDiagram.fitStaffChrome (Б2 I3)', () => {
  it('no chrome → returns null and does not move the camera', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    // Org-only data: no staff chrome is ever built, so the getter is null.
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: { organizations: [{ id: 'o', name: 'O', groupIds: [], collapsed: false }], groups: [], departments: [], persons: [], positions: [], reportLines: [] } as unknown as DiagramData,
      useWorker: false,
      renderer: 'canvas',
    });
    const before = diagram.getViewport();
    expect(diagram.fitStaffChrome()).toBeNull();
    expect(diagram.getViewport()).toEqual(before);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('returns the computeStaffFit target and applies it (animate:false)', async () => {
    const { diagram, container } = await makeMounted();
    const box = diagram.getStaffChromeGeometry()?.org;
    expect(box).toBeTruthy();
    const screen = diagram.getScreenSize();

    const expected = computeStaffFit(box!, screen, {
      padding: 48,
      minScale: 0.55,
      maxScale: 1,
      axis: 'width',
      align: 'top',
    });
    const target = diagram.fitStaffChrome({ animate: false });
    expect(target).toEqual(expected);

    const v = diagram.getViewport();
    expect(v.x).toBeCloseTo(expected.x);
    expect(v.y).toBeCloseTo(expected.y);
    expect(v.scale).toBeCloseTo(expected.scale);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('guard: with default opts the returned target equals the actual camera (inside the zoom clamp)', async () => {
    const { diagram, container } = await makeMounted();
    // Default range 0.55–1 ⊂ the viewport clamp 0.15–4, so setViewport does not
    // re-clamp: the returned target must match getViewport() exactly. If a future
    // default fell outside the clamp, the camera would diverge from the return —
    // this pins that they agree.
    const target = diagram.fitStaffChrome({ animate: false })!;
    const v = diagram.getViewport();
    expect(target.scale).toBeGreaterThanOrEqual(0.15);
    expect(target.scale).toBeLessThanOrEqual(4);
    expect(v.scale).toBeCloseTo(target.scale);
    expect(v.x).toBeCloseTo(target.x);
    expect(v.y).toBeCloseTo(target.y);
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('honours opts: axis=both + maxScale changes the target', async () => {
    const { diagram, container } = await makeMounted();
    const box = diagram.getStaffChromeGeometry()!.org!;
    const screen = diagram.getScreenSize();
    const target = diagram.fitStaffChrome({ animate: false, axis: 'both', maxScale: 2 });
    expect(target).toEqual(
      computeStaffFit(box, screen, { axis: 'both', maxScale: 2 }),
    );
    diagram.destroy();
    document.body.removeChild(container);
  });
});
