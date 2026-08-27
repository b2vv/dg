/** Build a minimal single-page PDF embedding an RGB image (no external deps). */
export function rgbImageToPdf(
  width: number,
  height: number,
  rgb: Uint8Array,
): Uint8Array {
  if (rgb.byteLength !== width * height * 3) {
    throw new Error('RGB buffer size mismatch');
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const writeObj = (id: number, body: Uint8Array) => {
    offsets[id] = offset;
    push(body);
  };

  const catalogId = 1;
  const pagesId = 2;
  const pageId = 3;
  const contentId = 4;
  const imageId = 5;
  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;

  push(encoder.encode('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n'));

  writeObj(
    catalogId,
    encoder.encode(`1 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`),
  );
  writeObj(
    pagesId,
    encoder.encode(
      `2 0 obj\n<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>\nendobj\n`,
    ),
  );
  writeObj(
    pageId,
    encoder.encode(
      `3 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${contentId} 0 R /Resources << /XObject << /Im0 ${imageId} 0 R >> >> >>\nendobj\n`,
    ),
  );
  writeObj(
    contentId,
    (() => {
      const stream = encoder.encode(content);
      const h = encoder.encode(`4 0 obj\n<< /Length ${stream.byteLength} >>\nstream\n`);
      const f = encoder.encode('\nendstream\nendobj\n');
      const m = new Uint8Array(h.length + stream.length + f.length);
      m.set(h, 0);
      m.set(stream, h.length);
      m.set(f, h.length + stream.length);
      return m;
    })(),
  );
  writeObj(
    imageId,
    (() => {
      const h = encoder.encode(
        `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgb.byteLength} >>\nstream\n`,
      );
      const f = encoder.encode('\nendstream\nendobj\n');
      const m = new Uint8Array(h.length + rgb.length + f.length);
      m.set(h, 0);
      m.set(rgb, h.length);
      m.set(f, h.length + rgb.length);
      return m;
    })(),
  );

  const xrefStart = offset;
  const xrefLines = [`xref\n0 6\n`, `0000000000 65535 f \n`];
  for (let i = 1; i <= 5; i++) {
    xrefLines.push(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(encoder.encode(xrefLines.join('')));
  push(
    encoder.encode(
      `trailer\n<< /Size 6 /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
    ),
  );

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function solidRgb(width: number, height: number, r: number, g: number, b: number): Uint8Array {
  const buf = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const o = i * 3;
    buf[o] = r;
    buf[o + 1] = g;
    buf[o + 2] = b;
  }
  return buf;
}
