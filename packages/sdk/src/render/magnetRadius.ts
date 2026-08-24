/**
 * Shared magnet-radius validation (T78-T4).
 * Non-finite values must reject — not silently become MAX (Rust) or splinter (JS `??`).
 */

export class ContourConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContourConfigError';
  }
}

/** Finite magnet radius ≥ 0; default 1.5 when undefined/null. */
export function resolveMagnetRadius(raw: number | undefined | null, fallback = 1.5): number {
  if (raw === undefined || raw === null) return fallback;
  if (!Number.isFinite(raw) || raw < 0) {
    throw new ContourConfigError(
      `magnetRadius must be a finite number ≥ 0 (got ${String(raw)})`,
    );
  }
  return raw;
}
