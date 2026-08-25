import type { OrgLayoutOptions, StaffLayoutOptions } from '@org-hierarchy/sdk';

/** Cell pitch and card sizes measured off the approved Figma frames. */
export const FIGMA_SEAT = { width: 248, height: 44 } as const;

/** Org row-tree layout for frame 1264:8121 — 234×110 cards, 40px between peers. */
export const FIGMA_ORG_LAYOUT = {
  nodeWidth: 234,
  nodeHeight: 110,
  horizontalGap: 40,
  verticalGap: 72,
  margin: 40,
  orgEdgeStyle: 'spine-bus',
} satisfies OrgLayoutOptions;

/**
 * Staff canvas layout for frame 1264:7906. Zone inset is `margin / 2`, kept
 * clear of the 16px department padding so the two labels never collide.
 */
export const FIGMA_STAFF_LAYOUT = {
  horizontalGap: 56,
  verticalGap: 76,
  tierGap: 72,
  margin: 96,
  nodeWidth: FIGMA_SEAT.width,
  nodeHeight: FIGMA_SEAT.height,
  orgCardWidth: 234,
  orgCardHeight: 110,
  refCellWidth: 304,
  refCellHeight: 88,
  collapseUnexpandedPositions: false,
} satisfies StaffLayoutOptions;

/** Magnetic copy: matrix mode, so `refCell*` must equal `render.cell*`. */
export const MAGNETIC_STAFF_LAYOUT = {
  ...FIGMA_STAFF_LAYOUT,
  refCellHeight: 120,
} satisfies StaffLayoutOptions;

/** Contour grid pitch for the magnetic copy (`render.cellWidth/Height`). */
export const MAGNETIC_CELL = { width: 304, height: 120 } as const;

/**
 * Flood copy: tighter cells so the cell-space contour still hugs the cards —
 * a wide cell would wrap each seat in a much larger block.
 */
export const FLOOD_CELL = { width: 272, height: 68 } as const;

export const FLOOD_STAFF_LAYOUT = {
  ...FIGMA_STAFF_LAYOUT,
  horizontalGap: FLOOD_CELL.width - FIGMA_SEAT.width,
  verticalGap: FLOOD_CELL.height - FIGMA_SEAT.height,
  refCellWidth: FIGMA_SEAT.width,
  refCellHeight: FIGMA_SEAT.height,
} satisfies StaffLayoutOptions;

/**
 * Figma «посади» topology (frame 1264:7906) with civilian names (rule 1 of
 * work/tasks/MOCKUP-styles-review.md): a managing tier holding one command
 * department, and the current tier holding a command department with two
 * service departments side by side beneath it.
 */
