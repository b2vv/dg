import { describe, expect, it } from 'vitest';
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
    await new Promise((r) => setTimeout(r, 0));
    expect(diagram.getLodLevel()).toBe('far');

    diagram.setZoom(2);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
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
});
