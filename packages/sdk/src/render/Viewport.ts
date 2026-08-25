import { easeOutCubic } from './contourMorph.js';

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ViewportOptions {
  minScale?: number;
  maxScale?: number;
  /** Wheel zoom sensitivity (default 0.0015) */
  wheelIntensity?: number;
}

/** Camera tween options (injectable clock for tests). */
export interface CameraMotionOptions {
  animate?: boolean;
  durationMs?: number;
  now?: () => number;
  requestFrame?: (cb: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
}

const DEFAULT_MIN_SCALE = 0.15;
const DEFAULT_MAX_SCALE = 4;
const DEFAULT_WHEEL = 0.0015;
const DEFAULT_CAMERA_MS = 280;

/**
 * Pan/zoom camera applied to a world root container.
 * Screen point = world * scale + (x, y).
 */
export class Viewport {
  private x = 0;
  private y = 0;
  private scale = 1;
  private readonly minScale: number;
  private readonly maxScale: number;
  private readonly wheelIntensity: number;
  private panning = false;
  private panPointerId: number | null = null;
  private lastScreenX = 0;
  private lastScreenY = 0;
  private detachWheel: (() => void) | null = null;
  private detachPinch: (() => void) | null = null;
  private screenWidth = 800;
  private screenHeight = 600;
  private onChange: ((t: ViewportTransform) => void) | null = null;
  private animCancel: (() => void) | null = null;
  private pinch: {
    pointerIds: [number, number];
    lastDist: number;
    lastMidX: number;
    lastMidY: number;
  } | null = null;

  constructor(
    private readonly world: {
      position: { set(x: number, y: number): void };
      scale: { set(x: number, y: number): void };
    },
    options: ViewportOptions = {},
  ) {
    this.minScale = options.minScale ?? DEFAULT_MIN_SCALE;
    this.maxScale = options.maxScale ?? DEFAULT_MAX_SCALE;
    this.wheelIntensity = options.wheelIntensity ?? DEFAULT_WHEEL;
    this.apply();
  }

  setOnChange(handler: ((t: ViewportTransform) => void) | null): void {
    this.onChange = handler;
  }

  getTransform(): ViewportTransform {
    return { x: this.x, y: this.y, scale: this.scale };
  }

  setTransform(next: Partial<ViewportTransform>): void {
    this.cancelAnimation();
    if (typeof next.x === 'number' && Number.isFinite(next.x)) this.x = next.x;
    if (typeof next.y === 'number' && Number.isFinite(next.y)) this.y = next.y;
    if (typeof next.scale === 'number' && Number.isFinite(next.scale)) {
      this.scale = clamp(next.scale, this.minScale, this.maxScale);
    }
    this.apply();
  }

  setScreenSize(width: number, height: number): void {
    this.screenWidth = Math.max(width, 1);
    this.screenHeight = Math.max(height, 1);
  }

  /** Place world point at viewport center (keeps current scale). */
  panTo(worldX: number, worldY: number, motion?: CameraMotionOptions): void {
    const target: ViewportTransform = {
      x: this.screenWidth / 2 - worldX * this.scale,
      y: this.screenHeight / 2 - worldY * this.scale,
      scale: this.scale,
    };
    this.goTo(target, motion);
  }

  setZoom(scale: number, anchorScreenX?: number, anchorScreenY?: number): void {
    this.cancelAnimation();
    const ax = anchorScreenX ?? this.screenWidth / 2;
    const ay = anchorScreenY ?? this.screenHeight / 2;
    this.zoomAt(scale, ax, ay);
  }

  getZoom(): number {
    return this.scale;
  }

  getScreenSize(): { width: number; height: number } {
    return { width: this.screenWidth, height: this.screenHeight };
  }

  /** Compute fit camera without applying. */
  computeFitTransform(
    bounds: { x: number; y: number; width: number; height: number },
    padding = 48,
    minScale?: number,
  ): ViewportTransform | null {
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return null;
    }
    const pad = Math.max(0, padding);
    const availW = Math.max(1, this.screenWidth - pad * 2);
    const availH = Math.max(1, this.screenHeight - pad * 2);
    const nextScale = clamp(
      Math.min(availW / bounds.width, availH / bounds.height),
      minScale ?? this.minScale,
      this.maxScale,
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    return {
      scale: nextScale,
      x: this.screenWidth / 2 - cx * nextScale,
      y: this.screenHeight / 2 - cy * nextScale,
    };
  }

  /**
   * Zoom/pan so `bounds` (world units) fits in the screen with padding.
   * Returns false when bounds are empty/invalid.
   */
  fitBounds(
    bounds: { x: number; y: number; width: number; height: number },
    padding = 48,
    motion?: CameraMotionOptions & { minScale?: number },
  ): boolean {
    const target = this.computeFitTransform(bounds, padding, motion?.minScale);
    if (!target) return false;
    this.goTo(target, motion);
    return true;
  }

  /** Identity camera: origin top-left, scale 1. */
  resetView(motion?: CameraMotionOptions): void {
    this.goTo({ x: 0, y: 0, scale: 1 }, motion);
  }

  /** Tween camera to target; cancels any in-flight tween. */
  animateTo(
    target: ViewportTransform,
    motion: CameraMotionOptions = {},
  ): { cancel: () => void; done: Promise<void> } {
    this.cancelAnimation();
    const durationMs = Math.max(0, motion.durationMs ?? DEFAULT_CAMERA_MS);
    const from = this.getTransform();
    const to: ViewportTransform = {
      x: target.x,
      y: target.y,
      scale: clamp(target.scale, this.minScale, this.maxScale),
    };

    if (durationMs === 0 || motion.animate === false) {
      this.x = to.x;
      this.y = to.y;
      this.scale = to.scale;
      this.apply();
      return { cancel: () => {}, done: Promise.resolve() };
    }

    const now = motion.now ?? (() => performance.now());
    const requestFrame =
      motion.requestFrame ?? ((cb) => requestAnimationFrame((t) => cb(t)));
    const cancelFrame = motion.cancelFrame ?? ((id) => cancelAnimationFrame(id));

    let frameId = 0;
    let cancelled = false;
    const start = now();
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const finish = () => {
      this.x = to.x;
      this.y = to.y;
      this.scale = to.scale;
      this.apply();
      this.animCancel = null;
      resolveDone();
    };

    const tick = () => {
      if (cancelled) {
        resolveDone();
        return;
      }
      const elapsed = now() - start;
      const t = easeOutCubic(elapsed / durationMs);
      this.x = from.x + (to.x - from.x) * t;
      this.y = from.y + (to.y - from.y) * t;
      this.scale = from.scale + (to.scale - from.scale) * t;
      this.apply();
      if (elapsed >= durationMs) {
        finish();
        return;
      }
      frameId = requestFrame(tick);
    };

    frameId = requestFrame(tick);
    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      cancelFrame(frameId);
      this.animCancel = null;
      resolveDone();
    };
    this.animCancel = cancel;
    return { cancel, done };
  }

  cancelAnimation(): void {
    this.animCancel?.();
    this.animCancel = null;
  }

  /**
   * Wheel gestures on the canvas: **Ctrl/⌘ + scroll zooms** at the pointer
   * (trackpad pinch arrives as ctrl+wheel too), plain scroll pans vertically and
   * Shift + scroll pans horizontally. Drag-pan still comes from beginPan/movePan.
   */
  attachWheel(canvas: HTMLCanvasElement): void {
    this.detachWheel?.();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cancelAnimation();
      if (isZoomWheel(e)) {
        const rect = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * this.wheelIntensity);
        this.zoomAt(this.scale * factor, sx, sy);
        return;
      }
      const { dx, dy } = wheelPanDelta(e);
      this.panBy(dx, dy);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    this.detachWheel = () => {
      canvas.removeEventListener('wheel', onWheel);
      this.detachWheel = null;
    };
  }

  /**
   * Two-finger pinch zoom (mobile). Also pans when both fingers move together.
   * Call after attachWheel; sets touch-action: none on the canvas.
   */
  attachPinch(canvas: HTMLCanvasElement): void {
    this.detachPinch?.();
    canvas.style.touchAction = 'none';

    const pointers = new Map<number, { x: number; y: number }>();

    const screenOf = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, screenOf(e));
      if (pointers.size === 2) {
        this.cancelAnimation();
        this.panning = false;
        this.panPointerId = null;
        const pts = [...pointers.entries()];
        const a = pts[0]![1];
        const b = pts[1]![1];
        this.pinch = {
          pointerIds: [pts[0]![0], pts[1]![0]],
          lastDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
          lastMidX: (a.x + b.x) / 2,
          lastMidY: (a.y + b.y) / 2,
        };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, screenOf(e));
      if (!this.pinch || pointers.size < 2) return;
      const a = pointers.get(this.pinch.pointerIds[0]);
      const b = pointers.get(this.pinch.pointerIds[1]);
      if (!a || !b) return;
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const factor = dist / this.pinch.lastDist;
      // Pan mid first, then zoom at the current mid (keeps focal world point stable).
      this.x += midX - this.pinch.lastMidX;
      this.y += midY - this.pinch.lastMidY;
      this.zoomAt(this.scale * factor, midX, midY);
      this.pinch.lastDist = dist;
      this.pinch.lastMidX = midX;
      this.pinch.lastMidY = midY;
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) this.pinch = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    // Do not clear pinch on pointerleave — finger can briefly leave the canvas.

    this.detachPinch = () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      this.detachPinch = null;
      this.pinch = null;
    };
  }

  /** Zoom by a multiplicative step around screen center (UI +/- buttons). */
  zoomBy(factor: number): void {
    this.cancelAnimation();
    this.zoomAt(this.scale * factor, this.screenWidth / 2, this.screenHeight / 2);
  }

  /** Move the camera by a screen-space delta (wheel / keyboard pan). */
  panBy(screenDx: number, screenDy: number): void {
    if (!Number.isFinite(screenDx) || !Number.isFinite(screenDy)) return;
    if (screenDx === 0 && screenDy === 0) return;
    this.x += screenDx;
    this.y += screenDy;
    this.apply();
  }

  beginPan(pointerId: number, screenX: number, screenY: number): void {
    if (this.pinch) return;
    this.cancelAnimation();
    this.panning = true;
    this.panPointerId = pointerId;
    this.lastScreenX = screenX;
    this.lastScreenY = screenY;
  }

  movePan(pointerId: number, screenX: number, screenY: number): void {
    if (this.pinch || !this.panning || pointerId !== this.panPointerId) return;
    this.x += screenX - this.lastScreenX;
    this.y += screenY - this.lastScreenY;
    this.lastScreenX = screenX;
    this.lastScreenY = screenY;
    this.apply();
  }

  endPan(pointerId: number): void {
    if (pointerId !== this.panPointerId) return;
    this.panning = false;
    this.panPointerId = null;
  }

  destroy(): void {
    this.cancelAnimation();
    this.detachWheel?.();
    this.detachPinch?.();
    this.panning = false;
    this.panPointerId = null;
    this.pinch = null;
  }

  private goTo(target: ViewportTransform, motion?: CameraMotionOptions): void {
    // Opt-in animation (omit motion → instant, preserves sync call sites / tests).
    const animate = motion?.animate === true;
    if (!animate) {
      this.cancelAnimation();
      this.x = target.x;
      this.y = target.y;
      this.scale = clamp(target.scale, this.minScale, this.maxScale);
      this.apply();
      return;
    }
    void this.animateTo(target, motion);
  }

  private zoomAt(nextScale: number, screenX: number, screenY: number): void {
    const clamped = clamp(nextScale, this.minScale, this.maxScale);
    if (clamped === this.scale) return;
    const worldX = (screenX - this.x) / this.scale;
    const worldY = (screenY - this.y) / this.scale;
    this.scale = clamped;
    this.x = screenX - worldX * this.scale;
    this.y = screenY - worldY * this.scale;
    this.apply();
  }

  private apply(): void {
    this.world.position.set(this.x, this.y);
    this.world.scale.set(this.scale, this.scale);
    this.onChange?.(this.getTransform());
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Ctrl/⌘ + wheel = zoom (this is also how a trackpad pinch reaches the page). */
export function isZoomWheel(e: Pick<WheelEvent, 'ctrlKey' | 'metaKey'>): boolean {
  return e.ctrlKey || e.metaKey;
}

/**
 * Screen-space camera delta for a pan wheel: content follows the scroll, so the
 * camera moves the other way. Shift swaps a vertical wheel onto the X axis.
 */
export function wheelPanDelta(
  e: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'shiftKey'>,
): { dx: number; dy: number } {
  const deltaX = Number.isFinite(e.deltaX) ? e.deltaX : 0;
  const deltaY = Number.isFinite(e.deltaY) ? e.deltaY : 0;
  const invert = (v: number) => (v === 0 ? 0 : -v);
  if (e.shiftKey && deltaX === 0) return { dx: invert(deltaY), dy: 0 };
  return { dx: invert(deltaX), dy: invert(deltaY) };
}
