/**
 * Which slice of the address space belongs under the camera, and what it costs
 * to move the frame of reference when that slice changes.
 *
 * Pure arithmetic on purpose: the wall is a fixed grid, so «which seats are in
 * this rectangle» is a division, not a search — no backend, no spatial index,
 * and nothing here needs Pixi to be tested.
 */

export interface WallGeometry {
  /** Seats per row. */
  cols: number;
  /** World px between the top of one row and the next (cell + gap). */
  pitchY: number;
  /** First seat of the wall in the address space. */
  firstIndex: number;
  /** How many seats the wall holds. */
  tierSeats: number;
}

export interface WindowRequest {
  screen: { width: number; height: number };
  viewport: { x: number; y: number; scale: number };
  /**
   * Screens of materialized data to keep beyond the visible edge, per side.
   *
   * Named in **screens**, not seats, because the cost of a screen is what the
   * user perceives and what the zoom changes. Not to be confused with the
   * promote overlay's `pad`, which is screen **pixels** around the viewport for
   * DOM cards — a different quantity about a different layer.
   */
  reserveScreens: number;
  /** Index the current wall's top row starts at. */
  wallBase: number;
}

export interface WindowRange {
  start: number;
  end: number;
  /** Seats that actually exist in the band, after the ends of the wall clamp it. */
  size: number;
  /**
   * Seats the camera asks for, *before* the clamp.
   *
   * At the top or bottom of the tier `size` is smaller than a screenful — correct
   * for a window built at that edge, wrong for one built anywhere else. A jump
   * builds elsewhere, so it sizes by the ask, not by what the edge left over.
   */
  span: number;
}

/**
 * The seats under the camera, plus the reserve.
 *
 * Row 0 of the wall is the pinned head (see `scaleStaff.cellOfSeat`), so the
 * seat rows begin at 1 — the `- 1` below is that offset, not a fencepost.
 */
export function resolveWindowRange(req: WindowRequest, geom: WallGeometry): WindowRange {
  const { scale } = req.viewport;
  const worldTop = (0 - req.viewport.y) / scale;
  const worldHeight = req.screen.height / scale;
  const reserve = worldHeight * req.reserveScreens;

  // Wall rows intersecting the band. `ceil` already lands on the row *after* the
  // last one needed, so it is the exclusive end — subtracting one here as well
  // as for the head offset made every window a row too wide.
  const firstRow = Math.floor((worldTop - reserve) / geom.pitchY);
  const endRow = Math.ceil((worldTop + worldHeight + reserve) / geom.pitchY);

  const lastSeat = geom.firstIndex + geom.tierSeats;
  // Wall row 1 holds the first seat, so a row index maps to `(row - 1)` rows of seats.
  const start = clamp(req.wallBase + (firstRow - 1) * geom.cols, geom.firstIndex, lastSeat);
  const end = clamp(req.wallBase + (endRow - 1) * geom.cols, start, lastSeat);
  return { start, end, size: end - start, span: Math.max(0, endRow - firstRow) * geom.cols };
}

/**
 * Move the camera by exactly as much as re-basing the wall moved the content.
 *
 * Rows are window-relative because absolute ones would put the wall at
 * y ≈ 730 000 px, far past what `fitView` can frame. That choice is only
 * honest if the camera is shifted back by the same amount on every rebuild —
 * otherwise the scene creeps by a row each time the window slides.
 */
export function rebaseViewport(
  viewport: { x: number; y: number; scale: number },
  shift: { rowShift: number; pitchY: number },
): { x: number; y: number; scale: number } {
  if (shift.rowShift === 0) return viewport;
  return {
    ...viewport,
    y: viewport.y + shift.rowShift * shift.pitchY * viewport.scale,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Why the window is being rebuilt.
 *
 * The two are not the same move and must not be collapsed into one number: a
 * slide is given a range and keeps the content under the cursor still, a jump
 * is given a point and takes the camera to it. They share a scheduler because
 * they share the one thing that must not overlap — `setData`.
 */
export type StaffRebuild = { kind: 'slide'; start: number } | { kind: 'jump'; focusIndex: number };

/**
 * One rebuild at a time, and never one per event.
 *
 * Two separate things, both required: a quiet period so a gesture does not
 * rebuild on every frame, and a queue so a request arriving mid-rebuild is
 * neither dropped nor run concurrently. Concurrency here is not theoretical —
 * `setData` rebuilds the search index asynchronously, so two overlapping
 * rebuilds can finish out of order and leave the index describing the older
 * window.
 */
export class RebuildScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: StaffRebuild | null = null;
  private stopped = false;
  /**
   * The mutual exclusion both entry points share.
   *
   * A boolean «running» flag is not enough once there is a second entry point:
   * a caller that sets `pending` and then awaits the loop can land in the gap
   * between the loop's last check and its exit, and wait for a build that will
   * never start. Chaining onto the tail has no such gap — a job is queued
   * behind whatever is in flight at the moment it is created.
   */
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly build: (request: StaffRebuild) => Promise<void>,
    private readonly quietMs: number,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  request(request: StaffRebuild): void {
    if (this.stopped) return;
    this.pending = request;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.quietMs);
  }

  /**
   * Rebuild now and resolve when the scene has it.
   *
   * For an explicit destination rather than a gesture: waiting out the quiet
   * period would only add latency to something the user already committed to,
   * and the caller needs to say what landed, which means awaiting it. Anything
   * merely queued is superseded — a pan that has not started yet is stale the
   * moment somebody names where they want to be.
   *
   * Unlike {@link request}, a failure is thrown rather than routed to
   * `onError`: an explicit action that did not happen has to be named to the
   * person who asked for it.
   */
  async run(request: StaffRebuild): Promise<void> {
    if (this.stopped) return;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
    await this.enqueue(request);
  }

  /** Cancel anything not yet started. A rebuild already in flight still finishes. */
  stop(): void {
    this.stopped = true;
    this.pending = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private async flush(): Promise<void> {
    while (this.pending !== null && !this.stopped) {
      const next = this.pending;
      this.pending = null;
      try {
        await this.enqueue(next);
      } catch (error) {
        // The range is dropped rather than retried: the camera has usually
        // moved on by now, and a retry loop on a dead worker would rebuild
        // forever against a window nobody is looking at. The scene keeps the
        // data it already has; the caller names the reason.
        this.onError(error);
      }
    }
  }

  private enqueue(request: StaffRebuild): Promise<void> {
    const job = this.tail.then(() => (this.stopped ? undefined : this.build(request)));
    // The tail must survive a rejection, or one failed rebuild wedges every
    // later one; the rejection still reaches whoever awaited `job`.
    this.tail = job.then(
      () => {},
      () => {},
    );
    return job;
  }
}
