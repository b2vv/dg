import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';
import type { NodeRef } from '../interaction/types.js';
import { nodeDomTestId } from '../interaction/nodeTestId.js';
import type { TestAnchorCandidate } from '../interaction/nodeTestId.js';
import { screenRectInView, worldBoxToScreen } from '../render/promoteMath.js';
import type { ViewportTransform } from '../render/Viewport.js';

/** Diagram surface for test anchor overlay (mirrors promote sync). */
export interface TestAnchorOverlayDiagram {
  getViewport(): ViewportTransform;
  listTestAnchors(): readonly TestAnchorCandidate[];
  focusByTestId(testId: string): Promise<boolean>;
  openContextMenu(ref: NodeRef, pointer?: Partial<ContextMenuPointer>): void;
  subscribePromoteSync(listener: () => void): () => void;
}

export interface TestAnchorOverlayOptions {
  diagram: TestAnchorOverlayDiagram;
  mount: HTMLElement;
  /** When true, anchors receive clicks and call focusByTestId (e2e mode). */
  interactive?: boolean;
}

export interface TestAnchorOverlay {
  sync: () => void;
  dispose: () => void;
}

/**
 * Invisible DOM hit-targets synced to Pixi node bounds for Playwright/Cypress.
 * `data-testid="node-<testId>"` on each anchor.
 */
export function createTestAnchorOverlay(options: TestAnchorOverlayOptions): TestAnchorOverlay {
  const { mount, diagram } = options;
  const interactive = options.interactive ?? false;

  const prevPosition = mount.style.position;
  if (!prevPosition || prevPosition === 'static') {
    mount.style.position = 'relative';
  }

  const layer = document.createElement('div');
  layer.setAttribute('data-org-hierarchy-test-anchors', '');
  layer.style.position = 'absolute';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '6';
  mount.appendChild(layer);

  let disposed = false;

  const sync = (): void => {
    if (disposed) return;
    layer.replaceChildren();
    const viewport = diagram.getViewport();
    const screen = { width: mount.clientWidth || 1, height: mount.clientHeight || 1 };

    for (const anchor of diagram.listTestAnchors()) {
      const rect = worldBoxToScreen(anchor.world, viewport);
      if (!screenRectInView(rect, screen)) continue;

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('data-testid', nodeDomTestId(anchor.testId));
      el.setAttribute('data-node-kind', anchor.kind);
      el.setAttribute('data-node-id', anchor.ref.id);
      el.setAttribute('aria-label', `${anchor.kind} ${anchor.testId}`);
      el.title = anchor.testId;
      el.style.position = 'absolute';
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${Math.max(rect.width, 8)}px`;
      el.style.height = `${Math.max(rect.height, 8)}px`;
      el.style.padding = '0';
      el.style.margin = '0';
      el.style.border = '0';
      el.style.background = 'transparent';
      el.style.opacity = '0.001';
      el.style.cursor = interactive ? 'pointer' : 'default';
      el.style.pointerEvents = interactive ? 'auto' : 'none';

      if (interactive) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          void diagram.focusByTestId(anchor.testId);
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          diagram.openContextMenu(anchor.ref, { clientX: e.clientX, clientY: e.clientY });
        });
      }

      layer.appendChild(el);
    }
  };

  const unsubscribe = diagram.subscribePromoteSync(sync);
  sync();

  return {
    sync,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      layer.remove();
      if (!prevPosition || prevPosition === 'static') {
        mount.style.position = prevPosition;
      }
    },
  };
}
