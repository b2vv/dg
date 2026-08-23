import { Application, Rectangle } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { Viewport, type ViewportTransform, type CameraMotionOptions } from './Viewport.js';

export interface PixiHostOptions {
  background?: number;
  minScale?: number;
  maxScale?: number;
  /** Override device pixel ratio (tests). Default: `window.devicePixelRatio`. */
  resolution?: number;
}

/** Crisp canvas text/sprites under browser zoom / retina (capped at 3×). */
export function resolvePixiResolution(explicit?: number): number {
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return Math.min(explicit, 3);
  }
  const dpr =
    typeof globalThis !== 'undefined' && 'devicePixelRatio' in globalThis
      ? Number((globalThis as { devicePixelRatio?: number }).devicePixelRatio)
      : 1;
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(dpr, 3);
}

export class PixiHost {
  private app: Application | null = null;
  readonly renderer = new DiagramRenderer();
  private viewport: Viewport | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;
  private destroyed = false;
  private lastResolution = 1;

  static async create(container: HTMLElement, options: PixiHostOptions = {}): Promise<PixiHost> {
    if (!container) {
      throw new Error('OrgHierarchyDiagram: container is required');
    }
    const host = new PixiHost();
    await host.init(container, options);
    return host;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  getApplication(): Application | null {
    return this.app;
  }

  getViewport(): ViewportTransform {
    return this.viewport?.getTransform() ?? { x: 0, y: 0, scale: 1 };
  }

  setViewport(next: Partial<ViewportTransform>): void {
    this.viewport?.setTransform(next);
  }

  getZoom(): number {
    return this.viewport?.getZoom() ?? 1;
  }

  setZoom(scale: number): void {
    this.viewport?.setZoom(scale);
  }

  /** Multiply current zoom (UI +/-). */
  zoomBy(factor: number): void {
    this.viewport?.zoomBy(factor);
  }

  /** Pan world so (worldX, worldY) is near viewport center. */
  panTo(worldX: number, worldY: number, motion?: CameraMotionOptions): void {
    this.viewport?.panTo(worldX, worldY, motion);
  }

  /** Fit content bounds into the screen. Returns false if nothing to fit. */
  fitView(
    padding = 48,
    motion?: CameraMotionOptions & { minScale?: number },
  ): boolean {
    const bounds = this.renderer.getContentBounds();
    if (!bounds || !this.viewport) return false;
    return this.viewport.fitBounds(bounds, padding, motion);
  }

  resetView(motion?: CameraMotionOptions): void {
    this.viewport?.resetView(motion);
  }

  setOnViewportChange(handler: ((t: ViewportTransform) => void) | null): void {
    this.viewport?.setOnChange(handler);
  }

  /** Update WebGL clear color (theme toggle). */
  setBackground(color: number): void {
    if (!this.app) return;
    this.app.renderer.background.color = color;
  }

  private async init(container: HTMLElement, options: PixiHostOptions): Promise<void> {
    this.container = container;
    const width = Math.max(container.clientWidth || 800, 320);
    const height = Math.max(container.clientHeight || 600, 240);
    this.lastResolution = resolvePixiResolution(options.resolution);

    const app = new Application();
    await app.init({
      width,
      height,
      background: options.background ?? 0xf8fafc,
      antialias: true,
      resolution: this.lastResolution,
      autoDensity: true,
      // Do not use resizeTo: a 0-height mount (CSS not loaded / mobile layout)
      // would shrink the canvas to empty; we drive size via ResizeObserver mins.
    });

    this.app = app;
    container.appendChild(app.canvas);
    app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.renderer.mount(app.stage);

    this.viewport = new Viewport(this.renderer.layers.root, {
      minScale: options.minScale,
      maxScale: options.maxScale,
    });
    this.viewport.setScreenSize(width, height);
    this.viewport.attachWheel(app.canvas);
    this.viewport.attachPinch(app.canvas);
    this.bindPan(app);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.app || this.destroyed) return;
      // Floor prevents a collapsed mount from wiping the WebGL surface
      // (export still works off-screen; users would only see a black page).
      const w = Math.max(container.clientWidth || 0, 320);
      const h = Math.max(container.clientHeight || 0, 240);
      const nextRes = resolvePixiResolution(options.resolution);
      if (Math.abs(nextRes - this.lastResolution) > 0.01) {
        this.lastResolution = nextRes;
        this.app.renderer.resolution = nextRes;
      }
      this.app.renderer.resize(w, h);
      this.viewport?.setScreenSize(w, h);
      this.syncStageHitArea(w, h);
    });
    this.resizeObserver.observe(container);
  }

  private bindPan(app: Application): void {
    const stage = app.stage;
    stage.eventMode = 'static';
    this.syncStageHitArea(app.screen.width, app.screen.height);

    stage.on('pointerdown', (e) => {
      // Nodes call stopPropagation; background hits reach the stage.
      if (e.button !== 0 && e.button !== 1) return;
      this.viewport?.beginPan(e.pointerId, e.global.x, e.global.y);
    });
    stage.on('globalpointermove', (e) => {
      this.viewport?.movePan(e.pointerId, e.global.x, e.global.y);
    });
    const end = (e: { pointerId: number }) => {
      this.viewport?.endPan(e.pointerId);
    };
    stage.on('pointerup', end);
    stage.on('pointerupoutside', end);
    stage.on('pointercancel', end);
  }

  private syncStageHitArea(width: number, height: number): void {
    if (!this.app) return;
    this.app.stage.hitArea = new Rectangle(0, 0, width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.viewport?.destroy();
    this.viewport = null;

    this.renderer.destroy();

    if (this.app) {
      const canvas = this.app.canvas;
      this.app.destroy(true, { children: true });
      canvas?.remove();
      this.app = null;
    }

    this.container = null;
  }
}
