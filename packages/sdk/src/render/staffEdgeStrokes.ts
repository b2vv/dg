import type { StaffEdgeLink } from '../layout/staffEdgeGeometry.js';
import type { EdgeStyle } from './types.js';

// The single per-kind stroke table. Both the live painter (StaffEdgesView) and
// the SVG export route through this one site (T126 R6-7, H3 style parity), so a
// kind cannot look one way on screen and another in the export. Kept pixi-free
// so the headless SVG export can import it.
//
// `lead-org` is the org→org plink (card v3 §3.4): a dashed grey vertical, no
// arrow, theme-neutral `#6b6b73` as in the mockup CSS (`.plink`).
const STROKE_LIGHT: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0x334155, width: 2.25 },
  'lead-org': { color: 0x6b6b73, width: 2, dash: [6, 4] },
  matrix: { color: 0x94a3b8, width: 1.5, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.5, dash: [2, 4] },
};

const STROKE_DARK: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0xe2e8f0, width: 2.25 },
  'lead-org': { color: 0x6b6b73, width: 2, dash: [6, 4] },
  matrix: { color: 0x64748b, width: 1.5, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.5, dash: [2, 4] },
};

export type StaffEdgeStrokeTable = Record<
  StaffEdgeLink['kind'],
  { color: number; width: number; dash?: number[] }
>;

/** Per-kind stroke table; a host {@link EdgeStyle} repaints/resizes every kind. */
export function staffEdgeStrokes(
  theme: 'light' | 'dark',
  edge?: EdgeStyle,
): StaffEdgeStrokeTable {
  const base = theme === 'dark' ? STROKE_DARK : STROKE_LIGHT;
  if (edge?.color === undefined && edge?.width === undefined) return base;
  const apply = (s: { color: number; width: number; dash?: number[] }) => ({
    ...s,
    color: edge.color ?? s.color,
    width: edge.width ?? s.width,
  });
  return {
    admin: apply(base.admin),
    'lead-org': apply(base['lead-org']),
    matrix: apply(base.matrix),
    dotted: apply(base.dotted),
  };
}
