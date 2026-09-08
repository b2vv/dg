import type { ContourPositionInput } from './types.js';

/**
 * Variant B — the canonical sketch the department geometry is reasoned about
 * with: an IT row of three, a CEO seat wedged under its middle, and two IT
 * seats below. Small enough to check by hand, awkward enough that a foreign
 * card sits inside the component's bounding box.
 *
 * Lived in `contour/bridge.ts` until T80. It is a fixture, not a WASM concern,
 * and leaving it there would have made the loader import from `render/` — the
 * layer inversion this task went out of its way to avoid.
 */
export const VARIANT_B_POSITIONS: ContourPositionInput[] = [
  { id: 'P1', departmentId: 'IT', col: 0, row: 0 },
  { id: 'P2', departmentId: 'IT', col: 1, row: 0 },
  { id: 'P3', departmentId: 'IT', col: 2, row: 0 },
  { id: 'P4', departmentId: 'CEO', col: 1, row: 1 },
  { id: 'P5', departmentId: 'IT', col: 0, row: 2 },
  { id: 'P6', departmentId: 'IT', col: 2, row: 2 },
];
