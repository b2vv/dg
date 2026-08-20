export interface MorphPoint {
  x: number;
  y: number;
}

const DEFAULT_SAMPLES = 32;

function perimeter(points: MorphPoint[]): number {
  if (points.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

/** Resample a closed ring to `count` vertices at equal arc length. */
export function resampleClosedRing(points: MorphPoint[], count = DEFAULT_SAMPLES): MorphPoint[] {
  const n = Math.max(3, Math.floor(count));
  if (points.length === 0) {
    return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  }
  if (points.length === 1) {
    const p = points[0]!;
    return Array.from({ length: n }, () => ({ x: p.x, y: p.y }));
  }

  const total = perimeter(points);
  if (total <= 0) {
    const p = points[0]!;
    return Array.from({ length: n }, () => ({ x: p.x, y: p.y }));
  }

  const out: MorphPoint[] = [];
  for (let s = 0; s < n; s += 1) {
    const target = (s / n) * total;
    let walked = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (walked + seg >= target || i === points.length - 1) {
        const t = seg === 0 ? 0 : (target - walked) / seg;
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
        break;
      }
      walked += seg;
    }
  }
  return out;
}

/** Rotate `candidate` so vertex 0 best matches `reference` (min SSD). */
export function rotateRingToAlign(reference: MorphPoint[], candidate: MorphPoint[]): MorphPoint[] {
  if (reference.length === 0 || candidate.length === 0) return candidate.slice();
  if (reference.length !== candidate.length) {
    const n = Math.max(reference.length, candidate.length, DEFAULT_SAMPLES);
    return rotateRingToAlign(resampleClosedRing(reference, n), resampleClosedRing(candidate, n));
  }

  let bestOffset = 0;
  let bestScore = Infinity;
  for (let offset = 0; offset < candidate.length; offset += 1) {
    let score = 0;
    for (let i = 0; i < reference.length; i += 1) {
      const a = reference[i]!;
      const b = candidate[(i + offset) % candidate.length]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      score += dx * dx + dy * dy;
    }
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  if (bestOffset === 0) return candidate.slice();
  return [...candidate.slice(bestOffset), ...candidate.slice(0, bestOffset)];
}

export function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}

/** Interpolate two closed rings (resample + align). */
export function lerpClosedRings(
  from: MorphPoint[],
  to: MorphPoint[],
  t: number,
  sampleCount = DEFAULT_SAMPLES,
): MorphPoint[] {
  const a = resampleClosedRing(from, sampleCount);
  const b = rotateRingToAlign(a, resampleClosedRing(to, sampleCount));
  const u = Math.min(1, Math.max(0, t));
  return a.map((p, i) => ({
    x: p.x + (b[i]!.x - p.x) * u,
    y: p.y + (b[i]!.y - p.y) * u,
  }));
}

export interface PointMorphHandle {
  cancel: () => void;
  done: Promise<void>;
}

/**
 * Animate point morph with injectable clock/raf (tests can drive sync frames).
 */
export function runPointMorph(options: {
  from: MorphPoint[];
  to: MorphPoint[];
  durationMs?: number;
  sampleCount?: number;
  onUpdate: (points: MorphPoint[]) => void;
  now?: () => number;
  requestFrame?: (cb: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
}): PointMorphHandle {
  const durationMs = Math.max(0, options.durationMs ?? 160);
  const now = options.now ?? (() => performance.now());
  const requestFrame =
    options.requestFrame ??
    ((cb) => requestAnimationFrame((t) => cb(t)));
  const cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id));

  let frameId = 0;
  let cancelled = false;
  const start = now();

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const finish = (points: MorphPoint[]) => {
    options.onUpdate(points);
    resolveDone();
  };

  if (durationMs === 0) {
    finish(lerpClosedRings(options.from, options.to, 1, options.sampleCount));
    return {
      cancel: () => {
        cancelled = true;
      },
      done,
    };
  }

  const tick = () => {
    if (cancelled) {
      resolveDone();
      return;
    }
    const elapsed = now() - start;
    const t = easeOutCubic(elapsed / durationMs);
    options.onUpdate(lerpClosedRings(options.from, options.to, t, options.sampleCount));
    if (elapsed >= durationMs) {
      finish(lerpClosedRings(options.from, options.to, 1, options.sampleCount));
      return;
    }
    frameId = requestFrame(tick);
  };

  frameId = requestFrame(tick);

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cancelFrame(frameId);
      resolveDone();
    },
    done,
  };
}
