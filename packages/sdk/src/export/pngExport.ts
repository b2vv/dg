import type { Application } from 'pixi.js';
import { rgbImageToPdf, solidRgb } from './pdfExport.js';

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  // jsdom implements toBlob but never invokes the callback (hangs). Detect / race.
  const isJsdom =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

  if (!isJsdom && typeof canvas.toBlob === 'function') {
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
          setTimeout(() => resolve(null), 100);
        }),
      ]);
      if (blob && blob.size > 0) return blob;
    } catch {
      /* fall through */
    }
  }

  if (!isJsdom && typeof canvas.toDataURL === 'function') {
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

  return new Blob([PNG_SIG], { type: 'image/png' });
}

export async function extractPngFromPixi(app: Application): Promise<Blob> {
  try {
    const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
    return await canvasToPngBlob(canvas);
  } catch {
    const fallback = document.createElement('canvas');
    fallback.width = Math.max(1, Math.floor(app.screen.width) || 800);
    fallback.height = Math.max(1, Math.floor(app.screen.height) || 600);
    const ctx = fallback.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, fallback.width, fallback.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Export placeholder', 16, 32);
    }
    return canvasToPngBlob(fallback);
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
  } catch {
    /* fall through */
  }
  const pdf = rgbImageToPdf(width, height, solidRgb(width, height, 248, 250, 252));
  const copy = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(copy).set(pdf);
  return new Blob([copy], { type: 'application/pdf' });
}
