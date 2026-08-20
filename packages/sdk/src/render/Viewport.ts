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

const DEFAULT_MIN_SCALE = 0.15;
const DEFAULT_MAX_SCALE = 4;
const DEFAULT_WHEEL = 0.0015;

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
  private screenWidth = 800;
  private screenHeight = 600;
  private onChange: ((t: ViewportTransform) => void) | null = null;

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
  panTo(worldX: number, worldY: number): void {
    this.x = this.screenWidth / 2 - worldX * this.scale;
    this.y = this.screenHeight / 2 - worldY * this.scale;
    this.apply();
  }

  setZoom(scale: number, anchorScreenX?: number, anchorScreenY?: number): void {
    const ax = anchorScreenX ?? this.screenWidth / 2;
    const ay = anchorScreenY ?? this.screenHeight / 2;
    this.zoomAt(scale, ax, ay);
  }

  getZoom(): number {
    return this.scale;
  }

  /** Wheel zoom on the canvas (pan is driven via beginPan/movePan/endPan from Pixi). */
  attachWheel(canvas: HTMLCanvasElement): void {
    this.detachWheel?.();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * this.wheelIntensity);
      this.zoomAt(this.scale * factor, sx, sy);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    this.detachWheel = () => {
      canvas.removeEventListener('wheel', onWheel);
      this.detachWheel = null;
    };
  }

  beginPan(pointerId: number, screenX: number, screenY: number): void {
    this.panning = true;
    this.panPointerId = pointerId;
    this.lastScreenX = screenX;
    this.lastScreenY = screenY;
  }

  movePan(pointerId: number, screenX: number, screenY: number): void {
    if (!this.panning || pointerId !== this.panPointerId) return;
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
    this.detachWheel?.();
    this.panning = false;
    this.panPointerId = null;
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
