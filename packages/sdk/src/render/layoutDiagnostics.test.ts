import { describe, expect, it, vi } from 'vitest';
import { DiagramRenderer } from './DiagramRenderer.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';
import type { DiagramData } from '../data/types.js';
import { OrgHierarchyDiagram } from '../index.js';

function overlappingStaffData(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: true }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: [
      { id: 'p1', fullName: 'A' },
      { id: 'p2', fullName: 'B' },
    ],
    positions: [
      {
        id: 'a',
        title: 'A',
        organizationId: 'org1',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 0, row: 0 },
      },
      {
        id: 'b',
        title: 'B',
        organizationId: 'org1',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p2',
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 0, row: 0 },
      },
    ],
    reportLines: [],
  };
}

describe('layout diagnostics', () => {
  it('success: overlapping anchors produce Anchor overlap diagnostic', async () => {
    const renderer = new DiagramRenderer();
    await renderer.render(overlappingStaffData(), defaultNodeTheme, 'light', defaultRenderConfig, {
      staff: {
        currentOrgId: 'org1',
        layout: { staffCoordMode: 'matrix' },
      },
    });
    expect(renderer.getLayoutDiagnostics().some((d) => d.includes('Anchor overlap'))).toBe(true);
  });

  it('failure: clean layout → empty diagnostics', async () => {
    const data = overlappingStaffData();
    data.positions[1] = {
      ...data.positions[1]!,
      gridCell: { col: 2, row: 0 },
    };
    const renderer = new DiagramRenderer();
    await renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, {
      staff: { currentOrgId: 'org1', layout: { staffCoordMode: 'matrix' } },
    });
    expect(renderer.getLayoutDiagnostics()).toEqual([]);
  });

  it('success: OrgHierarchyDiagram exposes diagnostics + callback', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);

    const onLayoutDiagnostics = vi.fn();
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: overlappingStaffData(),
      theme: 'light',
      useWorker: false,
      staffCurrentOrgId: 'org1',
      callbacks: { onLayoutDiagnostics },
    });

    const messages = diagram.getLayoutDiagnostics();
    expect(messages.some((d) => d.includes('Anchor overlap'))).toBe(true);
    expect(onLayoutDiagnostics).toHaveBeenCalled();
    const last = onLayoutDiagnostics.mock.calls.at(-1)?.[0] as string[];
    expect(last.some((d) => d.includes('Anchor overlap'))).toBe(true);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: the engine that drew the scene is named, and survives a second render', async () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    document.body.appendChild(container);

    const diagram = await OrgHierarchyDiagram.create(container, {
      data: overlappingStaffData(),
      useWorker: false,
      staffCurrentOrgId: 'org1',
      renderer: 'canvas',
    });

    const named = (messages: readonly string[]) =>
      messages.some((d) => d.includes('Renderer: canvas') && d.includes('canvas'));

    expect(named(diagram.getLayoutDiagnostics())).toBe(true);

    // DiagramRenderer overwrites its diagnostics on every render, so a line
    // written once at mount would vanish here — silently, which is the failure
    // this test exists for.
    await diagram.setTheme('dark');
    expect(named(diagram.getLayoutDiagnostics())).toBe(true);

    diagram.destroy();
    document.body.removeChild(container);
  });
});
