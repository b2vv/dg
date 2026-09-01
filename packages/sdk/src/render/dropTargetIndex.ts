import type { NodeWorldBox } from './SceneRegistry.js';

/**
 * Which card is under the pointer, without walking the scene.
 *
 * React Flow answers this by iterating every node on each `pointermove`
 * (`xyhandle/utils.ts`), allocating a rectangle per node as it goes. At a
 * thousand seats that is a thousand tests sixty times a second, and the 1M tab
 * would make it worse, not better.
 *
 * Here the boxes are bucketed once per render into a uniform grid. A lookup
 * touches the bucket under the pointer and, for the magnet radius, its
 * neighbours — a handful of boxes regardless of how many the scene holds. The
 * cost of a `pointermove` therefore does not grow with the scene (T91 row 14).
 *
 * The bucket size is the *scene's* pitch, not a tuned constant: cards laid on a
 * grid then land roughly one per bucket, which is what keeps the probe short.
 */
export interface DropTarget {
  id: string;
  box: NodeWorldBox;
}

export class DropTargetIndex {
  private readonly buckets = new Map<string, NodeWorldBox[]>();

  /**
   * Boxes examined by the last lookup.
   *
   * Kept as real state rather than left to a benchmark because the claim being
   * defended — that a `pointermove` does not get more expensive as the scene
   * grows — is a claim about *work done*, and a wall-clock test for it would be
   * the flakiest assertion in the suite (T91 row 14).
   */
  probed = 0;

  constructor(
    boxes: readonly NodeWorldBox[],
    private readonly cellW: number,
    private readonly cellH: number,
  ) {
    // A degenerate pitch would put every box in one bucket and quietly restore
    // the full walk this class exists to avoid.
    this.cellW = cellW > 0 ? cellW : 1;
    this.cellH = cellH > 0 ? cellH : 1;
    for (const box of boxes) this.add(box);
  }

  /** A box can span buckets, so it is filed under every bucket it touches. */
  private add(box: NodeWorldBox): void {
    const c0 = Math.floor(box.x / this.cellW);
    const c1 = Math.floor((box.x + box.width) / this.cellW);
    const r0 = Math.floor(box.y / this.cellH);
    const r1 = Math.floor((box.y + box.height) / this.cellH);
    for (let c = c0; c <= c1; c += 1) {
      for (let r = r0; r <= r1; r += 1) {
        const key = `${c}:${r}`;
        const list = this.buckets.get(key);
        if (list) list.push(box);
        else this.buckets.set(key, [box]);
      }
    }
  }

  /** The box containing the point, or `undefined`. Ties go to the last drawn. */
  at(x: number, y: number): NodeWorldBox | undefined {
    this.probed = 0;
    const key = `${Math.floor(x / this.cellW)}:${Math.floor(y / this.cellH)}`;
    const list = this.buckets.get(key);
    if (!list) return undefined;
    let found: NodeWorldBox | undefined;
    for (const box of list) {
      this.probed += 1;
      if (x < box.x || x > box.x + box.width) continue;
      if (y < box.y || y > box.y + box.height) continue;
      found = box;
    }
    return found;
  }

  /**
   * The nearest box within `radius` — the magnetism itself (T91 row 15).
   *
   * A card the pointer is inside wins outright; otherwise the closest edge
   * within the radius does. Distance is measured to the rectangle, not to its
   * centre, so a wide card is not handicapped against a narrow neighbour.
   */
  nearest(x: number, y: number, radius: number, skipId?: string): DropTarget | undefined {
    const inside = this.at(x, y);
    if (inside && inside.id !== skipId) return { id: inside.id, box: inside };

    const reach = Math.max(0, radius);
    const c0 = Math.floor((x - reach) / this.cellW);
    const c1 = Math.floor((x + reach) / this.cellW);
    const r0 = Math.floor((y - reach) / this.cellH);
    const r1 = Math.floor((y + reach) / this.cellH);

    let best: NodeWorldBox | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    const seen = new Set<NodeWorldBox>();
    for (let c = c0; c <= c1; c += 1) {
      for (let r = r0; r <= r1; r += 1) {
        const list = this.buckets.get(`${c}:${r}`);
        if (!list) continue;
        for (const box of list) {
          if (box.id === skipId || seen.has(box)) continue;
          seen.add(box);
          this.probed += 1;
          const dist = distanceToRect(x, y, box);
          if (dist > reach || dist >= bestDist) continue;
          bestDist = dist;
          best = box;
        }
      }
    }
    return best ? { id: best.id, box: best } : undefined;
  }
}

/** Euclidean distance from a point to a rectangle; 0 when inside. */
export function distanceToRect(x: number, y: number, box: NodeWorldBox): number {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
  const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
  return Math.hypot(dx, dy);
}
