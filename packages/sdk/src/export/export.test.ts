import { afterEach, describe, expect, it } from '@rstest/core';
import { VARIANT_B_POSITIONS } from '../render/contour/variantBPositions.js';
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

  it('success: png with Pixi app uses extractPngFromPixi', async () => {
    const fakePixels = new Uint8Array(100).fill(0xff);
    setCanvasToBlobImpl(async () => new Blob([fakePixels], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    const fakeApp = {
      stage: {},
      renderer: { extract: { canvas: () => canvas } },
    } as unknown as import('pixi.js').Application;

    const result = await exportDiagram(
      {
        data: variantB(),
        mounted: true,
        app: fakeApp,
        renderConfig: defaultRenderConfig,
        currentOrgId: 'org1',
      },
      { format: 'png', scope: 'full' },
    );
    expect(result).toBeInstanceOf(Blob);
    const blob = result as Blob;
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(100);
  });

  it('failure: png without Pixi app throws ExportError (no blank fillRect)', async () => {
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
    ).rejects.toThrow(/PNG export requires a mounted Pixi/i);
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





describe('boundaries of the export contour layer (T6 / B1–B5)', () => {
  const deptCount = (svg: string) => [...svg.matchAll(/data-dept="/g)].length;
  // T80: ці п'ять перевіряють межі САМОГО шару експорту — сцена без відділу,
  // один відділ, поріг, піддерево. Раніше вони їхали через flood-гілку, і разом
  // із нею мало не поїхали у смітник; рушій тут не при чому, тож вони просто
  // переїхали на той, що лишився.
  const cfg = { minContourMembers: 1 };

  it('B1 — a scene whose seats have no department paints an empty layer, no error', async () => {
    const base = variantB();
    // Без `as`: будуємо посади без відділу, а не зрізаємо поле з готових.
    const data = {
      ...base,
      positions: base.positions.map(({ departmentId: _dropped, ...rest }) => rest),
    };

    const said: string[] = [];
    const svg = await buildDiagramSvg({
      data,
      currentOrgId: 'org1',
      config: cfg,
      onDiagnostic: (m) => said.push(m),
    });

    expect(svg).toContain('<g id="departments">');
    expect(deptCount(svg)).toBe(0);
    // Посада без відділу — чужа для будь-якого контуру, а не збій рушія.
    expect(said).toEqual([]);
  });

  it('B2 — one seat in one department still gets its ring', async () => {
    const base = variantB();
    const data = { ...base, positions: base.positions.slice(0, 1) };

    const svg = await buildDiagramSvg({ data, currentOrgId: 'org1', config: cfg });
    expect(deptCount(svg)).toBe(2); // fill + stroke того самого кільця
  });

  it('B3 — minContourMembers above the crowd empties the layer silently', async () => {
    const said: string[] = [];
    const svg = await buildDiagramSvg({
      data: variantB(),
      currentOrgId: 'org1',
      config: { minContourMembers: 99 },
      onDiagnostic: (m) => said.push(m),
    });

    expect(deptCount(svg)).toBe(0);
    expect(said).toEqual([]);
  });

  it('B4 — subtree keeps only the departments that live under the root', async () => {
    const full = await buildDiagramSvg({ data: variantB(), currentOrgId: 'org1', config: cfg });
    const cut = await buildDiagramSvg({
      data: filterDiagramSubtree(variantB(), 'org1'),
      currentOrgId: 'org1',
      config: cfg,
    });
    // Піддерево рахується заново для свого набору посад, а не ріжеться з готового.
    expect(deptCount(cut)).toBeGreaterThan(0);
    expect(deptCount(cut)).toBeLessThanOrEqual(deptCount(full));
  });

  it('B5 — a subtree with no seats falls to the org branch, engine untouched', async () => {
    const said: string[] = [];
    const svg = await buildDiagramSvg({
      data: {
        ...variantB(),
        positions: [],
        organizations: [{ id: 'org1', name: 'Solo', groupIds: [] }],
      },
      config: cfg,
      onDiagnostic: (m) => said.push(m),
    });

    // Інша гілка рендера — шару відділів немає взагалі, і рушій тут ні до чого.
    expect(deptCount(svg)).toBe(0);
    expect(said).toEqual([]);
  });
});

describe('buildDiagramSvg — default engine is frozen (T1 / H2)', () => {
  /**
   * Знята ДО того, як експорт навчився рахувати flood. Мета — не «SVG виглядає добре»,
   * а «дефолтний рушій не зачепило»: будь-який зсув геометрії, порядку шарів чи атрибутів
   * ламає цей тест. Знята після рефакторингу, вона перевіряла б сама себе.
   */
  it('success: byte-for-byte stable output for the button-group engine', async () => {
    const svg = await buildDiagramSvg({ data: variantB(), currentOrgId: 'org1' });
    expect(svg).toMatchSnapshot('default-engine-svg');
  });

  it('failure: the snapshot is sensitive — a changed knob changes the bytes', async () => {
    const base = await buildDiagramSvg({ data: variantB(), currentOrgId: 'org1' });
    const shifted = await buildDiagramSvg({
      data: variantB(),
      currentOrgId: 'org1',
      config: { paddingCells: 2 },
    });
    // Якби фікстура була нечутлива, вона б і справжню регресію пропустила.
    expect(shifted).not.toBe(base);
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

  it('success: multi-org with seats and no currentOrgId infers staff focus (T78-L4)', async () => {
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
          isHead: true,
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
    // Same as canvas: infer org A (first / unique head) → staff seats present.
    expect(svg).toContain('data-position=');
    expect(svg).toContain('data-position="p-a"');
  });
});

describe('rgbImageToPdf', () => {
  it('success: header %PDF', () => {
    const pdf = rgbImageToPdf(2, 2, solidRgb(2, 2, 255, 0, 0));
    expect(String.fromCodePoint(...pdf.slice(0, 5))).toBe('%PDF-');
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

