import type { Application } from 'pixi.js';
import type { DiagramData } from '../data/types.js';
import type { StaffLayoutOptions } from '../layout/staff/types.js';
import type { RenderConfig, PersonNodeStyle } from '../render/types.js';
import { assertExportOptions, ExportError, type ExportOptions } from './types.js';
import { filterDiagramSubtree } from './subtree.js';
import { buildDiagramSvg } from './svgExport.js';
import { extractPngFromPixi, pngBlobToPdfBlob } from './pngExport.js';

export interface ExportContext {
  data: DiagramData;
  mounted: boolean;
  app: Application | null;
  renderConfig: RenderConfig;
  currentOrgId?: string;
  expandedOrgIds?: readonly string[];
  staffLayout?: StaffLayoutOptions;
  background?: string;
  personTheme?: Partial<PersonNodeStyle>;
}

export async function exportDiagram(
  ctx: ExportContext,
  options: ExportOptions,
): Promise<Blob | string> {
  if (!ctx.mounted) {
    throw new ExportError('Cannot export before the diagram is mounted');
  }
  assertExportOptions(options);

  const scope = options.scope ?? 'viewport';
  let data = ctx.data;
  if (scope === 'subtree') {
    data = filterDiagramSubtree(data, options.subtreeRootId!);
  }

  if (options.format === 'svg') {
    return buildDiagramSvg({
      data,
      config: ctx.renderConfig,
      background: options.background ?? ctx.background,
      includeLabels: options.includeLabels,
      currentOrgId: ctx.currentOrgId,
      expandedOrgIds: ctx.expandedOrgIds,
      staffLayout: ctx.staffLayout,
      personTheme: ctx.personTheme,
    });
  }

  if (options.format === 'png') {
    if (ctx.app) {
      return extractPngFromPixi(ctx.app);
    }
    // No Pixi — rasterize via canvas fill, then canvasToPngBlob.
    // Throws ExportError if toBlob/toDataURL are unavailable (e.g. jsdom without canvas pkg).
    const canvas = document.createElement('canvas');
    canvas.width = options.width ?? 800;
    canvas.height = 600;
    const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = options.background ?? '#f8fafc';
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    const { canvasToPngBlob } = await import('./pngExport.js');
    return canvasToPngBlob(canvas);
  }

  // pdf
  if (!ctx.app) {
    throw new ExportError(
      'PDF export requires a mounted Pixi application; refusing to emit a blank page',
    );
  }
  const png = await extractPngFromPixi(ctx.app);
  return pngBlobToPdfBlob(png, options.width ?? 800, 600);
}

export function printDiagram(svg: string): void {
  if (typeof window === 'undefined') {
    throw new ExportError('print() requires a browser window');
  }
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    throw new ExportError('Unable to open print window (popup blocked?)');
  }
  w.document.write(`<!doctype html><html><head><title>Print</title>
<style>@page{margin:12mm}body{margin:0}svg{max-width:100%;height:auto}</style>
</head><body>${svg}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
