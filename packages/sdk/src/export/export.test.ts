import { afterEach, describe, expect, it } from 'vitest';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';
import { assertExportOptions, ExportError } from './types.js';
import { filterDiagramSubtree } from './subtree.js';
import { buildDiagramSvg } from './svgExport.js';
import { exportDiagram, printDiagram } from './exportDiagram.js';
import { rgbImageToPdf, solidRgb } from './pdfExport.js';
import { extractPngFromPixi, setCanvasToBlobImpl } from './pngExport.js';
import type { Application } from 'pixi.js';
import type { DiagramData } from '../data/types.js';
import { defaultRenderConfig } from '../render/types.js';

afterEach(() => setCanvasToBlobImpl(null));

function variantB(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Demo Org', groupIds: [] }],
    groups: [],
    departments: [
      { id: 'IT', name: 'IT', organizationId: 'org1' },
      { id: 'CEO', name: 'CEO', organizationId: 'org1' },
    ],
    persons: VARIANT_B_POSITIONS.map((p) => ({
      id: `person-${p.id}`,
      fullName: `Person ${p.id}`,
    })),
    positions: VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      title: p.id,
      organizationId: 'org1',
      departmentId: p.departmentId,
      groupIds: [],
      personId: `person-${p.id}`,
      status: 'filled' as const,
      isTemporary: false,
      gridCell: { col: p.col, row: p.row },
    })),
    reportLines: [],
  };
}

describe('export options', () => {
  it('failure: invalid format throws', () => {
    expect(() =>
      assertExportOptions({ format: 'invalid' as 'png' }),
    ).toThrow(ExportError);
  });

  it('failure: subtree without root throws', () => {
    expect(() => assertExportOptions({ format: 'svg', scope: 'subtree' })).toThrow(
      /subtreeRootId/,
    );
  });
});

describe('exportDiagram', () => {
  it('failure: before mount throws', async () => {
    await expect(
      exportDiagram(
        {
          data: variantB(),
          mounted: false,
          app: null,
          renderConfig: defaultRenderConfig,
        },
        { format: 'png' },
      ),
    ).rejects.toThrow(/mounted/i);
  });

  it('success: png → image/png blob with real pixel data (not 8-byte sig)', async () => {
    // Inject a seam that returns a non-trivial PNG-like blob (simulates real canvas export).
    const fakePixels = new Uint8Array(100).fill(0xff);
    setCanvasToBlobImpl(async () => new Blob([fakePixels], { type: 'image/png' }));

    const result = await exportDiagram(
      {
        data: variantB(),
        mounted: true,
        app: null,
        renderConfig: defaultRenderConfig,
        currentOrgId: 'org1',
      },
      { format: 'png', scope: 'full' },
    );
    expect(result).toBeInstanceOf(Blob);
    const blob = result as Blob;
    expect(blob.type).toBe('image/png');
    // Must be the injected blob (100 bytes), not the 8-byte PNG signature fallback.
    expect(blob.size).toBe(100);
  });

  it('failure: png without seam throws ExportError in jsdom (B6 — no silent 8-byte stub)', async () => {
    // In jsdom, toBlob never fires and toDataURL is not implemented → ExportError.
    await expect(
      exportDiagram(
        {
          data: variantB(),
          mounted: true,
          app: null,
          renderConfig: defaultRenderConfig,
          currentOrgId: 'org1',
        },
        { format: 'png', scope: 'full' },
      ),
    ).rejects.toThrow(/PNG export failed/i);
  });

  it('success: svg contains path d=', async () => {
    const svg = (await exportDiagram(
      {
        data: variantB(),
        mounted: true,
        app: null,
        renderConfig: defaultRenderConfig,
        currentOrgId: 'org1',
      },
      { format: 'svg', scope: 'full' },
    )) as string;
    expect(svg).toMatch(/<path d="M/);
    expect(svg).toContain('data-dept="IT"');
  });

  it('failure: pdf without Pixi app throws ExportError (no blank gray page)', async () => {
    await expect(
      exportDiagram(
        {
          data: variantB(),
          mounted: true,
          app: null,
          renderConfig: defaultRenderConfig,
        },
        { format: 'pdf' },
      ),
    ).rejects.toThrow(/PDF export requires a mounted Pixi application/i);
  });

  it('failure: extractPngFromPixi throws instead of drawing Export placeholder', async () => {
    const app = {
      renderer: {
        extract: {
          canvas: () => {
            throw new Error('no webgl');
          },
        },
      },
      screen: { width: 800, height: 600 },
    } as unknown as Application;
    await expect(extractPngFromPixi(app)).rejects.toThrow(/PNG export failed/i);
  });
});

describe('filterDiagramSubtree', () => {
  it('success: keeps descendant orgs only', () => {
    const data: DiagramData = {
      organizations: [
        { id: 'a', name: 'A', groupIds: [] },
        { id: 'b', name: 'B', groupIds: [], parentOrgId: 'a' },
        { id: 'c', name: 'C', groupIds: [], parentOrgId: 'b' },
      ],
      groups: [],
      departments: [],
      persons: [],
      positions: [
        {
          id: 'p1',
          title: 't',
          organizationId: 'c',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
        },
        {
          id: 'p0',
          title: 't',
          organizationId: 'a',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
        },
      ],
      reportLines: [],
    };
    const sub = filterDiagramSubtree(data, 'b');
    expect(sub.organizations.map((o) => o.id).sort()).toEqual(['b', 'c']);
    expect(sub.positions.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('buildDiagramSvg', () => {
  it('success: includes person groups', async () => {
    const svg = await buildDiagramSvg({ data: variantB(), currentOrgId: 'org1' });
    expect(svg.match(/data-position=/g)?.length).toBe(6);
  });

  it('success: contour fill under cards; stroke group after persons (canvas parity)', async () => {
    const svg = await buildDiagramSvg({
      data: variantB(),
      currentOrgId: 'org1',
      config: { paddingCells: 0, smoothIterations: 1 },
    });
    expect(svg).toContain('id="departments"');
    expect(svg).toContain('id="department-strokes"');
    expect(svg).toContain('fill-opacity=');
    const fillIdx = svg.indexOf('id="departments"');
    const personsIdx = svg.indexOf('id="persons"');
    const strokeIdx = svg.indexOf('id="department-strokes"');
    expect(fillIdx).toBeGreaterThan(-1);
    expect(personsIdx).toBeGreaterThan(fillIdx);
    expect(strokeIdx).toBeGreaterThan(personsIdx);
  });

  it('regression: staffLayout gap/margin must match live diagram (contours vs cards)', async () => {
    const staffLayout = {
      horizontalGap: 0,
      verticalGap: 0,
      margin: 0,
      refCellWidth: 140,
      refCellHeight: 160,
      nodeWidth: 136,
      nodeHeight: 156,
    };
    const svg = await buildDiagramSvg({
      data: variantB(),
      currentOrgId: 'org1',
      staffLayout,
      config: { cellWidth: 140, cellHeight: 160, paddingCells: 0, smoothIterations: 0 },
    });
    const m = svg.match(/data-position="P1"[^>]*transform="translate\(([\d.]+),([\d.]+)\)/);
    expect(m).toBeTruthy();
    // inset = 2; default margin 32 would place y≥32 — this catches export/layout drift.
    expect(Number(m![1])).toBeLessThan(8);
    expect(Number(m![2])).toBeLessThan(8);
  });

  it('success: org-only diagram exports org cards, not an empty svg', async () => {
    const data: DiagramData = {
      organizations: [
        { id: 'root', name: 'Root Co', groupIds: [], collapsed: true },
        { id: 'child', name: 'Child Org', groupIds: [], parentOrgId: 'root', collapsed: true },
      ],
      groups: [],
      departments: [],
      persons: [],
      positions: [],
      reportLines: [],
    };
    const svg = await buildDiagramSvg({ data });
    expect(svg).toContain('data-org="root"');
    expect(svg).toContain('data-org="child"');
    expect(svg).toContain('Root Co');
  });

  it('success: multi-org without currentOrgId exports all orgs, not one staff tree', async () => {
    const data: DiagramData = {
      organizations: [
        { id: 'a', name: 'Org A', groupIds: [], collapsed: true },
        { id: 'b', name: 'Org B', groupIds: [], collapsed: true },
      ],
      groups: [],
      departments: [],
      persons: [],
      positions: [
        {
          id: 'p-a',
          title: 'Head A',
          organizationId: 'a',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
          gridCell: { col: 0, row: 0 },
        },
        {
          id: 'p-b',
          title: 'Head B',
          organizationId: 'b',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
          gridCell: { col: 0, row: 0 },
        },
      ],
      reportLines: [],
    };
    const svg = await buildDiagramSvg({ data });
    expect(svg).toContain('data-org="a"');
    expect(svg).toContain('data-org="b"');
    expect(svg).not.toContain('data-position=');
  });
});

describe('rgbImageToPdf', () => {
  it('success: header %PDF', () => {
    const pdf = rgbImageToPdf(2, 2, solidRgb(2, 2, 255, 0, 0));
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe('%PDF-');
  });
});

describe('printDiagram', () => {
  it('failure: popup blocked throws ExportError (A13)', () => {
    const orig = window.open;
    window.open = () => null;
    try {
      expect(() => printDiagram('<svg></svg>')).toThrow(ExportError);
    } finally {
      window.open = orig;
    }
  });
});
