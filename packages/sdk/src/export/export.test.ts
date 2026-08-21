import { describe, expect, it } from 'vitest';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';
import { assertExportOptions, ExportError } from './types.js';
import { filterDiagramSubtree } from './subtree.js';
import { buildDiagramSvg } from './svgExport.js';
import { exportDiagram } from './exportDiagram.js';
import { rgbImageToPdf, solidRgb } from './pdfExport.js';
import type { DiagramData } from '../data/types.js';
import { defaultRenderConfig } from '../render/types.js';

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

  it('success: png → image/png blob', async () => {
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
    expect((result as Blob).type).toBe('image/png');
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

  it('success: pdf has %PDF header', async () => {
    const pdf = await exportDiagram(
      {
        data: variantB(),
        mounted: true,
        app: null,
        renderConfig: defaultRenderConfig,
      },
      { format: 'pdf' },
    );
    expect(pdf).toBeInstanceOf(Blob);
    const blob = pdf as Blob;
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const header = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!);
    expect(header).toBe('%PDF-');
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

  it('regression: staffLayout gap/margin must match live diagram (contours vs cards)', async () => {
    const staffLayout = {
      horizontalGap: 0,
      verticalGap: 0,
      margin: 0,
      refCellWidth: 148,
      refCellHeight: 168,
      nodeWidth: 128,
      nodeHeight: 148,
    };
    const svg = await buildDiagramSvg({
      data: variantB(),
      currentOrgId: 'org1',
      staffLayout,
      config: { cellWidth: 148, cellHeight: 168, paddingCells: 0, smoothIterations: 0 },
    });
    const m = svg.match(/data-position="P1"[^>]*transform="translate\(([\d.]+),([\d.]+)\)/);
    expect(m).toBeTruthy();
    // inset ≈10; default margin 32 would place y≥32 — this catches export/layout drift.
    expect(Number(m![1])).toBeLessThan(20);
    expect(Number(m![2])).toBeLessThan(20);
  });
});

describe('rgbImageToPdf', () => {
  it('success: header %PDF', () => {
    const pdf = rgbImageToPdf(2, 2, solidRgb(2, 2, 255, 0, 0));
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe('%PDF-');
  });
});
