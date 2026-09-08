/**
 * The vocabulary the contour painter speaks: a seat on the grid, the magnetism
 * settings that group seats into components, and a point on a ring.
 *
 * These lived in `contour/bridge.ts` until T80, because that file described the
 * WASM contract and the Rust flood was the first thing to need them. The flood
 * is gone; the words are not. Both engines used them, and the one that stays is
 * pure TS — so keeping them next to a WASM loader would have said something
 * about this code that stopped being true.
 */

/** One seat, addressed by its cell on the department grid. */
export interface ContourPositionInput {
  id: string;
  departmentId: string;
  col: number;
  row: number;
}

/**
 * How seats group into contour components, and how the ring is drawn around
 * them (SPEC §4.6.1).
 *
 * ⚠️ Several fields are read only by the paint path and several only shaped the
 * Rust call that no longer exists; `preferNotch` is the clearest survivor of the
 * second kind. Left in place because narrowing an options object is a change to
 * the public surface, not a tidy-up — and this task already spends one.
 */
export interface ContourMagnetConfig {
  /** Max Manhattan distance between own cells in one component (default 1.5). */
  magnetRadius?: number;
  paddingCells?: number;
  corridorCells?: number;
  cellWidth?: number;
  cellHeight?: number;
  /** Chaikin iterations; clamped to 8 at paint time (A9, OOM above ~18). */
  smoothIterations?: number;
  /** Prefer a notch around a foreign card rather than swallowing it. */
  preferNotch?: boolean;
}

/** A point on a contour ring, in whatever space the caller is working in. */
export interface ContourPoint {
  x: number;
  y: number;
}
