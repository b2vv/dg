import { Application } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';

export interface PixiHostOptions {
  background?: number;
}

export class PixiHost {
  private app: Application | null = null;
  readonly renderer = new DiagramRenderer();
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;
  private destroyed = false;

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

  /** Pan world so (worldX, worldY) is near viewport center. */
  panTo(worldX: number, worldY: number): void {
    if (!this.app) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.renderer.layers.root.position.set(w / 2 - worldX, h / 2 - worldY);
  }

  private async init(container: HTMLElement, options: PixiHostOptions): Promise<void> {
    this.container = container;
    const width = Math.max(container.clientWidth || 800, 320);
    const height = Math.max(container.clientHeight || 600, 240);

    const app = new Application();
    await app.init({
      width,
      height,
      background: options.background ?? 0xf8fafc,
      antialias: true,
      resizeTo: container,
    });

    this.app = app;
    container.appendChild(app.canvas);
    app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.renderer.mount(app.stage);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.app || this.destroyed) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 240);
      this.app.renderer.resize(w, h);
    });
    this.resizeObserver.observe(container);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

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
