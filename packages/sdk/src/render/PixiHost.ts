import { Application, Rectangle, RendererType } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { Viewport, type ViewportTransform, type CameraMotionOptions } from './Viewport.js';
import {
  createSoftwareRendererDetector,
  readUnmaskedRendererFromDom,
  type RendererDetector,
} from './detectSoftwareRenderer.js';

/**
 * One detector for the page: the renderer name cannot change while the document
 * lives, and asking again would cost another throwaway context per diagram.
 * Not exported — tests build their own and pass it in, so no process-wide reset
 * joins the package barrel.
 */
const detectRenderer: RendererDetector = createSoftwareRendererDetector(
  readUnmaskedRendererFromDom,
);

/**
 * Which engine draws the scene. `'auto'` lets the browser decide: Pixi walks
 * webgl → canvas, and `failIfMajorPerformanceCaveat` makes the browser refuse a
 * WebGL context it would have to emulate in software.
 */
export type RendererKindPreference = 'auto' | 'webgl' | 'canvas';

/** The two `app.init` options a {@link RendererKindPreference} resolves to. */
export interface ResolvedRendererPreference {
  preference: ReadonlyArray<'webgl' | 'canvas'>;
  failIfMajorPerformanceCaveat: boolean;
  /** Set only when the requested value was not one we know — see the fallback below. */
  diagnostic?: string;
}

/**
 * `'auto'` is best-effort, not a guarantee: the same Chromium refused a software
 * WebGL context under `--use-gl=swiftshader` on macOS and handed one out in a
 * GPU-less Linux container. Hosts that need certainty pass `'canvas'`.
 *
 * Because that hint is unreliable, `'auto'` also asks who is drawing and steps
 * aside to Canvas2D when the answer is a known software rasteriser — worth ~7×
 * the frame rate on such a machine (T92). A name we do not recognise is not a
 * verdict: it leaves the choice exactly as it was, so no real GPU is demoted by
 * a guess.
 *
 * @param detect injected in tests; production shares one memoised detector so
 *   the renderer string costs a single throwaway context per page.
 */
export function resolveRendererPreference(
  value?: unknown,
  detect: RendererDetector = detectRenderer,
): ResolvedRendererPreference {
  const auto: ResolvedRendererPreference = {
    preference: ['webgl', 'canvas'],
    failIfMajorPerformanceCaveat: true,
  };
  if (value === 'canvas') {
    return { preference: ['canvas'], failIfMajorPerformanceCaveat: false };
  }
  if (value === 'webgl') {
    // A single-entry array is a blocklist: canvas is excluded, so an environment
    // without WebGL rejects the mount instead of quietly drawing on canvas.
    return { preference: ['webgl'], failIfMajorPerformanceCaveat: false };
  }
  if (value === 'auto' || value === undefined) return resolveAuto(auto, detect);
  // A host on untyped JS can pass anything. Falling back silently would leave
  // "why is this diagram on canvas?" unanswerable, so the substitution is spoken.
  return {
    ...resolveAuto(auto, detect),
    diagnostic: `Unknown renderer '${String(value)}' — using 'auto' instead.`,
  };
}

/**
 * The `'auto'` branch, after the host has declined to choose.
 *
 * Silent when nothing changed: a diagnostic about a decision that was not taken
 * teaches hosts to ignore the channel.
 */
function resolveAuto(
  auto: ResolvedRendererPreference,
  detect: RendererDetector,
): ResolvedRendererPreference {
  const software = detect();
  if (!software) return auto;
  return {
    preference: ['canvas'],
    failIfMajorPerformanceCaveat: false,
    // Names the rasteriser, not just the fact: the host's next question is
    // always "why is this on canvas?", and "software" is half of that answer.
    diagnostic:
      `Software renderer '${software}' detected — drawing on 'canvas'. ` +
      `Pass renderer: 'canvas' explicitly if you want this without detection.`,
  };
}

export interface PixiHostOptions {
  background?: number;
  minScale?: number;
  maxScale?: number;
  /** Override device pixel ratio (tests). Default: `window.devicePixelRatio`. */
  resolution?: number;
  /** Abort in-flight `create` / `init` (React StrictMode, route change). */
  signal?: AbortSignal;
  /** Which engine draws the scene. Default `'auto'` — see {@link resolveRendererPreference}. */
  renderer?: RendererKindPreference;
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
  private paintRequested = false;
  private paintHandle = 0;
  private contextMenuHandler: ((e: Event) => void) | null = null;
  private onResize: (() => void) | null = null;

  static async create(container: HTMLElement, options: PixiHostOptions = {}): Promise<PixiHost> {
    if (!container) {
      throw new Error('OrgHierarchyDiagram: container is required');
    }
    const host = new PixiHost();
    const onAbort = () => host.destroy();
    if (options.signal?.aborted) {
      host.destroy();
      throw new Error('PixiHost destroyed during create');
    }
    options.signal?.addEventListener('abort', onAbort);
    try {
      await host.init(container, options);
      if (host.destroyed) {
        throw new Error('PixiHost destroyed during create');
      }
      return host;
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  getApplication(): Application | null {
    return this.app;
  }

  /**
   * Surface size as last measured by the ResizeObserver. Callers that need the
   * size on a per-frame path read it here rather than from the DOM, where the
   * read would force a synchronous style and layout flush.
   */
  getScreenSize(): { width: number; height: number } {
    // Delegated, not duplicated: the viewport already tracks the surface size
    // — the ResizeObserver below feeds it through setScreenSize — and a second
    // copy of the same two numbers is a second thing to keep in step.
    return this.viewport?.getScreenSize() ?? { width: 0, height: 0 };
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
    // Every pan, zoom and camera tween frame passes through Viewport.apply, so
    // wrapping the change handler covers all of them with one hook.
    this.viewport?.setOnChange((t) => {
      this.requestPaint();
      handler?.(t);
    });
  }

  /**
   * Called after the surface has been re-measured.
   *
   * Separate from {@link PixiHost.setOnViewportChange} because a resize moves no
   * camera: the transform is identical and only the visible area changed. Any
   * consumer whose answer depends on how much fits on screen has to hear about
   * it, and before this hook there was no way to.
   */
  setOnResize(handler: (() => void) | null): void {
    this.onResize = handler;
  }

  /**
   * Paint once, at the next frame, however many times it is asked in between.
   *
   * Every path that changes what is on screen calls this: the scene rebuild, the
   * camera, a dragged card. Coalescing matters because a drag fires far more
   * often than the display refreshes, and each paint is the expensive half.
   */
  requestPaint(): void {
    if (this.paintRequested || this.destroyed) return;
    this.paintRequested = true;
    this.paintHandle = requestAnimationFrame(() => {
      this.paintHandle = 0;
      this.paintRequested = false;
      if (!this.destroyed) this.app?.render();
    });
  }

  /**
   * Which engine actually drew the scene, or `null` before the mount finishes
   * and after `destroy()` — symmetric with the other post-mount getters.
   */
  getRendererKind(): 'webgl' | 'canvas' | null {
    const type = this.app?.renderer?.type;
    if (type == null) return null;
    return type === RendererType.CANVAS ? 'canvas' : 'webgl';
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
    const rendererChoice = resolveRendererPreference(options.renderer);
    await app.init({
      preference: [...rendererChoice.preference],
      failIfMajorPerformanceCaveat: rendererChoice.failIfMajorPerformanceCaveat,
      // No shared ticker: a diagram nobody is touching must cost nothing. Every
      // path that changes the picture asks for a paint instead — `requestPaint`.
      autoStart: false,
      width,
      height,
      background: options.background ?? 0xf8fafc,
      antialias: true,
      resolution: this.lastResolution,
      autoDensity: true,
      // Do not use resizeTo: a 0-height mount (CSS not loaded / mobile layout)
      // would shrink the canvas to empty; we drive size via ResizeObserver mins.
    });

    app.ticker.stop();

    // StrictMode / route change may call destroy() while Application.init awaits.
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }

    this.app = app;
    container.appendChild(app.canvas);
    this.contextMenuHandler = (e) => e.preventDefault();
    app.canvas.addEventListener('contextmenu', this.contextMenuHandler);
    this.renderer.mount(app.stage);

    this.viewport = new Viewport(this.renderer.layers.root, {
      minScale: options.minScale,
      maxScale: options.maxScale,
    });
    this.viewport.setScreenSize(width, height);
    // Anything inside the scene that moves pixels without a rebuild — a dragged
    // card — reaches the application through here.
    this.renderer.onNeedsPaint = () => this.requestPaint();

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
      this.requestPaint();
      this.onResize?.();
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

    if (this.paintHandle !== 0) {
      cancelAnimationFrame(this.paintHandle);
      this.paintHandle = 0;
    }
    this.paintRequested = false;
    this.renderer.onNeedsPaint = null;
    this.onResize = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.viewport?.destroy();
    this.viewport = null;

    this.renderer.destroy();

    if (this.app) {
      const canvas = this.app.canvas;
      if (this.contextMenuHandler && canvas) {
        canvas.removeEventListener('contextmenu', this.contextMenuHandler);
      }
      this.contextMenuHandler = null;
      this.app.destroy(true, { children: true });
      canvas?.remove();
      this.app = null;
    }

    this.container = null;
  }
}
