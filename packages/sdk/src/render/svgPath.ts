export interface ParsedPath {
  points: { x: number; y: number }[];
  closed: boolean;
}

/** Parse SVG paths: M, L, H, V, Z (contour + org edges) */
export function parseSvgPath(d: string): ParsedPath | null {
  const trimmed = d.trim();
  if (!trimmed) return null;

  const tokens = trimmed.match(/[MLHVZ]|[-+]?[\d.]+(?:e[-+]?\d+)?/gi);
  if (!tokens?.length) return null;

  const points: { x: number; y: number }[] = [];
  let i = 0;
  let cmd = '';
  let closed = false;
  let cx = 0;
  let cy = 0;

  const readNum = (): number | null => {
    if (i >= tokens.length) return null;
    const t = tokens[i];
    if (/^[MLHVZ]$/i.test(t)) return null;
    const n = Number(t);
    if (Number.isNaN(n)) return null;
    i += 1;
    return n;
  };

  const lineTo = (x: number, y: number) => {
    cx = x;
    cy = y;
    points.push({ x, y });
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[MLHVZ]$/i.test(t)) {
      cmd = t.toUpperCase();
      i += 1;
      if (cmd === 'Z') {
        closed = true;
        continue;
      }
    }

    if (cmd === 'M' || cmd === 'L') {
      const x = readNum();
      const y = readNum();
      if (x === null || y === null) return null;
      lineTo(x, y);
      if (cmd === 'M') cmd = 'L';
    } else if (cmd === 'H') {
      const x = readNum();
      if (x === null) return null;
      lineTo(x, cy);
    } else if (cmd === 'V') {
      const y = readNum();
      if (y === null) return null;
      lineTo(cx, y);
    } else {
      return null;
    }
  }

  if (points.length < 2) return null;
  return { points, closed };
}
