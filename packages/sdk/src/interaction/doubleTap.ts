/** Max interval between taps that counts as a double-tap (T69 / D5). */
export const NODE_DOUBLE_TAP_MS = 300;

export type DoubleTapKind = 'single' | 'double';

/**
 * Tracks consecutive taps on the same key. Same key within {@link NODE_DOUBLE_TAP_MS}
 * → `'double'` (and clears so a third tap starts a new sequence).
 */
export class DoubleTapTracker {
  private lastKey: string | null = null;
  private lastAt = 0;

  tap(key: string, now = performance.now()): DoubleTapKind {
    if (this.lastKey === key && now - this.lastAt <= NODE_DOUBLE_TAP_MS) {
      this.lastKey = null;
      this.lastAt = 0;
      return 'double';
    }
    this.lastKey = key;
    this.lastAt = now;
    return 'single';
  }

  reset(): void {
    this.lastKey = null;
    this.lastAt = 0;
  }
}
