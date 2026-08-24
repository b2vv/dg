import type { Application } from 'pixi.js';
import { rgbImageToPdf } from './pdfExport.js';
import { ExportError } from './types.js';

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Seam for tests — inject a real or mock toBlob implementation. */
export type CanvasToBlobFn = (
  canvas: HTMLCanvasElement,
  type?: string,
) => Promise<Blob | null>;

let canvasToBlobImpl: CanvasToBlobFn | null = null;

/** Override the canvas→blob path (use in tests or when native toBlob is broken). */
export function setCanvasToBlobImpl(fn: CanvasToBlobFn | null): void {
  canvasToBlobImpl = fn;
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  if (canvasToBlobImpl) {
    const blob = await canvasToBlobImpl(canvas, 'image/png');
    if (blob && blob.size > 0) return blob;
  }

  if (typeof canvas.toBlob === 'function') {
    try {
      const blob = await Promise.race([
        new Promise<Blob | null>((resolve, reject) => {
          try {
            canvas.toBlob((b) => resolve(b), 'image/png');
          } catch (err) {
            reject(err);
          }
        }),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 400);
        }),
      ]);
      if (blob && blob.size > 0) return blob;
    } catch {
      /* fall through */
    }
  }

  if (typeof canvas.toDataURL === 'function') {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl.startsWith('data:image/png')) {
        const res = await fetch(dataUrl);
        return await res.blob();
      }
    } catch {
      /* ignore */
    }
  }

  // All rasterization paths failed — throw rather than return unrenderable 8-byte stub.
  throw new ExportError(
    'PNG export failed: canvas.toBlob and toDataURL both unavailable. ' +
      'Inject a canvasToBlobImpl via setCanvasToBlobImpl() or use SVG export.',
  );
}

/** @internal Only for unit tests and environments where canvas.toBlob is broken. */
export function pngFallbackBlob(): Blob {
  return new Blob([PNG_SIG], { type: 'image/png' });
}

export async function extractPngFromPixi(app: Application): Promise<Blob> {
  try {
    const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
    return await canvasToPngBlob(canvas);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ExportError(
      `PNG export failed: Pixi extract.canvas did not produce a canvas (${message})`,
    );
  }
}

export async function pngBlobToPdfBlob(png: Blob, width = 800, height = 600): Promise<Blob> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(png);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width || width;
      canvas.height = bitmap.height || height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d');
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const rgb = new Uint8Array(canvas.width * canvas.height * 3);
      for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
        rgb[j] = image.data[i]!;
        rgb[j + 1] = image.data[i + 1]!;
        rgb[j + 2] = image.data[i + 2]!;
      }
      const pdf = rgbImageToPdf(canvas.width, canvas.height, rgb);
      const copy = new ArrayBuffer(pdf.byteLength);
      new Uint8Array(copy).set(pdf);
      return new Blob([copy], { type: 'application/pdf' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ExportError(`PDF export failed: ${message}`);
  }
  throw new ExportError(
    'PDF export failed: createImageBitmap is unavailable; refusing to emit a blank page',
  );
}
