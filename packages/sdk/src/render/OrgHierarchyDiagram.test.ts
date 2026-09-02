import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';

function makeVariantBDiagram() {
  return {
    organizations: [],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'CEO', name: 'CEO', organizationId: 'org1' },
    ],
    persons: VARIANT_B_POSITIONS.map((p) => ({
      id: `person-${p.id}`,
      fullName: p.id,
    })),
    positions: VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      title: p.id,
      organizationId: 'org1',
      departmentId: p.departmentId,
      groupIds: [],
      personId: `person-${p.id}`,
      status: 'filled' as const,
      isTemporary: p.id === 'P4',
      gridCell: { col: p.col, row: p.row },
    })),
    reportLines: [],
  };
}

describe('OrgHierarchyDiagram', () => {
  it('failure: create(null, config) throws', async () => {
    await expect(
      OrgHierarchyDiagram.create(null as unknown as HTMLElement, {
        data: makeVariantBDiagram(),
      }),
    ).rejects.toThrow(/container/i);
  });

  it('success: create mounts canvas with non-zero size', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeVariantBDiagram(),
      theme: 'light',
    });

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(diagram.getCanvas()).toBeTruthy();

    diagram.destroy();
    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: data without mapper and not DiagramData throws', async () => {
    const container = document.createElement('div');
    await expect(
      OrgHierarchyDiagram.create(container, {
        data: { foo: 'bar' } as never,
      }),
    ).rejects.toThrow(/DiagramData/i);
  });

  it('success: setZoom crossing LOD band updates getLodLevel', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeVariantBDiagram(),
      theme: 'light',
      useWorker: false,
    });

    expect(diagram.getLodLevel()).toBe('mid');
    diagram.setZoom(0.2);
    await Promise.resolve();
    await new Promise((r) => { setTimeout(r, 0); });
    expect(diagram.getLodLevel()).toBe('far');

    diagram.setZoom(2);
    await Promise.resolve();
    await new Promise((r) => { setTimeout(r, 0); });
    expect(diagram.getLodLevel()).toBe('near');

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: fitView returns true and frames content', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeVariantBDiagram(),
      theme: 'light',
      useWorker: false,
    });

    expect(diagram.fitView(48, { animate: false })).toBe(true);
    const vp = diagram.getViewport();
    expect(vp.scale).toBeGreaterThan(0);
    expect(Number.isFinite(vp.x)).toBe(true);

    diagram.resetView({ animate: false });
    expect(diagram.getViewport()).toEqual({ x: 0, y: 0, scale: 1 });

    diagram.destroy();
    document.body.removeChild(container);
  });

  /**
   * Acceptance A7 — `work/reports/row-tree-depth/spec.md`. The guard lives in
   * the layout, but a host never calls the layout: it calls `setData`. This
   * pins that the refusal survives the trip through the facade rather than
   * being swallowed into a blank canvas.
   */
  it('failure: setData rejects a too-deep org tree and leaves the diagram usable', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: makeVariantBDiagram(),
      theme: 'light',
    });

    // No positions: the renderer draws staff when there are any, and org
    // layout is only reached when there are none (`DiagramRenderer.ts:349-353`).
    const deep = {
      ...makeVariantBDiagram(),
      departments: [],
      persons: [],
      positions: [],
      organizations: Array.from({ length: 3_000 }, (_, i) => ({
        id: `org-${i}`,
        name: `Org ${i}`,
        groupIds: [] as string[],
        collapsed: false,
        ...(i > 0 ? { parentOrgId: `org-${i - 1}` } : {}),
      })),
    };

    const err = await diagram.setData(deep).then(
      () => null,
      (e: Error) => e,
    );
    expect(err?.name).toBe('OrgHierarchyError');
    expect(err?.message).toMatch(/too deep/i);

    // The canvas is still there, and the instance still accepts good data.
    expect(diagram.getCanvas()).toBeTruthy();
    await diagram.setData(makeVariantBDiagram());
    expect(diagram.getData().positions).toHaveLength(VARIANT_B_POSITIONS.length);

    diagram.destroy();
    document.body.removeChild(container);
  });
});
