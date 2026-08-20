export interface ParsedPath {
  points: { x: number; y: number }[];
  closed: boolean;
}

/** Parse simple SVG paths emitted by WASM contour (M, L, Z only) */
export function parseSvgPath(d: string): ParsedPath | null {
  const trimmed = d.trim();
  if (!trimmed) return null;

  const tokens = trimmed.match(/[MLZ]|[-+]?[\d.]+(?:e[-+]?\d+)?/gi);
  if (!tokens?.length) return null;

  const points: { x: number; y: number }[] = [];
  let i = 0;
  let cmd = '';
  let closed = false;

  const readNum = (): number | null => {
    if (i >= tokens.length) return null;
    const t = tokens[i];
    if (/^[MLZ]$/i.test(t)) return null;
    const n = Number(t);
    if (Number.isNaN(n)) return null;
    i += 1;
    return n;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[MLZ]$/i.test(t)) {
      cmd = t.toUpperCase();
      i += 1;
      if (cmd === 'Z') {
        closed = true;
        continue;
      }
    }

    const x = readNum();
    const y = readNum();
    if (x === null || y === null) return null;

    if (cmd === 'M' || cmd === 'L') {
      points.push({ x, y });
      if (cmd === 'M') cmd = 'L';
    } else {
      return null;
    }
  }

  if (points.length < 2) return null;
  return { points, closed };
}
