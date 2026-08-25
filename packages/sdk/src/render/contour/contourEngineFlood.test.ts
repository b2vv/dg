import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OrgHierarchyDiagram } from '../../index.js';
import { DepartmentBlobView } from './DepartmentBlob.js';
import { resetContourWasmForTests, setContourWasmLoaderForTests } from '../../contour/bridge.js';
import { contourButtonGroupMargin } from './contourButtonGroup.js';
import { defaultNodeTheme } from '../types.js';
import type { DiagramData } from '../../data/types.js';

/**
 * Two departments interleaved on one grid: IT wraps the CEO cell, so a flood
 * contour has to notch around it while the button-group painter draws a frame.
 *
 * ```text
 *        col 0     col 1     col 2
 * row 0  IT        IT        IT
 * row 1  IT        CEO       IT
 * ```
 */
function interleavedData(): DiagramData {
  const cells: Array<[string, string, number, number]> = [
    ['P1', 'IT', 0, 0],
    ['P2', 'IT', 1, 0],
    ['P3', 'IT', 2, 0],
    ['P4', 'IT', 0, 1],
    ['P5', 'CEO', 1, 1],
    ['P6', 'IT', 2, 1],
  ];
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'CEO', name: 'CEO', organizationId: 'org1' },
    ],
    persons: cells.map(([id]) => ({ id: `person-${id}`, fullName: `Person ${id}` })),
    positions: cells.map(([id, departmentId, col, row]) => ({
      id,
      title: id,
      organizationId: 'org1',
      departmentId,
      groupIds: [],
      personId: `person-${id}`,
      status: 'filled' as const,
      isTemporary: false,
      gridCell: { col, row },
    })),
    reportLines: [],
  };
}

async function mount(contourEngine: 'button-group' | 'cell-flood') {
  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.height = '700px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: interleavedData(),
    staffCurrentOrgId: 'org1',
    useWorker: false,
    render: {
      departmentStyle: 'blob',
      minContourMembers: 1,
      magnetRadius: 1.5,
      contourEngine,
      cellWidth: 140,
      cellHeight: 160,
    },
    // Gaps 0 → pitch == cell, so ring widths compare directly with the lattice.
    staffLayout: {
      refCellWidth: 140,
      refCellHeight: 160,
      nodeWidth: 136,
      nodeHeight: 156,
      horizontalGap: 0,
      verticalGap: 0,
    },
  });
  return { container, diagram };
}

function blobRings(diagram: OrgHierarchyDiagram): { x: number; y: number }[][] {
  const host = (diagram as unknown as { host: { renderer: { layers: { departments: { children: unknown[] } } } } | null }).host;
  const children = host?.renderer.layers.departments.children ?? [];
  return children
    .filter((c): c is DepartmentBlobView => c instanceof DepartmentBlobView)
    .map((b) => [...b.getDrawnPoints()]);
}

describe('RenderConfig.contourEngine', () => {
  beforeAll(() => {
    const wasmPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../wasm/pkg/org_hierarchy_core_bg.wasm',
    );
    const bytes = readFileSync(wasmPath);
    setContourWasmLoaderForTests(async () => {
      const mod = await import('../../wasm/pkg/org_hierarchy_core.js');
      await mod.default({ module_or_path: bytes });
      return mod as never;
    });
    resetContourWasmForTests();
  });

  afterEach(() => {
    resetContourWasmForTests();
  });

  it('success: cell-flood paints rings from the Rust engine', async () => {
    const { container, diagram } = await mount('cell-flood');
    const rings = blobRings(diagram);
    expect(rings.length).toBeGreaterThan(0);
    // Flood rings are orthogonal cell walks — a plain frame would be 4 corners
    // before filleting; the IT ring wraps the CEO cell, so it has more.
    expect(Math.max(...rings.map((r) => r.length))).toBeGreaterThan(4);
    diagram.destroy();
    container.remove();
  });

  it('success: flood rings track the cards, not the cell lattice', async () => {
    const { container, diagram } = await mount('cell-flood');
    const rings = blobRings(diagram);
    const widest = rings.reduce((best, r) => {
      const w = Math.max(...r.map((p) => p.x)) - Math.min(...r.map((p) => p.x));
      return w > best.width ? { width: w, ring: r } : best;
    }, { width: 0, ring: [] as { x: number; y: number }[] });

    const pitchX = 140; // refCellWidth + horizontalGap (gap 0 in this fixture)
    const cardWidth = 136;
    const padding = contourButtonGroupMargin(0, defaultNodeTheme.department.strokeWidth);
    // Card union across three columns + the wash padding — not 3 × cell.
    expect(widest.width).toBeCloseTo(2 * pitchX + cardWidth + padding * 2, 5);
    diagram.destroy();
    container.remove();
  });

  it('success: button-group stays the default and needs no wasm round-trip', async () => {
    const spy = vi.spyOn(await import('../../contour/bridge.js'), 'computeAllContours');
    const { container, diagram } = await mount('button-group');
    expect(blobRings(diagram).length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    diagram.destroy();
    container.remove();
  });

  it('failure: blob mode without authored cells says why the layer is empty', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const data = interleavedData();
    const diagram = await OrgHierarchyDiagram.create(container, {
      data: {
        ...data,
        // Same scene, coords stripped — a tree-laid-out roster needs a head.
        positions: data.positions.map(({ gridCell: _gridCell, ...p }, i) => ({
          ...p,
          isHead: i === 0,
        })),
        reportLines: data.positions
          .slice(1)
          .map((p) => ({ fromId: 'P1', toId: p.id, kind: 'admin' as const })),
      },
      staffCurrentOrgId: 'org1',
      useWorker: false,
      render: { departmentStyle: 'blob', minContourMembers: 1 },
    });

    expect(blobRings(diagram)).toEqual([]);
    expect(diagram.getLayoutDiagnostics().join(' ')).toMatch(/Contours skipped: .* no gridCell/);

    diagram.destroy();
    container.remove();
  });

  it('failure: a broken wasm loader leaves no contours and reports a diagnostic', async () => {
    setContourWasmLoaderForTests(async () => {
      throw new Error('wasm gone');
    });
    resetContourWasmForTests();
    const { container, diagram } = await mount('cell-flood');
    expect(blobRings(diagram)).toEqual([]);
    expect(diagram.getLayoutDiagnostics().join(' ')).toMatch(/Contour flood unavailable/);
    diagram.destroy();
    container.remove();
  });
});
